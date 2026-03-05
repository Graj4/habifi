# CLAUDE.md -- OPNet Frontend Project

## Project Description

This is a frontend application that interacts with smart contracts on Bitcoin Layer 1 with OP_NET. It connects to OP_WALLET for transaction signing and uses the opnet SDK for blockchain queries.

## Required Reading

Before writing ANY frontend code, read the skill docs:
- Read `crypto-frontend-design` skill docs for UI patterns and wallet integration
- Read `opnet-development` skill docs for contract interaction patterns
- Read `setup-guidelines.md` for correct package versions

## Package Rules

### ALWAYS Use
- `opnet` -- OPNet SDK, JSONRpcProvider, getContract, ABIs
- `@btc-vision/bitcoin` -- Bitcoin library (OPNet fork)
- `@btc-vision/transaction` -- Transaction types and ABI data types
- `@btc-vision/walletconnect` -- Wallet connection modal
- `react` -- UI framework
- `vite` -- Build tool and dev server

### NEVER Use
- `bitcoinjs-lib` -- wrong Bitcoin library
- `ethers` or `web3` -- Ethereum libraries
- `@metamask/sdk` or MetaMask patterns -- wrong wallet
- `window.ethereum` -- MetaMask's API, does not apply here
- `express` -- wrong backend framework (use hyper-express if backend needed)

### Package Versions
- Check the opnet-development skill setup-guidelines for exact versions
- Do not use `latest` or `^` ranges -- use pinned versions from the docs

## Wallet Integration

### Connection
- Use `@btc-vision/walletconnect` for the connection modal
- ALWAYS include the WalletConnect popup CSS fix (modal renders broken without it)
- Handle connection, disconnection, and network switching gracefully
- Show clear UI states for: not connected, connecting, connected, wrong network

### WalletConnect Popup CSS Fix (MANDATORY)
```css
.wallet-connect-modal,
[class*="walletconnect"] [class*="modal"],
[class*="WalletConnect"] [class*="Modal"] {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 99999 !important;
    background: rgba(0, 0, 0, 0.7) !important;
}

.wallet-connect-modal > div,
[class*="walletconnect"] [class*="modal"] > div,
[class*="WalletConnect"] [class*="Modal"] > div {
    position: relative !important;
    max-width: 420px !important;
    max-height: 80vh !important;
    overflow-y: auto !important;
    border-radius: 16px !important;
}
```

## Contract Interaction Rules

### Provider
- Create a SEPARATE `JSONRpcProvider` from the `opnet` package for all read operations
- Testnet: `https://testnet.opnet.org`
- Mainnet: `https://mainnet.opnet.org`
- NEVER use the WalletConnect provider for reads -- only for signing

### Contract Calls
- Use `getContract<T>(address, abi, provider, network, senderAddress)` from opnet
- ALWAYS simulate before sending: `const sim = await contract.method(params)`
- Check for revert: `if ('error' in sim) { handle error }`
- Send with NULL signers on frontend: `sim.sendTransaction({ signer: null, mldsaSigner: null, refundTo: addr })`
- NEVER put private keys in frontend code

### ABIs
- Use built-in ABIs when available: `OP_20_ABI`, `OP_721_ABI`
- For custom contracts, define ABI as `BitcoinInterfaceAbi` array
- Import `ABIDataTypes` from `@btc-vision/transaction` for type definitions

## UI Standards

### General
- TypeScript only -- no JavaScript files
- React functional components with hooks
- Dark theme preferred (consistent with crypto aesthetic)
- Responsive design (works on mobile and desktop)
- Loading spinners for async operations
- Error messages for failed operations
- Success feedback for completed transactions

### Data Display
- Truncate addresses: show first 8 and last 6 characters
- Format large numbers with commas or abbreviations
- Show token amounts with proper decimal formatting
- Auto-refresh balances after transactions

## Build and Dev

- `npm install` -- install dependencies
- `npm run dev` -- start dev server (usually port 5173)
- `npm run build` -- production build to `dist/` folder
- Deploy `dist/` to IPFS or .btc domain for production