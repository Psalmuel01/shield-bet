"use client";

import { Lock, Shield, Check } from "lucide-react";

interface BetPlacementProps {
  selectedOutcome: number;
  outcomeLabels: string[];
  amount: string;
  balanceLabel: string;
  alreadyBet: boolean;
  isSubmitting: boolean;
  submitLabel: string;
  statusHint: string;
  onSelectOutcome: (next: number) => void;
  onAmountChange: (next: string) => void;
  onMax: () => void;
  onSubmit: () => void;
}

export function BetPlacement({
  selectedOutcome,
  outcomeLabels,
  amount,
  balanceLabel,
  alreadyBet,
  isSubmitting,
  submitLabel,
  statusHint,
  onSelectOutcome,
  onAmountChange,
  onMax,
  onSubmit
}: BetPlacementProps) {
  return (
    <div className="surface p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Select Position</h2>
        <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Lock className="h-3 w-3" /> Encrypted
        </div>
      </div>

      <div className="grid gap-3">
        {outcomeLabels.map((label, idx) => {
          const isSelected = selectedOutcome === idx;
          return (
            <button
              key={idx}
              type="button"
              disabled={alreadyBet || isSubmitting}
              onClick={() => onSelectOutcome(idx)}
              className={`group relative flex items-center justify-between rounded-2xl border-2 p-4 text-left transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${isSelected
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/5 ring-4 ring-indigo-500/10"
                  : "border-slate-100 bg-white hover:border-slate-200 dark:border-slate-800 dark:bg-slate-950"
                }`}
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${isSelected ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-200 dark:border-slate-700"
                  }`}>
                  {isSelected ? <Check className="h-3.5 w-3.5 stroke-[3px]" /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                </div>
                <span className={`font-bold transition-colors ${isSelected ? "text-indigo-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>
                  {label}
                </span>
              </div>
              {isSelected && <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />}
            </button>
          );
        })}
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <label htmlFor="amount" className="text-sm font-bold uppercase tracking-widest text-slate-400">
            Stake Amount (ETH)
          </label>
          <span className="text-xs font-medium text-slate-500">Available: {balanceLabel}</span>
        </div>
        <div className="relative group">
          <input
            id="amount"
            value={amount}
            disabled={alreadyBet || isSubmitting}
            onChange={(event) => onAmountChange(event.target.value)}
            className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-xl font-bold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950"
            placeholder="0.00"
          />
          <button
            type="button"
            disabled={alreadyBet || isSubmitting}
            onClick={onMax}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-xl bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-slate-800 active:scale-95 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500"
          >
            MAX
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-indigo-900 p-5 text-white shadow-xl shadow-indigo-900/20 dark:shadow-indigo-500/10">
        <div className="flex items-start gap-4">
          <div className="mt-1 rounded-full bg-indigo-800 p-2">
            <Shield className="h-5 w-5 text-indigo-300" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-300">Confidential Processing</p>
            <p className="mt-1 text-sm leading-relaxed text-indigo-100 font-medium">
              {statusHint}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={alreadyBet || isSubmitting}
        onClick={onSubmit}
        className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-slate-900 py-5 text-lg font-bold text-white transition-all hover:bg-slate-800 hover:shadow-2xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:shadow-indigo-500/20"
      >
        <Lock className={`h-5 w-5 transition-transform group-hover:rotate-12 ${isSubmitting ? "animate-pulse" : ""}`} />
        {submitLabel}
      </button>
    </div>
  );
}
