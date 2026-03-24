export interface DecodedMarketView {
  question: string;
  deadline: bigint;
  outcome: number;
  resolved: boolean;
  totalYes: `0x${string}`;
  totalNo: `0x${string}`;
  creator: `0x${string}`;
}

export interface DecodedMarketDetails {
  category: string;
  resolutionCriteria: string;
  resolutionSource: string;
}

function isHex32(value: unknown): value is `0x${string}` {
  return typeof value === "string" && value.startsWith("0x");
}

function isAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && value.startsWith("0x") && value.length === 42;
}

export function decodeMarketView(result: unknown): DecodedMarketView | null {
  if (!result) return null;

  const asArray = Array.isArray(result) ? result : null;
  if (asArray && asArray.length >= 7) {
    const [question, deadline, outcome, resolved, totalYes, totalNo, creator] = asArray as unknown[];
    if (
      typeof question === "string" &&
      typeof deadline === "bigint" &&
      typeof outcome === "number" &&
      typeof resolved === "boolean" &&
      isHex32(totalYes) &&
      isHex32(totalNo) &&
      isAddress(creator)
    ) {
      return {
        question,
        deadline,
        outcome,
        resolved,
        totalYes,
        totalNo,
        creator
      };
    }
  }

  if (typeof result === "object") {
    const market = result as Partial<DecodedMarketView>;
    if (
      typeof market.question === "string" &&
      typeof market.deadline === "bigint" &&
      typeof market.outcome === "number" &&
      typeof market.resolved === "boolean" &&
      isHex32(market.totalYes) &&
      isHex32(market.totalNo) &&
      isAddress(market.creator)
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
