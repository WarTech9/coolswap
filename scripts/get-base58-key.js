/**
 * Convert server wallet secret key to base58 format for Phantom import
 */

import { Keypair } from '@solana/web3.js';
import { readFileSync } from 'fs';
import bs58 from 'bs58';

// Load server wallet
const walletData = JSON.parse(readFileSync('server-wallet.json', 'utf-8'));
const keypair = Keypair.fromSecretKey(new Uint8Array(walletData.secretKey));

// Get base58 encoded private key
const base58PrivateKey = bs58.encode(keypair.secretKey);

console.log('\n🔑 BASE58 PRIVATE KEY FOR PHANTOM\n');
console.log('Copy this key to import into Phantom:\n');
console.log(base58PrivateKey);
console.log('\n');
console.log('Public Key (to verify):', keypair.publicKey.toBase58());
console.log('\n');
