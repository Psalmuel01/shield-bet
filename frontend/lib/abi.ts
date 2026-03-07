export const shieldBetAbi = [
  {
    type: "function",
    name: "marketCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "markets",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "question", type: "string" },
          { name: "deadline", type: "uint256" },
          { name: "outcome", type: "uint8" },
          { name: "resolved", type: "bool" },
          { name: "totalYes", type: "uint64" },
          { name: "totalNo", type: "uint64" },
          { name: "creator", type: "address" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "marketMetadataCID",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }]
  },
  {
    type: "function",
    name: "marketResolutionCID",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }]
  },
  {
    type: "function",
    name: "placeBet",
    stateMutability: "payable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "encOutcome", type: "bytes32" },
      { name: "encAmount", type: "bytes32" },
      { name: "proof", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "resolveMarket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint8" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "claimWinnings",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "getMyBet",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "", type: "uint64" }]
  },
  {
    type: "function",
    name: "getMyOutcome",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }]
  },
  {
    type: "function",
    name: "getClaimQuote",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "user", type: "address" }
    ],
    outputs: [
      { name: "payout", type: "uint256" },
      { name: "eligible", type: "bool" }
    ]
  }
] as const;
