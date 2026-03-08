import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, decodeEventLog, getAddress, http, isAddress, parseAbiItem } from "viem";
import { logError, logInfo } from "@/lib/telemetry";

interface ClaimRequest {
  marketId: string;
  account: string;
  txHash: string;
  expectedPayoutWei: string;
  litActionCid?: string;
  litResponse?: unknown;
  litLogs?: string;
}

export const runtime = "nodejs";

const winningsClaimedEvent = parseAbiItem(
  "event WinningsClaimed(uint256 indexed marketId, address indexed winner, uint256 payoutAmount)"
);

function getRpcUrl() {
  return process.env.NEXT_PUBLIC_CHAIN_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<ClaimRequest>;
  logInfo("claim-api", "incoming verify request", body);

  if (!body.marketId || !body.account || !body.txHash) {
    return NextResponse.json({ error: "Missing claim payload fields" }, { status: 400 });
  }

  if (!isAddress(body.account)) {
    return NextResponse.json({ error: "Invalid account address" }, { status: 400 });
  }

  let expectedMarketId: bigint;
  let expectedPayoutWei: bigint;
  try {
    expectedMarketId = BigInt(body.marketId);
    expectedPayoutWei = body.expectedPayoutWei ? BigInt(body.expectedPayoutWei) : 0n;
  } catch {
    return NextResponse.json({ error: "Invalid numeric claim payload values" }, { status: 400 });
  }

  const normalizedAccount = getAddress(body.account);

  const publicClient = createPublicClient({
    transport: http(getRpcUrl())
  });
  logInfo("claim-api", "client configured", {
    rpcUrl: getRpcUrl()
  });

  let receipt;
  try {
    receipt = await publicClient.getTransactionReceipt({
      hash: body.txHash as `0x${string}`
    });
    logInfo("claim-api", "tx receipt loaded", {
      txHash: body.txHash,
      status: receipt.status,
      logsCount: receipt.logs.length
    });
  } catch {
    logError("claim-api", "failed fetching receipt", {
      txHash: body.txHash
    });
    return NextResponse.json({ error: "Unable to fetch claim transaction receipt" }, { status: 400 });
  }

  if (receipt.status !== "success") {
    return NextResponse.json({ error: "Claim transaction reverted" }, { status: 400 });
  }

  let claimedPayout = 0n;
  let matchedClaim = false;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: [winningsClaimedEvent],
        data: log.data,
        topics: log.topics
      });

      const marketId = decoded.args.marketId as bigint;
      const winner = getAddress(String(decoded.args.winner));
      const payout = decoded.args.payoutAmount as bigint;

      if (marketId === expectedMarketId && winner === normalizedAccount) {
        claimedPayout = payout;
        matchedClaim = true;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!matchedClaim) {
    logError("claim-api", "no matching claim event", {
      txHash: body.txHash,
      expectedMarketId: expectedMarketId.toString(),
      expectedAccount: normalizedAccount
    });
    return NextResponse.json({ error: "No matching WinningsClaimed event found in receipt" }, { status: 400 });
  }

  if (expectedPayoutWei > 0n && claimedPayout !== expectedPayoutWei) {
    logError("claim-api", "claim payout mismatch", {
      txHash: body.txHash,
      expectedPayoutWei: expectedPayoutWei.toString(),
      claimedPayoutWei: claimedPayout.toString()
    });
    return NextResponse.json({
      error: `Claim payout mismatch: expected ${expectedPayoutWei.toString()} got ${claimedPayout.toString()}`
    }, { status: 409 });
  }

  const hasLitProof = Boolean(body.litActionCid && body.litResponse);

  const response = {
    mode: hasLitProof ? "lit" : "verify",
    txHash: body.txHash,
    actionCid: hasLitProof ? body.litActionCid : undefined,
    plaintextPayoutWei: claimedPayout.toString(),
    litResponse: hasLitProof ? body.litResponse : undefined,
    litLogs: hasLitProof ? body.litLogs || "" : undefined
  };
  logInfo("claim-api", "verify response", response);
  return NextResponse.json(response);
}
