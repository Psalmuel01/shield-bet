import {
  ArrowRight,
  BadgeCheck,
  Binary,
  EyeOff,
  Lock,
  Scale,
  Shield,
  Sparkles,
  Workflow
} from "lucide-react";
import { InteractiveLink } from "@/components/interactive-link";

const metrics = [
  {
    label: "Private by default",
    value: "Encrypted side",
    detail: "YES or NO stays encrypted on-chain until post-resolution settlement data is opened."
  },
  {
    label: "Honest v1 design",
    value: "Public ETH stake",
    detail: "The amount you escrow is public, which keeps payout math clean, deterministic, and auditable."
  },
  {
    label: "Automation-ready",
    value: "Lit + signer flow",
    detail: "Claims are wired for signer authorization now, and can move to PKP-backed automation next."
  }
];

const features = [
  {
    icon: Shield,
    title: "Confidential market side",
    body: "ShieldBet uses Zama fhEVM so market side selection can stay encrypted during market activity."
  },
  {
    icon: Scale,
    title: "Deterministic payout path",
    body: "Winnings are computed from the public pool and public stake, not manual payout numbers."
  },
  {
    icon: Workflow,
    title: "Lit-ready settlement",
    body: "The contract now supports signer-authorized resolution and claim flows, which is the clean bridge to PKP automation."
  }
];

const steps = [
  {
    title: "Create a market",
    body: "Define the question, close time, and resolution criteria. Metadata is stored with the market from day one."
  },
  {
    title: "Place a confidential side",
    body: "Users stake ETH publicly, but their YES or NO side is encrypted before it ever touches the chain."
  },
  {
    title: "Resolve and claim",
    body: "After close, the market resolves, settlement opens, and eligible winners claim through the signed authorization flow."
  }
];

export default function Home() {
  return (
    <section className="space-y-10 md:space-y-12">
      <div className="hero-frame">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="relative">
            <p className="eyebrow">
              <Shield className="h-3.5 w-3.5" />
              Confidential prediction markets
            </p>

            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl dark:text-slate-50">
              Trade conviction without broadcasting your side to the market.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg dark:text-slate-300">
              ShieldBet is an honest confidential-markets prototype: your side is encrypted with Zama fhEVM, your ETH
              stake settles cleanly on-chain, and the claim flow is already wired for stronger Lit-powered automation.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <InteractiveLink
                href="/markets"
                pendingClassName="scale-[0.99] opacity-85"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-slate-800 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Explore markets
                <ArrowRight className="h-4 w-4" />
              </InteractiveLink>
              <InteractiveLink
                href="/create"
                pendingClassName="scale-[0.99] opacity-85"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/85 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:scale-[1.02] hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-100 dark:hover:border-slate-600"
              >
                <Lock className="h-4 w-4" />
                Launch a market
              </InteractiveLink>
            </div>

            <div className="mt-8 flex flex-wrap gap-5 text-sm text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-500" />
                Encrypted side selection
              </span>
              <span className="inline-flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-500" />
                Public ETH settlement
              </span>
              <span className="inline-flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-500" />
                Lit-ready authorization
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="surface-muted overflow-hidden p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Live product model
                </p>
                <Sparkles className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="mt-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Encrypted side, public stake</p>
                <p className="mt-2 text-sm leading-6 text-emerald-800/85 dark:text-emerald-100/80">
                  ShieldBet v1 is deliberately honest: confidentiality protects the side selection, while stake size stays public so payouts remain verifiable.
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <Binary className="h-4 w-4 text-indigo-500" />
                    Zama fhEVM
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Encrypts the market side before submission and preserves that secrecy on-chain.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <Workflow className="h-4 w-4 text-cyan-500" />
                    Lit transition path
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Claim authorization is already structured so we can replace the server signer with a PKP cleanly.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="stat-card">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">{metric.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{metric.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="feature-card">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-indigo-500">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{feature.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">{feature.body}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface p-6 md:p-7">
          <p className="eyebrow">
            <EyeOff className="h-3.5 w-3.5" />
            Why this matters
          </p>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 md:text-3xl">
            Better market privacy without pretending the settlement model is magic.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
            Most crypto prediction interfaces default to full transparency. ShieldBet takes a narrower but more credible
            route: hide the side people choose while keeping ETH settlement measurable and auditable.
          </p>
          <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-4 dark:border-slate-800 dark:bg-slate-900/65">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Current trust model</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Resolution and claim authorization are already signer-based. That lets us demo a serious contract surface now,
              while keeping the next step to Lit PKPs straightforward.
            </p>
          </div>
        </div>

        <div className="surface p-6 md:p-7">
          <p className="eyebrow">
            <Workflow className="h-3.5 w-3.5" />
            End-to-end flow
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-slate-50">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="surface overflow-hidden p-6 md:p-7">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Ready to explore
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 md:text-3xl">
              Open the markets, place a side, and see the v1 confidentiality model in motion.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              If a page still feels slow, it is usually because the next route is hydrating a client-heavy screen and
              loading chain data. The new click feedback and route skeletons should make that delay feel intentional
              instead of broken.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <InteractiveLink
              href="/markets"
              pendingClassName="scale-[0.99] opacity-85"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-indigo-400"
            >
              Browse markets
              <ArrowRight className="h-4 w-4" />
            </InteractiveLink>
            <InteractiveLink
              href="/my-bets"
              pendingClassName="scale-[0.99] opacity-85"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/90 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:scale-[1.02] dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
            >
              View portfolio
            </InteractiveLink>
          </div>
        </div>
      </div>
    </section>
  );
}
