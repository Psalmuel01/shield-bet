"use client";

import Link from "next/link";
import { formatEther } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { cidToExplorer, formatDeadline, getCountdown } from "@/lib/format";
import { shieldBetConfig } from "@/lib/contract";
import { useEffect, useState } from "react";

interface MarketCardProps {
  marketId: bigint;
  question: string;
  deadline: bigint;
  outcome: number;
  resolved: boolean;
  metadataCid: string;
  resolutionCid: string;
}

export function MarketCard({
  marketId,
  question,
  deadline,
  outcome,
  resolved,
  metadataCid,
  resolutionCid
}: MarketCardProps) {
  const { address } = useAccount();
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [claimFeedback, setClaimFeedback] = useState<string | null>(null);

  const { data: claimQuote } = useReadContract({
    ...shieldBetConfig,
    functionName: "getClaimQuote",
    args: [marketId, address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: resolved && Boolean(address)
    }
  });

  useEffect(() => {
    if (isSuccess) {
      setClaimFeedback("Winnings claimed. Decryption payload is ready on the bet page.");
    }
  }, [isSuccess]);

  const payout = claimQuote?.[0] || 0n;
  const isEligible = claimQuote?.[1] || false;

  async function onClaim() {
    setClaimFeedback(null);
    await writeContractAsync({
      ...shieldBetConfig,
      functionName: "claimWinnings",
      args: [marketId]
    });
  }

  const status = resolved ? "Resolved" : deadline * 1000n < BigInt(Date.now()) ? "Expired" : "Open";

  return (
    <article className="market-card">
      <div className="market-meta-row">
        <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
        <span>{formatDeadline(deadline)}</span>
      </div>
      <h2>{question}</h2>
      <p className="meta-text">Volume: Encrypted</p>
      <p className="meta-text">{getCountdown(deadline)}</p>
      {resolved && (
        <p className="resolution-text">
          Outcome: <strong>{outcome === 1 ? "YES" : "NO"}</strong>
        </p>
      )}
      <div className="cid-links">
        {metadataCid && (
          <a href={cidToExplorer(metadataCid)} target="_blank" rel="noreferrer">
            Market CID
          </a>
        )}
        {resolutionCid && (
          <a href={cidToExplorer(resolutionCid)} target="_blank" rel="noreferrer">
            Resolution CID
          </a>
        )}
      </div>
      <div className="card-actions">
        <Link href={`/markets/${marketId}`} className="btn btn-secondary">
          Open Market
        </Link>
        {isEligible && (
          <button className="btn" onClick={onClaim} disabled={isPending || isConfirming}>
            {isPending || isConfirming ? "Claiming..." : `Claim ${Number(formatEther(payout)).toFixed(4)} ETH`}
          </button>
        )}
      </div>
      {claimFeedback && <p className="success-text">{claimFeedback}</p>}
    </article>
  );
}
