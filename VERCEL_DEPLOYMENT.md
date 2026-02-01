# Vercel Deployment Guide

This guide walks through deploying CoolSwap to Vercel with serverless backend functions.

## Prerequisites

- Vercel account (free tier works)
- Vercel CLI installed: `npm i -g vercel`
- Git repository (for automatic deployments)

## Step 1: Generate Server Wallet

The server wallet acts as the fee payer for Relay transactions.

```bash
# Install @solana/web3.js in scripts directory (one-time)
cd scripts
npm init -y
npm install @solana/web3.js
cd ..

# Generate wallet
node scripts/generate-server-wallet.js
```

This creates:
- `server-wallet.json` (gitignored - NEVER commit!)
- Console output with public/secret keys for configuration

**Important**: Save the secret key output - you'll need it for Vercel environment variables.

## Step 2: Configure Frontend Environment

Update `.env` file with the server wallet public key:

```bash
# Server wallet public key (fee payer for Relay transactions)
VITE_SERVER_WALLET_PUBLIC_KEY=<public-key-from-step-1>

# Other required variables
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
VITE_RELAY_API_URL=https://api.relay.link
VITE_RELAY_API_KEY=<your-relay-api-key>
VITE_KORA_URL=http://localhost:8080
```

## Step 3: Fund Server Wallet

The server wallet needs SOL to pay transaction fees:

```bash
# Get the public key from step 1
# Send SOL to this address:
# - Testing/Devnet: 0.1 SOL
# - Production/Mainnet: 1+ SOL
```

**Recommended amounts**:
- Devnet testing: 0.1 SOL
- Mainnet production: 1-5 SOL (refill as needed)

## Step 4: Install Vercel CLI (if not installed)

```bash
npm install -g vercel
```

## Step 5: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate.

## Step 6: Configure Vercel Environment Variables

You need to set environment variables in Vercel dashboard:

### Frontend Variables (Build-time)
These are used during `vite build`:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` | Production |
| `VITE_RELAY_API_URL` | `https://api.relay.link` | Production |
| `VITE_RELAY_API_KEY` | Your Relay API key | Production |
| `VITE_KORA_URL` | `http://localhost:8080` | Production |
| `VITE_SERVER_WALLET_PUBLIC_KEY` | Public key from Step 1 | Production |

### Backend Variables (Runtime)
This is used by serverless functions:

| Variable | Value | Environment |
|----------|-------|-------------|
| `SERVER_WALLET_SECRET_KEY` | Secret key array from Step 1 | Production |

**Setting variables**:

Option A - Vercel Dashboard:
1. Go to your project → Settings → Environment Variables
2. Add each variable with appropriate environment scope
3. For `SERVER_WALLET_SECRET_KEY`, paste the JSON array from Step 1

Option B - Vercel CLI:
```bash
# Frontend variables
vercel env add VITE_SOLANA_RPC_URL production
vercel env add VITE_RELAY_API_URL production
vercel env add VITE_RELAY_API_KEY production
vercel env add VITE_KORA_URL production
vercel env add VITE_SERVER_WALLET_PUBLIC_KEY production

# Backend variable (paste the JSON array when prompted)
vercel env add SERVER_WALLET_SECRET_KEY production
```

## Step 7: Deploy to Vercel

### Initial Deployment

```bash
# From project root
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Link to existing project? No (or Yes if you already created one)
# - Project name: coolswap (or your choice)
# - Directory: ./ (current directory)
# - Override settings? No
```

This creates a preview deployment.

### Production Deployment

```bash
vercel --prod
```

This deploys to production with your configured environment variables.

## Step 8: Verify Deployment

After deployment, Vercel will provide a URL (e.g., `coolswap.vercel.app`).

### Test the Backend Endpoint

```bash
curl -X POST https://your-app.vercel.app/api/sign-transaction \
  -H "Content-Type: application/json" \
  -d '{"transaction": "test"}'
```

Expected: Error response (since "test" is invalid), but confirms endpoint is reachable.

### Test the Frontend

1. Visit `https://your-app.vercel.app`
2. Connect wallet
3. Try a small swap (0.1 USDC)
4. Check transaction on Solana Explorer

## Step 9: Set Up Automatic Deployments (Optional)

Connect your Git repository to Vercel for automatic deployments:

1. Push code to GitHub/GitLab/Bitbucket
2. In Vercel dashboard: New Project → Import Git Repository
3. Select your repository
4. Configure build settings (Vercel auto-detects Vite)
5. Add environment variables (same as Step 6)
6. Deploy

