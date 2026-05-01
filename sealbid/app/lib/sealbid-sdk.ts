import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { keccak_256 } from "@noble/hashes/sha3";

// Mock IDL for development - in production, this would be generated
const IDL = {
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
    }
  ]
} as any;

export interface AuctionConfig {
  tokenMint: PublicKey;
  tokenAmount: BN;
  commitDuration: BN; // in seconds
  revealDuration: BN; // in seconds
}

export interface BidCommitment {
  commitment: Uint8Array; // 32-byte hash
  bidAmount: BN;
  salt: Uint8Array; // 32-byte random salt
}

export interface AuctionInfo {
  authority: PublicKey;
  tokenMint: PublicKey;
  tokenAmount: BN;
  commitDeadline: BN;
  revealDeadline: BN;
  highestBid: BN;
  winner: PublicKey;
  settled: boolean;
}

export interface BidderInfo {
  auction: PublicKey;
  bidder: PublicKey;
  commitment: Uint8Array;
  bidAmount: BN;
  revealed: boolean;
}

export class SealBidSDK {
  private program: Program<any>;
  private connection: Connection;

  constructor(
    connection: Connection,
    wallet: Wallet,
    programId: PublicKey = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS")
  ) {
    this.connection = connection;
    const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
    this.program = new Program(IDL, programId, provider);
  }

