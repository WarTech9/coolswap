/**
 * Check which token program a mint uses (SPL Token vs Token-2022)
 * Usage: node api/check-token-program.js <mint-address>
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function checkTokenProgram(mintAddress) {
  const rpcUrl = process.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');

  console.log('🔍 Checking token:', mintAddress);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check mint account
  const mint = new PublicKey(mintAddress);
  const mintInfo = await connection.getAccountInfo(mint);

  if (!mintInfo) {
    console.log('❌ Mint account not found');
    return;
  }

  console.log('📍 Mint owner (token program):', mintInfo.owner.toBase58());

  if (mintInfo.owner.equals(TOKEN_PROGRAM_ID)) {
    console.log('✅ This is a REGULAR SPL Token');
  } else if (mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    console.log('⚠️  This is a TOKEN-2022 token');
  } else {
    console.log('❓ Unknown token program');
  }

  // Check server wallet's ATA
  if (process.env.SERVER_WALLET_SECRET_KEY) {
    const serverSecretKey = JSON.parse(process.env.SERVER_WALLET_SECRET_KEY.trim());
    const { Keypair } = await import('@solana/web3.js');
    const serverKeypair = Keypair.fromSecretKey(new Uint8Array(serverSecretKey));

    console.log('\n📦 Checking server wallet ATA...');
    console.log('Server wallet:', serverKeypair.publicKey.toBase58());

    // Try both token programs
    for (const [programName, programId] of [
      ['SPL Token', TOKEN_PROGRAM_ID],
      ['Token-2022', TOKEN_2022_PROGRAM_ID]
    ]) {
      try {
        const ata = await getAssociatedTokenAddress(
          mint,
          serverKeypair.publicKey,
          false,
          programId
        );

        console.log(`\n${programName} ATA:`, ata.toBase58());

        const ataInfo = await connection.getAccountInfo(ata);
        if (ataInfo) {
          console.log(`  ✅ ATA exists`);
          console.log(`  Owner program:`, ataInfo.owner.toBase58());

          try {
            const accountData = await getAccount(connection, ata, 'confirmed', programId);
            console.log(`  Balance:`, accountData.amount.toString());
          } catch (e) {
            console.log(`  ⚠️  Could not read account data:`, e.message);
          }
        } else {
          console.log(`  ❌ ATA does NOT exist`);
        }
      } catch (err) {
        console.log(`\n${programName}: Error -`, err.message);
      }
    }
  }
}

const mintAddress = process.argv[2];

if (!mintAddress) {
  console.log('Usage: node api/check-token-program.js <mint-address>');
  console.log('\nQuick check USDT:');
  console.log('  node api/check-token-program.js Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
  process.exit(1);
}

checkTokenProgram(mintAddress)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
