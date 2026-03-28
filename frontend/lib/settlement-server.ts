import { createPublicClient, decodeEventLog, getAddress, http, isAddress, parseAbiItem } from "viem";
import { shieldBetAbi } from "@/lib/abi";
import { shieldBetConfig } from "@/lib/contract";
import { publicDecryptHandles } from "@/lib/fhevm-server";
import { logError, logInfo } from "@/lib/telemetry";

const betPlacedEvent = parseAbiItem(
  "event BetPlaced(uint256 indexed marketId, address indexed bettor, bytes32 encOutcomeHandle, uint256 stakeAmountWei)"
);
const MAX_LOG_BLOCK_RANGE = 45_000n;
const DEFAULT_EVENT_SCAN_LOOKBACK = 100_000n;

export interface ParticipantPlan {
  bettor: `0x${string}`;
  outcome: "YES" | "NO";
  amountWei: string;
  isWinner: boolean;
  projectedPayoutWei: string;
  assignedPayoutWei: string;
  hasClaimed: boolean;
}

export interface SettlementPlanView {
  marketId: string;
  resolvedOutcome: "YES" | "NO";
  totalPoolWei: string;
  marketPoolBalanceWei: string;
  reservedPayoutBalanceWei: string;
  feeBasisPoints: string;
  feeWei: string;
  distributablePoolWei: string;
  totalWinningSideWei: string;
  participants: ParticipantPlan[];
}

export interface ClaimPreview {
  marketId: string;
  account: `0x${string}`;
  eligible: boolean;
  mode: "refund" | "signed-winner" | "legacy-assigned" | "none";
  expectedPayoutWei: string;
  totalWinningSideWei: string;
  resolvedOutcome: string;
  checks: string[];
  reason?: string;
  settlementOpened?: boolean;
  legacyAssigned?: boolean;
}

export class SettlementPlanUnavailableError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, status = 409, details?: Record<string, unknown>) {
    super(message);
    this.name = "SettlementPlanUnavailableError";
    this.status = status;
    this.details = details;
  }
}

function getRpcUrl() {
  return process.env.NEXT_PUBLIC_CHAIN_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
}

function createShieldBetPublicClient() {
  return createPublicClient({
    transport: http(getRpcUrl())
  });
}

async function getBetPlacedLogs(publicClient: ReturnType<typeof createShieldBetPublicClient>, marketId: bigint) {
  const latestBlock = await publicClient.getBlockNumber();
  const configuredStartBlock = process.env.SHIELDBET_EVENT_SCAN_FROM_BLOCK;
  let scanStartBlock = 0n;
  if (configuredStartBlock) {
    scanStartBlock = BigInt(configuredStartBlock);
  } else if (latestBlock > DEFAULT_EVENT_SCAN_LOOKBACK) {
    scanStartBlock = latestBlock - DEFAULT_EVENT_SCAN_LOOKBACK;
  }

  const logs: Awaited<ReturnType<typeof publicClient.getLogs>> = [];

  for (let fromBlock = scanStartBlock; fromBlock <= latestBlock; fromBlock += MAX_LOG_BLOCK_RANGE + 1n) {
    const toBlock = fromBlock + MAX_LOG_BLOCK_RANGE > latestBlock ? latestBlock : fromBlock + MAX_LOG_BLOCK_RANGE;
    const chunk = await publicClient.getLogs({
      address: shieldBetConfig.address,
      event: betPlacedEvent,
      args: { marketId },
      fromBlock,
      toBlock
    });
    logs.push(...chunk);
  }

  return logs;
}

function ensureConfigured() {
  if (shieldBetConfig.address === "0x0000000000000000000000000000000000000000") {
    throw new SettlementPlanUnavailableError("NEXT_PUBLIC_SHIELDBET_ADDRESS is not configured", 500);
  }
}