  /**
   * Creates a new auction
   */
  async createAuction(config: AuctionConfig): Promise<PublicKey> {
    const authority = this.program.provider.wallet.publicKey;
    
    // Find PDA for auction
    const [auction] = await PublicKey.findProgramAddress(
      [
        Buffer.from("auction"),
        authority.toBuffer(),
        config.tokenMint.toBuffer()
      ],
      this.program.programId
    );

    // Find PDA for auction token account
    const [auctionTokenAccount] = await PublicKey.findProgramAddress(
      [
        Buffer.from("auction"),
        authority.toBuffer(),
        config.tokenMint.toBuffer(),
        authority.toBuffer()
      ],
      TOKEN_PROGRAM_ID
    );

    // Get or create associated token account for authority
    const authorityTokenAccount = await getAssociatedTokenAddress(
      config.tokenMint,
      authority
    );

    const tx = await this.program.methods
      .createAuction(
        config.tokenMint,
        config.tokenAmount,
        config.commitDuration,
        config.revealDuration
      )
      .accounts({
        auction,
        auctionTokenAccount,
        authority,
        authorityTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return auction;
  }

  /**
   * Commits a bid to an auction
   */
  async commitBid(
    auction: PublicKey,
    bidAmount: BN,
    salt: Uint8Array
  ): Promise<{ commitment: Uint8Array; tx: string }> {
    const bidder = this.program.provider.wallet.publicKey;
    
    // Generate commitment hash
    const commitment = this.generateCommitment(bidAmount, salt);

    // Find PDA for bidder
    const [bidderAccount] = await PublicKey.findProgramAddress(
      [
        Buffer.from("bidder"),
        auction.toBuffer(),
        bidder.toBuffer()
      ],
      this.program.programId
    );

    // Find PDA for bidder escrow
    const [bidderEscrow] = await PublicKey.findProgramAddress(
      [
        Buffer.from("auction"),
        auction.toBuffer(),
        (await this.getAuctionInfo(auction)).tokenMint.toBuffer(),
        bidder.toBuffer()
      ],
      TOKEN_PROGRAM_ID
    );

    // Get associated token account for bidder
    const auctionInfo = await this.getAuctionInfo(auction);
    const bidderTokenAccount = await getAssociatedTokenAddress(
      auctionInfo.tokenMint,
      bidder
    );

    const tx = await this.program.methods
      .commitBid(
        Array.from(commitment),
        bidAmount
      )
      .accounts({
        auction,
        bidder: bidderAccount,
        bidderEscrow,
        bidderAuthority: bidder,
        bidderTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return { commitment, tx };
  }

  /**
   * Reveals a previously committed bid
   */
  async revealBid(
    auction: PublicKey,
    bidAmount: BN,
    salt: Uint8Array
  ): Promise<string> {
    const bidder = this.program.provider.wallet.publicKey;
    
    // Find PDA for bidder
    const [bidderAccount] = await PublicKey.findProgramAddress(
      [
        Buffer.from("bidder"),
        auction.toBuffer(),
        bidder.toBuffer()
      ],
      this.program.programId
    );

    const tx = await this.program.methods
      .revealBid(
        bidAmount,
        Array.from(salt)
      )
      .accounts({
        auction,
        bidder: bidderAccount,
        bidderAuthority: bidder,
      })
      .rpc();

    return tx;
  }

  /**
   * Settles an auction and transfers tokens to the winner
   */
  async settleAuction(auction: PublicKey): Promise<string> {
    const authority = this.program.provider.wallet.publicKey;
    const auctionInfo = await this.getAuctionInfo(auction);
    
    // Find PDA for bidder (we need at least one bidder for the instruction)
    const [bidderAccount] = await PublicKey.findProgramAddress(
      [
        Buffer.from("bidder"),
        auction.toBuffer(),
        authority.toBuffer()
      ],
      this.program.programId
    );

    // Find PDA for auction token account
    const [auctionTokenAccount] = await PublicKey.findProgramAddress(
      [
        Buffer.from("auction"),
        auctionInfo.authority.toBuffer(),
        auctionInfo.tokenMint.toBuffer(),
        auctionInfo.authority.toBuffer()
      ],
      TOKEN_PROGRAM_ID
    );

    // Get or create associated token account for winner
    const winnerTokenAccount = await getAssociatedTokenAddress(
      auctionInfo.tokenMint,
      auctionInfo.winner
    );

    // Get associated token account for bidder
    const bidderTokenAccount = await getAssociatedTokenAddress(
      auctionInfo.tokenMint,
      authority
    );

    // Find PDA for bidder escrow
    const [bidderEscrow] = await PublicKey.findProgramAddress(
      [
        Buffer.from("auction"),
        auction.toBuffer(),
        auctionInfo.tokenMint.toBuffer(),
        authority.toBuffer()
      ],
      TOKEN_PROGRAM_ID
    );

    const tx = await this.program.methods
      .settleAuction()
      .accounts({
        auction,
        bidder: bidderAccount,
        auctionTokenAccount,
        winnerTokenAccount,
        bidderTokenAccount,
        bidderEscrow,
        authority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Gets auction information
   */
  async getAuctionInfo(auction: PublicKey): Promise<AuctionInfo> {
    const account = await this.program.account.auction.fetch(auction);
    return {
      authority: account.authority,
      tokenMint: account.tokenMint,
      tokenAmount: new BN(account.tokenAmount.toString()),
      commitDeadline: new BN(account.commitDeadline.toString()),
      revealDeadline: new BN(account.revealDeadline.toString()),
      highestBid: new BN(account.highestBid.toString()),
      winner: account.winner,
      settled: account.settled,
    };
  }

  /**
   * Gets bidder information
   */
  async getBidderInfo(auction: PublicKey, bidder: PublicKey): Promise<BidderInfo> {
    const [bidderAccount] = await PublicKey.findProgramAddress(
      [
        Buffer.from("bidder"),
        auction.toBuffer(),
        bidder.toBuffer()
      ],
      this.program.programId
    );

    const account = await this.program.account.bidder.fetch(bidderAccount);
    return {
      auction: account.auction,
      bidder: account.bidder,
      commitment: new Uint8Array(account.commitment),
      bidAmount: new BN(account.bidAmount.toString()),
      revealed: account.revealed,
    };
  }

  /**
   * Gets current auction phase
   */
  async getAuctionPhase(auction: PublicKey): Promise<'not-started' | 'commit' | 'reveal' | 'ended'> {
    const auctionInfo = await this.getAuctionInfo(auction);
    const currentTime = Math.floor(Date.now() / 1000);

    if (currentTime < auctionInfo.commitDeadline.toNumber()) {
      return 'commit';
    } else if (currentTime < auctionInfo.revealDeadline.toNumber()) {
      return 'reveal';
    } else {
      return 'ended';
    }
  }

  /**
   * Generates a commitment hash from bid amount and salt
   */
  generateCommitment(bidAmount: BN, salt: Uint8Array): Uint8Array {
    const data = new Uint8Array(40); // 8 bytes for amount + 32 bytes for salt
    const amountBytes = bidAmount.toArrayLike(Buffer, "le", 8);
    
    for (let i = 0; i < 8; i++) {
      data[i] = amountBytes[i];
    }
    for (let i = 0; i < 32; i++) {
      data[8 + i] = salt[i];
    }

    return keccak_256(data);
  }

  /**
   * Generates a random salt
   */
  generateRandomSalt(): Uint8Array {
    const salt = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(salt);
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < 32; i++) {
        salt[i] = Math.floor(Math.random() * 256);
      }
    }
    return salt;
  }

  /**
   * Gets the program instance
   */
  getProgram(): Program<any> {
    return this.program;
  }

  /**
   * Gets the connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }
}
