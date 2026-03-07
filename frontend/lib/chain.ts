import { defineChain } from "viem";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8009);
const rpcUrl = process.env.NEXT_PUBLIC_CHAIN_RPC_URL || "https://rpc.zama.example";
const chainName = process.env.NEXT_PUBLIC_CHAIN_NAME || "Zama Testnet";
const explorer = process.env.NEXT_PUBLIC_CHAIN_EXPLORER || "https://explorer.zama.example";

export const zamaChain = defineChain({
  id: chainId,
  name: chainName,
  network: "zama-testnet",
  nativeCurrency: {
    name: "Zama ETH",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [rpcUrl]
    }
  },
  blockExplorers: {
    default: {
      name: "Zama Explorer",
      url: explorer
    }
  },
  testnet: true
});
