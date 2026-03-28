import {
  ArrowRight,
  BadgeCheck,
  Binary,
  EyeOff,
  Lock,
  Scale,
  Shield,
  Sparkles,
  Workflow,
  Gavel,
  Layers
} from "lucide-react";
import { InteractiveLink } from "@/components/interactive-link";

const metrics = [
  {
    label: "Confidentiality",
    value: "Zama fhEVM",
    detail: "Outcome selection stays encrypted on-chain, protecting your edge from the market."
  },
  {
    label: "Resolution",
    value: "Optimistic Oracle",
    detail: "Decentralized resolution with 90/10 stake rewards for honest reporting."
  },
  {
    label: "Market Depth",
    value: "Categorical Support",
    detail: "Binary or N-outcome markets with dynamic liquidity and encrypted participation."
  }
];

const features = [
  {
    icon: Shield,
    title: "Privacy-Preserving Betting",
    body: "Trade any outcome with full encryption. Your specific position is never revealed, only your stake is public."
  },
  {
    icon: Gavel,
    title: "Optimistic Oracle",
    body: "Propose outcomes and win rewards. Our dispute system ensures accurate resolution through crypto-economic incentives."
  },
  {
    icon: Layers,
    title: "Categorical Markets",
    body: "Go beyond Yes/No. ShieldBet supports complex multi-outcome markets for sports, politics, and more."
  }
];

export default function Home() {
  return (
    <section className="space-y-16 md:space-y-24 pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 px-8 py-20 text-white lg:px-16 lg:py-32 shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />

        <div className="relative z-10 grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-400">
              <Sparkles className="h-3.5 w-3.5" />
              Private Prediction Markets v1
            </div>
            
            <h1 className="text-5xl font-black tracking-tight md:text-7xl lg:leading-[1.1]">
              Predict with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Full Secrecy.</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-slate-400 font-medium">
              ShieldBet combines Zama's FHE technology with an Optimistic Oracle to create the world's first categorical, privacy-first prediction market.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <InteractiveLink
                href="/markets"
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-indigo-500 px-8 py-4 text-sm font-bold text-white transition-all hover:bg-indigo-400 hover:shadow-2xl hover:shadow-indigo-500/40 active:scale-95"
              >
                Launch App
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </InteractiveLink>
              <InteractiveLink
                href="/create"
                className="inline-flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800/50 px-8 py-4 text-sm font-bold text-slate-200 transition-all hover:bg-slate-800 hover:border-slate-600 active:scale-95"
              >
                <Lock className="h-4 w-4" />
                Host Market
              </InteractiveLink>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/5 bg-white/5 p-8 backdrop-blur-xl">
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2">
                <Binary className="h-4 w-4" /> Live Protocol Stats
              </div>
              <div className="space-y-6">
                {metrics.map((m) => (
                  <div key={m.label} className="group cursor-default">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">{m.label}</p>
                    <p className="mt-1 text-xl font-bold text-white transition-all group-hover:translate-x-1">{m.value}</p>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed font-medium">{m.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {features.map((f, i) => (
          <div key={i} className="surface group p-8 space-y-5 hover:border-indigo-500/50 transition-colors">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-indigo-400 dark:bg-indigo-500 shadow-xl shadow-indigo-500/10 group-hover:scale-110 transition-transform">
              <f.icon className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{f.title}</h3>
            <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 font-medium">{f.body}</p>
          </div>
        ))}
      </div>

      {/* Trust Model Section */}
      <div className="surface p-10 lg:p-16 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-500/5 to-transparent" />
        <div className="max-w-3xl relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-500">
            <Gavel className="h-4 w-4" />
            Governance & Trust
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-950 dark:text-white leading-[1.1]">
            Optimistically Honest. <br/>
            <span className="text-slate-400">Cryptographically Secure.</span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            ShieldBet doesn't just promise privacy. We use Zama's Fully Homomorphic Encryption to ensure that even the validators cannot see which side you're betting on. Combined with an optimistic oracle, resolution is decentralised, fair, and fast.
          </p>
          <div className="flex gap-4 pt-4">
             <div className="flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-bold dark:bg-slate-800">
               <Scale className="h-4 w-4 text-emerald-400" /> 90/10 Reward Model
             </div>
             <div className="flex items-center gap-2 rounded-xl bg-slate-100 text-slate-900 px-4 py-2 text-xs font-bold dark:bg-slate-800 dark:text-white">
               <Workflow className="h-4 w-4 text-indigo-500" /> Zama fhEVM
             </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-indigo-600 rounded-[2.5rem] p-12 lg:p-20 text-center space-y-8 relative overflow-hidden shadow-2xl shadow-indigo-500/20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 to-transparent pointer-events-none opacity-50" />
        <h2 className="text-3xl md:text-5xl font-black text-white relative z-10">Start Trading Conviction.</h2>
        <p className="text-indigo-100 max-w-xl mx-auto font-medium text-lg relative z-10 opacity-80">
          Join the next generation of privacy-first prediction markets.
        </p>
        <div className="flex flex-wrap justify-center gap-4 relative z-10 pt-4">
          <InteractiveLink
            href="/markets"
            className="rounded-2xl bg-white px-10 py-5 text-sm font-black text-indigo-600 shadow-xl shadow-white/10 transition-all hover:scale-105 active:scale-95"
          >
            ENTER MARKETS
          </InteractiveLink>
          <InteractiveLink
            href="/create"
            className="rounded-2xl bg-indigo-700 px-10 py-5 text-sm font-black text-white shadow-xl shadow-indigo-800/20 transition-all hover:scale-105 active:scale-95 border border-indigo-400/30"
          >
            CREATE MARKET
          </InteractiveLink>
        </div>
      </div>
    </section>
  );
}
