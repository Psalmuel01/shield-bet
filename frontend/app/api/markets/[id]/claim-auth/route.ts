import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { buildClaimPreview } from "@/lib/settlement-server";
import { signSettlementClaimAuth } from "@/lib/server-signing";
import { logError, logInfo } from "@/lib/telemetry";

export const runtime = "nodejs";

const DEFAULT_EXPIRY_SECONDS = Number(process.env.SHIELDBET_CLAIM_AUTH_EXPIRY_SECONDS || 900);

interface ClaimAuthRequest {
  account?: string;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as ClaimAuthRequest;

  if (!body.account || !isAddress(body.account)) {
    return NextResponse.json({ error: "A valid account is required." }, { status: 400 });
  }

  let marketId: bigint;
  try {
    marketId = BigInt(id);
  } catch {
    return NextResponse.json({ error: "Invalid market id" }, { status: 400 });
  }

  try {
    const preview = await buildClaimPreview(marketId, body.account);
    if (!preview.eligible) {
      return NextResponse.json(
        {
          error: preview.reason || "This wallet is not eligible to claim.",
          preview
        },
        { status: 409 }
      );
    }

    if (preview.mode !== "signed-winner") {
      return NextResponse.json(
        {
          error: "Signed claim authorization is only used for winner claims in the current flow.",
          preview
        },
        { status: 409 }
      );
    }

    const expiry = BigInt(Math.floor(Date.now() / 1000) + DEFAULT_EXPIRY_SECONDS);
    const totalWinningSide = BigInt(preview.totalWinningSideWei);
    const resolvedOutcome = Number(preview.resolvedOutcome);

    const { signature, signer } = await signSettlementClaimAuth({
      marketId,
      claimant: preview.account,
      resolvedOutcome,
      totalWinningSide,
      expiry
    });

    const response = {
      marketId: preview.marketId,
      account: preview.account,
      expectedPayoutWei: preview.expectedPayoutWei,
      totalWinningSideWei: preview.totalWinningSideWei,
      resolvedOutcome: preview.resolvedOutcome,
      expiry: expiry.toString(),
      signature,
      signer,
      checks: [...preview.checks, "settlement signer authorized this claim"],
      reason: preview.reason
    };

    logInfo("claim-auth-api", "issued claim authorization", response);
    return NextResponse.json(response);
  } catch (error) {
    logError("claim-auth-api", "failed to sign claim authorization", {
      marketId: marketId.toString(),
      account: body.account,
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to authorize claim" }, { status: 500 });
  }
}
