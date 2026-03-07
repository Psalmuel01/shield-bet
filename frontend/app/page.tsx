import Link from "next/link";

export default function Home() {
  return (
    <section className="hero">
      <p className="eyebrow">PL Genesis 2026</p>
      <h1>Confidential prediction markets without position sniping.</h1>
      <p>
        ShieldBet encrypts stake sizes and outcomes end-to-end. Bettors reveal only what they choose after market
        settlement.
      </p>
      <Link href="/markets" className="btn">
        Enter Markets
      </Link>
    </section>
  );
}
