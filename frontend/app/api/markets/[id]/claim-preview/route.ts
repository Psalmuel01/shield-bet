import { NextRequest, NextResponse } from "next/server";
import { SettlementPlanUnavailableError, buildClaimPreview } from "@/lib/settlement-server";
import { logError } from "@/lib/telemetry";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const account = request.nextUrl.searchParams.get("account");

  if (!account) {
    return NextResponse.json({ error: "Missing account query parameter" }, { status: 400 });
  }

  let marketId: bigint;
  try {
    marketId = BigInt(id);
  } catch {
    return NextResponse.json({ error: "Invalid market id" }, { status: 400 });
  }

  try {
    const preview = await buildClaimPreview(marketId, account);
    return NextResponse.json(preview);
  } catch (error) {
    if (error instanceof SettlementPlanUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    logError("claim-preview-api", "failed to build claim preview", {
      marketId: marketId.toString(),
      account,
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: "Unable to prepare claim preview" }, { status: 500 });
  }
}
