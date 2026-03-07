// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

type euint64 is uint64;
type euint8 is uint8;
type einput is bytes32;

contract ShieldBet is Ownable {
    struct Market {
        string question;
        uint256 deadline;
        uint8 outcome; // 0 = unresolved, 1 = YES, 2 = NO
        bool resolved;
        euint64 totalYes;
        euint64 totalNo;
        address creator;
    }

    uint256 public marketCount;

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => euint64)) private betAmounts;
    mapping(uint256 => mapping(address => euint8)) private betOutcomes;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    mapping(uint256 => string) public marketMetadataCID;
    mapping(uint256 => string) public marketResolutionCID;

    event MarketCreated(uint256 indexed marketId, string question, uint256 deadline, address indexed creator);
    event MarketMetadataAnchored(uint256 indexed marketId, string cid);
    event BetPlaced(uint256 indexed marketId, address indexed bettor, bytes32 encOutcome, bytes32 encAmount);
    event MarketResolved(uint256 indexed marketId, uint8 outcome);
    event MarketResolutionAnchored(uint256 indexed marketId, string cid);
    event WinningsClaimed(uint256 indexed marketId, address indexed winner, uint256 payoutAmount);

    error MarketNotFound();
    error DeadlineMustBeFuture();
    error MarketExpired();
    error MarketAlreadyResolved();
    error InvalidOutcome();
    error AlreadyHasPosition();
    error InvalidBetProof();
    error IncorrectStakeValue();
    error MarketNotResolved();
    error AlreadyClaimed();
    error NoPosition();
    error NotWinningPosition();
    error NotMarketCreator();

    constructor() Ownable(msg.sender) {}

    function createMarket(string calldata question, uint256 deadline) external returns (uint256 marketId) {
        if (deadline <= block.timestamp) revert DeadlineMustBeFuture();

        marketId = ++marketCount;
        markets[marketId] = Market({
            question: question,
            deadline: deadline,
            outcome: 0,
            resolved: false,
            totalYes: euint64.wrap(0),
            totalNo: euint64.wrap(0),
            creator: msg.sender
        });

        emit MarketCreated(marketId, question, deadline, msg.sender);
    }

    function anchorMarketMetadataCID(uint256 marketId, string calldata cid) external {
        Market storage market = _requireMarket(marketId);
        if (market.creator != msg.sender) revert NotMarketCreator();

        marketMetadataCID[marketId] = cid;
        emit MarketMetadataAnchored(marketId, cid);
    }

    function placeBet(
        uint256 marketId,
        einput encOutcome,
        einput encAmount,
        bytes calldata proof
    ) external payable {
        Market storage market = _requireMarket(marketId);
        if (block.timestamp >= market.deadline) revert MarketExpired();
        if (market.resolved) revert MarketAlreadyResolved();
        if (euint64.unwrap(betAmounts[marketId][msg.sender]) != 0) revert AlreadyHasPosition();

        (uint8 clearOutcome, uint64 clearAmount) = _decodeAndValidateProof(encOutcome, encAmount, proof);

        if (msg.value != clearAmount) revert IncorrectStakeValue();

        betAmounts[marketId][msg.sender] = euint64.wrap(clearAmount);
        betOutcomes[marketId][msg.sender] = euint8.wrap(clearOutcome);

        if (clearOutcome == 1) {
            market.totalYes = euint64.wrap(euint64.unwrap(market.totalYes) + clearAmount);
        } else {
            market.totalNo = euint64.wrap(euint64.unwrap(market.totalNo) + clearAmount);
        }

        emit BetPlaced(marketId, msg.sender, einput.unwrap(encOutcome), einput.unwrap(encAmount));
    }

    function resolveMarket(uint256 marketId, uint8 outcome) external onlyOwner {
        Market storage market = _requireMarket(marketId);
        if (market.resolved) revert MarketAlreadyResolved();
        if (outcome != 1 && outcome != 2) revert InvalidOutcome();

        market.outcome = outcome;
        market.resolved = true;

        emit MarketResolved(marketId, outcome);
    }

    function anchorResolutionCID(uint256 marketId, string calldata cid) external onlyOwner {
        Market storage market = _requireMarket(marketId);
        if (!market.resolved) revert MarketNotResolved();

        marketResolutionCID[marketId] = cid;
        emit MarketResolutionAnchored(marketId, cid);
    }

    function claimWinnings(uint256 marketId) external {
        Market storage market = _requireMarket(marketId);
        if (!market.resolved) revert MarketNotResolved();
        if (hasClaimed[marketId][msg.sender]) revert AlreadyClaimed();

        uint64 stake = euint64.unwrap(betAmounts[marketId][msg.sender]);
        if (stake == 0) revert NoPosition();

        uint8 position = euint8.unwrap(betOutcomes[marketId][msg.sender]);
        if (position != market.outcome) revert NotWinningPosition();

        uint64 winningPool = market.outcome == 1 ? euint64.unwrap(market.totalYes) : euint64.unwrap(market.totalNo);
        uint64 losingPool = market.outcome == 1 ? euint64.unwrap(market.totalNo) : euint64.unwrap(market.totalYes);

        uint256 payout = stake;
        if (winningPool > 0 && losingPool > 0) {
            payout += (uint256(stake) * uint256(losingPool)) / uint256(winningPool);
        }

        hasClaimed[marketId][msg.sender] = true;

        (bool sent, ) = msg.sender.call{value: payout}("");
        require(sent, "ETH transfer failed");

        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    function getMyBet(uint256 marketId) external view returns (euint64) {
        _requireMarket(marketId);
        return betAmounts[marketId][msg.sender];
    }

    function getMyOutcome(uint256 marketId) external view returns (euint8) {
        _requireMarket(marketId);
        return betOutcomes[marketId][msg.sender];
    }

    function getMarketTotals(uint256 marketId) external view onlyOwner returns (uint64 yesTotal, uint64 noTotal) {
        Market storage market = _requireMarket(marketId);
        return (euint64.unwrap(market.totalYes), euint64.unwrap(market.totalNo));
    }

    function getClaimQuote(uint256 marketId, address user) external view returns (uint256 payout, bool eligible) {
        Market storage market = _requireMarket(marketId);
        if (!market.resolved) return (0, false);

        uint64 stake = euint64.unwrap(betAmounts[marketId][user]);
        if (stake == 0) return (0, false);

        uint8 position = euint8.unwrap(betOutcomes[marketId][user]);
        if (position != market.outcome || hasClaimed[marketId][user]) return (0, false);

        uint64 winningPool = market.outcome == 1 ? euint64.unwrap(market.totalYes) : euint64.unwrap(market.totalNo);
        uint64 losingPool = market.outcome == 1 ? euint64.unwrap(market.totalNo) : euint64.unwrap(market.totalYes);

        payout = stake;
        if (winningPool > 0 && losingPool > 0) {
            payout += (uint256(stake) * uint256(losingPool)) / uint256(winningPool);
        }

        return (payout, true);
    }

    function _decodeAndValidateProof(
        einput encOutcome,
        einput encAmount,
        bytes calldata proof
    ) internal pure returns (uint8 clearOutcome, uint64 clearAmount) {
        (clearOutcome, clearAmount) = abi.decode(proof, (uint8, uint64));

        if (clearOutcome != 1 && clearOutcome != 2) revert InvalidOutcome();
        if (clearAmount == 0) revert InvalidBetProof();

        uint8 decodedOutcome = uint8(uint256(einput.unwrap(encOutcome)) & 0xff);
        uint64 decodedAmount = uint64(uint256(einput.unwrap(encAmount)));

        if (decodedOutcome != clearOutcome || decodedAmount != clearAmount) revert InvalidBetProof();
    }

    function _requireMarket(uint256 marketId) internal view returns (Market storage market) {
        market = markets[marketId];
        if (market.deadline == 0) revert MarketNotFound();
    }
}
