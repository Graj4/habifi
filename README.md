# StreakSats ⚡

**Habit Tracking + Yield Farming on Bitcoin L1**
Built on OP_NET · vibecode.finance Week 2 · #opnetvibecode

> Stack Sats. Build Habits. Earn Yield.

---

## How It Works

1. **Stake** PILL tokens on a real-life habit (exercise, reading, orange-pilling friends…)
2. **Check in** daily/weekly on Bitcoin L1 — your streak grows on-chain
3. **Earn yield** from the Impatience Tax — when others break their streak, 10% of their stake is redistributed to active streak holders
4. **Collect soulbound NFT badges** at 7, 30, and 100-day milestones (non-transferable)
5. **Earn Moto Miles** per check-in — snapshotted for $MOTO airdrop priority

---

## Project Structure

```
BitDeFi/
├── contracts/          # AssemblyScript smart contracts
│   ├── src/StreakSats/     # Main habit + yield contract
│   └── src/StreakBadge/    # Soulbound OP_721 badge NFT
└── frontend/           # React + Vite + opnet SDK
    └── src/
        ├── components/     # All 6 screens
        └── lib/            # Hooks, ABI, config
```

---

## Quick Start

### 1. Build & Deploy Contracts

```bash
cd contracts
npm install
npm run build          # compiles to build/StreakSats.wasm + build/StreakBadge.wasm
```

Deploy via **OP_WALLET Chrome extension**:
- Go to OP_WALLET → Deploy Contract → Upload `build/StreakBadge.wasm` first
- Then upload `build/StreakSats.wasm`
- Copy both deployed contract addresses

### 2. Post-deployment setup

After deploying, call `setAddresses()` on StreakSats with:
- PILL token contract address (from OP_NET testnet)
- StreakBadge contract address (from step above)

Then call `setMinter()` on StreakBadge with the StreakSats contract address.

### 3. Configure Frontend

Edit `frontend/src/lib/config.ts`:
```typescript
export const STREAK_SATS_ADDRESS  = 'your-streaksats-address';
export const STREAK_BADGE_ADDRESS = 'your-streakbadge-address';
export const PILL_TOKEN_ADDRESS   = 'pill-token-address-on-testnet';
```

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev            # starts at http://localhost:5173
```

---

## Contract Functions

| Function | Description |
|---|---|
| `createHabit(name, frequency, stakeAmount)` | Stake PILL and start a habit |
| `checkIn(habitId)` | Prove you maintained the habit |
| `breakStreak(habitId)` | Triggers 10% Impatience Tax, anyone can call |
| `claimYield()` | Claim your share of the redistribution pool |
| `sponsor(amount)` | Add PILL to the reward pool |
| `challenge(friend, multiplier, baseAmount)` | Send a streak challenge |
| `acceptChallenge(challengeId)` | Accept a pending challenge |
| `getLeaderboard()` | Top 10 streaks on-chain |
| `getMotoMiles(user)` | Moto Miles for airdrop snapshot |

---

## Tokenomics

- **Entry**: Minimum 500 PILL staked per habit
- **Impatience Tax**: 10% of stake slashed on streak break → redistributionPool
- **Yield formula**: `userYield = (userStreakDays / totalStreakDays) × pool`
- **Yield model**: MasterChef pattern (pull-based, no iteration)
- **Moto Miles**: 1 per check-in, tracked on-chain for $MOTO airdrop

---

## Tech Stack

- **Contracts**: AssemblyScript → WebAssembly, deployed on Bitcoin L1 via OP_NET
- **Frontend**: React 18 + Vite + TypeScript
- **Wallet**: OP_WALLET (via `@btc-vision/walletconnect`)
- **Blockchain reads**: `opnet` JSONRpcProvider
- **Token standard**: OP_20 (PILL), OP_721 (soulbound badges)

---

## Networks

| Network | RPC |
|---|---|
| Testnet | `https://testnet.opnet.org` |
| Mainnet | `https://mainnet.opnet.org` |

---

Built for **vibecode.finance Week 2: The DeFi Signal**
Deadline: March 6, 2026 · Theme: "Tools that make money work on Bitcoin"
