export interface RuntimeDiagnostic {
  severity: "error" | "warning";
  message: string;
}

function hasCustomFhevmEnv() {
  const required = [
    process.env.NEXT_PUBLIC_FHEVM_ACL_CONTRACT,
    process.env.NEXT_PUBLIC_FHEVM_KMS_CONTRACT,
    process.env.NEXT_PUBLIC_FHEVM_INPUT_VERIFIER_CONTRACT,
    process.env.NEXT_PUBLIC_FHEVM_VERIFY_DECRYPTION_CONTRACT,
    process.env.NEXT_PUBLIC_FHEVM_VERIFY_INPUT_CONTRACT,
    process.env.NEXT_PUBLIC_FHEVM_GATEWAY_CHAIN_ID,
    process.env.NEXT_PUBLIC_FHEVM_RELAYER_URL
  ];

  return required.every(Boolean);
}

export function getRuntimeDiagnostics(): RuntimeDiagnostic[] {
  const diagnostics: RuntimeDiagnostic[] = [];

  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);
  const address = process.env.NEXT_PUBLIC_SHIELDBET_ADDRESS;
  const rpcUrl = process.env.NEXT_PUBLIC_CHAIN_RPC_URL;
  const useCustomFhevm = process.env.NEXT_PUBLIC_FHEVM_USE_CUSTOM === "true";

  if (!address) {
    diagnostics.push({
      severity: "error",
      message: "Missing NEXT_PUBLIC_SHIELDBET_ADDRESS. Contract reads and transactions will fail."
    });
  }

  if (!rpcUrl) {
    diagnostics.push({
      severity: "error",
      message: "Missing NEXT_PUBLIC_CHAIN_RPC_URL. Chain reads and fhEVM relayer initialization need it."
    });
  }

  if (useCustomFhevm && !hasCustomFhevmEnv()) {
    diagnostics.push({
      severity: "error",
      message: "Custom fhEVM mode is enabled but one or more NEXT_PUBLIC_FHEVM_* variables are missing."
    });
  }

  if (!useCustomFhevm && chainId !== 1 && chainId !== 11155111) {
    diagnostics.push({
      severity: "error",
      message: `Chain ID ${chainId} requires explicit NEXT_PUBLIC_FHEVM_* relayer configuration for client encryption.`
    });
  }

  return diagnostics;
}
