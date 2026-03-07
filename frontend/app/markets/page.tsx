import { MarketsDashboard } from "@/components/markets-dashboard";

export default function MarketsPage() {
  return (
    <section className="page-section">
      <div className="section-header">
        <p className="eyebrow">ShieldBet Markets</p>
        <h1>Encrypted Positions, Honest Price Discovery</h1>
      </div>
      <MarketsDashboard />
    </section>
  );
}