export async function buildSettlementPlan(marketId: bigint): Promise<SettlementPlanView> {
  ensureConfigured();
  const publicClient = createShieldBetPublicClient();

  const [marketRecord, totalPool, marketPoolBalance, reservedPayoutBalance, feeBasisPoints, marketFeeAmount] =
    await Promise.all([
      publicClient.readContract({
        address: shieldBetConfig.address,
        abi: shieldBetAbi,
        functionName: "markets",
        args: [marketId]
      }),
      publicClient.readContract({
        address: shieldBetConfig.address,
        abi: shieldBetAbi,
        functionName: "totalPool",
        args: [marketId]
      }),
      publicClient.readContract({
        address: shieldBetConfig.address,
        abi: shieldBetAbi,
        functionName: "marketPoolBalance",
        args: [marketId]
      }),
      publicClient.readContract({
        address: shieldBetConfig.address,
        abi: shieldBetAbi,
        functionName: "reservedPayoutBalance",
        args: [marketId]
      }),
      publicClient.readContract({
        address: shieldBetConfig.address,
        abi: shieldBetAbi,
        functionName: "feeBasisPoints",
        args: [marketId]
      }),
      publicClient.readContract({
        address: shieldBetConfig.address,
        abi: shieldBetAbi,
        functionName: "marketFeeAmount",
        args: [marketId]
      })
    ]);

  const resolved = Array.isArray(marketRecord) ? Boolean(marketRecord[3]) : false;
  const outcome = Array.isArray(marketRecord) ? Number(marketRecord[2]) : 0;
  if (!resolved || (outcome !== 1 && outcome !== 2)) {
    throw new SettlementPlanUnavailableError("Market is not resolved yet", 409);
  }

  const logs = await getBetPlacedLogs(publicClient, marketId);

  const participants = logs.map((log) => {
    const decoded = decodeEventLog({
      abi: [betPlacedEvent],
      data: log.data,
      topics: log.topics
    });

    return {
      bettor: getAddress(String(decoded.args.bettor)),
      stakeAmountWei: BigInt(decoded.args.stakeAmountWei as bigint | string | number)
    };
  });

  if (!participants.length) {
    return {
      marketId: marketId.toString(),
      resolvedOutcome: outcome === 1 ? "YES" : "NO",
      totalPoolWei: totalPool.toString(),
      marketPoolBalanceWei: marketPoolBalance.toString(),
      reservedPayoutBalanceWei: reservedPayoutBalance.toString(),
      feeBasisPoints: feeBasisPoints.toString(),
      feeWei: marketFeeAmount.toString(),
      distributablePoolWei: (totalPool - marketFeeAmount).toString(),
      totalWinningSideWei: "0",
      participants: []
    };
  }

  const winnerHandleResults = await Promise.all(
    participants.map((participant) =>
      publicClient.readContract({
        address: shieldBetConfig.address,
        abi: shieldBetAbi,
        functionName: "getSettlementWinnerHandle",
        args: [marketId, participant.bettor]
      })
    )
  );

  const allHandles = winnerHandleResults as `0x${string}`[];

  let decrypted: Record<`0x${string}`, bigint | number | boolean | string>;
  try {
    decrypted = await publicDecryptHandles(allHandles);
  } catch (error) {
    logError("settlement-server", "public decrypt failed", {
      marketId: marketId.toString(),
      error: error instanceof Error ? error.message : String(error)
    });

    throw new SettlementPlanUnavailableError(
      "Settlement data is not public yet. Open settlement data from the settlement panel first.",
      409,
      {
        bettors: participants.map((participant) => participant.bettor)
      }
    );
  }

  const feeWei = marketFeeAmount > 0n ? marketFeeAmount : (totalPool * feeBasisPoints) / 10_000n;
  const distributablePoolWei = totalPool - feeWei;

  const clearParticipants = participants.map((participant, index) => {
    const winnerHandle = allHandles[index];
    const isWinner = Boolean(decrypted[winnerHandle]);
    const participantOutcome: "YES" | "NO" =
      outcome === 1 ? (isWinner ? "YES" : "NO") : isWinner ? "NO" : "YES";

    return {
      bettor: participant.bettor,
      outcome: participantOutcome,
      amountWei: participant.stakeAmountWei,
      isWinner
    };
  });

  const totalWinningSideWei = clearParticipants.reduce((sum, participant) => {
    return participant.isWinner ? sum + participant.amountWei : sum;
  }, 0n);

  const winnerContracts = clearParticipants
    .filter((participant) => participant.isWinner)
    .flatMap((participant) => [
      {
        address: shieldBetConfig.address,
        abi: shieldBetAbi,
        functionName: "claimablePayouts" as const,
        args: [marketId, participant.bettor] as const
      },
      {
        address: shieldBetConfig.address,
        abi: shieldBetAbi,
        functionName: "hasClaimed" as const,
        args: [marketId, participant.bettor] as const
      }
    ]);

    const winnerState = winnerContracts.length ? await Promise.all(winnerContracts.map((contract) => publicClient.readContract(contract))) : [];

  let winnerIdx = 0;
  const settlementParticipants: ParticipantPlan[] = clearParticipants.map((participant) => {
    let assignedPayoutWei = 0n;
    let hasClaimed = false;

    if (participant.isWinner) {
      assignedPayoutWei = winnerState[winnerIdx] as bigint;
      hasClaimed = Boolean(winnerState[winnerIdx + 1] as unknown);
      winnerIdx += 2;
    }

    const projectedPayoutWei =
      participant.isWinner && totalWinningSideWei > 0n
        ? (participant.amountWei * distributablePoolWei) / totalWinningSideWei
        : 0n;

    return {
      bettor: participant.bettor,
      outcome: participant.outcome,
      amountWei: participant.amountWei.toString(),
      isWinner: participant.isWinner,
      projectedPayoutWei: projectedPayoutWei.toString(),
      assignedPayoutWei: assignedPayoutWei.toString(),
      hasClaimed
    };
  });

    const response: SettlementPlanView = {
      marketId: marketId.toString(),
      resolvedOutcome: outcome === 1 ? "YES" : "NO",
    totalPoolWei: totalPool.toString(),
    marketPoolBalanceWei: marketPoolBalance.toString(),
    reservedPayoutBalanceWei: reservedPayoutBalance.toString(),
    feeBasisPoints: feeBasisPoints.toString(),
    feeWei: feeWei.toString(),
    distributablePoolWei: distributablePoolWei.toString(),
    totalWinningSideWei: totalWinningSideWei.toString(),
    participants: settlementParticipants
  };

  logInfo("settlement-server", "settlement plan generated", response);
  return response;
}

