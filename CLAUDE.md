# CLAUDE.md -- OPNet Smart Contract Project

## Project Description

This is a smart contract project built on Bitcoin Layer 1 with OP_NET. Contracts are written in AssemblyScript and compiled to WebAssembly.

## Required Reading

Before writing ANY contract code, read the opnet-development skill docs:
- Read `contracts-guidelines.md` for contract patterns
- Read the relevant contract type docs (OP20, OP721, etc.)
- Read `setup-guidelines.md` for correct package versions
- Read `audit-guidelines.md` before finalizing any contract

## Package Rules

### ALWAYS Use
- `@btc-vision/bitcoin` -- Bitcoin library (OPNet fork)
- `@btc-vision/ecpair` -- EC pair library (OPNet fork)
- `@btc-vision/transaction` -- Transaction construction
- `opnet` -- OPNet SDK and provider
- `@btc-vision/btc-runtime` -- Smart contract runtime

### NEVER Use
- `bitcoinjs-lib` -- wrong Bitcoin library, will break transactions
- `ecpair` -- wrong EC pair library
- `tiny-secp256k1` -- use `@noble/curves` instead
- `ethers` or `web3` -- Ethereum libraries, wrong ecosystem
- `express`, `fastify`, `koa` -- wrong backend framework

### Package Versions
- DO NOT guess package versions
- Check the opnet-development skill setup-guidelines for exact versions
- Do not use `latest` or `^` ranges -- use pinned versions from the docs

## Smart Contract Rules

### Architecture
- Contracts are classes extending the appropriate base (OP20, OP721, etc.)
- The constructor runs on EVERY interaction, not just deployment
- Use `onDeployment()` for one-time initialization (minting, setting owner, etc.)
- All state is stored via storage pointers

### Safety
- Use SafeMath for ALL u256 arithmetic operations -- no raw +, -, *, /
- No `while` loops -- all loops must be bounded with a known max iteration count
- No iterating over all map keys -- store aggregates separately
- Every storage pointer must have a unique numeric value -- collisions corrupt data

### Access Control
- Owner-only functions must check `Revert.ifNotOwner(this, msg.sender)`
- Public functions that modify state should validate all inputs
- Check for zero-address and zero-amount where applicable

### Coding Standards
- TypeScript / AssemblyScript only -- no raw JavaScript
- Every public function should have clear parameter types
- Use descriptive storage pointer names with comments showing their numeric ID
- Handle all arithmetic edge cases (overflow, underflow, division by zero)

## Build Process

- `npm install` -- install dependencies
- `npm run build` -- compile contract to WebAssembly
- Output: `.wasm` file in the build directory

## Deployment

- Use testnet for testing: `https://testnet.opnet.org`
- Use mainnet for production: `https://mainnet.opnet.org`
- Read the opnet-cli skill docs for deployment commands

## Before Finalizing

1. Run the full audit checklist from the skill docs
2. Check all storage pointers are unique
3. Verify SafeMath is used everywhere
4. Confirm no unbounded loops exist
5. Test all functions on testnet before mainnet