import { encodeAbiParameters, pad, toHex } from "viem";

export type BetOutcome = 1 | 2;

export interface EncryptedBetPayload {
  encOutcome: `0x${string}`;
  encAmount: `0x${string}`;
  proof: `0x${string}`;
}

// Local fhEVM-compatible placeholder: packs values into bytes32 and emits a proof blob.
export function encryptBetInputs(outcome: BetOutcome, amountWei: bigint): EncryptedBetPayload {
  const encOutcome = pad(toHex(outcome), { size: 32 });
  const encAmount = pad(toHex(amountWei), { size: 32 });
  const proof = encodeAbiParameters(
    [
      { type: "uint8", name: "outcome" },
      { type: "uint64", name: "amount" }
    ],
    [outcome, amountWei]
  );

  return { encOutcome, encAmount, proof };
}
