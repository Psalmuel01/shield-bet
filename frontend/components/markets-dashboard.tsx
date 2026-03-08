"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { MarketCard } from "@/components/market-card";
import { shieldBetConfig } from "@/lib/contract";
import { decodeMarketView } from "@/lib/market-contract";
import { getEncryptedBandCount, inferCategory, MarketCategory } from "@/lib/market-ui";
import { logInfo, logWarn } from "@/lib/telemetry";

type MarketTab = "All" | "Crypto" | "Politics" | "Sports" | "Science" | "My Markets";
type SortOption = "Closing Soon" | "Newest" | "Most Activity";

interface ParsedMarket {
  marketId: bigint;
  question: string;
  deadline: bigint;
  outcome: number;
  resolved: boolean;
  creator: `0x${string}`;
  metadataCid: string;
  resolutionCid: string;
  category: MarketCategory;
  encryptedActivity: number;
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

  useEffect(() => {
    logInfo("markets-dashboard", "read marketCount", {
      contract: shieldBetConfig.address,
      marketCount: marketCount?.toString() || "0"
    });
  }, [marketCount]);

  const ids = useMemo(() => {
    if (marketCount === undefined || marketCount === null) return [] as bigint[];

    const count = Number(marketCount);
    if (!Number.isFinite(count) || count <= 0) return [] as bigint[];

    // Probe both 1-based and 0-based indexing because deployed variants may differ.
    const oneBased = Array.from({ length: count }, (_, idx) => BigInt(idx + 1));
    const zeroBased = Array.from({ length: count }, (_, idx) => BigInt(idx));
    return [...new Set([...oneBased, ...zeroBased].map((value) => value.toString()))].map((value) => BigInt(value));
  }, [marketCount]);

  useEffect(() => {
    logInfo("markets-dashboard", "derived market ids", {
      ids: ids.map((id) => id.toString())
    });
  }, [ids]);

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
          functionName: "marketResolutionCID" as const,
          args: [marketId] as const
        }
      ]),
    [ids]
  );

  const { data: marketBatch, isLoading: loadingMarkets, error } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0
    }
  });

  useEffect(() => {
    if (!marketBatch?.length) return;
    logInfo("markets-dashboard", "read market batch", {
      calls: marketBatch.length,
      statuses: marketBatch.map((entry, idx) => ({
        idx,
        status: entry.status
      }))
    });
  }, [marketBatch]);

  const markets = useMemo(() => {
    if (!marketBatch?.length) return [] as ParsedMarket[];

    const rows: ParsedMarket[] = [];
    for (let i = 0; i < marketBatch.length; i += 3) {
      const marketRes = marketBatch[i];
      const metadataRes = marketBatch[i + 1];
      const resolutionRes = marketBatch[i + 2];
      const marketId = ids[i / 3];

      if (marketRes?.status !== "success" || !marketRes.result) {
        logWarn("markets-dashboard", "market read failed", {
          marketId: marketId.toString(),
          marketStatus: marketRes?.status,
          marketError: marketRes?.status === "failure" ? String(marketRes.error) : ""
        });
        continue;
      }

      const market = decodeMarketView(marketRes.result);
      if (!market) {
        logWarn("markets-dashboard", "unable to decode market payload", {
          marketId: marketId.toString(),
          raw: marketRes.result
        });
        continue;
      }

      const hasSignal =
        market.question.trim().length > 0 || market.deadline > 0n || market.creator.toLowerCase() !== ZERO_ADDRESS;
      if (!hasSignal) {
        logWarn("markets-dashboard", "market skipped as empty/default struct", {
          marketId: marketId.toString(),
          market
        });
        continue;
      }

      rows.push({
        marketId,
        question: market.question,
        deadline: market.deadline,
        outcome: market.outcome,
        resolved: market.resolved,
        creator: market.creator,
        metadataCid: metadataRes?.status === "success" && metadataRes.result ? String(metadataRes.result) : "",
        resolutionCid: resolutionRes?.status === "success" && resolutionRes.result ? String(resolutionRes.result) : "",
        category: inferCategory(market.question),
        encryptedActivity: getEncryptedBandCount(marketId)
      });
    }

    return rows;
  }, [ids, marketBatch]);

  useEffect(() => {
    logInfo("markets-dashboard", "parsed markets", {
      count: markets.length,
      markets: markets.map((market) => ({
        marketId: market.marketId.toString(),
        question: market.question,
        deadline: market.deadline.toString(),
        creator: market.creator,
        metadataCid: market.metadataCid,
        resolutionCid: market.resolutionCid
      }))
    });
  }, [markets]);

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

  const hasReadMismatch = useMemo(() => {
    const count = marketCount ? Number(marketCount) : 0;
    return count > 0 && markets.length === 0;
  }, [marketCount, markets.length]);

  if (loadingCount || loadingMarkets) {
    return <p className="subtle">Loading encrypted markets...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-500">Unable to load markets. Confirm contract address and RPC in `.env.local`.</p>;
  }

  return (
    <section className="space-y-3">
      <div className="surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === tab
                    ? "bg-indigo-500 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            Sort
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              {sortOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="subtle">Encrypted activity bands hide real market size until settlement.</p>
      </div>

      {!filtered.length ? (
        <div className="surface p-8 text-center">
          <h2 className="section-title mb-2">No markets found</h2>
          <p className="subtle">
            {hasReadMismatch
              ? "Contract reports markets, but reads returned empty/default structs. Check console logs for ABI/indexing mismatch details."
              : "Try another filter, or create your first confidential market."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((market) => (
            <MarketCard key={market.marketId.toString()} {...market} />
          ))}
        </div>
      )}
    </section>
  );
}
