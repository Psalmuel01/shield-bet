import { Address, bytesToHex, getAddress } from "viem";

export type BetOutcome = 1 | 2;

export interface EncryptedBetPayload {
  encOutcome: `0x${string}`;
  encAmount: `0x${string}`;
  inputProof: `0x${string}`;
}

interface EncryptBetParams {
  contractAddress: Address;
  userAddress: Address;
}

type FhevmWebModule = typeof import("@zama-fhe/relayer-sdk/web");
type FhevmInstance = Awaited<ReturnType<FhevmWebModule["createInstance"]>>;

const MAX_UINT64 = (1n << 64n) - 1n;
let fhevmInstancePromise: Promise<FhevmInstance> | null = null;

function getCustomFhevmConfig(chainId: number, network: string) {
  const acl = process.env.NEXT_PUBLIC_FHEVM_ACL_CONTRACT;
  const kms = process.env.NEXT_PUBLIC_FHEVM_KMS_CONTRACT;
  const inputVerifier = process.env.NEXT_PUBLIC_FHEVM_INPUT_VERIFIER_CONTRACT;
  const verifyDecrypt = process.env.NEXT_PUBLIC_FHEVM_VERIFY_DECRYPTION_CONTRACT;
  const verifyInput = process.env.NEXT_PUBLIC_FHEVM_VERIFY_INPUT_CONTRACT;
  const gatewayChainId = process.env.NEXT_PUBLIC_FHEVM_GATEWAY_CHAIN_ID;
  const relayerUrl = process.env.NEXT_PUBLIC_FHEVM_RELAYER_URL;

  const hasAllCustomVars =
    acl && kms && inputVerifier && verifyDecrypt && verifyInput && gatewayChainId && relayerUrl;

  if (!hasAllCustomVars) return null;

  return {
    aclContractAddress: getAddress(acl),
    kmsContractAddress: getAddress(kms),
    inputVerifierContractAddress: getAddress(inputVerifier),
    verifyingContractAddressDecryption: getAddress(verifyDecrypt),
    verifyingContractAddressInputVerification: getAddress(verifyInput),
    chainId,
    gatewayChainId: Number(gatewayChainId),
    relayerUrl,
    network
  };
}

async function getFhevmInstance(): Promise<FhevmInstance> {
  if (fhevmInstancePromise) return fhevmInstancePromise;

  fhevmInstancePromise = (async () => {
    const sdk = await import("@zama-fhe/relayer-sdk/web");

    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);
    const network = process.env.NEXT_PUBLIC_CHAIN_RPC_URL;

    if (!network) {
      throw new Error("Missing NEXT_PUBLIC_CHAIN_RPC_URL for FHEVM relayer encryption");
    }

    const customConfig = getCustomFhevmConfig(chainId, network);

    if (customConfig) {
      return sdk.createInstance(customConfig);
    }

    if (chainId === 11155111) {
      return sdk.createInstance({
        ...sdk.SepoliaConfig,
        network
      });
    }

    if (chainId === 1) {
      return sdk.createInstance({
        ...sdk.MainnetConfig,
        network
      });
    }

    throw new Error(
      "Unsupported chain for default FHEVM config. Set NEXT_PUBLIC_FHEVM_* env vars for custom relayer setup."
    );
  })();

  return fhevmInstancePromise;
}

export async function encryptBetInputs(
  outcome: BetOutcome,
  amountWei: bigint,
  params: EncryptBetParams
): Promise<EncryptedBetPayload> {
  if (amountWei <= 0n) {
    throw new Error("Bet amount must be positive");
  }

  if (amountWei > MAX_UINT64) {
    throw new Error("Bet amount exceeds euint64 limit");
  }

  const instance = await getFhevmInstance();
  const encryptedInput = instance.createEncryptedInput(getAddress(params.contractAddress), getAddress(params.userAddress));

  encryptedInput.add8(outcome);
  encryptedInput.add64(amountWei);

  const encrypted = await encryptedInput.encrypt();

  return {
    encOutcome: bytesToHex(encrypted.handles[0]) as `0x${string}`,
    encAmount: bytesToHex(encrypted.handles[1]) as `0x${string}`,
    inputProof: bytesToHex(encrypted.inputProof) as `0x${string}`
  };
}
