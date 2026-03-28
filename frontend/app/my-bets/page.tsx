"use client";

import { useEffect, useMemo, useState } from "react";
import { getAddress, formatEther } from "viem";
import { useAccount, useReadContract, useReadContracts, useWalletClient } from "wagmi";
import { MyBetRow, MyBetsTable } from "@/components/my-bets-table";
import { shieldBetConfig } from "@/lib/contract";
import { decryptUserHandles } from "@/lib/encryption";
import { decodeMarketView } from "@/lib/market-contract";
import { getLocalBetsByWallet, LocalBetRecord } from "@/lib/local-bets";
import { logInfo, logWarn } from "@/lib/telemetry";

export default function MyBetsPage() {
  const { address } = useAccount();
  const normalizedAddress = address ? getAddress(address) : null;
  const { data: walletClient } = useWalletClient();
  const [localBets, setLocalBets] = useState<LocalBetRecord[]>([]);
  const [decryptedPositions, setDecryptedPositions] = useState<Record<string, number>>({});

  useEffect(() => {
    setLocalBets(getLocalBetsByWallet(address));
  }, [address]);

  const { data: marketCount } = useReadContract({
    ...shieldBetConfig,
    functionName: "marketCount"
  });

  const ids = useMemo(() => {
    if (!marketCount) return [] as bigint[];
    const count = Number(marketCount);
    return Array.from({ length: count }, (_, idx) => BigInt(idx + 1));
  }, [marketCount]);

  const contracts = useMemo(() => {
    if (!address) return [];

    return ids.flatMap((marketId) => [
      {
        ...shieldBetConfig,
        functionName: "markets" as const,
        args: [marketId] as const
      },
      {
        ...shieldBetConfig,
        functionName: "hasPosition" as const,
        args: [marketId, address] as const
      },
      {
        ...shieldBetConfig,
        functionName: "getClaimQuote" as const,
        args: [marketId, address] as const
      },
      {
        ...shieldBetConfig,
        functionName: "getMyOutcome" as const,
        args: [marketId] as const
      },
      {
        ...shieldBetConfig,
        functionName: "stakeAmounts" as const,
        args: [marketId, address] as const
      },
      {
        ...shieldBetConfig,
        functionName: "hasClaimed" as const,
        args: [marketId, address] as const
      },
      {
        ...shieldBetConfig,
        functionName: "getOutcomeLabels" as const,
        args: [marketId] as const
      }
    ]);
  }, [address, ids]);

  const { data: batch } = useReadContracts({
    contracts,
    query: {
      enabled: Boolean(address && contracts.length)
    }
  });

  useEffect(() => {
    if (!normalizedAddress || !walletClient || !batch?.length) return;
    const userAddress = normalizedAddress;
    const signer = walletClient;
    const batchResults = batch;

    let cancelled = false;
    async function loadPositions() {
      const contractsToDecrypt: { marketId: bigint; handle: `0x${string}` }[] = [];

      for (let i = 0; i < batchResults.length; i += 7) {
        const hasPositionRes = batchResults[i + 1];
        const outcomeRes = batchResults[i + 3];
        const marketId = ids[i / 7];

        if (hasPositionRes?.status !== "success" || !hasPositionRes.result) continue;
        if (outcomeRes?.status !== "success" || !outcomeRes.result) continue;

        contractsToDecrypt.push({
          marketId,
          handle: outcomeRes.result as `0x${string}`
        });
      }

      if (!contractsToDecrypt.length) return;

      try {
        const decrypted = await decryptUserHandles({
          contractAddress: shieldBetConfig.address,
          userAddress,
          walletClient: signer,
          handles: contractsToDecrypt.map((entry) => entry.handle)
        });
        if (cancelled) return;

        const next: Record<string, number> = {};
        for (const entry of contractsToDecrypt) {
          next[entry.marketId.toString()] = Number(decrypted[entry.handle]);
        }
        setDecryptedPositions(next);
      } catch (error) {
        logWarn("my-bets", "failed to decrypt positions", error);
      }
    }

    void loadPositions();
    return () => { cancelled = true; };
  }, [batch, ids, normalizedAddress, walletClient]);

  const rows = useMemo(() => {
    if (!batch?.length || !address) return [] as MyBetRow[];

    const next: MyBetRow[] = [];
    for (let i = 0; i < batch.length; i += 7) {
      const marketRes = batch[i];
      const hasPositionRes = batch[i + 1];
      const claimRes = batch[i + 2];
      const stakeRes = batch[i + 4];
      const hasClaimedRes = batch[i + 5];
      const labelsRes = batch[i + 6];
      const marketId = ids[i / 7];

      if (
        marketRes?.status !== "success" || !marketRes.result ||
        hasPositionRes?.status !== "success" || !hasPositionRes.result
      ) {
        continue;
      }

      const market = decodeMarketView(marketRes.result);
      if (!market) continue;

      const labels = (labelsRes?.status === "success" ? labelsRes.result as string[] : []) || ["YES", "NO"];
      const decryptedIdx = decryptedPositions[marketId.toString()];
      const position = decryptedIdx !== undefined ? labels[decryptedIdx] : "Encrypted";

      const stakeWei = BigInt((stakeRes?.status === "success" ? stakeRes.result as bigint : 0n) || 0n);
      const isClaimable = claimRes?.status === "success" ? (claimRes.result as unknown as [bigint, boolean])[1] : false;
      const hasClaimed = hasClaimedRes?.status === "success" ? Boolean(hasClaimedRes.result) : false;

      // Status mapping
      const statusInt = market.status;
      let status: MyBetRow["status"] = "Open";
      if (statusInt === 0) status = "Open";
      else if (statusInt === 1) status = "Awaiting Resolution";
      else if (statusInt === 2) status = "Proposed";
      else if (statusInt === 3) status = "Disputed";
      else if (statusInt === 4) {
        if (hasClaimed) status = "Claimed";
        else if (isClaimable) status = "Won";
        else status = "Finalized";
      }

      next.push({
        marketId,
        question: market.question,
        position,
        amountWei: stakeWei.toString(),
        status,
        canClaim: isClaimable && !hasClaimed,
        claimType: "winnings"
      });
    }

    return next;
  }, [address, batch, decryptedPositions, ids]);

  return (
    <section className="space-y-8">
      <div className="surface p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-900">
            Portfolio
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl">
            My Positions
          </h1>
          <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Monitor and manage your private prediction market positions. Encrypted data is decrypted locally using your wallet signature.
          </p>
        </div>
      </div>

      {!address ? (
        <div className="surface p-20 text-center">
          <p className="text-slate-400 font-bold uppercase tracking-widest">Connect wallet to view portfolio</p>
        </div>
      ) : (
        <MyBetsTable rows={rows} />
      )}
    </section>
  );
}
