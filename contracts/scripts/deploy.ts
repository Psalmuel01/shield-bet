import { ethers } from "hardhat";

async function main() {
  const ShieldBet = await ethers.getContractFactory("ShieldBet");
  const contract = await ShieldBet.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("ShieldBet deployed:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
