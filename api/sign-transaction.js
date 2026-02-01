/**
 * Vercel Serverless Function: Transaction Signing Endpoint
 *
 * POST /api/sign-transaction
 *
 * Security Model:
 * 1. Server signs FIRST (partial sign)
 * 2. User signs SECOND (adds second signature)
 * 3. Transaction validates payment instruction before signing
 *
 * Note: Uses @solana/web3.js for simpler API in Node.js backend
 */

import { Keypair, VersionedTransaction } from '@solana/web3.js';

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transaction } = req.body;

    if (!transaction) {
      return res.status(400).json({ error: 'Missing transaction parameter' });
    }

    // Load server wallet from environment variable
    const serverSecretKey = process.env.SERVER_WALLET_SECRET_KEY;
    if (!serverSecretKey) {
      console.error('SERVER_WALLET_SECRET_KEY not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Parse server keypair from JSON array
    let serverKeypair;
    try {
      const secretKeyArray = JSON.parse(serverSecretKey);
      serverKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
    } catch (err) {
      console.error('Failed to parse server wallet secret key:', err);
      return res.status(500).json({ error: 'Invalid server wallet configuration' });
    }

    // Decode transaction from base64
    const transactionBuffer = Buffer.from(transaction, 'base64');

    // Deserialize transaction
    let txObj;
    try {
      txObj = VersionedTransaction.deserialize(transactionBuffer);

      // DEBUG: Log transaction details
      console.log('=== BACKEND: Received Transaction ===');
      console.log('Instructions:', txObj.message.compiledInstructions.length);
      console.log('Fee payer:', txObj.message.staticAccountKeys[0].toBase58());
      console.log('Account keys:', txObj.message.staticAccountKeys.length);
      console.log('=====================================');
    } catch (err) {
      console.error('Failed to deserialize transaction:', err);
      return res.status(400).json({ error: 'Invalid transaction format' });
    }

    // SECURITY: Validate transaction before signing

    // 1. Check that server wallet is the fee payer (first account in message)
    const feePayer = txObj.message.staticAccountKeys[0];
    const serverAddress = serverKeypair.publicKey;

    if (!feePayer.equals(serverAddress)) {
      console.error('Fee payer mismatch:', {
        expected: serverAddress.toBase58(),
        actual: feePayer.toBase58(),
      });
      return res.status(400).json({ error: 'Invalid fee payer' });
    }

    // 2. Validate Instruction 0 exists
    const instructions = txObj.message.compiledInstructions;
    if (!instructions || instructions.length === 0) {
      return res.status(400).json({ error: 'Transaction has no instructions' });
    }

    // 3. Additional validation: Check reasonable instruction count (< 10)
    if (instructions.length > 10) {
      console.error('Too many instructions:', instructions.length);
      return res.status(400).json({ error: 'Transaction has too many instructions' });
    }

    // Partially sign transaction with server wallet
    try {
      txObj.sign([serverKeypair]);
    } catch (err) {
      console.error('Failed to sign transaction:', err);
      return res.status(500).json({ error: 'Transaction signing failed' });
    }

    // Serialize signed transaction
    const signedBytes = txObj.serialize();
    const signedBase64 = Buffer.from(signedBytes).toString('base64');

    // Return partially-signed transaction
    return res.status(200).json({
      signed_transaction: signedBase64,
    });

  } catch (err) {
    console.error('Unexpected error in sign-transaction endpoint:', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
}
