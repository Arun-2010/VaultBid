# SealBid Deployment Guide

This guide covers deploying the SealBid MEV-proof auction system on Solana.

## 🚀 Deployment Overview

SealBid consists of three main components:
1. **Smart Contract** - Solana program with auction logic
2. **SDK** - TypeScript client library
3. **Frontend** - Next.js web application

## 📋 Prerequisites

### Required Tools
- Node.js 18+ 
- Rust 1.70+
- Solana CLI 1.18+
- Anchor CLI 0.30+
- Git

### Wallet Setup
```bash
# Create a new keypair for deployment
solana-keygen new --outfile ~/.config/solana/deploy-keypair.json

# Set as default wallet
solana config set --keypair ~/.config/solana/deploy-keypair.json

# Get SOL for deployment (devnet)
solana airdrop 5 --url devnet
```

## 🔧 Smart Contract Deployment

### 1. Build the Program
```bash
cd sealbid
anchor build
```

### 2. Deploy to Devnet
```bash
anchor deploy --provider.cluster devnet
```

### 3. Verify Deployment
```bash
# Check program is deployed
solana program show --url devnet <PROGRAM_ID>

# Verify IDL
anchor idl fetch --provider.cluster devnet <PROGRAM_ID>
```

### 4. Update Program ID
After deployment, update the program ID in:
- `sdk/src/index.ts`
- `app/lib/sealbid-sdk.ts`
- `Anchor.toml`

## 📦 SDK Deployment

### 1. Build the SDK
```bash
cd sdk
npm run build
```

### 2. Publish to NPM (Optional)
```bash
npm login
npm publish --access public
```

### 3. Update Dependencies
```bash
# In frontend app
cd ../app
npm install @sealbid/sdk@latest
```

## 🌐 Frontend Deployment

### Environment Variables
Create `.env.local` in the app directory:

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=<DEPLOYED_PROGRAM_ID>
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

### Build for Production
```bash
cd app
npm run build
```

### Deploy Options

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=.next
```

#### Docker
```bash
# Build Docker image
docker build -t sealbid-frontend .

# Run container
docker run -p 3000:3000 sealbid-frontend
```

## 🔍 Testing Deployment

### 1. Smart Contract Tests
```bash
anchor test --skip-deploy
```

### 2. Integration Tests
```bash
cd tests
npm test
```

### 3. Frontend Tests
```bash
cd app
npm test
```

### 4. Manual Testing
1. Visit deployed frontend
2. Connect wallet (Phantom/Solflare)
3. Create a test auction
4. Commit a bid
5. Reveal the bid
6. Verify settlement

## 🌍 Mainnet Deployment

### 1. Switch to Mainnet
```bash
solana config set --url mainnet-beta
```

### 2. Fund Deployment Wallet
```bash
# Transfer SOL to deployment wallet
solana transfer <DEPLOYMENT_WALLET> <AMOUNT> --url mainnet-beta
```

### 3. Deploy Contract
```bash
anchor deploy --provider.cluster mainnet
```

### 4. Update Frontend Config
Update environment variables for mainnet:
```env
NEXT_PUBLIC_SOLANA_NETWORK=mainnet
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
```

### 5. Deploy Frontend
```bash
cd app
npm run build
vercel --prod
```

## 📊 Monitoring

### Program Logs
```bash
# Monitor program logs
solana logs --url devnet <PROGRAM_ID>
```

### Account Monitoring
```bash
# Check auction accounts
solana account <AUCTION_PUBKEY> --url devnet

# Check all program accounts
solana account <PROGRAM_ID> --url devnet --output json
```

### Frontend Analytics
- Set up Vercel Analytics
- Configure error tracking (Sentry)
- Monitor performance metrics

## 🔐 Security Considerations

### Smart Contract Security
- Audit the contract before mainnet deployment
- Use multi-sig for program authority
- Set proper upgrade authority

### Frontend Security
- Use HTTPS in production
- Validate all user inputs
- Implement rate limiting
- Secure environment variables

### Key Management
- Never commit private keys
- Use hardware wallets for production
- Rotate keys regularly
- Backup all important keys

## 🚨 Troubleshooting

### Common Issues

#### "Insufficient funds"
```bash
# Check balance
solana balance --url devnet

# Request more SOL
solana airdrop 2 --url devnet
```

#### "Program not found"
```bash
# Verify program ID
solana program show <PROGRAM_ID> --url devnet

# Redeploy if necessary
anchor deploy --provider.cluster devnet
```

#### "Transaction failed"
- Check account initialization
- Verify sufficient rent exemption
- Review instruction data
- Check cluster status

### Debug Commands
```bash
# Get cluster status
solana cluster-version

# Check recent blocks
solana block-commitment --url devnet

# Monitor transaction
solana confirm <TRANSACTION_SIGNATURE> --url devnet
```

## 📈 Performance Optimization

### Smart Contract
- Optimize account sizes
- Use efficient data structures
- Minimize compute units
- Batch operations when possible

### Frontend
- Enable caching
- Optimize images
- Use CDN for static assets
- Implement lazy loading

### RPC Endpoints
- Use dedicated RPC nodes
- Implement request caching
- Handle rate limits
- Use WebSocket subscriptions

## 🔄 Maintenance

### Regular Tasks
- Monitor program performance
- Update dependencies
- Backup important data
- Check security advisories

### Updates
```bash
# Update Anchor
npm install -g @coral-xyz/anchor-cli@latest

# Update Solana CLI
solana-install update

# Update dependencies
npm update
```

## 📞 Support

For deployment issues:
- Check [Solana documentation](https://docs.solana.com/)
- Review [Anchor guide](https://www.anchor-lang.com/)
- Join SealBid Discord
- Create GitHub issue

Remember to test thoroughly on devnet before deploying to mainnet!
