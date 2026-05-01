# SealBid - MEV-Proof Auction System on Solana

A decentralized auction protocol where bids are hidden during the commit phase and revealed later, preventing front-running and MEV attacks.

## 🎯 Features

- **MEV-Proof**: Commit-reveal scheme prevents front-running and MEV extraction
- **Fair & Transparent**: All transactions on-chain, rules enforced by smart contract
- **Non-Custodial**: You maintain full control of your funds at all times
- **Low Fees**: Built on Solana for fast, cheap transactions
- **Real-time UI**: Live countdown timers and instant status updates

## 🏗️ Architecture

### Smart Contract (Solana Program)
- **Language**: Rust + Anchor Framework
- **Features**: 
  - Create auctions with configurable timing
  - Commit bid hashes during commit phase
  - Reveal actual bids during reveal phase
  - Automatic settlement with winner selection
  - Slash funds for non-revealing bidders

### TypeScript SDK
- Reusable client library for SealBid integration
- Handles wallet connections and transaction building
- Provides easy-to-use methods for all auction operations

### Web Frontend
- **Framework**: Next.js 14 + TypeScript
- **Styling**: Tailwind CSS
- **Features**: 
  - Wallet integration (Phantom, Solflare)
  - Real-time auction timers
  - Commit and reveal forms
  - Auction status tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Solana CLI
- Anchor CLI
- Rust

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd sealbid
```

2. **Install dependencies**
```bash
# Install smart contract dependencies
cd programs/sealbid
cargo build-bpf --manifest-path=Cargo.toml --bpf-out-dir=target/deploy

# Install SDK dependencies
cd ../../sdk
npm install

# Install frontend dependencies
cd ../app
npm install
```

3. **Deploy the smart contract**
```bash
# From project root
anchor build
anchor deploy --provider.cluster devnet
```

4. **Run the frontend**
```bash
cd app
npm run dev
```

Visit `http://localhost:3000` to access the SealBid interface.

## 📋 How It Works

### 1. Commit Phase
- Users submit a hash of their bid amount + random salt
- Actual bid amounts remain hidden
- Funds are locked in escrow

### 2. Reveal Phase  
- Users reveal their actual bid amount and salt
- Smart contract verifies the commitment matches
- Valid bids are recorded

### 3. Settlement
- Highest valid bid wins
- Auctioned tokens transferred to winner
- Losing bidders refunded automatically
- Non-revealers get slashed

## 🔧 Development

### Smart Contract Development

The smart contract is located in `programs/sealbid/src/lib.rs`. Key components:

- **Auction PDA**: Stores auction state and configuration
- **Bidder PDA**: Stores individual bidder commitments and escrow
- **Instructions**: `createAuction`, `commitBid`, `revealBid`, `settleAuction`

Run tests:
```bash
anchor test
```

### SDK Development

The SDK is in `sdk/src/`. It provides a simple interface for interacting with the SealBid protocol:

```typescript
import { SealBidSDK } from '@sealbid/sdk';

const sdk = new SealBidSDK(connection, wallet);

// Create auction
const auction = await sdk.createAuction({
  tokenMint: new PublicKey(...),
  tokenAmount: new BN(1000000),
  commitDuration: new BN(3600), // 1 hour
  revealDuration: new BN(3600), // 1 hour
});

// Commit bid
const salt = sdk.generateRandomSalt();
const { commitment, tx } = await sdk.commitBid(
  auction,
  new BN(100000), // bid amount
  salt
);

// Reveal bid
await sdk.revealBid(auction, new BN(100000), salt);
```

### Frontend Development

The frontend uses Next.js with TypeScript. Key pages:

- `/` - Home page with recent auctions
- `/create` - Create new auction
- `/auction/[id]` - Auction detail page
- `/auctions` - Browse all auctions

## 🧪 Testing

### Smart Contract Tests
```bash
anchor test
```

### SDK Tests
```bash
cd sdk
npm test
```

### Frontend Tests
```bash
cd app
npm test
```

## 📁 Project Structure

```
sealbid/
├── programs/              # Solana smart contract
│   └── sealbid/
│       ├── src/
│       │   └── lib.rs     # Main contract logic
│       └── Cargo.toml
├── sdk/                   # TypeScript SDK
│   ├── src/
│   │   ├── index.ts       # Main SDK exports
│   │   └── types.ts       # Type definitions
│   └── package.json
├── app/                   # Next.js frontend
│   ├── app/
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Home page
│   │   └── globals.css    # Global styles
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries
│   └── package.json
├── tests/                # Integration tests
├── Anchor.toml          # Anchor configuration
└── README.md
```

## 🔐 Security Considerations

- **Random Salt Generation**: Uses cryptographically secure random values
- **Hash Function**: Uses keccak256 for commitment hashing
- **Client-side Security**: Sensitive computations happen in the browser
- **Smart Contract Audits**: Contract designed with security best practices
- **No Centralized Backend**: Fully decentralized architecture

## 🌐 Network Deployment

### Devnet (Development)
```bash
anchor deploy --provider.cluster devnet
```

### Mainnet (Production)
```bash
anchor deploy --provider.cluster mainnet
```

Update the network configuration in:
- `Anchor.toml` for smart contract
- Frontend wallet adapter configuration
- SDK connection endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.sealbid.io](https://docs.sealbid.io)
- **Discord**: [SealBid Community](https://discord.gg/sealbid)
- **Twitter**: [@SealBidProtocol](https://twitter.com/SealBidProtocol)

## 🙏 Acknowledgments

- [Solana](https://solana.com/) - High-performance blockchain
- [Anchor](https://www.anchor-lang.com/) - Solana development framework
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
