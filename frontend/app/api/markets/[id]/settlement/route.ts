import { NextRequest, NextResponse } from "next/server";
import { SettlementPlanUnavailableError, buildSettlementPlan } from "@/lib/settlement-server";
import { logError } from "@/lib/telemetry";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let marketId: bigint;
  try {
    marketId = BigInt(id);
  } catch {
    return NextResponse.json({ error: "Invalid market id" }, { status: 400 });
  }

  try {
    const settlementPlan = await buildSettlementPlan(marketId);
    return NextResponse.json(settlementPlan);
  } catch (error) {
    if (error instanceof SettlementPlanUnavailableError) {
      return NextResponse.json(
        {
          error: error.message,
          ...(error.details || {})
        },
        { status: error.status }
      );
    }

    logError("settlement-api", "failed to build settlement plan", {
      marketId: marketId.toString(),
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: "Unable to generate settlement plan" }, { status: 500 });
  }
}
