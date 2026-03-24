"use client";

import { createAuthManager } from "@lit-protocol/auth/src/lib/AuthManager/auth-manager";
import { localStorage } from "@lit-protocol/auth/src/lib/storage/localStorage";
import { createLitClient } from "@lit-protocol/lit-client";
import { naga, nagaDev, nagaLocal, nagaMainnet, nagaProto, nagaStaging, nagaTest } from "@lit-protocol/networks";
import type { WalletClient } from "viem";

export interface LitClaimExecutionParams {
  actionCid: string;
  marketId: string;
  account: `0x${string}`;
  resolvedOutcome: string;
  expectedPayoutWei: string;
  txHash?: string;
  walletClient: WalletClient;
}

export interface LitClaimAttestation {
  eligible: boolean;
  account: string;
  marketId: string;
  resolvedOutcome: string;
  expectedPayoutWei: string;
  txHash?: string;
  verifier: "lit-action";
  actionCid: string;
  network: string;
  issuedAt: string;
  checks: string[];
}

export interface LitClaimExecutionResult {
  actionCid: string;
  response: unknown;
  logs: string;
  attestation: LitClaimAttestation;
}

type LitNetworkName =
  | "naga"
  | "naga-mainnet"
  | "naga-test"
  | "naga-dev"
  | "naga-local"
  | "naga-staging"
  | "naga-proto"
  | "datil";

const DEFAULT_LIT_NETWORK: LitNetworkName = "naga-test";
const DEFAULT_LIT_CONNECT_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_LIT_CONNECT_TIMEOUT_MS || 45000);
const RETRY_LIT_CONNECT_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_LIT_CONNECT_TIMEOUT_RETRY_MS || 70000);

export class LitHandshakeTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LitHandshakeTimeoutError";
  }
}

function resolveLitNetworkConfig() {
  const requested = (process.env.NEXT_PUBLIC_LIT_NETWORK || DEFAULT_LIT_NETWORK).toLowerCase() as LitNetworkName;

  switch (requested) {
    case "naga":
      return { network: naga, name: "naga" };
    case "naga-mainnet":
      return { network: nagaMainnet, name: "naga-mainnet" };
    case "naga-dev":
      return { network: nagaDev, name: "naga-dev" };
    case "naga-local":
      return { network: nagaLocal, name: "naga-local" };
    case "naga-staging":
      return { network: nagaStaging, name: "naga-staging" };
    case "naga-proto":
      return { network: nagaProto, name: "naga-proto" };
    case "datil":
      // Backward-compatible alias used in older env files.
      return { network: nagaTest, name: "naga-test" };
    case "naga-test":
    default:
      return { network: nagaTest, name: "naga-test" };
  }
}

function normalizeLitLogs(logs: unknown): string {
  if (typeof logs === "string") return logs;
  if (Array.isArray(logs)) {
    return logs
      .map((entry) => {
        if (typeof entry === "string") return entry;
        try {
          return JSON.stringify(entry);
        } catch {
          return String(entry);
        }
      })
      .join("\n");
  }
  if (logs == null) return "";
  try {
    return JSON.stringify(logs);
  } catch {
    return String(logs);
  }
}

function normalizeAttestationValue(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") return String(value);
  return undefined;
}

function normalizeChecks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function isHandshakeTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Could not handshake with nodes after timeout");
}

function createNetworkWithTimeout(timeoutMs: number) {
  const resolved = resolveLitNetworkConfig();
  return {
    ...resolved,
    network: {
      ...resolved.network,
      config: {
        ...resolved.network.config,
        abortTimeout: timeoutMs
      }
    }
  };
}

