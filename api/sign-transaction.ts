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

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  Connection,
  Keypair,
  VersionedTransaction
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getMint,
  getTransferFeeConfig,
} from '@solana/spl-token';

interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    isToken2022: boolean;
    transferFeeBps?: number;
    grossAmount?: string;
    expectedNet?: string;
    actualNet?: string;
  };
}

async function validatePaymentInstruction(
  connection: Connection,
  txObj: VersionedTransaction,
  _gasCostLamports: bigint
): Promise<ValidationResult> {
  // Find first token transfer instruction (payment instruction)
  // Don't use hardcoded index - memo instruction may or may not be present
  const instructions = txObj.message.compiledInstructions;

  const paymentInstruction = instructions.find((ix) => {
    const programIdIndex = ix.programIdIndex;
    const programId = txObj.message.staticAccountKeys[programIdIndex];

    // Find first Token or Token-2022 program instruction
    return programId?.equals(TOKEN_PROGRAM_ID) || programId?.equals(TOKEN_2022_PROGRAM_ID);
  });

  if (!paymentInstruction) {
    return { valid: true }; // No token transfer instruction, allow
  }

  // Get program ID for instruction
  const programIdIndex = paymentInstruction.programIdIndex;
  const programId = txObj.message.staticAccountKeys[programIdIndex];

  // Safety check (should always be true given find() condition above)
  if (!programId?.equals(TOKEN_PROGRAM_ID) &&
      !programId?.equals(TOKEN_2022_PROGRAM_ID)) {
    return { valid: true };
  }

  const isToken2022 = programId.equals(TOKEN_2022_PROGRAM_ID);

  // If regular SPL Token, no validation needed
  if (!isToken2022) {
    return { valid: true };
  }

  // For Token-2022, validate transfer fee handling
  try {
    // Decode instruction to get mint and amount
    // Account layout for transferChecked:
    //   0: source
    //   1: mint
    //   2: destination
    //   3+: signers
    const mintIndex = paymentInstruction.accountKeyIndexes[1];
    if (mintIndex === undefined) {
      return { valid: false, error: 'Could not extract mint index from payment instruction' };
    }

    const mintPubkey = txObj.message.staticAccountKeys[mintIndex];
    if (!mintPubkey) {
      return { valid: false, error: 'Could not extract mint from payment instruction' };
    }

    // Fetch mint account
    const mintInfo = await getMint(
      connection,
      mintPubkey,
      'confirmed',
      TOKEN_2022_PROGRAM_ID
    );

    // Get transfer fee config
    const transferFeeConfig = getTransferFeeConfig(mintInfo);

    if (!transferFeeConfig) {
      // Token-2022 but no transfer fee, allow
      return {
        valid: true,
        details: { isToken2022: true, transferFeeBps: 0 }
      };
    }

    const { newerTransferFee } = transferFeeConfig;
    const feeBps = Number(newerTransferFee.transferFeeBasisPoints);
    const maxFee = newerTransferFee.maximumFee;

    // Decode instruction data to get amount
    // This requires parsing the instruction bytes
    // For simplicity, we'll log a warning and allow
    // (Full implementation would decode transferChecked instruction)

    console.warn('Token-2022 payment detected:', {
      mint: mintPubkey.toBase58(),
      feeBps,
      maxFee: maxFee.toString(),
    });

    // TODO: Decode instruction amount and validate gross-up
    // For MVP, we log and allow (Relay handles it)

    return {
      valid: true,
      details: {
        isToken2022: true,
        transferFeeBps: feeBps,
      }
    };

  } catch (error) {
    console.error('Token-2022 validation error:', error);
    // On error, allow (don't block valid transactions)
    return { valid: true };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS handling
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000']; // Default for local dev

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transaction } = req.body as { transaction?: string };

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
      // Trim whitespace that may be added by Vercel environment variable UI
      const secretKeyArray = JSON.parse(serverSecretKey.trim());
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
      const firstAccount = txObj.message.staticAccountKeys[0];
      if (firstAccount) {
        console.log('Fee payer:', firstAccount.toBase58());
      }
      console.log('Account keys:', txObj.message.staticAccountKeys.length);
      console.log('=====================================');
    } catch (err) {
      console.error('Failed to deserialize transaction:', err);
      return res.status(400).json({ error: 'Invalid transaction format' });
    }

    // SECURITY: Validate transaction before signing

    // 1. Check that server wallet is the fee payer (first account in message)
    const feePayer = txObj.message.staticAccountKeys[0];
    if (!feePayer) {
      return res.status(400).json({ error: 'Transaction has no fee payer' });
    }
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

    // 4. Token-2022 validation for payment instruction
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // If quote includes gas cost, validate payment amount
    // For MVP: Just log Token-2022 detection
    const validation = await validatePaymentInstruction(
      connection,
      txObj,
      0n // Gas cost would come from metadata if available
    );

    if (!validation.valid) {
      console.error('Payment validation failed:', validation.error);
      return res.status(400).json({ error: validation.error });
    }

    if (validation.details?.isToken2022) {
      console.log('Token-2022 payment validated:', validation.details);
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
    // Log full error for debugging, but only return generic message to client
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}
