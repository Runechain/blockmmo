//! RUNECHAIN real-money settlement (PRD F6).
//!
//! A single, atomic instruction routes a wrapped-SOL (or whichever mint is settled in,
//! Q-F6b) payment three ways — **50% true SPL burn · 35% marketing · 15% ops** (F5.4) — and
//! emits a `GoldPurchased` event the authoritative Chainwell server reconciles to credit
//! Gold off-chain (S1.2 seam). Gold is **never minted here**; this program only moves the
//! real-money leg and proves the split happened.
//!
//! Invariants:
//! - F6.1 Atomicity: all three legs happen in one instruction, or the tx reverts. A partial
//!   split is impossible.
//! - F6.2 True burn: `burn` (SPL Burn) reduces supply, not the incinerator address.
//! - F6.3 Go-live gate: `Config.paused` starts `true`. Flipping it live is a hard
//!   legal/compliance precondition, performed by the admin via `set_paused` — not a date.
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, TransferChecked};

declare_id!("A7A2G4qnQaKBZiCqUPtuNbeDrvdPGK4gE9wip61dXPpN");

/// F5.4 split, in basis points. Must sum to 10_000.
pub const BURN_BPS: u16 = 5_000; // 50% burned (F6.2)
pub const MARKETING_BPS: u16 = 3_500; // 35% operator-discretion marketing bucket (not a prize pool)
pub const OPS_BPS: u16 = 1_500; // 15% ops fee (single recipient)

#[program]
pub mod runechain_settlement {
    use super::*;

    /// Admin: create the singleton config. Starts PAUSED (F6.3) — settlement cannot run
    /// until an admin flips it live after legal/compliance sign-off.
    pub fn init_config(ctx: Context<InitConfig>, marketing: Pubkey, ops: Pubkey) -> Result<()> {
        let c = &mut ctx.accounts.config;
        c.authority = ctx.accounts.authority.key();
        c.marketing = marketing;
        c.ops = ops;
        c.burn_bps = BURN_BPS;
        c.marketing_bps = MARKETING_BPS;
        c.ops_bps = OPS_BPS;
        c.paused = true;
        c.bump = ctx.bumps.config;
        require_eq!(
            c.burn_bps as u32 + c.marketing_bps as u32 + c.ops_bps as u32,
            10_000,
            SettlementError::InvalidSplit
        );
        Ok(())
    }

    /// Admin: the legal/compliance go-live toggle (F6.3). Designed now, flipped later.
    pub fn set_paused(ctx: Context<AdminOnly>, paused: bool) -> Result<()> {
        ctx.accounts.config.paused = paused;
        Ok(())
    }

    /// Atomically settle `amount` of the configured mint: burn 50%, send 35% to marketing,
    /// 15% to ops. The buyer signs and the legs all draw from their token account. Dust from
    /// integer division is absorbed by the ops leg so the three legs sum exactly to `amount`.
    pub fn purchase_gold(ctx: Context<PurchaseGold>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(!config.paused, SettlementError::Paused);
        require!(amount > 0, SettlementError::ZeroAmount);

        let burn_amt = (amount as u128 * config.burn_bps as u128 / 10_000) as u64;
        let mkt_amt = (amount as u128 * config.marketing_bps as u128 / 10_000) as u64;
        let ops_amt = amount
            .checked_sub(burn_amt)
            .and_then(|v| v.checked_sub(mkt_amt))
            .ok_or(SettlementError::MathOverflow)?;

        let decimals = ctx.accounts.mint.decimals;
        let token_program = ctx.accounts.token_program.to_account_info();

        // 1) true SPL burn — reduces supply, not the incinerator (F6.2)
        token::burn(
            CpiContext::new(
                token_program.clone(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.buyer_token.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            burn_amt,
        )?;

        // 2) 35% -> marketing
        token::transfer_checked(
            CpiContext::new(
                token_program.clone(),
                TransferChecked {
                    from: ctx.accounts.buyer_token.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.marketing_token.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            mkt_amt,
            decimals,
        )?;

        // 3) 15% -> ops
        token::transfer_checked(
            CpiContext::new(
                token_program,
                TransferChecked {
                    from: ctx.accounts.buyer_token.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.ops_token.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            ops_amt,
            decimals,
        )?;

        emit!(GoldPurchased {
            buyer: ctx.accounts.buyer.key(),
            mint: ctx.accounts.mint.key(),
            amount,
            burn: burn_amt,
            marketing: mkt_amt,
            ops: ops_amt,
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(init, payer = authority, space = 8 + Config::LEN, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump, has_one = authority)]
    pub config: Account<'info, Config>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct PurchaseGold<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut, token::mint = mint, token::authority = buyer)]
    pub buyer_token: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint, constraint = marketing_token.owner == config.marketing @ SettlementError::WrongDestination)]
    pub marketing_token: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint, constraint = ops_token.owner == config.ops @ SettlementError::WrongDestination)]
    pub ops_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Config {
    pub authority: Pubkey,
    pub marketing: Pubkey,
    pub ops: Pubkey,
    pub burn_bps: u16,
    pub marketing_bps: u16,
    pub ops_bps: u16,
    pub paused: bool,
    pub bump: u8,
}

impl Config {
    pub const LEN: usize = 32 * 3 + 2 * 3 + 1 + 1;
}

#[event]
pub struct GoldPurchased {
    pub buyer: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub burn: u64,
    pub marketing: u64,
    pub ops: u64,
}

#[error_code]
pub enum SettlementError {
    #[msg("Settlement is paused pending legal/compliance sign-off")]
    Paused,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Split basis points must sum to 10000")]
    InvalidSplit,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Destination token account owner does not match config")]
    WrongDestination,
}
