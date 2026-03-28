"use client";

import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Lock, Shield, Sparkles } from "lucide-react";
import { InteractiveLink } from "@/components/interactive-link";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/markets", label: "Markets" },
  { href: "/my-bets", label: "My Bets" },
  { href: "/create", label: "Create Market" }
];

function truncateAddress(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/78 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/72">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <InteractiveLink
          href="/"
          pendingClassName="opacity-75"
          className="flex items-center gap-3 text-slate-900 transition hover:opacity-90 dark:text-slate-100"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-[0_14px_40px_-24px_rgba(79,70,229,0.95)]">
            <Shield className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-base font-semibold tracking-tight">ShieldBet</span>
            <span className="block text-[10px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Confidential markets
            </span>
          </span>
          <Lock className="h-4 w-4 text-indigo-500" />
        </InteractiveLink>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <InteractiveLink
                key={item.href}
                href={item.href}
                pendingClassName="opacity-80"
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-100 text-indigo-700 shadow-sm dark:bg-indigo-500/20 dark:text-indigo-300"
                    : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {item.label}
              </InteractiveLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ConnectButton.Custom>
            {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              if (!connected) {
                return (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-slate-800 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Connect Wallet
                    </span>
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openChainModal}
                    className="hidden rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 md:inline-flex"
                  >
                    {chain.name}
                  </button>
                  <button
                    type="button"
                    onClick={openAccountModal}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {truncateAddress(account.address)}
                  </button>
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 overflow-x-auto px-4 pb-3 md:hidden">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <InteractiveLink
              key={item.href}
              href={item.href}
              pendingClassName="opacity-80"
              className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                  : "bg-white/85 text-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
              }`}
            >
              {item.label}
            </InteractiveLink>
          );
        })}
      </div>
    </header>
  );
}
