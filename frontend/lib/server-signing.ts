import { getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { shieldBetConfig } from "@/lib/contract";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);

function normalizePrivateKey(value: string | undefined) {
  if (!value) return null;
  return value.startsWith("0x") ? (value as `0x${string}`) : (`0x${value}` as `0x${string}`);
}

function getPrivateKey(kind: "resolver" | "settlement") {
  if (kind === "resolver") {
    return normalizePrivateKey(
      process.env.SHIELDBET_RESOLVER_SIGNER_PRIVATE_KEY ||
        process.env.SHIELDBET_SERVER_SIGNER_PRIVATE_KEY ||
        process.env.DEPLOYER_PRIVATE_KEY
    );
  }

  return normalizePrivateKey(
    process.env.SHIELDBET_SETTLEMENT_SIGNER_PRIVATE_KEY ||
      process.env.SHIELDBET_SERVER_SIGNER_PRIVATE_KEY ||
      process.env.DEPLOYER_PRIVATE_KEY
  );
}

function getDomain() {
  if (shieldBetConfig.address === "0x0000000000000000000000000000000000000000") {
    throw new Error("NEXT_PUBLIC_SHIELDBET_ADDRESS is not configured.");
  }

  return {
    name: "ShieldBet",
    version: "1",
    chainId: CHAIN_ID,
    verifyingContract: shieldBetConfig.address
  } as const;
}

export async function signSettlementClaimAuth({
  marketId,
  claimant,
  resolvedOutcome,
  totalWinningSide,
  expiry
}: {
  marketId: bigint;
  claimant: `0x${string}`;
  resolvedOutcome: number;
  totalWinningSide: bigint;
  expiry: bigint;
}) {
  const privateKey = getPrivateKey("settlement");
  if (!privateKey) {
    throw new Error("SHIELDBET_SETTLEMENT_SIGNER_PRIVATE_KEY is not configured.");
  }

  const account = privateKeyToAccount(privateKey);
  const signature = await account.signTypedData({
    domain: getDomain(),
    primaryType: "ClaimAuth",
    types: {
      ClaimAuth: [
        { name: "marketId", type: "uint256" },
        { name: "claimant", type: "address" },
        { name: "resolvedOutcome", type: "uint8" },
        { name: "totalWinningSide", type: "uint256" },
        { name: "expiry", type: "uint256" }
      ]
    },
    message: {
      marketId,
      claimant,
      resolvedOutcome,
      totalWinningSide,
      expiry
    }
  });

  return {
    signer: getAddress(account.address),
    signature
  };
}
