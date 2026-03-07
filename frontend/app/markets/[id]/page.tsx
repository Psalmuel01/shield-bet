"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatEther, getAddress, isAddress, parseEther } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { BetOutcome, encryptBetInputs } from "@/lib/encryption";
import { shieldBetConfig } from "@/lib/contract";
import { formatDeadline, getCountdown } from "@/lib/format";

export default function MarketBetPage() {
  const params = useParams<{ id: string }>();
  const marketId = useMemo(() => BigInt(params.id), [params.id]);

  const [selectedOutcome, setSelectedOutcome] = useState<BetOutcome>(1);
  const [amount, setAmount] = useState("0.1");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [decryptedPayout, setDecryptedPayout] = useState<string | null>(null);

  const [adminResolveOutcome, setAdminResolveOutcome] = useState<BetOutcome>(1);
  const [adminWinner, setAdminWinner] = useState("");
  const [adminPayout, setAdminPayout] = useState("0.0");
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  const { address } = useAccount();
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
      enabled: Boolean(address && marketData?.resolved)
    }
  });

  if (!marketData) {
    return <p className="loading-text">Loading market...</p>;
  }

  const question = marketData.question;
  const deadline = marketData.deadline;
  const outcome = marketData.outcome;
  const resolved = marketData.resolved;

  const isOwner = Boolean(address && ownerAddress && address.toLowerCase() === ownerAddress.toLowerCase());
  const alreadyBet = Boolean(hasPosition);
  const claimPayout = claimQuote?.[0] || 0n;
  const eligibleToClaim = claimQuote?.[1] || false;

  async function placeBet() {
    if (!address) {
      setStatusMessage("Connect your wallet first.");
      return;
    }

    try {
      setStatusMessage(null);
      setDecryptedPayout(null);

      const amountWei = parseEther(amount);
      const encrypted = await encryptBetInputs(selectedOutcome, amountWei, {
        contractAddress: shieldBetConfig.address,
        userAddress: getAddress(address)
      });

      await writeContractAsync({
        ...shieldBetConfig,
        functionName: "placeBet",
        args: [marketId, encrypted.encOutcome, encrypted.encAmount, encrypted.inputProof],
        value: amountWei
      });

      setStatusMessage("Your encrypted position was submitted.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bet transaction failed";
      setStatusMessage(message);
    }
  }

  async function claimWinnings() {
    try {
      setStatusMessage(null);
      const txHash = await writeContractAsync({
        ...shieldBetConfig,
        functionName: "claimWinnings",
        args: [marketId]
      });

      const response = await fetch("/api/lit/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          marketId: marketId.toString(),
          account: address,
          txHash,
          expectedPayoutWei: claimPayout.toString()
        })
      });

      const data = (await response.json()) as { plaintextPayoutWei: string; mode: string };
      setDecryptedPayout(formatEther(BigInt(data.plaintextPayoutWei)));
      setStatusMessage(`Lit claim proof complete (${data.mode}).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Claim failed";
      setStatusMessage(message);
    }
  }

  async function resolveMarket() {
    try {
      setAdminMessage(null);
      await writeContractAsync({
        ...shieldBetConfig,
        functionName: "resolveMarket",
        args: [marketId, adminResolveOutcome]
      });
      setAdminMessage("Market resolution transaction sent.");
    } catch (error) {
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
      setAdminMessage(null);
      const payoutWei = parseEther(adminPayout || "0");
      await writeContractAsync({
        ...shieldBetConfig,
        functionName: "assignWinnerPayout",
        args: [marketId, getAddress(adminWinner), payoutWei]
      });
      setAdminMessage("Payout assignment transaction sent.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to assign payout";
      setAdminMessage(message);
    }
  }

  return (
    <section className="page-section market-detail">
      <Link href="/markets" className="text-link">
        Back to markets
      </Link>
      <p className="eyebrow">Market #{marketId.toString()}</p>
      <h1>{question}</h1>
      <p className="meta-text">
        Deadline: {formatDeadline(deadline)} ({getCountdown(deadline)})
      </p>

      <div className="market-panel">
        {!resolved ? (
          <>
            <h2>Place a confidential bet</h2>
            <div className="toggle-row">
              <button
                className={`toggle-btn ${selectedOutcome === 1 ? "active" : ""}`}
                onClick={() => setSelectedOutcome(1)}
                type="button"
              >
                YES
              </button>
              <button
                className={`toggle-btn ${selectedOutcome === 2 ? "active" : ""}`}
                onClick={() => setSelectedOutcome(2)}
                type="button"
              >
                NO
              </button>
            </div>
            <label htmlFor="amount">Amount (ETH)</label>
            <input id="amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
            <button onClick={placeBet} disabled={isPending || isConfirming || alreadyBet} className="btn">
              {alreadyBet ? "Already positioned" : isPending || isConfirming ? "Submitting..." : "Encrypt & Submit"}
            </button>
            {alreadyBet && <p className="success-text">Your position: Confidential</p>}
          </>
        ) : (
          <>
            <h2>Market resolved: {outcome === 1 ? "YES" : "NO"}</h2>
            <p className="meta-text">
              Eligible payout: {eligibleToClaim ? `${Number(formatEther(claimPayout)).toFixed(6)} ETH` : "Not eligible"}
            </p>
            {eligibleToClaim && (
              <button onClick={claimWinnings} disabled={isPending || isConfirming} className="btn">
                {isPending || isConfirming ? "Claiming..." : "Claim Winnings"}
              </button>
            )}
            {decryptedPayout && <p className="success-text">Decrypted winner payout: {decryptedPayout} ETH</p>}
          </>
        )}
        {statusMessage && <p className="meta-text">{statusMessage}</p>}
      </div>

      {isOwner && (
        <div className="market-panel">
          <h2>Admin Controls</h2>
          {!resolved ? (
            <>
              <p className="meta-text">Resolve this market.</p>
              <div className="toggle-row">
                <button
                  className={`toggle-btn ${adminResolveOutcome === 1 ? "active" : ""}`}
                  onClick={() => setAdminResolveOutcome(1)}
                  type="button"
                >
                  Resolve YES
                </button>
                <button
                  className={`toggle-btn ${adminResolveOutcome === 2 ? "active" : ""}`}
                  onClick={() => setAdminResolveOutcome(2)}
                  type="button"
                >
                  Resolve NO
                </button>
              </div>
              <button onClick={resolveMarket} disabled={isPending || isConfirming} className="btn">
                {isPending || isConfirming ? "Submitting..." : "Resolve Market"}
              </button>
            </>
          ) : (
            <>
              <p className="meta-text">Assign payout to a winner wallet.</p>
              <label htmlFor="winner">Winner Address</label>
              <input
                id="winner"
                placeholder="0x..."
                value={adminWinner}
                onChange={(event) => setAdminWinner(event.target.value)}
              />
              <label htmlFor="payout">Payout (ETH)</label>
              <input
                id="payout"
                placeholder="0.0"
                value={adminPayout}
                onChange={(event) => setAdminPayout(event.target.value)}
              />
              <button onClick={assignPayout} disabled={isPending || isConfirming} className="btn">
                {isPending || isConfirming ? "Submitting..." : "Assign Winner Payout"}
              </button>
            </>
          )}
          {adminMessage && <p className="meta-text">{adminMessage}</p>}
        </div>
      )}
    </section>
  );
}