export async function buildClaimPreview(marketId: bigint, account: string): Promise<ClaimPreview> {
  ensureConfigured();
  if (!isAddress(account)) {
    throw new SettlementPlanUnavailableError("Invalid account address", 400);
  }

  const normalizedAccount = getAddress(account);
  const publicClient = createShieldBetPublicClient();

  const [marketRecord, stakeAmount, claimed, legacyAssignedPayout] = await Promise.all([
    publicClient.readContract({
      address: shieldBetConfig.address,
      abi: shieldBetAbi,
      functionName: "markets",
      args: [marketId]
    }),
    publicClient.readContract({
      address: shieldBetConfig.address,
      abi: shieldBetAbi,
      functionName: "stakeAmounts",
      args: [marketId, normalizedAccount]
    }),
    publicClient.readContract({
      address: shieldBetConfig.address,
      abi: shieldBetAbi,
      functionName: "hasClaimed",
      args: [marketId, normalizedAccount]
    }),
    publicClient.readContract({
      address: shieldBetConfig.address,
      abi: shieldBetAbi,
      functionName: "claimablePayouts",
      args: [marketId, normalizedAccount]
    })
  ]);

  const resolved = Array.isArray(marketRecord) ? Boolean(marketRecord[3]) : false;
  const outcome = Array.isArray(marketRecord) ? Number(marketRecord[2]) : 0;
  const stakeWei = stakeAmount as bigint;
  const hasClaimed = Boolean(claimed as unknown);
  const assignedPayoutWei = legacyAssignedPayout as bigint;

  if (!resolved) {
    return {
      marketId: marketId.toString(),
      account: normalizedAccount,
      eligible: false,
      mode: "none",
      expectedPayoutWei: "0",
      totalWinningSideWei: "0",
      resolvedOutcome: outcome.toString(),
      checks: ["market is not resolved yet"],
      reason: "Market is not resolved yet."
    };
  }

  if (hasClaimed) {
    return {
      marketId: marketId.toString(),
      account: normalizedAccount,
      eligible: false,
      mode: "none",
      expectedPayoutWei: "0",
      totalWinningSideWei: "0",
      resolvedOutcome: outcome.toString(),
      checks: ["wallet has already claimed"],
      reason: "This wallet has already claimed."
    };
  }

  if (outcome === 3) {
    return {
      marketId: marketId.toString(),
      account: normalizedAccount,
      eligible: stakeWei > 0n,
      mode: stakeWei > 0n ? "refund" : "none",
      expectedPayoutWei: stakeWei.toString(),
      totalWinningSideWei: "0",
      resolvedOutcome: outcome.toString(),
      checks: ["market finished in a cancelled state", "refund amount equals recorded stake"],
      reason: stakeWei > 0n ? "Refund is available." : "This wallet does not have a refundable stake."
    };
  }

  if (assignedPayoutWei > 0n) {
    return {
      marketId: marketId.toString(),
      account: normalizedAccount,
      eligible: true,
      mode: "legacy-assigned",
      expectedPayoutWei: assignedPayoutWei.toString(),
      totalWinningSideWei: "0",
      resolvedOutcome: outcome.toString(),
      checks: ["legacy assigned payout is present on-chain"],
      reason: "Legacy assigned payout is available.",
      legacyAssigned: true
    };
  }

  if (stakeWei == 0n) {
    return {
      marketId: marketId.toString(),
      account: normalizedAccount,
      eligible: false,
      mode: "none",
      expectedPayoutWei: "0",
      totalWinningSideWei: "0",
      resolvedOutcome: outcome.toString(),
      checks: ["wallet has no recorded stake"],
      reason: "This wallet does not have a position in the market."
    };
  }

  try {
    const settlementPlan = await buildSettlementPlan(marketId);
    const participant = settlementPlan.participants.find(
      (entry) => entry.bettor.toLowerCase() === normalizedAccount.toLowerCase()
    );

    if (!participant) {
      return {
        marketId: marketId.toString(),
        account: normalizedAccount,
        eligible: false,
        mode: "none",
        expectedPayoutWei: "0",
        totalWinningSideWei: settlementPlan.totalWinningSideWei,
        resolvedOutcome: outcome.toString(),
        checks: ["wallet position was not found in settlement data"],
        reason: "Settlement data does not include this wallet."
      };
    }

    if (!participant.isWinner) {
      return {
        marketId: marketId.toString(),
        account: normalizedAccount,
        eligible: false,
        mode: "none",
        expectedPayoutWei: "0",
        totalWinningSideWei: settlementPlan.totalWinningSideWei,
        resolvedOutcome: outcome.toString(),
        checks: ["wallet participated in the market", "wallet side did not match resolved outcome"],
        reason: "This wallet was on the losing side."
      };
    }

    return {
      marketId: marketId.toString(),
      account: normalizedAccount,
      eligible: true,
      mode: "signed-winner",
      expectedPayoutWei: participant.projectedPayoutWei,
      totalWinningSideWei: settlementPlan.totalWinningSideWei,
      resolvedOutcome: outcome.toString(),
      checks: [
        "market is resolved",
        "settlement data is public",
        "wallet side matches resolved outcome",
        "payout is computed from public stake and winning-side total"
      ],
      reason: "Winner claim is available.",
      settlementOpened: true
    };
  } catch (error) {
    if (error instanceof SettlementPlanUnavailableError) {
      return {
        marketId: marketId.toString(),
        account: normalizedAccount,
        eligible: false,
        mode: "none",
        expectedPayoutWei: "0",
        totalWinningSideWei: "0",
        resolvedOutcome: outcome.toString(),
        checks: ["market is resolved", "winner claims require public settlement data"],
        reason: error.message,
        settlementOpened: false
      };
    }

    throw error;
  }
}
