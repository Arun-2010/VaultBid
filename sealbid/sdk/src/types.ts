export interface Auction {
  authority: string;
  tokenMint: string;
  tokenAmount: number;
  commitDeadline: number;
  revealDeadline: number;
  highestBid: number;
  winner: string;
  settled: boolean;
  bump: number;
}

export interface Bidder {
  auction: string;
  bidder: string;
  commitment: number[];
  bidAmount: number;
  revealed: boolean;
  bump: number;
}

export interface AuctionCreatedEvent {
  auction: string;
  authority: string;
  tokenMint: string;
  tokenAmount: number;
  commitDeadline: number;
  revealDeadline: number;
}

export interface BidCommittedEvent {
  auction: string;
  bidder: string;
  commitment: number[];
}

export interface BidRevealedEvent {
  auction: string;
  bidder: string;
  bidAmount: number;
}

export interface AuctionSettledEvent {
  auction: string;
  winner: string;
  highestBid: number;
}

export interface BidSlashedEvent {
  auction: string;
  bidder: string;
  amount: number;
}

// Anchor program types (these would normally be generated)
export type Sealbid = any;
export const IDL: any = {
  version: "0.1.0",
  name: "sealbid",
  instructions: [
    {
      name: "createAuction",
      accounts: [
        { name: "auction", isMut: true, isSigner: false },
        { name: "auctionTokenAccount", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "authorityTokenAccount", isMut: true, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "rent", isMut: false, isSigner: false }
      ],
      args: [
        { name: "tokenMint", type: "publicKey" },
        { name: "tokenAmount", type: "u64" },
        { name: "commitDuration", type: "i64" },
        { name: "revealDuration", type: "i64" }
      ]
    },
    {
      name: "commitBid",
      accounts: [
        { name: "auction", isMut: true, isSigner: false },
        { name: "bidder", isMut: true, isSigner: false },
        { name: "bidderEscrow", isMut: true, isSigner: false },
        { name: "bidderAuthority", isMut: true, isSigner: true },
        { name: "bidderTokenAccount", isMut: true, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "rent", isMut: false, isSigner: false }
      ],
      args: [
        { name: "commitment", type: { array: ["u8", 32] } },
        { name: "bidAmount", type: "u64" }
      ]
    },
    {
      name: "revealBid",
      accounts: [
        { name: "auction", isMut: false, isSigner: false },
        { name: "bidder", isMut: true, isSigner: false },
        { name: "bidderAuthority", isMut: false, isSigner: true }
      ],
      args: [
        { name: "bidAmount", type: "u64" },
        { name: "salt", type: { array: ["u8", 32] } }
      ]
    },
    {
      name: "settleAuction",
      accounts: [
        { name: "auction", isMut: true, isSigner: false },
        { name: "bidder", isMut: false, isSigner: false },
        { name: "auctionTokenAccount", isMut: true, isSigner: false },
        { name: "winnerTokenAccount", isMut: true, isSigner: false },
        { name: "bidderTokenAccount", isMut: true, isSigner: false },
        { name: "bidderEscrow", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: []
    },
    {
      name: "slashNonRevealer",
      accounts: [
        { name: "auction", isMut: false, isSigner: false },
        { name: "bidder", isMut: true, isSigner: false },
        { name: "bidderEscrow", isMut: true, isSigner: false },
        { name: "authorityTokenAccount", isMut: true, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false }
      ],
      args: []
    }
  ],
  accounts: [
    {
      name: "Auction",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" },
          { name: "tokenMint", type: "publicKey" },
          { name: "tokenAmount", type: "u64" },
          { name: "commitDeadline", type: "i64" },
          { name: "revealDeadline", type: "i64" },
          { name: "highestBid", type: "u64" },
          { name: "winner", type: "publicKey" },
          { name: "settled", type: "bool" },
          { name: "bump", type: "u8" }
        ]
      }
    },
    {
      name: "Bidder",
      type: {
        kind: "struct",
        fields: [
          { name: "auction", type: "publicKey" },
          { name: "bidder", type: "publicKey" },
          { name: "commitment", type: { array: ["u8", 32] } },
          { name: "bidAmount", type: "u64" },
          { name: "revealed", type: "bool" },
          { name: "bump", type: "u8" }
        ]
      }
    }
  ],
  events: [
    {
      name: "AuctionCreated",
      fields: [
        { name: "auction", type: "publicKey" },
        { name: "authority", type: "publicKey" },
        { name: "tokenMint", type: "publicKey" },
        { name: "tokenAmount", type: "u64" },
        { name: "commitDeadline", type: "i64" },
        { name: "revealDeadline", type: "i64" }
      ]
    },
    {
      name: "BidCommitted",
      fields: [
        { name: "auction", type: "publicKey" },
        { name: "bidder", type: "publicKey" },
        { name: "commitment", type: { array: ["u8", 32] } }
      ]
    },
    {
      name: "BidRevealed",
      fields: [
        { name: "auction", type: "publicKey" },
        { name: "bidder", type: "publicKey" },
        { name: "bidAmount", type: "u64" }
      ]
    },
    {
      name: "AuctionSettled",
      fields: [
        { name: "auction", type: "publicKey" },
        { name: "winner", type: "publicKey" },
        { name: "highestBid", type: "u64" }
      ]
    },
    {
      name: "BidSlashed",
      fields: [
        { name: "auction", type: "publicKey" },
        { name: "bidder", type: "publicKey" },
        { name: "amount", type: "u64" }
      ]
    }
  ],
  errors: [
    {
      code: 6000,
      name: "CommitPhaseEnded",
      msg: "Commit phase has ended"
    },
    {
      code: 6001,
      name: "CommitPhaseNotEnded",
      msg: "Commit phase has not ended yet"
    },
    {
      code: 6002,
      name: "RevealPhaseEnded",
      msg: "Reveal phase has ended"
    },
    {
      code: 6003,
      name: "RevealPhaseNotEnded",
      msg: "Reveal phase has not ended yet"
    },
    {
      code: 6004,
      name: "AlreadyRevealed",
      msg: "Bid has already been revealed"
    },
    {
      code: 6005,
      name: "InvalidCommitment",
      msg: "Invalid commitment hash"
    },
    {
      code: 6006,
      name: "AlreadySettled",
      msg: "Auction has already been settled"
    },
    {
      code: 6007,
      name: "BidderRevealed",
      msg: "Bidder has revealed their bid"
    }
  ]
};
