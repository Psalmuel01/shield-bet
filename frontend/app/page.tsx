"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  EyeOff,
  Gavel,
  Lock,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Zap
} from "lucide-react";
import { InteractiveLink } from "@/components/interactive-link";

const tickerItems = [
  "ETH > $6k by December 2026",
  "BTC dominance above 60%",
  "Solana ETF approved in 2026",
  "US spot rates cut before Q4",
  "AI regulation bill passes Senate",
  "Nigeria launches new digital bond"
];

const stats = [
  { icon: Activity, label: "Encrypted markets", value: "Live" },
  { icon: Users, label: "Wallet-native UX", value: "RainbowKit" },
  { icon: TrendingUp, label: "Private side logic", value: "Zama fhEVM" },
  { icon: Shield, label: "Claim verification", value: "Lit-ready" }
];

const steps = [
  {
    icon: Shield,
    tag: "Step 01",
    title: "Browse confidential markets",
    body: "Explore active prediction markets without exposing how other traders are positioned. Market activity remains intentionally abstracted."
  },
  {
    icon: Lock,
    tag: "Step 02",
    title: "Bet with encrypted side selection",
    body: "ShieldBet encrypts your YES or NO choice with Zama fhEVM tooling before it hits the contract, keeping your directional conviction hidden on-chain."
  },
  {
    icon: Gavel,
    tag: "Step 03",
    title: "Resolve and verify with Lit-aware flows",
    body: "When markets settle, winners claim through a verification path designed to plug cleanly into Lit-backed authorization and attestations."
  }
];

const features = [
  {
    icon: Lock,
    title: "Encrypted market side",
    body: "Outcome selection stays confidential. Traders do not leak their directional edge while the market is open."
  },
  {
    icon: EyeOff,
    title: "No noisy public order book",
    body: "Instead of a manipulative feed of visible positions, ShieldBet emphasizes aggregate activity and cleaner price discovery."
  },
  {
    icon: CheckCircle2,
    title: "Honest v1 settlement model",
    body: "ETH stake is public, encrypted choice stays private, and the payout path is structured so the trust boundaries are explicit instead of hand-wavy."
  },
  {
    icon: Zap,
    title: "Built for the next protocol layer",
    body: "The interface already reflects the endgame: Zama for confidential compute, Lit for programmable authorization, and a cleaner settlement UX."
  }
];

function LandingWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ mounted, account, chain, openConnectModal, openAccountModal }) => {
        const connected = mounted && account && chain;
        if (!connected) {
          return (
            <button type="button" onClick={openConnectModal} className="vm-wallet-btn">
              <Sparkles className="h-4 w-4" />
              <span>Connect Wallet</span>
            </button>
          );
        }

        return (
          <button type="button" onClick={openAccountModal} className="vm-wallet-btn">
            <span>{account.address.slice(0, 6)}...{account.address.slice(-4)}</span>
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <div className="noise-texture" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,228,180,0.1),transparent_22%),radial-gradient(circle_at_top_right,rgba(108,142,255,0.12),transparent_20%),linear-gradient(180deg,#030711_0%,#060b16_40%,#0b1120_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-16 pt-5 md:px-6 lg:px-8">
        <header className="mb-10 flex items-center justify-between gap-4 rounded-[1.75rem] border border-white/8 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
          <InteractiveLink href="/" className="flex items-center gap-4" pendingClassName="opacity-80">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00e4b4] to-[#6c8eff] text-[#081018] shadow-[0_20px_50px_-28px_rgba(108,142,255,0.8)]">
              <Shield className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-['Sora'] text-lg font-bold tracking-tight">ShieldBet</span>
              <span className="block text-[10px] uppercase tracking-[0.22em] text-white/45">Confidential prediction markets</span>
            </span>
          </InteractiveLink>

          <nav className="hidden items-center gap-2 md:flex">
            <InteractiveLink href="/markets" className="rounded-xl px-4 py-2 text-sm font-semibold text-white/72 transition hover:bg-white/6 hover:text-white">Markets</InteractiveLink>
            <InteractiveLink href="/my-bets" className="rounded-xl px-4 py-2 text-sm font-semibold text-white/72 transition hover:bg-white/6 hover:text-white">My Bets</InteractiveLink>
            <InteractiveLink href="/create" className="rounded-xl px-4 py-2 text-sm font-semibold text-white/72 transition hover:bg-white/6 hover:text-white">Create Market</InteractiveLink>
          </nav>

          <LandingWalletButton />
        </header>

        <section className="grid flex-1 gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00e4b4]/20 bg-[#00e4b4]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#00e4b4]">
              <Sparkles className="h-3.5 w-3.5" />
              Zama + Lit market stack
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl font-['Sora'] text-5xl font-extrabold leading-[1.02] tracking-tight md:text-6xl lg:text-7xl">
                Prediction markets with a <span className="bg-gradient-to-r from-[#00e4b4] to-[#6c8eff] bg-clip-text text-transparent">confidential core.</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-white/68 md:text-xl">
                ShieldBet brings the VeilMarkets-style interface into your Zama and Lit workflow: encrypted side selection, cleaner market discovery, and a product surface that actually feels like a serious trading app.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <InteractiveLink href="/markets" className="vm-primary-btn min-w-[12rem]" pendingClassName="opacity-85">
                Enter Markets
                <ArrowRight className="h-4 w-4" />
              </InteractiveLink>
              <InteractiveLink href="/create" className="vm-secondary-btn min-w-[12rem]" pendingClassName="opacity-85">
                Create Market
              </InteractiveLink>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => (
                <div key={item.label} className="rounded-[1.35rem] border border-white/8 bg-white/[0.04] p-4 backdrop-blur-xl">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/6 text-[#00e4b4]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">{item.label}</div>
                  <div className="mt-2 font-['Sora'] text-xl font-bold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="overflow-hidden rounded-[2rem] border border-white/8 bg-white/[0.04] backdrop-blur-2xl">
              <div className="border-b border-white/6 p-5">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#00e4b4]">
                  <Activity className="h-3.5 w-3.5" />
                  Live encrypted tape
                </div>
                <div className="overflow-hidden">
                  <div className="flex min-w-max animate-[ticker_28s_linear_infinite] gap-8 whitespace-nowrap text-sm text-white/70 [animation-play-state:running]">
                    {[...tickerItems, ...tickerItems].map((item, index) => (
                      <span key={`${item}-${index}`} className="flex items-center gap-3">
                        <span className="h-2 w-2 rounded-full bg-[#00e4b4]" />
                        <span>{item}</span>
                        <span className="text-[#6c8eff]">encrypted</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/6 bg-[#081018]/80 p-5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Private flow</div>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">Input</div>
                      <div className="mt-2 flex items-center gap-3 text-white/82"><Lock className="h-4 w-4 text-[#00e4b4]" /> Encrypted side selection</div>
                    </div>
                    <div className="rounded-2xl border border-[#00e4b4]/15 bg-[#00e4b4]/6 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-[#00e4b4]/80">Execution</div>
                      <div className="mt-2 font-semibold text-white">fhEVM updates private state without revealing your direction.</div>
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">Verification</div>
                      <div className="mt-2 flex items-center gap-3 text-white/82"><CheckCircle2 className="h-4 w-4 text-[#6c8eff]" /> Lit-ready claim attestation path</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/6 bg-white/[0.03] p-5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">What stays hidden</div>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-white/6 bg-black/20 p-4">
                      <div className="text-sm font-semibold text-white">Your directional conviction</div>
                      <div className="mt-2 text-sm leading-7 text-white/62">ShieldBet encrypts the side you picked before the transaction reaches the contract.</div>
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-black/20 p-4">
                      <div className="text-sm font-semibold text-white">Public market noise</div>
                      <div className="mt-2 text-sm leading-7 text-white/62">The interface intentionally avoids exposing a misleading public feed of exact positions.</div>
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-black/20 p-4">
                      <div className="text-sm font-semibold text-white">Settlement ambiguity</div>
                      <div className="mt-2 text-sm leading-7 text-white/62">The product copy stays honest about what Zama does, what Lit does, and where the trust boundary lives today.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-white/8 bg-white/[0.04] p-7 backdrop-blur-xl">
            <div className="mb-5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#00e4b4]">How it works</div>
            <div className="space-y-5">
              {steps.map((step) => (
                <div key={step.tag} className="rounded-[1.4rem] border border-white/6 bg-black/20 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-[#00e4b4]">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">{step.tag}</span>
                  </div>
                  <h3 className="font-['Sora'] text-xl font-bold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-white/62">{step.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-[1.75rem] border border-white/8 bg-white/[0.04] p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#00e4b4]/18 hover:bg-white/[0.06]">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-white/8 to-transparent text-[#00e4b4]">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-['Sora'] text-xl font-bold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/64">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-[2.25rem] border border-white/8 bg-[linear-gradient(135deg,rgba(0,228,180,0.12),rgba(108,142,255,0.08),rgba(255,255,255,0.03))] p-8 text-center backdrop-blur-xl md:p-12">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/72">
              <ChevronRight className="h-3.5 w-3.5 text-[#00e4b4]" />
              Built for real protocol integration
            </div>
            <h2 className="font-['Sora'] text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              The UI now matches the ambition of the protocol.
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-8 text-white/68">
              Explore the markets experience, create a new confidential market, and test the portfolio and detail flows against your live Zama and Lit-aware integration stack.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-3">
              <InteractiveLink href="/markets" className="vm-primary-btn min-w-[12rem]" pendingClassName="opacity-85">
                Explore Markets
              </InteractiveLink>
              <InteractiveLink href="/create" className="vm-secondary-btn min-w-[12rem]" pendingClassName="opacity-85">
                Launch a Market
              </InteractiveLink>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
