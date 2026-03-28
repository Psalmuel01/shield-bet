export interface DecodedMarketView {
  question: string;
  deadline: bigint;
  outcome: number;
  status: number;
  marketType: number;
  creator: `0x${string}`;
  disputeWindowEnd: bigint;
  proposedOutcome: number;
  proposer: `0x${string}`;
  challenger: `0x${string}`;
}

export interface DecodedMarketDetails {
  category: string;
  resolutionCriteria: string;
  resolutionSource: string;
}

function isAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && value.startsWith("0x") && value.length === 42;
}

export function decodeMarketView(result: unknown): DecodedMarketView | null {
  if (!result) return null;

  const asArray = Array.isArray(result) ? result : null;
  if (asArray && asArray.length >= 10) {
    const [
      question, 
      deadline, 
      outcome, 
      status, 
      marketType, 
      creator, 
      disputeWindowEnd, 
      proposedOutcome, 
      proposer, 
      challenger
    ] = asArray as unknown[];

    if (
      typeof question === "string" &&
      typeof deadline === "bigint" &&
      typeof outcome === "number" &&
      typeof status === "number" &&
      typeof marketType === "number" &&
      isAddress(creator) &&
      typeof disputeWindowEnd === "bigint" &&
      typeof proposedOutcome === "number" &&
      isAddress(proposer) &&
      isAddress(challenger)
    ) {
      return {
        question,
        deadline,
        outcome,
        status,
        marketType,
        creator,
        disputeWindowEnd,
        proposedOutcome,
        proposer,
        challenger
      };
    }
  }

  if (typeof result === "object") {
    const market = result as Partial<DecodedMarketView>;
    if (
      typeof market.question === "string" &&
      typeof market.deadline === "bigint" &&
      typeof market.outcome === "number" &&
      typeof market.status === "number" &&
      typeof market.marketType === "number" &&
      isAddress(market.creator) &&
      typeof market.disputeWindowEnd === "bigint" &&
      typeof market.proposedOutcome === "number" &&
      isAddress(market.proposer) &&
      isAddress(market.challenger)
    ) {
      return market as DecodedMarketView;
    }
  }

  return null;
}

export function decodeMarketDetails(result: unknown): DecodedMarketDetails | null {
  if (!result) return null;

  const asArray = Array.isArray(result) ? result : null;
  if (asArray && asArray.length >= 3) {
    const [category, resolutionCriteria, resolutionSource] = asArray as unknown[];
    if (
      typeof category === "string" &&
      typeof resolutionCriteria === "string" &&
      typeof resolutionSource === "string"
    ) {
      return {
        category,
        resolutionCriteria,
        resolutionSource
      };
    }
  }

  if (typeof result === "object") {
    const details = result as Partial<DecodedMarketDetails>;
    if (
      typeof details.category === "string" &&
      typeof details.resolutionCriteria === "string" &&
      typeof details.resolutionSource === "string"
    ) {
      return details as DecodedMarketDetails;
    }
  }

  return null;
}
