"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { MarketCard } from "@/components/market-card";
import { shieldBetConfig } from "@/lib/contract";
import { decodeMarketDetails, decodeMarketView } from "@/lib/market-contract";
import { coerceMarketCategory, getEncryptedBandCount, inferCategory, MarketCategory } from "@/lib/market-ui";
import { logInfo, logWarn } from "@/lib/telemetry";

type MarketTab = "All" | "Crypto" | "Politics" | "Sports" | "Science" | "My Markets";
type SortOption = "Closing Soon" | "Newest" | "Most Activity";

interface ParsedMarket {
  marketId: bigint;
  question: string;
  deadline: bigint;
  outcome: number;
  status: number;
  marketType: number;
  creator: `0x${string}`;
  metadataCid: string;
  resolutionCid: string;
  category: MarketCategory;
  encryptedActivity: number;
  poolBalanceWei: bigint;
}

const tabs: MarketTab[] = ["All", "Crypto", "Politics", "Sports", "Science", "My Markets"];
const sortOptions: SortOption[] = ["Closing Soon", "Newest", "Most Activity"];
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function MarketsDashboard() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<MarketTab>("All");
  const [sortBy, setSortBy] = useState<SortOption>("Closing Soon");

  const { data: marketCount, isLoading: loadingCount } = useReadContract({
    ...shieldBetConfig,
    functionName: "marketCount"
  });

  const ids = useMemo(() => {
    if (!marketCount) return [] as bigint[];
    const count = Number(marketCount);
    return Array.from({ length: count }, (_, idx) => BigInt(idx + 1));
  }, [marketCount]);

  const contracts = useMemo(
    () =>
      ids.flatMap((marketId) => [
        {
          ...shieldBetConfig,
          functionName: "markets" as const,
          args: [marketId] as const
        },
        {
          ...shieldBetConfig,
          functionName: "marketMetadataCID" as const,
          args: [marketId] as const
        },
        {
          ...shieldBetConfig,
          functionName: "getMarketDetails" as const,
          args: [marketId] as const
        },
        {
          ...shieldBetConfig,
          functionName: "marketResolutionCID" as const,
          args: [marketId] as const
        },
        {
          ...shieldBetConfig,
          functionName: "marketPoolBalance" as const,
          args: [marketId] as const
        }
      ]),
    [ids]
  );

  const { data: marketBatch, isLoading: loadingMarkets, error } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 }
  });

  const markets = useMemo(() => {
    if (!marketBatch?.length) return [] as ParsedMarket[];

    const rows: ParsedMarket[] = [];
    for (let i = 0; i < marketBatch.length; i += 5) {
      const marketRes = marketBatch[i];
      const metadataRes = marketBatch[i + 1];
      const detailsRes = marketBatch[i + 2];
      const resolutionRes = marketBatch[i + 3];
      const poolBalanceRes = marketBatch[i + 4];
      const marketId = ids[i / 5];

      if (marketRes?.status !== "success" || !marketRes.result) continue;

      const market = decodeMarketView(marketRes.result);
      if (!market) continue;

      const details = detailsRes?.status === "success" ? decodeMarketDetails(detailsRes.result) : null;
      const category = details?.category.trim() ? coerceMarketCategory(details.category.trim()) : inferCategory(market.question);

      rows.push({
        marketId,
        question: market.question,
        deadline: market.deadline,
        outcome: market.outcome,
        status: market.status,
        marketType: market.marketType,
        creator: market.creator,
        metadataCid: metadataRes?.status === "success" && metadataRes.result ? String(metadataRes.result) : "",
        resolutionCid: resolutionRes?.status === "success" && resolutionRes.result ? String(resolutionRes.result) : "",
        category,
        encryptedActivity: getEncryptedBandCount(marketId),
        poolBalanceWei: poolBalanceRes?.status === "success" && typeof poolBalanceRes.result === "bigint" ? poolBalanceRes.result : 0n
      });
    }

    return rows;
  }, [ids, marketBatch]);

  const filtered = useMemo(() => {
    let next = markets;

    if (activeTab !== "All") {
      if (activeTab === "My Markets") {
        const owner = address?.toLowerCase();
        next = owner ? next.filter((market) => market.creator.toLowerCase() === owner) : [];
      } else {
        next = next.filter((market) => market.category === activeTab);
      }
    }

    if (sortBy === "Closing Soon") {
      next = [...next].sort((a, b) => Number(a.deadline - b.deadline));
    } else if (sortBy === "Newest") {
      next = [...next].sort((a, b) => Number(b.marketId - a.marketId));
    } else {
      next = [...next].sort((a, b) => b.encryptedActivity - a.encryptedActivity);
    }

    return next;
  }, [activeTab, address, markets, sortBy]);

  if (loadingCount || loadingMarkets) {
    return (
      <div className="surface p-12 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        <p className="mt-4 font-bold text-slate-500 animate-pulse">Syncing encrypted data...</p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-sm transition-all focus:ring-4 focus:ring-indigo-500/10 ${
                  activeTab === tab
                    ? "bg-indigo-600 text-white shadow-indigo-500/20"
                    : "bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-950 dark:hover:bg-slate-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sort By</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              {sortOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!filtered.length ? (
        <div className="surface p-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900">
            <Lock className="h-8 w-8 text-slate-300 dark:text-slate-700" />
          </div>
          <h2 className="mt-6 text-2xl font-bold dark:text-white">No Markets Found</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            Your selection returned empty results. Try another filter or create a new prediction market.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((market) => (
            <MarketCard key={market.marketId.toString()} {...market} />
          ))}
        </div>
      )}
    </section>
  );
}

function Lock(props: any) {
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
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
