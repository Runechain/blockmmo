# Account Binding

RUNECHAIN uses a browser-local game account credential for the prototype. The browser
creates a non-extractable P-256 key pair with Web Crypto and keeps it in IndexedDB. The
server issues a short-lived challenge, the browser signs it, and the server derives the
account id from the public key.

This gives the server a stable pseudonymous account without requiring a wallet at first
launch. It also keeps gameplay value keyed to a server-issued character id instead of a
mutable display name or transient WebSocket peer id.

## Prototype Rule

- Account id: `acct_` plus the first 24 hex chars of SHA-256 over the canonical public
  P-256 JWK.
- Character id: `char_` plus the first 24 hex chars of SHA-256 over
  `accountId|seasonId`.
- Cap: one character per account key per season.
- Season state: the realm server persists `{ id, opensAt, closesAt, mandatoryTasks }`
  in `accounts.json`. Timestamps are real-world epoch milliseconds supplied by the
  operator/config for this prototype.
- Season completion: a character is marked `seasonComplete` only after every configured
  mandatory task is recorded while the shared window is open.
- Carry/reset: a kept character carries grind-earned `collection` and `stats` into the
  next season. A sale transfer carries the collection to the buyer but resets stats to
  zero; the seller's next character restarts at zero.
- Display name: mutable label only. It is not a value address.
- Chainwell value address: the server-issued character id for the active season.
- Online ledger append path: exact server-issued `mine:submit` reward work only. Generic
  client-submitted blocks are rejected in connected realms.

## Security Posture

The current model prevents accidental duplicate characters for one browser profile and
stops clients from forging another player's character id in realm messages. It is not
strong sybil resistance. Clearing browser storage, changing browser profiles, or using a
different device can create another game account.

That is acceptable for the local prototype and internal playtests. Production real-money
sales still need the legal/compliance identity decision tracked separately before any
cash-out market is enabled.

## Server Protocol

1. Client opens the WebSocket.
2. Client sends `account:challenge` with `{ type: "browser-p256-v1", publicKey }`.
3. Server replies with `account:challenge`, including `challengeId`, `seasonId`,
   `accountId`, and a canonical message string.
4. Client signs the message and sends `join` with the original public key,
   `challengeId`, and signature.
5. Server verifies the signature, creates or reuses the season character, and replies
   with `account`, including a server-owned realm peer id.
6. Authenticated clients can send state and request/submit server-issued mining work.
   Generic client block gossip is rejected in connected realms.

## Legacy Ledgers

Pre-account prototype ledgers used mutable display names as value addresses. This issue
does not auto-migrate those balances because a display name does not prove ownership of a
new browser credential. Operators should reset old prototype ledgers or run an explicit
out-of-band migration before persistent/public playtests.

## Season-State Assumptions

- Q-F7a is intentionally not resolved here: a character whose season window closes with
  unfinished tasks remains incomplete. No penalty, lock, or auto-reset is applied by this
  slice.
- Q-A1 is intentionally not resolved here: buyer/seller operations use existing prototype
  account ids. Production identity, wallet linkage, escrow, and compliance controls remain
  separate work.
- Open/close windows are deterministic server configuration, not a client clock. Tests use
  injected timestamps so carry/reset behavior is replayable without external chain calls.

## Follow-Ups

- Confirm whether production keeps this as the low-friction account layer or adds wallet
  and verified-identity gates at the sale boundary.
- Add an account recovery flow before persistent player progress matters.
- Decide season id source and migration rules before public seasons.
