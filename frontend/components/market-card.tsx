"use client";

import { Lock, ShieldAlert, Timer } from "lucide-react";
import { useMemo } from "react";
import { formatEther } from "viem";
import { InteractiveLink } from "@/components/interactive-link";
import { cidToExplorer, formatDeadline, getCountdown } from "@/lib/format";
import { getEncryptedBandCount, getMarketStatus, getMarketType, MarketCategory, renderEncryptedDots } from "@/lib/market-ui";

interface MarketCardProps {
  marketId: bigint;
  question: string;
  deadline: bigint;
  outcome: number;
  status: number;
  marketType: number;
  category: MarketCategory;
  metadataCid: string;
  resolutionCid: string;
  poolBalanceWei: bigint;
}

const categoryStyles: Record<string, string> = {
  Crypto: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  Politics: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  Sports: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  Science: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  Other: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
};

const statusStyles: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  Expired: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  Proposed: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  Disputed: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  Finalized: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
};

export function MarketCard({ 
  marketId, 
  question, 
  deadline, 
  outcome, 
  status: rawStatus, 
  marketType: rawType, 
  category, 
  metadataCid, 
  resolutionCid, 
  poolBalanceWei 
}: MarketCardProps) {
  const status = getMarketStatus(rawStatus, deadline);
  const mType = getMarketType(rawType);
  
  const encryptedBandCount = useMemo(() => getEncryptedBandCount(marketId), [marketId]);
  const encryptedBandText = renderEncryptedDots(encryptedBandCount);

  return (
    <article className="surface group relative flex flex-col p-5 hover:shadow-xl transition-all hover:-translate-y-1">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${categoryStyles[category]}`}>{category}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400">{mType}</span>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusStyles[status]}`}>{status}</span>
      </div>

      <InteractiveLink
        href={`/markets/${marketId}`}
        className="flex-1"
      >
        <h2 className="line-clamp-2 text-xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400 transition-colors">
          {question}
        </h2>
      </InteractiveLink>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5"><Timer className="h-4 w-4" /> {status === "Active" ? "Ends in " + getCountdown(deadline) : "Closed " + formatDeadline(deadline)}</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">{Number(formatEther(poolBalanceWei)).toFixed(4)} ETH</span>
        </div>

        <div className="rounded-2xl bg-indigo-50/50 p-4 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Confidentiality Band</p>
            <Lock className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-xl leading-none text-indigo-500/30 dark:text-indigo-400/20 line-through decoration-indigo-500/50 decoration-2">
              {encryptedBandText}
            </span>
            <span className="text-xs font-medium text-indigo-900 dark:text-indigo-200">
              {encryptedBandCount} Encrypted Position{encryptedBandCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {status === "Finalized" ? (
        <div className="mt-4 rounded-xl bg-slate-900 p-3 text-center dark:bg-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Official Outcome</p>
          <p className="mt-1 text-sm font-bold text-white">Index {outcome}</p>
        </div>
      ) : (
        <InteractiveLink
          href={`/markets/${marketId}`}
          className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-center text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.98] dark:bg-indigo-600 dark:hover:bg-indigo-500"
        >
          {status === "Active" ? "PLACE POSITION" : "VIEW DETAILS"}
        </InteractiveLink>
      )}

      {metadataCid && (
        <div className="mt-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <a href={cidToExplorer(metadataCid)} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-slate-400 hover:text-indigo-500 transition-colors uppercase">Metadata CID</a>
          {resolutionCid && <a href={cidToExplorer(resolutionCid)} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-slate-400 hover:text-indigo-500 transition-colors uppercase">Resolution CID</a>}
        </div>
      )}
    </article>
  );
}