Now every push to main branch auto-deploys to production.

## Project Structure

```
coolswap/
├── api/                          # Vercel serverless functions
│   ├── sign-transaction.js       # Transaction signing endpoint
│   └── package.json              # API dependencies
├── src/                          # Frontend code
├── scripts/
│   └── generate-server-wallet.js # Wallet generation script
├── vercel.json                   # Vercel configuration
├── .vercelignore                 # Deployment exclusions
├── .env                          # Local environment (gitignored)
└── server-wallet.json            # Server wallet (gitignored, NEVER commit!)
```

## Environment Variable Reference

### Frontend (.env file, gitignored)
```bash
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
VITE_RELAY_API_URL=https://api.relay.link
VITE_RELAY_API_KEY=your-relay-api-key
VITE_KORA_URL=http://localhost:8080
VITE_SERVER_WALLET_PUBLIC_KEY=server-public-key-from-step-1
```

### Vercel (Production Environment Variables)
All frontend variables above, plus:
```
SERVER_WALLET_SECRET_KEY=[secret key array from step 1]
```

## Troubleshooting

### "Server configuration error"
- Check `SERVER_WALLET_SECRET_KEY` is set in Vercel environment variables
- Verify it's a valid JSON array: `[1,2,3,...]`
- Redeploy after adding environment variables

### "Invalid fee payer"
- Verify `VITE_SERVER_WALLET_PUBLIC_KEY` matches the wallet from Step 1
- Check server wallet has SOL balance for fees

### "Transaction signing failed"
- Check server wallet has enough SOL
- Verify transaction format is correct
- Check Vercel function logs for detailed errors

### Viewing Logs

```bash
# Stream function logs
vercel logs --follow

# Or view in Vercel dashboard:
# Project → Deployments → [Latest] → Functions → sign-transaction
```

### Local Testing

To test serverless functions locally:

```bash
# Install Vercel CLI
npm i -g vercel

# Run dev server with serverless functions
vercel dev

# Frontend: http://localhost:3000
# API: http://localhost:3000/api/sign-transaction
```

## Security Best Practices

✅ **DO**:
- Store `SERVER_WALLET_SECRET_KEY` only in Vercel environment variables
- Keep `server-wallet.json` gitignored
- Fund server wallet with minimal SOL (refill as needed)
- Monitor server wallet balance
- Use environment-specific variables (dev/staging/prod)
- Enable Vercel deployment protection for production

❌ **DON'T**:
- Commit server wallet secret key to git
- Share secret key in chat/email
- Store secret key in frontend code
- Over-fund server wallet (security risk if compromised)
- Use same wallet for dev and production

## Cost Estimates

### Vercel Free Tier
- 100GB bandwidth/month
- 100 hours serverless function execution
- Automatic SSL
- **Cost**: Free

Sufficient for MVP and moderate production traffic.

### SOL Requirements (Server Wallet)
- Fee per transaction: ~0.00001 SOL (varies by network congestion)
- 1 SOL = ~100,000 transactions
- **Recommended**: Start with 1 SOL, monitor and refill

## Monitoring

### Server Wallet Balance

Check balance periodically:
```bash
solana balance <server-public-key>
```

Set up alerts when balance falls below threshold (e.g., 0.1 SOL).

### Transaction Success Rate

Monitor Vercel function logs for:
- Total requests to `/api/sign-transaction`
- Success rate (200 responses)
- Error patterns

### Vercel Analytics

Enable Vercel Analytics for:
- Request volume
- Response times
- Error rates
- Geographic distribution

## Updating Deployment

### Code Changes
```bash
git push origin main
# Auto-deploys if Git integration enabled

# Or manual deploy:
vercel --prod
```

### Environment Variable Changes
1. Update in Vercel dashboard
2. Trigger new deployment (required for build-time variables)

### Server Wallet Rotation
If compromised or for regular security:
1. Generate new wallet (Step 1)
2. Fund new wallet
3. Update environment variables in Vercel
4. Redeploy
5. Transfer remaining SOL from old wallet

## Next Steps

- Set up monitoring and alerts
- Configure custom domain
- Enable Vercel Analytics
- Set up staging environment
- Implement rate limiting on API endpoint
- Add server wallet balance monitoring
- Configure deployment protection

## Support

- Vercel Docs: https://vercel.com/docs
- Solana RPC Providers: https://solana.com/rpc
- Relay API: https://docs.relay.link
