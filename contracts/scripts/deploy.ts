import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ShieldBet with account:", deployer.address);

  const ShieldBet = await ethers.getContractFactory("ShieldBet");
  const contract = await ShieldBet.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("ShieldBet deployed to:", address);

  // No initial configuration required as the Optimistic Oracle architecture
  // is decentralized and doesn't rely on specific resolver/settlement signers.
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
