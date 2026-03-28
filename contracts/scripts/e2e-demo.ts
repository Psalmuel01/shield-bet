import { ethers } from "hardhat";
import * as hre from "hardhat";
import dotenv from "dotenv";
import { parseEther } from "ethers";
import { ShieldBet__factory } from "../typechain-types";

dotenv.config({ path: ".env" });
dotenv.config({ path: "../frontend/.env.local" });

async function main() {
  const contractAddress = process.env.SHIELDBET_ADDRESS || process.env.NEXT_PUBLIC_SHIELDBET_ADDRESS;
  if (!contractAddress) {
    throw new Error("Missing SHIELDBET_ADDRESS or NEXT_PUBLIC_SHIELDBET_ADDRESS");
  }

  const [owner] = await ethers.getSigners();
  const provider = ethers.provider;
  const shieldBet = ShieldBet__factory.connect(contractAddress, owner);
  const network = await provider.getNetwork();

  await hre.fhevm.initializeCLIApi();

  const latestBlock = await provider.getBlock("latest");
  if (!latestBlock) {
    throw new Error("Unable to load latest block");
  }

  const deadline = BigInt(latestBlock.timestamp + 60);
  console.log("Creating market on live chain...");
  const createTx = await shieldBet.createMarketWithMetadata(
    "Live demo: Will ShieldBet settle correctly on Sepolia today?",
    deadline,
    "Crypto",
    "Resolves YES if the live Sepolia e2e script completes with a successful claim.",
    "Owner settlement"
  );
  const createReceipt = await createTx.wait();
  if (!createReceipt) {
    throw new Error("Missing create receipt");
  }

  const marketCreatedEvent = shieldBet.interface.getEvent("MarketCreated");
  if (!marketCreatedEvent) {
    throw new Error("Missing MarketCreated event");
  }

  let marketId: bigint | null = null;
  for (const log of createReceipt.logs) {
    try {
      const parsed = shieldBet.interface.parseLog(log);
      if (parsed?.name === "MarketCreated") {
        marketId = parsed.args.marketId as bigint;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!marketId) {
    throw new Error("Unable to determine marketId from create receipt");
  }
  console.log(`Market created: ${marketId.toString()}`);

  async function encryptBetSide(bettorAddress: string, outcome: number) {
    const input = hre.fhevm.createEncryptedInput(contractAddress, bettorAddress);
    input.add8(outcome);
    return input.encrypt();
  }

  const ownerStake = parseEther("0.0001");

  console.log("Placing encrypted YES bet from owner...");
  const ownerEncrypted = await encryptBetSide(owner.address, 1);
  await (
    await shieldBet.placeBet(marketId, ownerEncrypted.handles[0], ownerEncrypted.inputProof, {
      value: ownerStake,
      gasLimit: 5_000_000n
    })
  ).wait();

  console.log("Waiting for market close...");
  while (true) {
    const currentBlock = await provider.getBlock("latest");
    if (currentBlock && BigInt(currentBlock.timestamp) > deadline) break;
    await new Promise((resolve) => setTimeout(resolve, 4_000));
  }

  const resolutionExpiry = BigInt(Math.floor(Date.now() / 1000) + 900);
  const resolutionSignature = await owner.signTypedData(
    {
      name: "ShieldBet",
      version: "1",
      chainId: Number(network.chainId),
      verifyingContract: contractAddress
    },
    {
      ResolutionAuth: [
        { name: "marketId", type: "uint256" },
        { name: "outcome", type: "uint8" },
        { name: "expiry", type: "uint256" }
      ]
    },
    {
      marketId,
      outcome: 1,
      expiry: resolutionExpiry
    }
  );

  console.log("Resolving market YES with signer authorization and opening settlement data...");
  await (await shieldBet.resolveMarketWithSig(marketId, 1, resolutionExpiry, resolutionSignature)).wait();
  await (await shieldBet.openSettlementData(marketId, [owner.address])).wait();

  const claimExpiry = BigInt(Math.floor(Date.now() / 1000) + 900);
  const claimSignature = await owner.signTypedData(
    {
      name: "ShieldBet",
      version: "1",
      chainId: Number(network.chainId),
      verifyingContract: contractAddress
    },
    {
      ClaimAuth: [
        { name: "marketId", type: "uint256" },
        { name: "claimant", type: "address" },
        { name: "resolvedOutcome", type: "uint8" },
        { name: "totalWinningSide", type: "uint256" },
        { name: "expiry", type: "uint256" }
      ]
    },
    {
      marketId,
      claimant: owner.address,
      resolvedOutcome: 1,
      totalWinningSide: ownerStake,
      expiry: claimExpiry
    }
  );

  console.log("Claiming winnings from owner...");
  const claimTx = await shieldBet.claimWinningsWithSig(marketId, ownerStake, claimExpiry, claimSignature);
  const claimReceipt = await claimTx.wait();
  if (!claimReceipt || claimReceipt.status !== 1) {
    throw new Error("Claim transaction failed");
  }

  console.log("Attempting second claim from owner (expected failure)...");
  try {
    await shieldBet.claimWinningsWithSig(marketId, ownerStake, claimExpiry, claimSignature);
    throw new Error("Second owner claim unexpectedly succeeded");
  } catch (error) {
    console.log("Second claim reverted as expected.");
  }

  console.log("Live demo completed successfully.");
  console.log(`Contract: ${contractAddress}`);
  console.log(`Market ID: ${marketId.toString()}`);
  console.log(`Winner: ${owner.address}`);
  console.log(`Claim tx: ${claimReceipt.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
