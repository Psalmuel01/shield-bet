import { expect } from "chai";
import { ethers } from "hardhat";

describe("ShieldBet", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const ShieldBet = await ethers.getContractFactory("ShieldBet");
    const shieldBet = await ShieldBet.deploy();
    await shieldBet.waitForDeployment();

    return { shieldBet, owner, alice, bob };
  }

  function encodeInput(value: bigint) {
    return ethers.zeroPadValue(ethers.toBeHex(value), 32);
  }

  it("creates markets and anchors metadata CID", async function () {
    const { shieldBet, alice } = await deployFixture();
    const deadline = BigInt((await ethers.provider.getBlock("latest"))!.timestamp + 3600);

    await expect(shieldBet.connect(alice).createMarket("Will ETH be above $5k by Dec 2026?", deadline))
      .to.emit(shieldBet, "MarketCreated")
      .withArgs(1n, "Will ETH be above $5k by Dec 2026?", deadline, alice.address);

    await expect(shieldBet.connect(alice).anchorMarketMetadataCID(1, "bafy-market-cid"))
      .to.emit(shieldBet, "MarketMetadataAnchored")
      .withArgs(1n, "bafy-market-cid");

    expect(await shieldBet.marketMetadataCID(1)).to.equal("bafy-market-cid");
  });

  it("accepts encrypted-like bets and tracks pools", async function () {
    const { shieldBet, owner, alice, bob } = await deployFixture();
    const deadline = BigInt((await ethers.provider.getBlock("latest"))!.timestamp + 3600);

    await shieldBet.connect(owner).createMarket("Test market", deadline);

    const aliceOutcome = 1n;
    const aliceAmount = 2_000_000_000_000_000_000n;
    const aliceProof = ethers.AbiCoder.defaultAbiCoder().encode(["uint8", "uint64"], [aliceOutcome, aliceAmount]);

    await shieldBet
      .connect(alice)
      .placeBet(1, encodeInput(aliceOutcome), encodeInput(aliceAmount), aliceProof, { value: aliceAmount });

    const bobOutcome = 2n;
    const bobAmount = 1_000_000_000_000_000_000n;
    const bobProof = ethers.AbiCoder.defaultAbiCoder().encode(["uint8", "uint64"], [bobOutcome, bobAmount]);

    await shieldBet
      .connect(bob)
      .placeBet(1, encodeInput(bobOutcome), encodeInput(bobAmount), bobProof, { value: bobAmount });

    const [yes, no] = await shieldBet.getMarketTotals(1);
    expect(yes).to.equal(aliceAmount);
    expect(no).to.equal(bobAmount);
  });

  it("resolves market and pays winners proportionally", async function () {
    const { shieldBet, owner, alice, bob } = await deployFixture();
    const deadline = BigInt((await ethers.provider.getBlock("latest"))!.timestamp + 3600);

    await shieldBet.connect(owner).createMarket("Who wins?", deadline);

    const aliceAmount = 2_000_000_000_000_000_000n;
    const bobAmount = 1_000_000_000_000_000_000n;

    const aliceProof = ethers.AbiCoder.defaultAbiCoder().encode(["uint8", "uint64"], [1, aliceAmount]);
    const bobProof = ethers.AbiCoder.defaultAbiCoder().encode(["uint8", "uint64"], [2, bobAmount]);

    await shieldBet.connect(alice).placeBet(1, encodeInput(1n), encodeInput(aliceAmount), aliceProof, { value: aliceAmount });
    await shieldBet.connect(bob).placeBet(1, encodeInput(2n), encodeInput(bobAmount), bobProof, { value: bobAmount });

    await shieldBet.connect(owner).resolveMarket(1, 1);
    await shieldBet.connect(owner).anchorResolutionCID(1, "bafy-resolution-cid");

    const quote = await shieldBet.getClaimQuote(1, alice.address);
    expect(quote.eligible).to.equal(true);
    expect(quote.payout).to.equal(3_000_000_000_000_000_000n);

    await expect(shieldBet.connect(bob).claimWinnings(1)).to.be.revertedWithCustomError(shieldBet, "NotWinningPosition");

    await expect(() => shieldBet.connect(alice).claimWinnings(1)).to.changeEtherBalances(
      [alice, shieldBet],
      [3_000_000_000_000_000_000n, -3_000_000_000_000_000_000n]
    );

    await expect(shieldBet.connect(alice).claimWinnings(1)).to.be.revertedWithCustomError(shieldBet, "AlreadyClaimed");
  });
});
