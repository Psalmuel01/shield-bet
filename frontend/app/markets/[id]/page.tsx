"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Clock3,
  ExternalLink,
  FileText,
  Wallet,
  ShieldCheck,
  AlertCircle,
  Gavel,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  History,
  Info
} from "lucide-react";
import { formatEther, getAddress, parseEther } from "viem";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWalletClient,
  useWriteContract
} from "wagmi";
import { BetPlacement } from "@/components/bet-placement";
import { ClaimFlow } from "@/components/claim-flow";
import { EncryptedActivity } from "@/components/encrypted-activity";
import { RuntimeAlerts } from "@/components/runtime-alerts";
import { encryptBetInputs, decryptUserHandles } from "@/lib/encryption";
import { cidToExplorer, formatDeadline, getCountdown } from "@/lib/format";
import { shieldBetConfig } from "@/lib/contract";
import { decodeMarketDetails, decodeMarketView } from "@/lib/market-contract";
import { getEncryptedBandCount, getMarketStatus, getMarketType } from "@/lib/market-ui";
import { getLocalBet, saveLocalBet } from "@/lib/local-bets";
import { getRuntimeDiagnostics } from "@/lib/runtime-config";
import { logError, logInfo, logWarn } from "@/lib/telemetry";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export default function MarketDetailPage() {
  const params = useParams<{ id: string }>();
  const marketId = useMemo(() => BigInt(params?.id || "0"), [params?.id]);

  const [selectedOutcome, setSelectedOutcome] = useState<number>(0);
  const [amount, setAmount] = useState("0.01");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBetting, setIsBetting] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [decryptedPosition, setDecryptedPosition] = useState<number | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { data: balance } = useBalance({ address });
  const { writeContractAsync } = useWriteContract();

  // Contract Reads
  const { data: marketData, refetch: refetchMarket } = useReadContract({
    ...shieldBetConfig,
    functionName: "markets",
    args: [marketId]
  });

  const { data: metadataCid } = useReadContract({
    ...shieldBetConfig,
    functionName: "marketMetadataCID",
    args: [marketId]
  });

  const { data: outcomeLabels } = useReadContract({
    ...shieldBetConfig,
    functionName: "getOutcomeLabels",
    args: [marketId]
  });

  const { data: outcomeTotals } = useReadContract({
    ...shieldBetConfig,
    functionName: "getOutcomeTotals",
    args: [marketId]
  });

  const { data: marketDetailsData } = useReadContract({
    ...shieldBetConfig,
    functionName: "getMarketDetails",
    args: [marketId]
  });

  const { data: marketPoolBalance } = useReadContract({
    ...shieldBetConfig,
    functionName: "marketPoolBalance",
    args: [marketId]
  });

  const { data: oracleStake } = useReadContract({
    ...shieldBetConfig,
    functionName: "ORACLE_STAKE"
  });

  const { data: hasPosition } = useReadContract({
    ...shieldBetConfig,
    functionName: "hasPosition",
    args: [marketId, address || ZERO_ADDRESS],
    query: { enabled: !!address }
  });

  const { data: myOutcomeHandle } = useReadContract({
    ...shieldBetConfig,
    functionName: "getMyOutcome",
    args: [marketId],
    query: { enabled: !!address && !!hasPosition }
  });

  const parsedMarket = useMemo(() => decodeMarketView(marketData), [marketData]);
  const parsedDetails = useMemo(() => decodeMarketDetails(marketDetailsData), [marketDetailsData]);
  const labels = useMemo(() => (outcomeLabels as string[]) || ["YES", "NO"], [outcomeLabels]);

  const status = useMemo(() => {
    if (!parsedMarket) return "Active";
    return getMarketStatus(parsedMarket.status, parsedMarket.deadline);
  }, [parsedMarket]);

  const marketType = useMemo(() => {
    if (!parsedMarket) return "Binary";
    return getMarketType(parsedMarket.marketType);
  }, [parsedMarket]);

  // Decrypt user position
  useEffect(() => {
    if (myOutcomeHandle && address && walletClient && !decryptedPosition && !isDecrypting) {
      const decrypt = async () => {
        setIsDecrypting(true);
        try {
          const result = await decryptUserHandles({
            contractAddress: shieldBetConfig.address,
            userAddress: address,
            walletClient,
            handles: [myOutcomeHandle as `0x${string}`]
          });
          const val = result[myOutcomeHandle as `0x${string}`];
          setDecryptedPosition(Number(val));
        } catch (e) {
          logError("market-detail", "decryption failed", e);
        } finally {
          setIsDecrypting(false);
        }
      };
      decrypt();
    }
  }, [myOutcomeHandle, address, walletClient, decryptedPosition, isDecrypting]);

  async function onPlaceBet() {
    if (!address) return setStatusMessage("Connect wallet first");
    setIsBetting(true);
    setStatusMessage("Encrypting position...");
    try {
      const amountWei = parseEther(amount);
      const encrypted = await encryptBetInputs(selectedOutcome, amountWei, {
        contractAddress: shieldBetConfig.address,
        userAddress: address
      });

      setStatusMessage("Confirm transaction in wallet...");
      const txHash = await writeContractAsync({
        ...shieldBetConfig,
        functionName: "placeBet",
        args: [marketId, encrypted.encOutcome, encrypted.inputProof],
        value: amountWei
      });

      setStatusMessage("Waiting for confirmation...");
      await publicClient?.waitForTransactionReceipt({ hash: txHash });
      setStatusMessage("Bet placed successfully!");
      refetchMarket();
    } catch (e) {
      logError("market-detail", "bet failed", e);
      setStatusMessage(e instanceof Error ? e.message : "Bet failed");
    } finally {
      setIsBetting(false);
    }
  }

  async function onPropose(outcomeIdx: number) {
    if (!address) return;
    setStatusMessage("Proposing outcome...");
    try {
      const txHash = await writeContractAsync({
        ...shieldBetConfig,
        functionName: "proposeOutcome",
        args: [marketId, outcomeIdx],
        value: oracleStake as bigint
      });
      await publicClient?.waitForTransactionReceipt({ hash: txHash });
      setStatusMessage("Outcome proposed!");
      refetchMarket();
    } catch (e) {
      logError("market-detail", "propose failed", e);
      setStatusMessage(e instanceof Error ? e.message : "Propose failed");
    }
  }

  async function onChallenge() {
    if (!address) return;
    setStatusMessage("Challenging outcome...");
    try {
      const txHash = await writeContractAsync({
        ...shieldBetConfig,
        functionName: "challengeOutcome",
        args: [marketId],
        value: oracleStake as bigint
      });
      await publicClient?.waitForTransactionReceipt({ hash: txHash });
      setStatusMessage("Challenge submitted!");
      refetchMarket();
    } catch (e) {
      logError("market-detail", "challenge failed", e);
      setStatusMessage(e instanceof Error ? e.message : "Challenge failed");
    }
  }

  async function onFinalize() {
    if (!address) return;
    setStatusMessage("Finalizing outcome...");
    try {
      const txHash = await writeContractAsync({
        ...shieldBetConfig,
        functionName: "finalizeOutcome",
        args: [marketId, Number(parsedMarket?.proposedOutcome || 0)]
      });
      await publicClient?.waitForTransactionReceipt({ hash: txHash });
      setStatusMessage("Market finalized!");
      refetchMarket();
    } catch (e) {
      logError("market-detail", "finalize failed", e);
      setStatusMessage(e instanceof Error ? e.message : "Finalize failed");
    }
  }

  async function onClaim() {
    if (!address) return;
    setStatusMessage("Claiming winnings...");
    try {
      const txHash = await writeContractAsync({
        ...shieldBetConfig,
        functionName: "claimWinnings",
        args: [marketId]
      });
      await publicClient?.waitForTransactionReceipt({ hash: txHash });
      setStatusMessage("Winnings claimed!");
      refetchMarket();
    } catch (e) {
      logError("market-detail", "claim failed", e);
      setStatusMessage(e instanceof Error ? e.message : "Claim failed");
    }
  }

  if (!parsedMarket) return <div className="p-12 text-center animate-pulse text-slate-500 font-bold">LOADING MARKET DATA...</div>;

  const isExpired = status === "Expired";
  const isProposed = status === "Proposed";
  const isDisputed = status === "Disputed";
  const isFinalized = status === "Finalized";
  const isActive = status === "Active";

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <Link href="/markets" className="hover:text-indigo-500 transition-colors">Markets Dashboard</Link>
        <ChevronRight className="h-3 w-3" />
        <span>{parsedDetails?.category || "General"}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-600 dark:text-slate-300">Market #{marketId.toString()}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="surface p-8 space-y-6 overflow-hidden relative">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{marketType}</span>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" :
                    isExpired ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" :
                      isFinalized ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" :
                        "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                  }`}>
                  {status}
                </span>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Clock3 className="h-3 w-3" />
                {isActive ? getCountdown(parsedMarket.deadline) : "Closed " + formatDeadline(parsedMarket.deadline)}
              </div>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl leading-tight">
              {parsedMarket.question}
            </h1>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pool Size</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{Number(formatEther(marketPoolBalance || 0n)).toFixed(4)} ETH</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Participants</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">Encrypted</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Created</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">#{marketId.toString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Creator</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white font-mono truncate max-w-[100px]">{parsedMarket.creator.slice(0, 6)}...</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Info className="h-4 w-4 text-indigo-500" />
                Resolution Criteria
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {parsedDetails?.resolutionCriteria || "The market resolves based on the criteria specified at creation time."}
              </p>
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Optimistic Oracle
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
                  <FileText className="h-3.5 w-3.5 text-indigo-500" />
                  Source: {parsedDetails?.resolutionSource || "Web"}
                </div>
              </div>
            </div>
          </div>

          {/* Oracle Dashboard */}
          {(isExpired || isProposed || isDisputed || isFinalized) && (
            <div className="bg-indigo-900 rounded-3xl p-8 text-white space-y-6 shadow-2xl shadow-indigo-900/20">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold">Optimistic Resolver</h2>
                  <p className="text-indigo-300 text-sm font-medium">Decentralized resolution monitoring</p>
                </div>
                <Gavel className="h-10 w-10 text-indigo-400/30" />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Current Phase</span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500 text-[10px] font-bold uppercase">{status}</span>
                  </div>
                  {isExpired && (
                    <div className="space-y-3">
                      <p className="text-sm text-indigo-100">Market has expired. Anyone can propose the final outcome by staking {oracleStake ? formatEther(oracleStake) : "0.01"} ETH.</p>
                      <div className="grid gap-2">
                        {labels.map((l, i) => (
                          <button key={i} onClick={() => onPropose(i)} className="w-full py-2 rounded-xl bg-white text-indigo-900 text-xs font-bold hover:bg-indigo-50 transition-colors">
                            PROPOSE "{l}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {isProposed && (
                    <div className="space-y-3">
                      <p className="text-sm text-indigo-100">
                        Proposed Outcome: <span className="font-bold">"{labels[parsedMarket.proposedOutcome]}"</span>
                      </p>
                      <div className="p-3 bg-white/10 rounded-xl space-y-1">
                        <p className="text-[10px] font-bold uppercase text-indigo-300 flex items-center gap-1.5">
                          <History className="h-3 w-3" /> Dispute window ends in
                        </p>
                        <p className="text-lg font-bold">{getCountdown(parsedMarket.disputeWindowEnd)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={onChallenge} className="flex-1 py-3 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors flex items-center justify-center gap-2">
                          <AlertCircle className="h-4 w-4" /> CHALLENGE
                        </button>
                        <button
                          onClick={onFinalize}
                          disabled={Number(parsedMarket.disputeWindowEnd) * 1000 > Date.now()}
                          className="flex-1 py-3 rounded-xl bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" /> FINALIZE
                        </button>
                      </div>
                    </div>
                  )}
                  {isDisputed && (
                    <div className="space-y-3">
                      <p className="text-sm text-indigo-100">
                        The proposed outcome was challenged. The market has been escalated for dispute resolution.
                      </p>
                      <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase italic">
                        <AlertCircle className="h-4 w-4 animate-ping" /> Escalated to DAO
                      </div>
                      <button onClick={onFinalize} className="w-full py-3 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-colors">
                        PROCESS DISPUTE RESULT
                      </button>
                    </div>
                  )}
                  {isFinalized && (
                    <div className="space-y-3">
                      <div className="p-4 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Official Result</p>
                        <p className="mt-2 text-2xl font-bold text-white">"{labels[parsedMarket.outcome]}"</p>
                      </div>
                      {hasPosition && (
                        <button onClick={onClaim} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
                          CLAIM WINNINGS
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-2">Stake Info</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-indigo-200">Proposer Stake</span>
                        <span className="font-bold">{oracleStake ? formatEther(oracleStake) : "0.01"} ETH</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-indigo-200">Success Reward</span>
                        <span className="font-bold">190% of Stake</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-indigo-200">Platform Fee</span>
                        <span className="font-bold">10%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-indigo-300/60 leading-relaxed italic">
                    Our optimistic oracle ensures honest resolution. False claims are slashed, rewarding challengers with 90% of the slashed stake.
                  </div>
                </div>
              </div>
            </div>
          )}

          <EncryptedActivity marketId={marketId} />
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {isActive ? (
            <BetPlacement
              selectedOutcome={selectedOutcome}
              outcomeLabels={labels}
              amount={amount}
              balanceLabel={balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : "Not Connected"}
              alreadyBet={!!hasPosition}
              isSubmitting={isBetting}
              submitLabel={isBetting ? "PROCESSING..." : "CONFIRM POSITION"}
              statusHint="Your position is fully encrypted on-chain. Only the stake size is visible."
              onSelectOutcome={setSelectedOutcome}
              onAmountChange={setAmount}
              onMax={() => setAmount(balance ? (Number(balance.formatted) * 0.99).toFixed(5) : "0")}
              onSubmit={onPlaceBet}
            />
          ) : (
            <div className="surface p-6 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Betting Closed</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                This market has reached its deadline and is no longer accepting new positions. Check the Oracle Resolver for the latest status.
              </p>
            </div>
          )}

          <div className="surface p-6 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Your Position</h3>
            {address ? (
              hasPosition ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10">
                    <p className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-300">Outcome</p>
                    <p className="mt-1 text-lg font-bold text-indigo-900 dark:text-white">
                      {isDecrypting ? "Decrypting..." : decryptedPosition !== null ? labels[decryptedPosition] : "Encrypted"}
                    </p>
                  </div>
                  {isFinalized && decryptedPosition !== null && (
                    <div className="p-4 rounded-2xl bg-white border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase">Result</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${decryptedPosition === parsedMarket.outcome ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {decryptedPosition === parsedMarket.outcome ? "WON" : "LOST"}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No position found for this wallet.</p>
              )
            ) : (
              <p className="text-sm text-slate-500">Connect wallet to view your encrypted positions.</p>
            )}
          </div>

          <div className="surface p-6 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Audit & Links</h3>
            <div className="space-y-3">
              <a href={cidToExplorer(metadataCid as string)} target="_blank" rel="noreferrer" className="flex items-center justify-between group">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-indigo-500 transition-colors">
                  <FileText className="h-4 w-4" /> Market Metadata
                </div>
                <ArrowRight className="h-3 w-3 text-slate-300 group-hover:translate-x-1 transition-all" />
              </a>
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Contract Address
                </div>
                <span className="font-mono">{shieldBetConfig.address.slice(0, 6)}...</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

    </section>
  );
}

function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24" height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
