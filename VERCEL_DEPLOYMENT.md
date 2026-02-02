# Vercel Deployment Guide

Simple guide to deploy CoolSwap to Vercel (frontend + backend serverless functions).

## Prerequisites

- Vercel account (free tier works)
- Vercel CLI installed: `npm i -g vercel`
- Server wallet generated and funded with 1+ SOL
- **Backend merged to main branch** (currently on feature branch)

---

## Pre-Deployment Checklist

### 1. Merge Backend to Main
The backend serverless function (`/api/sign-transaction.ts`) is currently on a feature branch.
**You MUST merge the PR to main before deploying.**

### 2. Verify Server Wallet
- Public key configured in `.env`: `VITE_SERVER_WALLET_PUBLIC_KEY`
- Secret key available (from `.env.local` or wallet generation)
- Wallet funded with **1+ SOL** for transaction fees

Check balance:
```bash
# Visit Solana Explorer
https://explorer.solana.com/address/<your-server-wallet-public-key>
```

---

## Environment Variables

You need to configure these in Vercel:

### Frontend (Build-time)
```bash
VITE_SOLANA_RPC_URL=https://solana-rpc.publicnode.com
VITE_RELAY_API_URL=https://api.relay.link
VITE_SERVER_WALLET_PUBLIC_KEY=<your-server-wallet-public-key>
```

### Backend (Runtime)
```bash
SERVER_WALLET_SECRET_KEY=[your-server-wallet-secret-key-array]
```

**Format for SECRET_KEY:** JSON array of integers (e.g., `[65,132,74,...]`)

**Optional:**
- `VITE_BACKEND_URL` - Leave empty (frontend and backend deploy to same domain)
- `VITE_RELAY_API_KEY` - Not required (Relay works without authentication)

---

## Deployment Steps

### Option A: Vercel CLI (Recommended)

```bash
# Step 1: Login to Vercel
vercel login

# Step 2: Set environment variables
vercel env add VITE_SOLANA_RPC_URL production
# Enter: https://solana-rpc.publicnode.com

vercel env add VITE_RELAY_API_URL production
# Enter: https://api.relay.link

vercel env add VITE_SERVER_WALLET_PUBLIC_KEY production
# Enter: <your-server-wallet-public-key>

vercel env add SERVER_WALLET_SECRET_KEY production
# Enter: [your-server-wallet-secret-key-array]

# Step 3: Deploy to production
vercel --prod
```

### Option B: Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Select your project → Settings → Environment Variables
3. Add each variable:
   - Click "Add New"
   - Enter name and value
   - Select "Production" environment
   - Click "Save"
4. Deploy from dashboard or run: `vercel --prod`

---

## Post-Deployment Verification

After deployment, Vercel provides a URL (e.g., `https://coolswap.vercel.app`).

### 1. Test Backend Endpoint

```bash
curl -X POST https://your-app.vercel.app/api/sign-transaction \
  -H "Content-Type: application/json" \
  -d '{"transaction": "test"}'

# Expected: Error response (confirms endpoint is reachable)
```

### 2. Test Frontend

1. Visit your deployment URL
2. Connect wallet (Phantom/Solflare)
3. Try a small test swap (0.1 USDC recommended)
4. Verify transaction on Solana Explorer

### 3. Check Logs

```bash
# Stream serverless function logs
vercel logs --follow
```

---

## Project Structure

```
coolswap/
├── api/
│   ├── sign-transaction.ts       # Backend signing endpoint
│   ├── package.json              # API dependencies
│   └── tsconfig.json             # TypeScript configuration
├── src/                          # Frontend React app
├── vercel.json                   # Vercel config (CORS, timeouts)
├── .vercelignore                 # Deployment exclusions
├── .env.local                    # Local secrets (gitignored)
└── server-wallet.json            # Server wallet (gitignored)
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Server configuration error" | Verify `SERVER_WALLET_SECRET_KEY` set in Vercel |
| "Invalid fee payer" | Check server wallet has SOL balance |
| "Transaction signing failed" | Ensure server wallet funded with 1+ SOL |
| Build fails | Run `pnpm build` locally to debug |
| CORS errors | `vercel.json` already configured, redeploy |

---

## Security Notes

✅ **DO:**
- Store `SERVER_WALLET_SECRET_KEY` only in Vercel environment variables
- Keep `.env.local` and `server-wallet.json` gitignored
- Fund server wallet with minimal SOL (1-5 SOL, refill as needed)
- Monitor server wallet balance regularly

❌ **DON'T:**
- Commit server wallet secret key to git
- Share secret key in any communication
- Over-fund server wallet (security risk if compromised)

---

## Monitoring

### Server Wallet Balance
Monitor balance periodically:
```bash
# Via Solana CLI
solana balance <server-public-key>

# Or check Solana Explorer
https://explorer.solana.com/address/<server-public-key>
```

Set up alerts when balance falls below 0.1 SOL.

### Vercel Function Logs
```bash
# Real-time logs
vercel logs --follow

# Or view in dashboard
# Project → Deployments → [Latest] → Functions
```

---

## Cost Estimates

**Vercel Free Tier:**
- 100GB bandwidth/month
- 100 hours serverless function execution
- Automatic SSL
- **Cost:** Free

**Server Wallet SOL:**
- ~0.00001 SOL per transaction
- 1 SOL ≈ 100,000 transactions
- **Recommended:** Start with 1 SOL, monitor and refill

---

## Next Steps After Deployment

1. **Review PR and merge backend to main**
2. **Test thoroughly** before promoting to production
3. Set up custom domain (optional)
4. Enable Vercel Analytics (optional)
5. Configure staging environment (optional)
6. Set up server wallet balance monitoring

---

## Support

- Vercel Docs: https://vercel.com/docs
- Relay API: https://docs.relay.link
- Solana Explorer: https://explorer.solana.com
