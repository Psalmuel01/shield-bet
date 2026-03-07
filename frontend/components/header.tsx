"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  return (
    <header className="app-header">
      <Link href="/markets" className="brand">
        ShieldBet
      </Link>
      <nav className="nav-links">
        <Link href="/markets">Markets</Link>
      </nav>
      <ConnectButton chainStatus="icon" showBalance={false} />
    </header>
  );
}