function buildLitAttestation(params: LitClaimExecutionParams, response: unknown): LitClaimAttestation {
  const defaultChecks = [
    "wallet matches claim request",
    "market id matches claim request",
    "resolved outcome matches current market",
    "expected payout matches current claim quote"
  ];

  if (typeof response === "boolean") {
    if (!response) {
      throw new Error("Lit Action marked this claim as ineligible.");
    }

    return {
      eligible: true,
      account: params.account,
      marketId: params.marketId,
      resolvedOutcome: params.resolvedOutcome,
      expectedPayoutWei: params.expectedPayoutWei,
      txHash: params.txHash,
      verifier: "lit-action",
      actionCid: params.actionCid,
      network: resolveLitNetworkConfig().name,
      issuedAt: new Date().toISOString(),
      checks: defaultChecks
    };
  }

  if (!response || typeof response !== "object") {
    throw new Error("Lit Action returned no usable attestation payload.");
  }

  const root = response as Record<string, unknown>;
  const record =
    root.attestation && typeof root.attestation === "object" ? (root.attestation as Record<string, unknown>) : root;
  const eligibleFlag = record.eligible ?? record.ok ?? record.allowed ?? record.approved;
  if (eligibleFlag === false) {
    throw new Error("Lit Action rejected this claim.");
  }

  const attestedAccount = normalizeAttestationValue(record.account) || params.account;
  const attestedMarketId = normalizeAttestationValue(record.marketId) || params.marketId;
  const attestedOutcome = normalizeAttestationValue(record.resolvedOutcome) || params.resolvedOutcome;
  const attestedPayout = normalizeAttestationValue(record.expectedPayoutWei) || params.expectedPayoutWei;
  const attestedTxHash = normalizeAttestationValue(record.txHash) || params.txHash;

  if (attestedAccount.toLowerCase() !== params.account.toLowerCase()) {
    throw new Error("Lit attestation account does not match the connected wallet.");
  }

  if (attestedMarketId !== params.marketId) {
    throw new Error("Lit attestation marketId does not match this claim.");
  }

  if (attestedOutcome !== params.resolvedOutcome) {
    throw new Error("Lit attestation resolved outcome does not match the market outcome.");
  }

  if (attestedPayout !== params.expectedPayoutWei) {
    throw new Error("Lit attestation expected payout does not match the claim quote.");
  }

  if (params.txHash && attestedTxHash && attestedTxHash !== params.txHash) {
    throw new Error("Lit attestation txHash does not match this claim transaction.");
  }

  const issuedAt = normalizeAttestationValue(record.issuedAt) || new Date().toISOString();
  const network = normalizeAttestationValue(record.network) || resolveLitNetworkConfig().name;
  const checks = normalizeChecks(record.checks);

  return {
    eligible: true,
    account: attestedAccount,
    marketId: attestedMarketId,
    resolvedOutcome: attestedOutcome,
    expectedPayoutWei: attestedPayout,
    txHash: attestedTxHash,
    verifier: "lit-action",
    actionCid: params.actionCid,
    network,
    issuedAt,
    checks: checks.length ? checks : defaultChecks
  };
}

export async function runLitClaimAction(params: LitClaimExecutionParams): Promise<LitClaimExecutionResult> {
  if (!params.walletClient.account?.address) {
    throw new Error("Wallet client is not connected");
  }

  async function executeWithTimeout(timeoutMs: number) {
    const networkConfig = createNetworkWithTimeout(timeoutMs);
    const litClient = await createLitClient({
      network: networkConfig.network
    });

    try {
      const authManager = createAuthManager({
        storage: localStorage({
          appName: "shieldbet",
          networkName: networkConfig.name
        })
      });

      const authContext = await authManager.createEoaAuthContext({
        litClient,
        config: {
          account: params.walletClient
        },
        authConfig: {
          domain: typeof window !== "undefined" ? window.location.host : "shieldbet.app",
          statement: "Authorize ShieldBet confidential claim verification.",
          expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
          resources: [
            {
              ability: "lit-action-execution",
              resource: params.actionCid
            }
          ]
        }
      });

      const execution = await litClient.executeJs({
        ipfsId: params.actionCid,
        authContext,
        jsParams: {
          marketId: params.marketId,
          account: params.account,
          resolvedOutcome: params.resolvedOutcome,
          expectedPayoutWei: params.expectedPayoutWei,
          txHash: params.txHash || ""
        }
      });

      const attestation = buildLitAttestation(params, execution?.response);

      return {
        actionCid: params.actionCid,
        response: execution?.response ?? null,
        logs: normalizeLitLogs(execution?.logs),
        attestation
      };
    } finally {
      litClient.disconnect();
    }
  }

  try {
    return await executeWithTimeout(DEFAULT_LIT_CONNECT_TIMEOUT_MS);
  } catch (error) {
    if (!isHandshakeTimeoutError(error)) {
      throw error;
    }

    try {
      return await executeWithTimeout(RETRY_LIT_CONNECT_TIMEOUT_MS);
    } catch (retryError) {
      if (isHandshakeTimeoutError(retryError)) {
        throw new LitHandshakeTimeoutError(
          "Lit verification timed out while contacting Naga nodes. We retried with a longer timeout, but the network is still unavailable."
        );
      }
      throw retryError;
    }
  }
}
