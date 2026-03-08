import { NextRequest, NextResponse } from "next/server";
import { calibration, devnet, mainnet, type Chain } from "@filoz/synapse-core/chains";
import { Synapse } from "@filoz/synapse-sdk";
import { privateKeyToAccount } from "viem/accounts";
import { http, keccak256, toHex } from "viem";
import { logError, logInfo } from "@/lib/telemetry";

type UploadKind = "market-metadata" | "market-resolution";

interface UploadRequestBody {
  kind: UploadKind;
  payload: Record<string, unknown>;
}

export const runtime = "nodejs";

function formatAttoFil(value: bigint): string {
  const base = 10n ** 18n;
  const whole = value / base;
  const frac = value % base;
  if (frac === 0n) return `${whole.toString()} FIL`;
  return `${whole.toString()}.${frac.toString().padStart(18, "0").replace(/0+$/, "")} FIL`;
}

function normalizeFilecoinCommitError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const match = raw.match(/InsufficientLockupFunds\(address payer, uint256 minimumRequired, uint256 available\) \((0x[a-fA-F0-9]{40}), (\d+), (\d+)\)/);
  if (!match) return raw;

  const [, payer, minimumRequiredRaw, availableRaw] = match;
  const minimumRequired = BigInt(minimumRequiredRaw);
  const available = BigInt(availableRaw);

  return [
    `Filecoin warm storage lockup is insufficient for payer ${payer}.`,
    `Required: ${minimumRequiredRaw} attoFIL (${formatAttoFil(minimumRequired)}).`,
    `Available: ${availableRaw} attoFIL (${formatAttoFil(available)}).`,
    "Fund lockup / warm storage for this payer and retry."
  ].join(" ");
}

function deterministicMockCid(payload: object): string {
  const hash = keccak256(toHex(JSON.stringify(payload)));
  return `bafy${hash.slice(2, 18)}`;
}

function resolveFilecoinChain(network: string): Chain {
  if (network === "mainnet") return mainnet;
  if (network === "devnet") return devnet;
  return calibration;
}

async function uploadWithSynapse(payload: Record<string, unknown>): Promise<string> {
  const walletPrivateKey = process.env.FILECOIN_WALLET_PRIVATE_KEY as `0x${string}` | undefined;
  if (!walletPrivateKey) {
    throw new Error("FILECOIN_WALLET_PRIVATE_KEY is not set");
  }

  const chain = resolveFilecoinChain(process.env.FILECOIN_NETWORK || "calibration");
  const account = privateKeyToAccount(walletPrivateKey);
  const transport = process.env.FILECOIN_RPC_URL ? http(process.env.FILECOIN_RPC_URL) : http();
  logInfo("filecoin-api", "synapse upload init", {
    network: process.env.FILECOIN_NETWORK || "calibration",
    rpcUrl: process.env.FILECOIN_RPC_URL || "(default)",
    payer: account.address,
    withCDN: process.env.FILECOIN_WITH_CDN === "true"
  });

  const synapse = Synapse.create({
    account,
    chain,
    transport,
    withCDN: process.env.FILECOIN_WITH_CDN === "true"
  });

  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  logInfo("filecoin-api", "synapse upload payload", {
    bytes: bytes.length,
    payload
  });
  const result = await synapse.storage.upload(bytes, {
    pieceMetadata: {
      app: "shieldbet",
      schema: "shieldbet.filecoin.v1",
      uploadedAt: new Date().toISOString()
    }
  });
  logInfo("filecoin-api", "synapse upload complete", {
    pieceCid: result.pieceCid.toString()
  });

  return result.pieceCid.toString();
}

export async function POST(request: NextRequest) {
  let body: UploadRequestBody;

  try {
    body = (await request.json()) as UploadRequestBody;
    logInfo("filecoin-api", "incoming upload request", body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!body?.kind || !body?.payload || (body.kind !== "market-metadata" && body.kind !== "market-resolution")) {
    return NextResponse.json({ error: "Missing or invalid upload payload" }, { status: 400 });
  }

  const uploadEnvelope = {
    version: 1,
    kind: body.kind,
    uploadedAt: new Date().toISOString(),
    payload: body.payload
  };

  const mode = process.env.FILECOIN_UPLOAD_MODE || "synapse";
  if (mode === "mock") {
    const cid = deterministicMockCid(uploadEnvelope);
    logInfo("filecoin-api", "mock upload response", {
      cid,
      kind: body.kind
    });
    return NextResponse.json({
      cid,
      kind: body.kind,
      provider: "mock",
      network: process.env.FILECOIN_NETWORK || "calibration"
    });
  }

  try {
    const cid = await uploadWithSynapse(uploadEnvelope);
    logInfo("filecoin-api", "synapse upload response", {
      cid,
      kind: body.kind
    });
    return NextResponse.json({
      cid,
      kind: body.kind,
      provider: "synapse",
      network: process.env.FILECOIN_NETWORK || "calibration"
    });
  } catch (error) {
    const friendlyError = normalizeFilecoinCommitError(error);
    logError("filecoin-api", "upload failed", {
      rawError: error instanceof Error ? error.message : String(error),
      friendlyError
    });
    return NextResponse.json(
      {
        error: friendlyError || "Filecoin upload failed"
      },
      { status: 500 }
    );
  }
}
