"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Clock3, ExternalLink, EyeOff, FileText, Wallet } from "lucide-react";
import { formatEther, getAddress, isAddress, parseEther } from "viem";
import { useAccount, useBalance, usePublicClient, useReadContract, useWaitForTransactionReceipt, useWalletClient, useWriteContract } from "wagmi";
import { BetPlacement } from "@/components/bet-placement";
import { ClaimConfirmation, ClaimFlow } from "@/components/claim-flow";
import { EncryptedActivity } from "@/components/encrypted-activity";
import { EncryptedBands } from "@/components/encrypted-bands";
import { RuntimeAlerts } from "@/components/runtime-alerts";
import { BetOutcome, encryptBetInputs } from "@/lib/encryption";
import { cidToExplorer, formatDeadline, getCountdown } from "@/lib/format";
import { shieldBetConfig } from "@/lib/contract";
import { decodeMarketDetails, decodeMarketView } from "@/lib/market-contract";
import { getEncryptedBandCount, inferCategory, getMarketStatus } from "@/lib/market-ui";
import { getLocalBet, saveLocalBet } from "@/lib/local-bets";
import { getRuntimeDiagnostics } from "@/lib/runtime-config";
import { logError, logInfo } from "@/lib/telemetry";

export default function MarketBetPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const marketId = useMemo(() => BigInt(params.id), [params.id]);

  const initialSide = searchParams.get("side")?.toLowerCase();

  const [selectedOutcome, setSelectedOutcome] = useState<BetOutcome>(initialSide === "no" ? 2 : 1);
  const [amount, setAmount] = useState("0.10");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);

  const [adminResolveOutcome, setAdminResolveOutcome] = useState<BetOutcome>(1);
  const [adminWinner, setAdminWinner] = useState("");
  const [adminPayout, setAdminPayout] = useState("0.0");
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  const [localPosition, setLocalPosition] = useState<"YES" | "NO" | "Encrypted">("Encrypted");

  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { data: balance } = useBalance({ address });
  const litActionCid = process.env.NEXT_PUBLIC_LIT_ACTION_CID;
  const expectedChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);

  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const { data: marketData } = useReadContract({
    ...shieldBetConfig,
    functionName: "markets",
    args: [marketId]
  });

  const { data: ownerAddress } = useReadContract({
    ...shieldBetConfig,
    functionName: "owner"
  });

  const { data: metadataCid } = useReadContract({
    ...shieldBetConfig,
    functionName: "marketMetadataCID",
    args: [marketId]
  });

  const { data: marketDetailsData } = useReadContract({
    ...shieldBetConfig,
    functionName: "getMarketDetails",
    args: [marketId]
  });

  const { data: resolutionCid } = useReadContract({
    ...shieldBetConfig,
    functionName: "marketResolutionCID",
    args: [marketId]
  });

  const { data: hasPosition } = useReadContract({
    ...shieldBetConfig,
    functionName: "hasPosition",
    args: [marketId, address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: Boolean(address)
    }
  });

  const { data: claimQuote } = useReadContract({
    ...shieldBetConfig,
    functionName: "getClaimQuote",
    args: [marketId, address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: Boolean(address && decodeMarketView(marketData)?.resolved)
    }
  });

  useEffect(() => {
    logInfo("market-detail", "read market core", {
      marketId: marketId.toString(),
      contract: shieldBetConfig.address,
      marketData: marketData || null
    });
  }, [marketData, marketId]);

  useEffect(() => {
    logInfo("market-detail", "read market cids", {
      marketId: marketId.toString(),
      metadataCid: metadataCid || "",
      resolutionCid: resolutionCid || ""
    });
  }, [marketId, metadataCid, resolutionCid]);

  useEffect(() => {
    logInfo("market-detail", "read position and claim quote", {
      marketId: marketId.toString(),
      account: address || "",
      hasPosition: Boolean(hasPosition),
      claimQuote: claimQuote
        ? {
            payout: claimQuote[0].toString(),
            eligible: claimQuote[1]
          }
        : null
    });
  }, [marketId, address, hasPosition, claimQuote]);

  useEffect(() => {
    const bet = getLocalBet(marketId, address);
    if (!bet) {
      setLocalPosition("Encrypted");
      return;
    }

    setLocalPosition(bet.position);
  }, [marketId, address, hash]);

  if (!marketData) {
    return <p className="subtle">Loading market...</p>;
  }

  const parsedMarket = decodeMarketView(marketData);
  if (!parsedMarket) {
    return <p className="text-sm text-rose-500">Unable to decode market payload. Check contract ABI/config.</p>;
  }
  const parsedDetails = decodeMarketDetails(marketDetailsData);

  const question = parsedMarket.question;
  const deadline = parsedMarket.deadline;
  const outcome = parsedMarket.outcome;
  const resolved = parsedMarket.resolved;
  const creator = parsedMarket.creator;

  const diagnostics = getRuntimeDiagnostics();
  const hasBlockingDiagnostics = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const isOwner = Boolean(address && ownerAddress && address.toLowerCase() === ownerAddress.toLowerCase());
  const marketStatus = getMarketStatus(deadline, resolved);
  const category = parsedDetails?.category.trim() || inferCategory(question);

  const alreadyBet = Boolean(hasPosition);
  const claimPayout = claimQuote?.[0] || 0n;
  const eligibleToClaim = claimQuote?.[1] || false;

  const encryptedVolumeBands = getEncryptedBandCount(marketId, 6, 10);
  const participantBands = getEncryptedBandCount(marketId + 11n, 3, 8);

  function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const maybe = error as Error & {
        shortMessage?: string;
        details?: string;
        cause?: unknown;
      };
      if (maybe.shortMessage) return maybe.shortMessage;
      if (maybe.details) return maybe.details;
      if (maybe.cause instanceof Error) return maybe.cause.message;
      return maybe.message;
    }

    return String(error);
  }

  async function placeBet() {
    if (!address) {
      setStatusMessage("Connect your wallet first.");
      return;
    }
    if (hasBlockingDiagnostics) {
      setStatusMessage("Resolve the configuration errors shown above before placing a bet.");
      return;
    }
    if (chainId !== expectedChainId) {
      setStatusMessage(`Wrong network. Switch wallet to chain ID ${expectedChainId}.`);
      return;
    }

    try {
      setStatusMessage(null);

      const amountWei = parseEther(amount);
      logInfo("market-detail", "placeBet encrypt request", {
        marketId: marketId.toString(),
        account: address,
        selectedOutcome,
        amountWei: amountWei.toString()
      });
      const encrypted = await encryptBetInputs(selectedOutcome, amountWei, {
        contractAddress: shieldBetConfig.address,
        userAddress: getAddress(address)
      });
      logInfo("market-detail", "placeBet encrypted payload", {
        marketId: marketId.toString(),
        encOutcome: encrypted.encOutcome,
        encAmount: encrypted.encAmount,
        inputProof: encrypted.inputProof
      });

      await writeContractAsync({
        ...shieldBetConfig,
        functionName: "placeBet",
        args: [marketId, encrypted.encOutcome, encrypted.encAmount, encrypted.inputProof],
        value: amountWei
      });
      logInfo("market-detail", "placeBet tx submitted", {
        marketId: marketId.toString(),
        account: address
      });

      saveLocalBet({
        marketId: marketId.toString(),
        wallet: getAddress(address),
        position: selectedOutcome === 1 ? "YES" : "NO",
        amountWei: amountWei.toString(),
        createdAt: Date.now()
      });

      setLocalPosition(selectedOutcome === 1 ? "YES" : "NO");
      setStatusMessage("Bet placed confidentially. Your position is now encrypted.");
    } catch (error) {
      logError("market-detail", "placeBet failed", error);
      const message = getErrorMessage(error) || "Bet transaction failed";
      setStatusMessage(message);
    }
  }

  async function executeClaim(): Promise<ClaimConfirmation> {
    if (!address) throw new Error("Connect wallet first");
    if (chainId !== expectedChainId) throw new Error(`Wrong network. Switch wallet to chain ID ${expectedChainId}.`);
    const normalizedAccount = getAddress(address);

    let litExecution:
      | {
          actionCid: string;
          response: unknown;
          logs: string;
          attestation: {
            eligible: boolean;
            account: string;
            marketId: string;
            resolvedOutcome: string;
            expectedPayoutWei: string;
            txHash?: string;
          };
        }
      | null = null;
    if (litActionCid) {
      if (!walletClient) {
        throw new Error("Wallet signer not ready for Lit action execution");
      }

      setStatusMessage("Running Lit Action eligibility check...");
      const { runLitClaimAction } = await import("@/lib/lit");
      logInfo("market-detail", "claim lit action start", {
          marketId: marketId.toString(),
          account: normalizedAccount,
          actionCid: litActionCid,
          resolvedOutcome: outcome.toString(),
          expectedPayoutWei: claimPayout.toString()
        });
      litExecution = await runLitClaimAction({
        actionCid: litActionCid,
        marketId: marketId.toString(),
        account: normalizedAccount,
        resolvedOutcome: outcome.toString(),
        expectedPayoutWei: claimPayout.toString(),
        walletClient
      });
      logInfo("market-detail", "claim lit action complete", {
        marketId: marketId.toString(),
        actionCid: litExecution.actionCid,
        litAttestation: litExecution.attestation,
        litLogs: litExecution.logs
      });
    }

    logInfo("market-detail", "claim submit tx", {
      marketId: marketId.toString(),
      account: normalizedAccount
    });
    const txHash = await writeContractAsync({
      ...shieldBetConfig,
      functionName: "claimWinnings",
      args: [marketId]
    });
    logInfo("market-detail", "claim tx submitted", { txHash });

    const receipt = await publicClient?.waitForTransactionReceipt({ hash: txHash });
    if (!receipt || receipt.status !== "success") {
      throw new Error("Claim transaction failed or was not confirmed");
    }
    logInfo("market-detail", "claim tx confirmed", {
      txHash,
      status: receipt.status,
      logsCount: receipt.logs.length
    });

    logInfo("market-detail", "claim verification request", {
      marketId: marketId.toString(),
      account: normalizedAccount,
      txHash,
      expectedPayoutWei: claimPayout.toString(),
      litActionCid: litExecution?.actionCid || ""
    });
    const verifyResponse = await fetch("/api/lit/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        marketId: marketId.toString(),
        account: normalizedAccount,
        txHash,
        expectedPayoutWei: claimPayout.toString(),
        litActionCid: litExecution?.actionCid || "",
        resolvedOutcome: outcome.toString(),
        litResponse: litExecution?.response ?? null,
        litLogs: litExecution?.logs || ""
      })
    });

    const verifyBody = (await verifyResponse.json()) as
      | ({ error?: string } & ClaimConfirmation)
      | { error?: string };

    if (!verifyResponse.ok) {
      throw new Error(verifyBody.error || "Claim verification failed");
    }
    if (!("txHash" in verifyBody) || !("plaintextPayoutWei" in verifyBody) || !("mode" in verifyBody)) {
      throw new Error("Claim verification response was incomplete");
    }
    logInfo("market-detail", "claim verification response", verifyBody);

    setStatusMessage(verifyBody.mode === "lit" ? "Claim verified with Lit and submitted." : "Claim verified on-chain and submitted.");
    return verifyBody;
  }

  async function resolveMarket() {
    try {
      if (chainId !== expectedChainId) {
        throw new Error(`Wrong network. Switch wallet to chain ID ${expectedChainId}.`);
      }
      setAdminMessage(null);
      setAdminMessage("Submitting market resolution...");
      logInfo("market-detail", "resolve submit tx", {
        marketId: marketId.toString(),
        outcome: adminResolveOutcome
      });
      const resolveHash = await writeContractAsync({
        ...shieldBetConfig,
        functionName: "resolveMarket",
        args: [marketId, adminResolveOutcome]
      });
      logInfo("market-detail", "resolve tx submitted", { resolveHash });

      const resolveReceipt = await publicClient?.waitForTransactionReceipt({ hash: resolveHash });
      if (!resolveReceipt || resolveReceipt.status !== "success") {
        throw new Error("Resolution transaction failed");
      }
      logInfo("market-detail", "resolve tx confirmed", {
        resolveHash,
        status: resolveReceipt.status
      });

      setAdminMessage("Market resolved on-chain.");
    } catch (error) {
      logError("market-detail", "resolve flow failed", error);
      const message = error instanceof Error ? error.message : "Failed to resolve market";
      setAdminMessage(message);
    }
  }

  async function assignPayout() {
    if (!isAddress(adminWinner)) {
      setAdminMessage("Winner address is invalid.");
      return;
    }

    try {
      if (chainId !== expectedChainId) {
        throw new Error(`Wrong network. Switch wallet to chain ID ${expectedChainId}.`);
      }
      setAdminMessage(null);
      const payoutWei = parseEther(adminPayout || "0");
      logInfo("market-detail", "assign payout submit tx", {
        marketId: marketId.toString(),
        winner: getAddress(adminWinner),
        payoutWei: payoutWei.toString()
      });

      await writeContractAsync({
        ...shieldBetConfig,
        functionName: "assignWinnerPayout",
        args: [marketId, getAddress(adminWinner), payoutWei]
      });
      logInfo("market-detail", "assign payout tx submitted", {
        marketId: marketId.toString()
      });
      setAdminMessage("Payout assignment transaction sent.");
    } catch (error) {
      logError("market-detail", "assign payout failed", error);
      const message = error instanceof Error ? error.message : "Failed to assign payout";
      setAdminMessage(message);
    }
  }

  return (
    <section className="space-y-5">
      <RuntimeAlerts diagnostics={diagnostics} />

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/markets" className="underline underline-offset-2">
          Markets
        </Link>
        <span>&gt;</span>
        <span>{category}</span>
        <span>&gt;</span>
        <span className="line-clamp-1 max-w-md">{question}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <div className="surface p-5 md:p-6">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">{question}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                {marketStatus}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <Clock3 className="mr-1 inline h-3 w-3" /> {formatDeadline(deadline)}
              </span>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              <p>
                <span className="font-medium">Closes:</span> {formatDeadline(deadline)} ({getCountdown(deadline)})
              </p>
              <p>
                <span className="font-medium">Created by:</span> <span className="font-mono-ui">{creator}</span>
              </p>
              <details className="surface-muted mt-2 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-slate-100">Resolution criteria</summary>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {parsedDetails?.resolutionCriteria.trim() || "No explicit resolution criteria has been stored for this market yet."}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Resolution source: {parsedDetails?.resolutionSource.trim() || "contract owner transaction"}
                </p>
              </details>
            </div>
          </div>

          {!resolved ? (
            <BetPlacement
              selectedOutcome={selectedOutcome}
              amount={amount}
              balanceLabel={balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : "Wallet not connected"}
              alreadyBet={alreadyBet}
              isSubmitting={isPending || isConfirming}
              onSelectOutcome={setSelectedOutcome}
              onAmountChange={setAmount}
              onMax={() => {
                if (!balance) return;
                setAmount((Number(balance.formatted) * 0.98).toFixed(4));
              }}
              onSubmit={placeBet}
            />
          ) : (
            <div className="surface p-5">
              <h2 className="section-title">Market resolved: {outcome === 1 ? "YES" : "NO"}</h2>
              <p className="subtle mt-2">Use Lit Protocol claim flow to reveal and withdraw your winnings.</p>
              <button
                type="button"
                disabled={!eligibleToClaim || isPending || isConfirming}
                onClick={() => setClaimOpen(true)}
                className="mt-4 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {eligibleToClaim ? "Claim Winnings" : "Claim unavailable"}
              </button>
            </div>
          )}

          {statusMessage && <p className="text-sm text-slate-600 dark:text-slate-300">{statusMessage}</p>}

          {isOwner && (
            <div className="surface space-y-3 p-5">
              <h2 className="section-title">Admin Controls</h2>
              {!resolved ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdminResolveOutcome(1)}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                        adminResolveOutcome === 1 ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-900"
                      }`}
                    >
                      Resolve YES
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminResolveOutcome(2)}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                        adminResolveOutcome === 2 ? "bg-rose-500 text-white" : "bg-slate-100 dark:bg-slate-900"
                      }`}
                    >
                      Resolve NO
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={resolveMarket}
                    className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Resolve market
                  </button>
                </>
              ) : (
                <>
                  <label className="text-sm font-medium">Winner Address</label>
                  <input
                    value={adminWinner}
                    onChange={(event) => setAdminWinner(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500/40 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                    placeholder="0x..."
                  />
                  <label className="text-sm font-medium">Payout (ETH)</label>
                  <input
                    value={adminPayout}
                    onChange={(event) => setAdminPayout(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500/40 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                    placeholder="0.0"
                  />
                  <button
                    type="button"
                    onClick={assignPayout}
                    className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Assign winner payout
                  </button>
                </>
              )}
              {adminMessage && <p className="text-sm text-slate-600 dark:text-slate-300">{adminMessage}</p>}
            </div>
          )}
        </div>

        <aside className="space-y-5 lg:col-span-2">
          <div className="surface p-4">
            <h3 className="section-title text-base">Market Stats (Privacy Mode)</h3>
            <div className="mt-3 space-y-3 text-sm">
              <div className="surface-muted flex items-center justify-between px-3 py-2">
                <span>Activity visibility</span>
                <span className="flex items-center gap-2 font-mono-ui">
                  <EncryptedBands count={encryptedVolumeBands} /> ETH
                </span>
              </div>
              <div className="surface-muted flex items-center justify-between px-3 py-2">
                <span>Participation visibility</span>
                <span className="flex items-center gap-2 font-mono-ui">
                  <EncryptedBands count={participantBands} />
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                v1 shows confidentiality bands, not exact public totals or participant counts.
              </p>
            </div>
          </div>

          <div className="surface p-4">
            <h3 className="section-title text-base">Your Position</h3>
            {address && alreadyBet ? (
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-slate-700 dark:text-slate-300">You have an encrypted position in this market.</p>
                <p>
                  Outcome: <span className="font-semibold">{localPosition}</span>
                </p>
                <p className="flex items-center gap-2">
                  Amount: <EyeOff className="h-4 w-4 text-indigo-500" /> ●●●●●● (encrypted)
                </p>
                <button
                  type="button"
                  disabled={!resolved || !eligibleToClaim}
                  onClick={() => setClaimOpen(true)}
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Claim available after resolution
                </button>
              </div>
            ) : (
              <p className="subtle mt-3">Connect your wallet and place a confidential bet to track your position.</p>
            )}
          </div>

          <EncryptedActivity marketId={marketId} />

          <div className="surface p-4">
            <h3 className="section-title text-base">Audit Trail</h3>
            <div className="mt-3 space-y-2 text-sm">
              {metadataCid ? (
                <a
                  href={cidToExplorer(String(metadataCid))}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 underline underline-offset-2 dark:text-indigo-300"
                >
                  <FileText className="h-4 w-4" /> Market metadata CID <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="subtle">Market CID pending</p>
              )}
              {resolutionCid ? (
                <a
                  href={cidToExplorer(String(resolutionCid))}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 underline underline-offset-2 dark:text-indigo-300"
                >
                  <Wallet className="h-4 w-4" /> Resolution CID <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="subtle">Resolution CID pending</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <ClaimFlow open={claimOpen} onClose={() => setClaimOpen(false)} payoutWei={claimPayout} onConfirmClaim={executeClaim} />
    </section>
  );
}
