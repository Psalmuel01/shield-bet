import { Lock, TrendingUp } from "lucide-react";
import { MarketsDashboard } from "@/components/markets-dashboard";

export default function MarketsPage() {
  return (
    <section className="vm-page page-enter">
      <div className="vm-page-header">
        <div>
          <div className="vm-page-header__meta">
            <span className="vm-page-eyebrow">
              <Lock className="h-3.5 w-3.5" />
              Live Prediction Ecosystem
            </span>
          </div>
          <h1 className="vm-page-title mt-5">
            Explore <span className="vm-text-gradient">Markets</span>
          </h1>
          <p className="vm-page-subtitle mt-4">
            Discover confidential prediction markets built around encrypted position selection. ShieldBet keeps Zama and Lit context intact while adopting a sharper, denser market browsing experience.
          </p>
        </div>

        <div className="vm-card w-full max-w-sm bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent)] lg:ml-auto">
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
            <TrendingUp className="h-4 w-4" />
            Network Pulse
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3">
              <span className="text-sm text-[var(--text-muted)]">Confidentiality</span>
              <span className="font-mono text-sm font-bold text-white dark:text-white">Encrypted side</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3">
              <span className="text-sm text-[var(--text-muted)]">Settlement</span>
              <span className="font-mono text-sm font-bold text-white dark:text-white">ETH pool</span>
            </div>
          </div>
        </div>
      </div>

      <MarketsDashboard />
    </section>
  );
}
