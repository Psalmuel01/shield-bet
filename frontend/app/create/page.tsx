"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Share2 } from "lucide-react";
import { decodeEventLog, parseAbiItem } from "viem";
import { useAccount, usePublicClient, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { shieldBetConfig } from "@/lib/contract";
import { uploadMarketMetadata } from "@/lib/filecoin";
import { cidToExplorer } from "@/lib/format";
import { logError, logInfo } from "@/lib/telemetry";

const categories = ["Crypto", "Politics", "Sports", "Science", "Other"];
const marketCreatedEvent = parseAbiItem("event MarketCreated(uint256 indexed marketId, string question, uint256 deadline, address indexed creator)");

export default function CreateMarketPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("Crypto");
  const [resolutionCriteria, setResolutionCriteria] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [createdMarketId, setCreatedMarketId] = useState<bigint | null>(null);
  const [cid, setCid] = useState<string>("");

  const { data: hash, isPending, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const { data: marketCount } = useReadContract({
    ...shieldBetConfig,
    functionName: "marketCount"
  });

  useEffect(() => {
    logInfo("create-market", "read marketCount", {
      contract: shieldBetConfig.address,
      marketCount: marketCount?.toString() || "0"
    });
  }, [marketCount]);

  const shareUrl = useMemo(() => {
    if (!createdMarketId) return "";
    if (typeof window === "undefined") return "";

    const text = encodeURIComponent(`I just created a confidential market on ShieldBet: ${question}`);
    const url = encodeURIComponent(`${window.location.origin}/market/${createdMarketId.toString()}`);
    return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  }, [createdMarketId, question]);

  async function onCreate() {
    if (!address) {
      setStatusMessage("Connect your wallet first.");
      return;
    }

    if (!question.trim() || !closingDate) {
      setStatusMessage("Question and closing date are required.");
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
      setCid("");
      logInfo("create-market", "submit createMarket", {
        contract: shieldBetConfig.address,
        question: question.trim(),
        deadline
      });

      const txHash = await writeContractAsync({
        ...shieldBetConfig,
        functionName: "createMarket",
        args: [question.trim(), BigInt(deadline)]
      });
      logInfo("create-market", "createMarket tx submitted", { txHash });

      const receipt = await publicClient?.waitForTransactionReceipt({ hash: txHash });
      if (!receipt) throw new Error("Could not confirm create transaction");
      logInfo("create-market", "createMarket tx confirmed", {
        txHash,
        status: receipt.status,
        logsCount: receipt.logs.length
      });

      let marketId: bigint | null = null;
      let eventFound = false;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: [marketCreatedEvent],
            data: log.data,
            topics: log.topics
          });
          if (typeof decoded.args.marketId === "bigint") {
            marketId = decoded.args.marketId;
            eventFound = true;
            break;
          }
        } catch {
          continue;
        }
      }
      if (!marketId) {
        const current = (await publicClient?.readContract({
          ...shieldBetConfig,
          functionName: "marketCount"
        })) as bigint | undefined;
        marketId = current ?? marketCount ?? null;
      }
      logInfo("create-market", "resolved marketId", {
        marketId: marketId?.toString() || "",
        source: eventFound ? "event" : "marketCount"
      });

      if (!marketId) {
        throw new Error("Failed to resolve created marketId");
      }

      setStatusMessage("Uploading metadata to Filecoin...");
      logInfo("create-market", "upload market metadata", {
        marketId: marketId.toString(),
        question: question.trim(),
        creator: address,
        deadline,
        category,
        resolutionCriteria
      });
      const uploaded = await uploadMarketMetadata({
        marketId,
        question: question.trim(),
        creator: address,
        deadline: BigInt(deadline),
        category,
        resolutionCriteria
      });
      const marketCid = uploaded.cid;
      logInfo("create-market", "filecoin upload success", {
        marketId: marketId.toString(),
        cid: marketCid,
        provider: uploaded.provider,
        network: uploaded.network
      });

      setStatusMessage("Anchoring CID on-chain...");
      logInfo("create-market", "submit anchorMarketMetadataCID", {
        marketId: marketId.toString(),
        cid: marketCid
      });
      const anchorHash = await writeContractAsync({
        ...shieldBetConfig,
        functionName: "anchorMarketMetadataCID",
        args: [marketId, marketCid]
      });
      logInfo("create-market", "anchorMarketMetadataCID tx submitted", { anchorHash });

      const anchorReceipt = await publicClient?.waitForTransactionReceipt({ hash: anchorHash });
      logInfo("create-market", "anchorMarketMetadataCID tx confirmed", {
        anchorHash,
        status: anchorReceipt?.status || "unknown"
      });

      setCreatedMarketId(marketId);
      setCid(marketCid);
      setStatusMessage(`Market created and metadata anchored (${uploaded.provider}/${uploaded.network}).`);
    } catch (error) {
      logError("create-market", "create flow failed", error);
      setStatusMessage(error instanceof Error ? error.message : "Create market failed");
    }
  }

  return (
    <section className="space-y-5">
      <div className="surface p-6 md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-4xl">Create Market</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300 md:text-base">
          Publish a confidential prediction market. Metadata is archived to Filecoin and CID-anchored on-chain.
        </p>
      </div>

      <div className="surface p-5 md:p-6">
        <div className="grid gap-4">
          <label className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Question
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500/40 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
              placeholder="Will ETH hit $5000 by March 31, 2026?"
            />
          </label>

          <label className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500/40 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
            >
              {categories.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Resolution criteria
            <textarea
              value={resolutionCriteria}
              onChange={(event) => setResolutionCriteria(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500/40 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
              placeholder="This market resolves YES if..."
            />
          </label>

          <label className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Closing date/time
            <input
              value={closingDate}
              onChange={(event) => setClosingDate(event.target.value)}
              type="datetime-local"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500/40 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <button
            type="button"
            onClick={onCreate}
            disabled={isPending || isConfirming}
            className="w-full rounded-lg bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending || isConfirming ? "Submitting..." : "CREATE MARKET"}
          </button>

          {statusMessage && <p className="text-sm text-slate-600 dark:text-slate-300">{statusMessage}</p>}

          {createdMarketId && (
            <div className="surface-muted p-4 text-sm">
              <p className="font-medium text-slate-800 dark:text-slate-100">Market created! Share:</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Link
                  href={`/market/${createdMarketId}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold dark:border-slate-700"
                >
                  View market
                </Link>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-slate-800 dark:text-slate-100"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share on X
                </a>
                {cid && (
                  <a
                    href={cidToExplorer(cid)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-indigo-600 underline underline-offset-2 dark:text-indigo-300"
                  >
                    Filecoin CID
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
