/**
 * Script to create server wallet's ATA for common tokens
 * Run this once to set up the server wallet before handling swaps
 *
 * Usage: node scripts/create-server-ata.js <token-mint-address>
 * Example: node scripts/create-server-ata.js EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
 */

import { Keypair, Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Common token mints on Solana mainnet
const COMMON_TOKENS = {
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL
};

async function createATA(tokenMint) {
  // 1. Load server wallet
  const secretKeyArray = JSON.parse(process.env.SERVER_WALLET_SECRET_KEY);
  const serverKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));

  console.log('\n📍 Server wallet:', serverKeypair.publicKey.toBase58());
  console.log('🪙 Token mint:', tokenMint);

  // 2. Connect to Solana
  const rpcUrl = process.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');

  // 3. Get ATA address
  const mintPubkey = new PublicKey(tokenMint);
  const ata = await getAssociatedTokenAddress(
    mintPubkey,
    serverKeypair.publicKey
  );

  console.log('🎯 ATA address:', ata.toBase58());

  // 4. Check if ATA already exists
  const accountInfo = await connection.getAccountInfo(ata);
  if (accountInfo) {
    console.log('✅ ATA already exists! Nothing to do.');
    return;
  }

  console.log('📝 Creating ATA...');

  // 5. Create ATA instruction
  const instruction = createAssociatedTokenAccountInstruction(
    serverKeypair.publicKey, // payer
    ata,                     // ata address
    serverKeypair.publicKey, // owner
    mintPubkey               // mint
  );

  // 6. Build and send transaction
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = serverKeypair.publicKey;

  // 7. Sign and send
  transaction.sign(serverKeypair);
  const signature = await connection.sendRawTransaction(transaction.serialize());

  console.log('📤 Transaction sent:', signature);
  console.log('⏳ Confirming...');

  // 8. Confirm
  await connection.confirmTransaction(signature, 'confirmed');

  console.log('✅ ATA created successfully!');
  console.log('🔗 Explorer:', `https://solscan.io/tx/${signature}`);
}

// Main execution
const tokenMint = process.argv[2];

if (!tokenMint) {
  console.log('\n❌ Error: Token mint address required\n');
  console.log('Usage: node scripts/create-server-ata.js <token-mint-address>');
  console.log('\nCommon tokens:');
  console.log('  USDC:', COMMON_TOKENS.USDC);
  console.log('  USDT:', COMMON_TOKENS.USDT);
  console.log('  SOL:', COMMON_TOKENS.SOL);
  console.log('\nExample:');
  console.log('  node scripts/create-server-ata.js', COMMON_TOKENS.USDC);
  process.exit(1);
}

createATA(tokenMint)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  });
