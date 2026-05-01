use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod sealbid {
    use super::*;

    /// Creates a new auction with specified parameters
    pub fn create_auction(
        ctx: Context<CreateAuction>,
        token_mint: Pubkey,
        token_amount: u64,
        commit_duration: i64,
        reveal_duration: i64,
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        auction.authority = ctx.accounts.authority.key();
        auction.token_mint = token_mint;
        auction.token_amount = token_amount;
        auction.commit_deadline = clock.unix_timestamp + commit_duration;
        auction.reveal_deadline = auction.commit_deadline + reveal_duration;
        auction.highest_bid = 0;
        auction.winner = Pubkey::default();
        auction.settled = false;
        auction.bump = ctx.bumps.auction;

        // Transfer auctioned tokens to auction escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.authority_token_account.to_account_info(),
            to: ctx.accounts.auction_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, token_amount)?;

        emit!(AuctionCreated {
            auction: auction.key(),
            authority: auction.authority,
            token_mint,
            token_amount,
            commit_deadline: auction.commit_deadline,
            reveal_deadline: auction.reveal_deadline,
        });

        Ok(())
    }

    /// Commits a bid hash during the commit phase
    pub fn commit_bid(
        ctx: Context<CommitBid>,
        commitment: [u8; 32],
        bid_amount: u64,
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let bidder = &mut ctx.accounts.bidder;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp <= auction.commit_deadline,
            ErrorCode::CommitPhaseEnded
        );

        bidder.auction = auction.key();
        bidder.bidder = ctx.accounts.bidder_authority.key();
        bidder.commitment = commitment;
        bidder.bid_amount = bid_amount;
        bidder.revealed = false;
        bidder.bump = ctx.bumps.bidder;

        // Lock bid tokens in escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.bidder_token_account.to_account_info(),
            to: ctx.accounts.bidder_escrow.to_account_info(),
            authority: ctx.accounts.bidder_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, bid_amount)?;

        emit!(BidCommitted {
            auction: auction.key(),
            bidder: bidder.bidder,
            commitment,
        });

        Ok(())
    }

    /// Reveals the actual bid amount and salt
    pub fn reveal_bid(
        ctx: Context<RevealBid>,
        bid_amount: u64,
        salt: [u8; 32],
    ) -> Result<()> {
        let auction = &ctx.accounts.auction;
        let bidder = &mut ctx.accounts.bidder;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp > auction.commit_deadline,
            ErrorCode::CommitPhaseNotEnded
        );
        require!(
            clock.unix_timestamp <= auction.reveal_deadline,
            ErrorCode::RevealPhaseEnded
        );
        require!(!bidder.revealed, ErrorCode::AlreadyRevealed);

        // Verify the commitment
        let mut data = Vec::with_capacity(16);
        data.extend_from_slice(&bid_amount.to_le_bytes());
        data.extend_from_slice(&salt);
        
        let hash = anchor_lang::solana_program::keccak::hash(&data);
        require!(
            hash.into_bytes() == bidder.commitment,
            ErrorCode::InvalidCommitment
        );

        bidder.revealed = true;
        bidder.bid_amount = bid_amount;

        emit!(BidRevealed {
            auction: auction.key(),
            bidder: bidder.bidder,
            bid_amount,
        });

        Ok(())
    }

    /// Settles the auction and transfers tokens to winner
    pub fn settle_auction(ctx: Context<SettleAuction>) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp > auction.reveal_deadline,
            ErrorCode::RevealPhaseNotEnded
        );
        require!(!auction.settled, ErrorCode::AlreadySettled);

        // Find the highest valid bid
        let mut highest_bid = 0;
        let mut winner = Pubkey::default();

        // Note: In a real implementation, you'd need to iterate through all bidders
        // For now, we'll use a simplified approach with the provided bidder account
        if ctx.accounts.bidder.revealed && ctx.accounts.bidder.bid_amount > highest_bid {
            highest_bid = ctx.accounts.bidder.bid_amount;
            winner = ctx.accounts.bidder.bidder;
        }

        if winner != Pubkey::default() {
            auction.highest_bid = highest_bid;
            auction.winner = winner;
            auction.settled = true;

            // Transfer auctioned tokens to winner
            let auction_key = auction.key();
            let seeds = &[
                b"auction",
                auction.authority.as_ref(),
                auction.token_mint.as_ref(),
                &[auction.bump],
            ];
            let signer = &[&seeds[..]];

            let cpi_accounts = Transfer {
                from: ctx.accounts.auction_token_account.to_account_info(),
                to: ctx.accounts.winner_token_account.to_account_info(),
                authority: auction.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::transfer(cpi_ctx, auction.token_amount)?;

            // Refund losing bidders (simplified - in reality you'd handle all bidders)
            if ctx.accounts.bidder.bidder != winner {
                let cpi_accounts = Transfer {
                    from: ctx.accounts.bidder_escrow.to_account_info(),
                    to: ctx.accounts.bidder_token_account.to_account_info(),
                    authority: auction.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
                token::transfer(cpi_ctx, ctx.accounts.bidder.bid_amount)?;
            }

            emit!(AuctionSettled {
                auction: auction.key(),
                winner,
                highest_bid,
            });
        }

        Ok(())
    }

    /// Slashes funds from bidders who didn't reveal
    pub fn slash_non_revealer(ctx: Context<SlashNonRevealer>) -> Result<()> {
        let auction = &ctx.accounts.auction;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp > auction.reveal_deadline,
            ErrorCode::RevealPhaseNotEnded
        );
        require!(!ctx.accounts.bidder.revealed, ErrorCode::BidderRevealed);

        // Transfer slashed funds to auction authority
        let auction_key = auction.key();
        let seeds = &[
            b"auction",
            auction.authority.as_ref(),
            auction.token_mint.as_ref(),
            &[auction.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.bidder_escrow.to_account_info(),
            to: ctx.accounts.authority_token_account.to_account_info(),
            authority: auction.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, ctx.accounts.bidder.bid_amount)?;

        emit!(BidSlashed {
            auction: auction.key(),
            bidder: ctx.accounts.bidder.bidder,
            amount: ctx.accounts.bidder.bid_amount,
        });

        Ok(())
    }
}

