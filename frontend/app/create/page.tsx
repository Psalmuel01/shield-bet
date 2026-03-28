"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Share2, Trash2 } from "lucide-react";
import { decodeEventLog, parseAbiItem } from "viem";
import { useAccount, usePublicClient, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { RuntimeAlerts } from "@/components/runtime-alerts";
import { shieldBetConfig } from "@/lib/contract";
import { MarketCategory } from "@/lib/market-ui";
import { getRuntimeDiagnostics } from "@/lib/runtime-config";
import { logError, logInfo } from "@/lib/telemetry";

const marketCreatedEvent = parseAbiItem("event MarketCreated(uint256 indexed marketId, string question, uint256 deadline, address indexed creator, uint8 marketType)");
const marketCategories: MarketCategory[] = ["Crypto", "Politics", "Sports", "Science", "Other"];

export default function CreateMarketPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [question, setQuestion] = useState("");
  const [marketType, setMarketType] = useState<0 | 1>(0); // 0 = Binary, 1 = Categorical
  const [outcomeLabels, setOutcomeLabels] = useState<string[]>(["YES", "NO"]);
  const [category, setCategory] = useState<MarketCategory>("Crypto");
  const [resolutionCriteria, setResolutionCriteria] = useState("");
  const [resolutionSource, setResolutionSource] = useState("Optimistic Oracle");
  const [closingDate, setClosingDate] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [createdMarketId, setCreatedMarketId] = useState<bigint | null>(null);

  const { data: hash, isPending, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const { data: marketCount } = useReadContract({
    ...shieldBetConfig,
    functionName: "marketCount"
  });

  const diagnostics = useMemo(() => getRuntimeDiagnostics(), []);

  const shareUrl = useMemo(() => {
    if (!createdMarketId) return "";
    if (typeof window === "undefined") return "";

    const text = encodeURIComponent(`I just created a private prediction market on ShieldBet: ${question}`);
    const url = encodeURIComponent(`${window.location.origin}/markets/${createdMarketId.toString()}`);
    return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  }, [createdMarketId, question]);

  const addOutcome = () => {
    setOutcomeLabels([...outcomeLabels, `Option ${outcomeLabels.length + 1}`]);
  };

  const removeOutcome = (index: number) => {
    if (outcomeLabels.length <= 2) return;
    const newLabels = [...outcomeLabels];
    newLabels.splice(index, 1);
    setOutcomeLabels(newLabels);
  };

  const updateOutcome = (index: number, val: string) => {
    const newLabels = [...outcomeLabels];
    newLabels[index] = val;
    setOutcomeLabels(newLabels);
  };

  async function onCreate() {
    if (!address) {
      setStatusMessage("Connect your wallet first.");
      return;
    }

    if (!question.trim() || !closingDate || !resolutionCriteria.trim()) {
      setStatusMessage("All fields are required.");
      return;
    }

    if (outcomeLabels.some(label => !label.trim())) {
      setStatusMessage("All outcome labels must be filled.");
      return;
    }

    const deadline = Math.floor(new Date(closingDate).getTime() / 1000);
    if (!Number.isFinite(deadline) || deadline <= Math.floor(Date.now() / 1000)) {
      setStatusMessage("Closing date must be in the future.");
      return;
    }

    try {
      setStatusMessage("Creating market...");
      setCreatedMarketId(null);

      const txHash = await writeContractAsync({
        ...shieldBetConfig,
        functionName: "createMarketWithMetadata",
        args: [
          question.trim(),
          BigInt(deadline),
          marketType,
          outcomeLabels.map(l => l.trim()),
          category,
          resolutionCriteria.trim(),
          resolutionSource.trim()
        ]
      });

      const receipt = await publicClient?.waitForTransactionReceipt({ hash: txHash });
      if (!receipt) throw new Error("Could not confirm transaction");

      let marketId: bigint | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: [marketCreatedEvent],
            data: log.data,
            topics: log.topics
          });
          if (decoded.args.marketId) {
            marketId = decoded.args.marketId;
            break;
          }
        } catch { continue; }
      }

      if (!marketId) {
        throw new Error("Failed to resolve market ID from logs.");
      }

      setCreatedMarketId(marketId);
      setStatusMessage("Market created successfully!");
    } catch (error) {
      logError("create-market", "failed", error);
      setStatusMessage(error instanceof Error ? error.message : "Failed to create market");
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="surface p-6 md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-4xl">Create New Market</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 md:text-base">
          Launch a private prediction market with an optimistic oracle settlement.
        </p>
      </div>

      <RuntimeAlerts diagnostics={diagnostics} />

      <div className="surface p-6 md:p-8 space-y-6">
        <div className="grid gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Market Type</label>
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => { setMarketType(0); setOutcomeLabels(["YES", "NO"]); }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${marketType === 0 ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-slate-500"}`}
              >
                Binary (Yes/No)
              </button>
              <button
                onClick={() => { setMarketType(1); setOutcomeLabels(["Option 1", "Option 2"]); }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${marketType === 1 ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-slate-500"}`}
              >
                Categorical
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Market Question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-base outline-none ring-indigo-500/20 transition focus:border-indigo-500 focus:ring-4 dark:border-slate-800 dark:bg-slate-950/50"
              placeholder="e.g. Will ETH be above $5,000 on June 1st?"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Outcomes</label>
              {marketType === 1 && (
                <button
                  onClick={addOutcome}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-500 hover:text-indigo-400"
                >
                  <Plus className="h-3.5 w-3.5" /> ADD OPTION
                </button>
              )}
            </div>
            <div className="grid gap-3">
              {outcomeLabels.map((label, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{idx + 1}</span>
                    <input
                      value={label}
                      onChange={(e) => updateOutcome(idx, e.target.value)}
                      readOnly={marketType === 0}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950/50"
                    />
                  </div>
                  {marketType === 1 && outcomeLabels.length > 2 && (
                    <button
                      onClick={() => removeOutcome(idx)}
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition dark:border-slate-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MarketCategory)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white/50 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950/50"
              >
                {marketCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Closing Date</label>
              <input
                type="datetime-local"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white/50 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Resolution Criteria</label>
            <textarea
              value={resolutionCriteria}
              onChange={(e) => setResolutionCriteria(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950/50"
              placeholder="Describe exactly how this market should be resolved..."
            />
          </div>

          <button
            onClick={onCreate}
            disabled={isPending || isConfirming}
            className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-500 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10"
          >
            {isPending || isConfirming ? <span className="flex items-center justify-center gap-2">Creating...</span> : "Create Market"}
          </button>

          {statusMessage && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400">
              {statusMessage}
            </div>
          )}

          {createdMarketId && (
            <div className="p-6 rounded-2xl bg-indigo-50 border border-indigo-100 dark:bg-indigo-500/5 dark:border-indigo-500/20 text-center space-y-3 anim-fade-in">
              <p className="font-bold text-indigo-900 dark:text-indigo-200">Market live! Share the link below.</p>
              <div className="flex items-center justify-center gap-3">
                <Link href={`/markets/${createdMarketId}`} className="px-5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold shadow-sm transition hover:scale-105 active:scale-95">
                  View Market
                </Link>
                <a href={shareUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-sm transition hover:scale-105 active:scale-95">
                  <Share2 className="h-4 w-4" /> Tweet
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
