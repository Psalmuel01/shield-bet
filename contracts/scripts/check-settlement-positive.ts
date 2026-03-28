import { ethers } from "hardhat";
import * as hre from "hardhat";
import dotenv from "dotenv";
import { parseEther } from "ethers";
import { ShieldBet__factory } from "../typechain-types";

dotenv.config({ path: ".env" });
dotenv.config({ path: "../frontend/.env.local" });

async function main() {
  const contractAddress = process.env.SHIELDBET_ADDRESS || process.env.NEXT_PUBLIC_SHIELDBET_ADDRESS;
  if (!contractAddress) throw new Error("Missing contract address");

  const [owner] = await ethers.getSigners();
  const provider = ethers.provider;
  const shieldBet = ShieldBet__factory.connect(contractAddress, owner);
  const network = await provider.getNetwork();

  await hre.fhevm.initializeCLIApi();

  const latest = await provider.getBlock("latest");
  if (!latest) throw new Error("Missing latest block");
  const deadline = BigInt(latest.timestamp + 45);

  const createTx = await shieldBet.createMarketWithMetadata(
    "Settlement route verification market",
    deadline,
    "Crypto",
    "Resolves YES if this verification market reaches settlement-open state.",
    "Owner signer check"
  );
  const createReceipt = await createTx.wait();
  if (!createReceipt) throw new Error("Missing create receipt");

  let marketId: bigint | null = null;
  for (const log of createReceipt.logs) {
    try {
      const parsed = shieldBet.interface.parseLog(log);
      if (parsed?.name === "MarketCreated") {
        marketId = parsed.args.marketId as bigint;
        break;
      }
    } catch {}
  }
  if (!marketId) throw new Error("No market id");

  const input = hre.fhevm.createEncryptedInput(contractAddress, owner.address);
  input.add8(1);
  const encrypted = await input.encrypt();
  await (await shieldBet.placeBet(marketId, encrypted.handles[0], encrypted.inputProof, {
    value: parseEther("0.0001"),
    gasLimit: 5_000_000n
  })).wait();

  while (true) {
    const current = await provider.getBlock("latest");
    if (current && BigInt(current.timestamp) > deadline) break;
    await new Promise((resolve) => setTimeout(resolve, 4_000));
  }

  const resolutionExpiry = BigInt(Math.floor(Date.now() / 1000) + 900);
  const resolutionSig = await owner.signTypedData(
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

  await (await shieldBet.resolveMarketWithSig(marketId, 1, resolutionExpiry, resolutionSig)).wait();
  await (await shieldBet.openSettlementData(marketId, [owner.address])).wait();

  console.log(JSON.stringify({ marketId: marketId.toString(), owner: owner.address }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
