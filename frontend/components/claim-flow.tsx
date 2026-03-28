"use client";

import { Loader2, Lock, Sparkles } from "lucide-react";
import { formatEther } from "viem";
import { useEffect, useState } from "react";

export interface ClaimConfirmation {
  mode: "verify" | "lit";
  txHash: string;
  plaintextPayoutWei: string;
  actionCid?: string;
  verifiedMarketId?: string;
  verifiedAccount?: string;
  verifiedOutcome?: string;
  verifiedChecks?: string[];
  litAttestation?: {
    account: string;
    marketId: string;
    resolvedOutcome: string;
    expectedPayoutWei: string;
    txHash?: string;
    verifier: "lit-action";
    actionCid: string;
    network: string;
    issuedAt: string;
    checks: string[];
  };
}

interface ClaimFlowProps {
  open: boolean;
  onClose: () => void;
  payoutWei: bigint;
  onConfirmClaim: () => Promise<ClaimConfirmation>;
  claimType?: "winnings" | "refund";
}

type ClaimStage = "idle" | "lit" | "ready" | "submitting" | "done" | "error";

export function ClaimFlow({ open, onClose, payoutWei, onConfirmClaim, claimType = "winnings" }: ClaimFlowProps) {
  const [stage, setStage] = useState<ClaimStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimConfirmation | null>(null);

  useEffect(() => {
    if (!open) {
      setStage("idle");
      setError(null);
      setClaimResult(null);
      return;
    }

    setStage("lit");
    const timer = window.setTimeout(() => setStage("ready"), 1700);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  const payoutWeiToDisplay = claimResult ? BigInt(claimResult.plaintextPayoutWei) : payoutWei;
  const payoutLabel = Number(formatEther(payoutWeiToDisplay)).toFixed(4);
  const isRefund = claimType === "refund";

  async function submitClaim() {
    try {
      setStage("submitting");
      setError(null);
      const result = await onConfirmClaim();
      setClaimResult(result);
      setStage("done");
    } catch (cause) {
      setStage("error");
      setError(cause instanceof Error ? cause.message : "Claim failed");
    }
  }

  return (
    <div className="vm-modal-backdrop">
      <div className="vm-modal">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
              {isRefund ? "Claim Refund" : "Claim Winnings"}
            </div>
            <h3 className="font-display mt-2 text-2xl font-bold text-white">
              {isRefund ? "Refund Verification Flow" : "Claim Verification Flow"}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="vm-icon-btn">
            <span className="sr-only">Close</span>
            ×
          </button>
        </div>

        <div className="space-y-3">
          <div className="rounded-[1.35rem] border border-white/6 bg-white/[0.03] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <Lock className="h-4 w-4 text-[var(--primary)]" />
              {isRefund ? "Verifying your refund before withdrawal..." : "Verifying your payout before withdrawal..."}
            </p>
            <p className="mt-2 text-sm leading-7 text-white/58">
              {isRefund
                ? "Refunds are checked against cancelled market state and your recorded stake."
                : "Lit attestation runs when available, with on-chain verification remaining the fallback path."}
            </p>
          </div>

          {(stage === "lit" || stage === "submitting") && (
            <div className="flex items-center gap-3 rounded-[1.2rem] border border-white/6 bg-white/[0.03] px-4 py-3 text-sm text-white/72">
              <Loader2 className="h-4 w-4 animate-spin" />
              {stage === "lit"
                ? isRefund
                  ? "Preparing refund verification..."
                  : "Verifying payout eligibility..."
                : isRefund
                  ? "Submitting refund transaction..."
                  : "Submitting claim transaction..."}
            </div>
          )}

          {(stage === "ready" || stage === "done" || stage === "submitting") && (
            <div className="rounded-[1.35rem] border border-white/6 bg-white/[0.03] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Claim preview</div>
              <div className="mt-3 space-y-2 text-sm text-white/72">
                <p>{isRefund ? "Refund amount" : "Payout amount"}: {payoutLabel} ETH</p>
                <p>{isRefund ? "Source: cancelled market refund" : "Source: deterministic payout quote"}</p>
                {claimResult?.verifiedOutcome ? <p>Verified outcome: {claimResult.verifiedOutcome}</p> : null}
                {claimResult?.verifiedAccount ? <p>Verified wallet: {claimResult.verifiedAccount}</p> : null}
              </div>
            </div>
          )}

          {claimResult?.litAttestation ? (
            <div className="rounded-[1.35rem] border border-[var(--primary)]/16 bg-[var(--primary)]/8 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--primary)]">What Lit Verified</div>
              <div className="mt-3 space-y-1 text-sm text-white/74">
                <p>Verifier: Lit Action</p>
                <p>Action CID: {claimResult.litAttestation.actionCid}</p>
                <p>Network: {claimResult.litAttestation.network}</p>
                <p>Market ID: {claimResult.litAttestation.marketId}</p>
                <p>Wallet: {claimResult.litAttestation.account}</p>
                <p>Outcome: {claimResult.litAttestation.resolvedOutcome}</p>
                <p>Payout: {claimResult.litAttestation.expectedPayoutWei} wei</p>
                {claimResult.litAttestation.txHash ? <p>Tx Hash: {claimResult.litAttestation.txHash}</p> : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {claimResult.litAttestation.checks.map((check) => (
                  <span key={check} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold text-white/72">
                    {check}
                  </span>
                ))}
              </div>
            </div>
          ) : claimResult?.verifiedChecks?.length ? (
            <div className="rounded-[1.35rem] border border-white/6 bg-white/[0.03] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Verified Checks</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {claimResult.verifiedChecks.map((check) => (
                  <span key={check} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold text-white/72">
                    {check}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {stage === "error" ? <p className="text-sm font-medium text-[var(--danger)]">{error}</p> : null}

          {stage === "done" ? (
            <p className="flex items-center gap-2 rounded-[1.2rem] border border-emerald-400/18 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">
              <Sparkles className="h-4 w-4" />
              {isRefund
                ? "Refund submitted successfully."
                : claimResult?.mode === "lit"
                  ? "Claim submitted with Lit verification."
                  : "Claim submitted with on-chain verification."}
            </p>
          ) : (
            <button
              type="button"
              disabled={stage !== "ready"}
              onClick={submitClaim}
              className="vm-primary-btn w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefund ? "Claim Refund To Wallet" : "Claim To Wallet"}
            </button>
          )}

          {claimResult?.txHash ? <p className="text-xs text-white/45">Transaction: {claimResult.txHash}</p> : null}
        </div>
      </div>
    </div>
  );
}