#[account]
pub struct Auction {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub token_amount: u64,
    pub commit_deadline: i64,
    pub reveal_deadline: i64,
    pub highest_bid: u64,
    pub winner: Pubkey,
    pub settled: bool,
    pub bump: u8,
}

#[account]
pub struct Bidder {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub commitment: [u8; 32],
    pub bid_amount: u64,
    pub revealed: bool,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(token_mint: Pubkey)]
pub struct CreateAuction<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 32 + 1 + 1,
        seeds = [b"auction", authority.key().as_ref(), token_mint.as_ref()],
        bump
    )]
    pub auction: Account<'info, Auction>,
    
    #[account(
        init,
        payer = authority,
        token::mint = token_mint,
        token::authority = authority,
    )]
    pub auction_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        token::mint = token_mint,
    )]
    pub authority_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CommitBid<'info> {
    #[account(mut)]
    pub auction: Account<'info, Auction>,
    
    #[account(
        init,
        payer = bidder_authority,
        space = 8 + 32 + 32 + 32 + 8 + 1 + 1,
        seeds = [b"bidder", auction.key().as_ref(), bidder_authority.key().as_ref()],
        bump
    )]
    pub bidder: Account<'info, Bidder>,
    
    #[account(
        init,
        payer = bidder_authority,
        token::mint = auction.token_mint,
        token::authority = auction,
    )]
    pub bidder_escrow: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub bidder_authority: Signer<'info>,
    #[account(
        mut,
        token::mint = auction.token_mint,
    )]
    pub bidder_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct RevealBid<'info> {
    pub auction: Account<'info, Auction>,
    #[account(mut)]
    pub bidder: Account<'info, Bidder>,
    pub bidder_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SettleAuction<'info> {
    #[account(mut)]
    pub auction: Account<'info, Auction>,
    pub bidder: Account<'info, Bidder>,
    
    #[account(
        mut,
        token::mint = auction.token_mint,
    )]
    pub auction_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = authority,
        token::mint = auction.token_mint,
    )]
    pub winner_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        token::mint = auction.token_mint,
    )]
    pub bidder_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        token::mint = auction.token_mint,
    )]
    pub bidder_escrow: Account<'info, TokenAccount>,
    
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SlashNonRevealer<'info> {
    pub auction: Account<'info, Auction>,
    #[account(mut)]
    pub bidder: Account<'info, Bidder>,
    
    #[account(
        mut,
        token::mint = auction.token_mint,
    )]
    pub bidder_escrow: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        token::mint = auction.token_mint,
    )]
    pub authority_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[event]
pub struct AuctionCreated {
    pub auction: Pubkey,
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub token_amount: u64,
    pub commit_deadline: i64,
    pub reveal_deadline: i64,
}

#[event]
pub struct BidCommitted {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub commitment: [u8; 32],
}

#[event]
pub struct BidRevealed {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub bid_amount: u64,
}

#[event]
pub struct AuctionSettled {
    pub auction: Pubkey,
    pub winner: Pubkey,
    pub highest_bid: u64,
}

#[event]
pub struct BidSlashed {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Commit phase has ended")]
    CommitPhaseEnded,
    #[msg("Commit phase has not ended yet")]
    CommitPhaseNotEnded,
    #[msg("Reveal phase has ended")]
    RevealPhaseEnded,
    #[msg("Reveal phase has not ended yet")]
    RevealPhaseNotEnded,
    #[msg("Bid has already been revealed")]
    AlreadyRevealed,
    #[msg("Invalid commitment hash")]
    InvalidCommitment,
    #[msg("Auction has already been settled")]
    AlreadySettled,
    #[msg("Bidder has revealed their bid")]
    BidderRevealed,
}
