import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const ShieldBet = await ethers.getContractFactory("ShieldBet");
  const contract = await ShieldBet.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const resolverSigner = process.env.RESOLVER_SIGNER_ADDRESS || deployer.address;
  const settlementSigner = process.env.SETTLEMENT_SIGNER_ADDRESS || deployer.address;

  if ((await contract.resolverSigner()) !== resolverSigner) {
    await (await contract.setResolverSigner(resolverSigner)).wait();
  }

  if ((await contract.settlementSigner()) !== settlementSigner) {
    await (await contract.setSettlementSigner(settlementSigner)).wait();
  }

  console.log("ShieldBet deployed:", address);
  console.log("Resolver signer:", resolverSigner);
  console.log("Settlement signer:", settlementSigner);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
