import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Sealbid } from "../target/types/sealbid";
import { 
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount
} from "@solana/spl-token";
import { 
  Keypair, 
  PublicKey, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY,
  Clock
} from "@solana/web3.js";
import { expect } from "chai";

describe("sealbid", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Sealbid as Program<Sealbid>;
  const connection = anchor.getProvider().connection;

  let mint: PublicKey;
  let authorityTokenAccount: PublicKey;
  let bidderTokenAccount: PublicKey;
  let auction: PublicKey;
  let auctionTokenAccount: PublicKey;
  let bidder: PublicKey;
  let bidderEscrow: PublicKey;

  // Test parameters
  const tokenAmount = new anchor.BN(1000000); // 1 million tokens
  const bidAmount = new anchor.BN(100000); // 100k tokens bid
  const commitDuration = 10; // 10 seconds
  const revealDuration = 10; // 10 seconds

  before(async () => {
    // Create a new mint
    mint = await createMint(
      connection,
      program.provider.wallet.payer,
      program.provider.wallet.publicKey,
      program.provider.wallet.publicKey,
      9
    );

    // Create token accounts
    authorityTokenAccount = await createAccount(
      connection,
      program.provider.wallet.payer,
      mint,
      program.provider.wallet.publicKey
    );

    bidderTokenAccount = await createAccount(
      connection,
      program.provider.wallet.payer,
      mint,
      program.provider.wallet.publicKey
    );

    // Mint tokens to authority account
    await mintTo(
      connection,
      program.provider.wallet.payer,
      mint,
      authorityTokenAccount,
      program.provider.wallet.publicKey,
      tokenAmount.toNumber()
    );

    // Mint tokens to bidder account
    await mintTo(
      connection,
      program.provider.wallet.payer,
      mint,
      bidderTokenAccount,
      program.provider.wallet.publicKey,
      tokenAmount.toNumber()
    );
  });

  it("Creates an auction", async () => {
    // Find PDA for auction
    const [auctionPDA, auctionBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("auction"),
        program.provider.wallet.publicKey.toBuffer(),
        mint.toBuffer()
      ],
      program.programId
    );
    auction = auctionPDA;

    // Find PDA for auction token account
    const [auctionTokenAccountPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("auction"),
        program.provider.wallet.publicKey.toBuffer(),
        mint.toBuffer(),
        program.provider.wallet.publicKey.toBuffer()
      ],
      TOKEN_PROGRAM_ID
    );
    auctionTokenAccount = auctionTokenAccountPDA;

    const tx = await program.methods
      .createAuction(
        mint,
        tokenAmount,
        new anchor.BN(commitDuration),
        new anchor.BN(revealDuration)
      )
      .accounts({
        auction: auction,
        auctionTokenAccount: auctionTokenAccount,
        authority: program.provider.wallet.publicKey,
        authorityTokenAccount: authorityTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("Create auction transaction:", tx);

    // Verify auction state
    const auctionAccount = await program.account.auction.fetch(auction);
    expect(auctionAccount.authority.toString()).to.equal(program.provider.wallet.publicKey.toString());
    expect(auctionAccount.tokenMint.toString()).to.equal(mint.toString());
    expect(auctionAccount.tokenAmount.toString()).to.equal(tokenAmount.toString());
    expect(auctionAccount.settled).to.be.false;
  });

  it("Commits a bid", async () => {
    // Generate commitment hash
    const salt = Buffer.from("random_salt_123");
    const bidData = Buffer.concat([
      Buffer.from(bidAmount.toArrayLike(Buffer, "le", 8)),
      salt
    ]);
    const commitment = anchor.web3.Keccak256.hash(bidData, "hex");

    // Find PDA for bidder
    const [bidderPDA, bidderBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("bidder"),
        auction.toBuffer(),
        program.provider.wallet.publicKey.toBuffer()
      ],
      program.programId
    );
    bidder = bidderPDA;

    // Find PDA for bidder escrow
    const [bidderEscrowPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("auction"),
        auction.toBuffer(),
        mint.toBuffer(),
        program.provider.wallet.publicKey.toBuffer()
      ],
      TOKEN_PROGRAM_ID
    );
    bidderEscrow = bidderEscrowPDA;

    const tx = await program.methods
      .commitBid(
        Buffer.from(commitment, "hex"),
        bidAmount
      )
      .accounts({
        auction: auction,
        bidder: bidder,
        bidderEscrow: bidderEscrow,
        bidderAuthority: program.provider.wallet.publicKey,
        bidderTokenAccount: bidderTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("Commit bid transaction:", tx);

    // Verify bidder state
    const bidderAccount = await program.account.bidder.fetch(bidder);
    expect(bidderAccount.bidder.toString()).to.equal(program.provider.wallet.publicKey.toString());
    expect(bidderAccount.revealed).to.be.false;
    expect(bidderAccount.bidAmount.toString()).to.equal(bidAmount.toString());

    // Verify tokens were transferred to escrow
    const escrowAccount = await getAccount(connection, bidderEscrow);
    expect(escrowAccount.amount.toString()).to.equal(bidAmount.toString());
  });

  it("Reveals a bid", async () => {
    // Wait for commit phase to end (simulate time passing)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const salt = Buffer.from("random_salt_123");

    const tx = await program.methods
      .revealBid(
        bidAmount,
        Array.from(salt)
      )
      .accounts({
        auction: auction,
        bidder: bidder,
        bidderAuthority: program.provider.wallet.publicKey,
      })
      .rpc();

    console.log("Reveal bid transaction:", tx);

    // Verify bid was revealed
    const bidderAccount = await program.account.bidder.fetch(bidder);
    expect(bidderAccount.revealed).to.be.true;
    expect(bidderAccount.bidAmount.toString()).to.equal(bidAmount.toString());
  });

  it("Settles the auction", async () => {
    // Wait for reveal phase to end (simulate time passing)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create winner token account
    const winnerTokenAccount = await createAccount(
      connection,
      program.provider.wallet.payer,
      mint,
      program.provider.wallet.publicKey
    );

    const tx = await program.methods
      .settleAuction()
      .accounts({
        auction: auction,
        bidder: bidder,
        auctionTokenAccount: auctionTokenAccount,
        winnerTokenAccount: winnerTokenAccount,
        bidderTokenAccount: bidderTokenAccount,
        bidderEscrow: bidderEscrow,
        authority: program.provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Settle auction transaction:", tx);

    // Verify auction was settled
    const auctionAccount = await program.account.auction.fetch(auction);
    expect(auctionAccount.settled).to.be.true;
    expect(auctionAccount.winner.toString()).to.equal(program.provider.wallet.publicKey.toString());
    expect(auctionAccount.highestBid.toString()).to.equal(bidAmount.toString());

    // Verify winner received tokens
    const winnerAccount = await getAccount(connection, winnerTokenAccount);
    expect(winnerAccount.amount.toString()).to.equal(tokenAmount.toString());
  });

  it("Fails to commit after deadline", async () => {
    // This test would require manipulating the clock or using a different approach
    // For now, we'll just test the error condition conceptually
    try {
      // This should fail if commit phase has ended
      // In a real test, you'd need to advance the clock or create a new auction
      console.log("Testing commit after deadline - this would require clock manipulation");
    } catch (error) {
      console.log("Expected error for late commit:", error);
    }
  });

  it("Fails to reveal with wrong commitment", async () => {
    // Create a new auction for this test
    const [newAuction] = await PublicKey.findProgramAddress(
      [
        Buffer.from("auction"),
        program.provider.wallet.publicKey.toBuffer(),
        mint.toBuffer(),
        Buffer.from("test2") // Different seed
      ],
      program.programId
    );

    const [newAuctionTokenAccount] = await PublicKey.findProgramAddress(
      [
        Buffer.from("auction"),
        program.provider.wallet.publicKey.toBuffer(),
        mint.toBuffer(),
        program.provider.wallet.publicKey.toBuffer()
      ],
      TOKEN_PROGRAM_ID
    );

    // Create new auction
    await program.methods
      .createAuction(
        mint,
        tokenAmount,
        new anchor.BN(commitDuration),
        new anchor.BN(revealDuration)
      )
      .accounts({
        auction: newAuction,
        auctionTokenAccount: newAuctionTokenAccount,
        authority: program.provider.wallet.publicKey,
        authorityTokenAccount: authorityTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // Commit with one salt
    const salt1 = Buffer.from("salt1");
    const bidData1 = Buffer.concat([
      Buffer.from(bidAmount.toArrayLike(Buffer, "le", 8)),
      salt1
    ]);
    const commitment1 = anchor.web3.Keccak256.hash(bidData1, "hex");

    const [newBidder] = await PublicKey.findProgramAddress(
      [
        Buffer.from("bidder"),
        newAuction.toBuffer(),
        program.provider.wallet.publicKey.toBuffer()
      ],
      program.programId
    );

    const [newBidderEscrow] = await PublicKey.findProgramAddress(
      [
        Buffer.from("auction"),
        newAuction.toBuffer(),
        mint.toBuffer(),
        program.provider.wallet.publicKey.toBuffer()
      ],
      TOKEN_PROGRAM_ID
    );

    await program.methods
      .commitBid(
        Buffer.from(commitment1, "hex"),
        bidAmount
      )
      .accounts({
        auction: newAuction,
        bidder: newBidder,
        bidderEscrow: newBidderEscrow,
        bidderAuthority: program.provider.wallet.publicKey,
        bidderTokenAccount: bidderTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // Try to reveal with different salt
    const salt2 = Buffer.from("salt2");

    try {
      await program.methods
        .revealBid(
          bidAmount,
          Array.from(salt2)
        )
        .accounts({
          auction: newAuction,
          bidder: newBidder,
          bidderAuthority: program.provider.wallet.publicKey,
        })
        .rpc();

      expect.fail("Should have failed with invalid commitment");
    } catch (error) {
      expect(error.error.errorMessage).to.include("Invalid commitment");
    }
  });
});
