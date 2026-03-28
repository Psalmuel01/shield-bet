"use client";

import Link from "next/link";
import { formatEther } from "viem";

export interface MyBetRow {
  marketId: bigint;
  question: string;
  position: string;
  amountWei: string;
  status: "Open" | "Awaiting Resolution" | "Awaiting Payout" | "Won" | "Lost" | "Proposed" | "Disputed" | "Finalized" | "Claimed" | "Cancelled";
  canClaim: boolean;
  claimType?: "winnings" | "refund";
}

interface MyBetsTableProps {
  rows: MyBetRow[];
}

function formatEthValue(valueWei: string) {
  return `${Number(formatEther(BigInt(valueWei || "0"))).toFixed(4)} ETH`;
}

export function MyBetsTable({ rows }: MyBetsTableProps) {
  if (!rows.length) {
    return (
      <div className="surface p-12 text-center space-y-3">
        <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
          <span className="text-2xl">🗳️</span>
        </div>
        <h2 className="text-xl font-bold dark:text-white">No positions yet</h2>
        <p className="text-slate-500 max-w-xs mx-auto text-sm">You haven't placed any bets yet. Start by exploring active markets.</p>
        <div className="pt-2">
          <Link
            href="/markets"
            className="rounded-2xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-500/20 active:scale-95"
          >
            Explore Markets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="surface overflow-hidden border border-slate-100 dark:border-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/50 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              <th className="px-6 py-4">Market Details</th>
              <th className="px-6 py-4">Your Position</th>
              <th className="px-6 py-4">Staked Amount</th>
              <th className="px-6 py-4">Current Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row) => (
              <tr key={row.marketId.toString()} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                <td className="px-6 py-5 max-w-md">
                  <Link href={`/markets/${row.marketId}`} className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {row.question}
                  </Link>
                  <p className="mt-1 text-[10px] font-mono text-slate-400">ID #{row.marketId.toString()}</p>
                </td>
                <td className="px-6 py-5">
                  <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold leading-none ${row.position === "Encrypted" ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                    }`}>
                    {row.position}
                  </span>
                </td>
                <td className="px-6 py-5 font-mono font-bold text-slate-700 dark:text-slate-300">
                  {formatEthValue(row.amountWei)}
                </td>
                <td className="px-6 py-5">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${row.status === "Open" ? "bg-emerald-100 text-emerald-700" :
                      row.status === "Won" || row.status === "Claimed" ? "bg-indigo-100 text-indigo-700" :
                        "bg-slate-100 text-slate-500"
                    }`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  {row.canClaim ? (
                    <Link
                      href={`/markets/${row.marketId}`}
                      className="inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/10 transition-all hover:bg-indigo-500 hover:scale-105 active:scale-95"
                    >
                      {row.claimType === "refund" ? "Claim Refund" : "Withdraw Payout"}
                    </Link>
                  ) : (
                    <Link
                      href={`/markets/${row.marketId}`}
                      className="inline-flex rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                    >
                      Manage
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
