import { Address } from "viem";
import { shieldBetAbi } from "@/lib/abi";

const address = process.env.NEXT_PUBLIC_SHIELDBET_ADDRESS as Address | undefined;

if (!address) {
  console.warn("NEXT_PUBLIC_SHIELDBET_ADDRESS is not set");
}

export const shieldBetConfig = {
  address: (address || "0x0000000000000000000000000000000000000000") as Address,
  abi: shieldBetAbi
};
