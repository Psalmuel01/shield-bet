import { NextRequest, NextResponse } from "next/server";

interface ClaimRequest {
  marketId: string;
  account: string;
  txHash: string;
  expectedPayoutWei: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ClaimRequest;

  if (!body.marketId || !body.account || !body.txHash) {
    return NextResponse.json({ error: "Missing claim payload fields" }, { status: 400 });
  }

  // This route is the integration seam for Lit Actions + PKP execution.
  // If Lit secrets/config are absent, we intentionally return mock mode for local demos.
  const litActionCid = process.env.LIT_ACTION_CID;

  if (!litActionCid) {
    return NextResponse.json({
      mode: "mock",
      plaintextPayoutWei: body.expectedPayoutWei || "0"
    });
  }

  return NextResponse.json({
    mode: "lit",
    actionCid: litActionCid,
    plaintextPayoutWei: body.expectedPayoutWei || "0"
  });
}
