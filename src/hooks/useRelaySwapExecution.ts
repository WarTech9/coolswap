/**
 * Hook to execute Relay swap transactions with server-first signing
 *
 * CRITICAL: Uses "Instruction 0 Rule" - payment instruction executes FIRST,
 * then Relay swap instructions follow. This prevents account state conflicts.
 *
 * Flow:
 * 1. Build payment instruction (user → server token transfer for gas reimbursement)
 * 2. Build Relay swap instructions from quote
 * 3. Combine instructions: [payment, ...relayInstructions] with server as fee payer
 * 4. Server signs FIRST (partial sign via /api/sign-transaction endpoint)
 * 5. User signs SECOND (adds second signature)
 * 6. Submit fully-signed transaction to Solana RPC
 *
 * IMPORTANT: Payment instruction executes before Relay instructions.
 * This ensures server receives token payment BEFORE Relay modifies account state.
 *
 * NOTE: Server's ATA for the source token must exist before executing. The server
 * should pre-create ATAs for common tokens (USDC, USDT, SOL, etc.).
 */

import { useState, useCallback, useRef } from 'react';
import { useWalletConnection } from '@solana/react-hooks';
import {
  getTransactionDecoder,
  getTransactionEncoder,
} from '@solana/transactions';
import {
  address,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  compileTransaction,
  createNoopSigner,
  type Blockhash,
} from '@solana/kit';
import {
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
  getTransferInstruction,
} from '@solana-program/token';
import { getSetComputeUnitLimitInstruction } from '@solana-program/compute-budget';
import { useSolanaClient } from '@/context/SolanaContext';
import { convertRelayInstruction } from '@/services/solana';
import { convertLamportsToToken } from '@/services/price';
import { env } from '@/config/env';
import type { Quote, PreparedTransaction } from '@/services/bridge/types';

export type ExecutionStatus = 'idle' | 'signing' | 'confirming' | 'completed' | 'error';

export interface UseRelaySwapExecutionResult {
  execute: () => Promise<void>;
  isExecuting: boolean;
  txSignature: string | null;
  error: string | null;
  status: ExecutionStatus;
  reset: () => void;
}

/**
 * Hook for executing Relay swap transactions with server-first signing
 *
 * @param quote - The current quote containing transaction data from Relay
 * @param sourceTokenAddress - Source token mint address for server gas payment
 * @param sourceTokenDecimals - Source token decimals for gas conversion (Pyth)
 * @param onPause - Callback to pause quote auto-refresh
 * @param onResume - Callback to resume quote auto-refresh
 */
export function useRelaySwapExecution(
  quote: Quote | null,
  sourceTokenAddress: string | null,
  sourceTokenDecimals: number,
  onPause?: () => void,
  onResume?: () => void
): UseRelaySwapExecutionResult {
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isExecutingRef = useRef(false);
  const { wallet } = useWalletConnection();
  const solanaClient = useSolanaClient();

  const reset = useCallback(() => {
    setStatus('idle');
    setTxSignature(null);
    setError(null);
    isExecutingRef.current = false;
  }, []);

  const execute = useCallback(async () => {
    // Prevent double execution
    if (isExecutingRef.current) {
      return;
    }

    if (!quote) {
      setError('No quote available');
      setStatus('error');
      return;
    }

    if (!wallet) {
      setError('Wallet not connected');
      setStatus('error');
      return;
    }

    const txData = quote.transactionData as PreparedTransaction;

    // Relay can return either pre-serialized hex or instructions array
    const hasHexData = txData?.data && typeof txData.data === 'string';
    const hasInstructions = txData?.instructions && txData.instructions.length > 0;

    if (!hasHexData && !hasInstructions) {
      setError('Invalid transaction data');
      setStatus('error');
      return;
    }

    // Validate hex format if using pre-serialized data
    if (hasHexData) {
      const hexPattern = /^(0x)?[0-9a-fA-F]+$/;
      if (!hexPattern.test(txData.data!)) {
        setError('Invalid transaction data format');
        setStatus('error');
        return;
      }

      // Ensure even length (2 hex chars per byte)
      const cleanHex = txData.data!.startsWith('0x') ? txData.data!.slice(2) : txData.data!;
      if (cleanHex.length % 2 !== 0) {
        setError('Invalid transaction data format');
        setStatus('error');
        return;
      }
    }

    // Check signing capability before processing
    if (!wallet.signTransaction) {
      setError('Wallet does not support transaction signing. Please use a different wallet.');
      setStatus('error');
      return;
    }

    isExecutingRef.current = true;
    onPause?.();

    try {
      setStatus('signing');
      setError(null);
      setTxSignature(null);

      // Step 1: Build payment instruction (becomes Instruction 0)
      // This executes BEFORE Relay instructions to avoid account state conflict

      // 1a. Validate required parameters
      if (!sourceTokenAddress) {
        throw new Error('Source token address is required for gas payment');
      }
      if (!wallet.account?.address) {
        throw new Error('Wallet address not available');
      }

      // 1b. Get gas cost from Relay quote (in lamports)
      // Use Pyth price API to convert to token amount (bypasses Kora simulation)
      if (!quote.fees?.gasSolLamports) {
        throw new Error('Gas cost not available in Relay quote. The quote may be invalid or expired.');
      }

      const gasLamports = BigInt(quote.fees.gasSolLamports);
      if (gasLamports === 0n) {
        throw new Error('Gas cost is zero. This is unexpected for a cross-chain swap.');
      }

      console.log('=== GAS PAYMENT CALCULATION ===');
      console.log('Gas cost (lamports):', gasLamports.toString());
      console.log('Gas cost (SOL):', Number(gasLamports) / 1e9);
      console.log('Source token:', sourceTokenAddress);
      console.log('Token decimals:', sourceTokenDecimals);

      // 1c. Convert SOL lamports to token amount using Pyth
      const tokenAmount = await convertLamportsToToken(
        gasLamports,
        sourceTokenAddress,
        sourceTokenDecimals
      );

      console.log('Payment amount (raw):', tokenAmount.toString());
      console.log('Payment amount (token):', Number(tokenAmount) / Math.pow(10, sourceTokenDecimals));
      console.log('===============================');

      // 1d. Get server wallet address (our fee payer)
      const serverWallet = env.SERVER_WALLET_PUBLIC_KEY;
      if (!serverWallet) {
        throw new Error('Server wallet not configured. Please set VITE_SERVER_WALLET_PUBLIC_KEY in .env');
      }

      // 1e. Build payment instruction: user → server (token transfer)
      const userAddress = address(wallet.account.address);
      const serverAddress = address(serverWallet.trim()); // Trim whitespace from env variable
      const mintAddress = address(sourceTokenAddress);

      // Find user's ATA (source)
      const [sourceTokenAccount] = await findAssociatedTokenPda({
        owner: userAddress,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
        mint: mintAddress,
      });

      // Find server's ATA (destination)
      const [destinationTokenAccount] = await findAssociatedTokenPda({
        owner: serverAddress,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
        mint: mintAddress,
      });

      // Create transfer instruction (user → server for gas reimbursement)
      // NOTE: Server's ATA must exist before this transaction. The server should
      // create ATAs for common tokens (USDC, USDT, SOL) ahead of time.
      const paymentInstruction = getTransferInstruction({
        source: sourceTokenAccount,
        destination: destinationTokenAccount,
        authority: createNoopSigner(userAddress),
        amount: tokenAmount,
      });

      // Step 2: Build transaction with PAYMENT FIRST (Instruction 0 Rule)
      const decoder = getTransactionDecoder();
      const encoder = getTransactionEncoder();
      let encodedBytes: Uint8Array;

      if (hasInstructions) {
        // Validate instructions array
        if (!Array.isArray(txData.instructions) || txData.instructions.length === 0) {
          throw new Error('Transaction instructions are missing or empty. The quote may be invalid.');
        }

        // 2a. Convert Relay instructions to @solana/kit format
        const relayInstructions = txData.instructions.map(convertRelayInstruction);

        // 2b. CRITICAL: Replace Relay's ComputeBudget with our own (higher limit)
        // We need extra compute units to account for our payment instruction

        // Remove Relay's ComputeBudget instruction (we'll add our own)
        const otherRelayIx = relayInstructions.filter(
          (ix) => ix.programAddress !== address('ComputeBudget111111111111111111111111111111')
        );

        // Create our own ComputeBudget instruction with higher limit
        // Default tx has ~30k CU. We need:
        // - Payment instruction: ~5k CU
        // - Relay swap transfer: ~5k CU
        // - Memo: ~21k CU
        // Total: ~31k CU, so set limit to 60k for safety
        const computeBudgetIx = getSetComputeUnitLimitInstruction({
          units: 60_000,
        });

        // Order: ComputeBudget FIRST, then payment, then Relay instructions
        const allInstructions = [computeBudgetIx, paymentInstruction, ...otherRelayIx];
        //                        ↑ COMPUTE FIRST  ↑ PAYMENT SECOND  ↑ Relay swap follows

        // 2c. Get fresh blockhash
        const { blockhash, lastValidBlockHeight } = await solanaClient.getLatestBlockhash();

        // 2d. Build transaction message
        const baseMessage = createTransactionMessage({ version: 0 });

        // 2e. Set server wallet as fee payer (replaces Kora)
        const messageWithFeePayer = setTransactionMessageFeePayer(
          serverAddress,  // Server pays SOL fees
          baseMessage
        );

        const messageWithBlockhash = setTransactionMessageLifetimeUsingBlockhash(
          { blockhash: blockhash as Blockhash, lastValidBlockHeight },
          messageWithFeePayer
        );

        // 2f. Add instructions (payment + Relay swap)
        const messageWithInstructions = appendTransactionMessageInstructions(
          allInstructions,  // [paymentInstruction, ...relayInstructions]
          messageWithBlockhash
        );

        // 2g. Compile transaction
        const transaction = compileTransaction(
          messageWithInstructions as Parameters<typeof compileTransaction>[0]
        );

        // DEBUG: Log transaction details
        console.log('=== TRANSACTION DEBUG ===');
        console.log('Total instructions:', allInstructions.length);
        console.log('- Payment instruction (amount:', tokenAmount.toString(), ')');
        console.log('- Relay instructions:', relayInstructions.length);
        console.log('Fee payer:', serverWallet);
        console.log('User address:', wallet.account.address);
        console.log('Server destination ATA:', destinationTokenAccount);
        console.log('Blockhash:', blockhash);
        console.log('Transaction:', transaction);
        console.log('========================');

        // SIMULATION: Test transaction before signing to see actual error
        try {
          console.log('=== SIMULATING TRANSACTION ===');
          const encodedForSim = encoder.encode(transaction);
          const bytesForSim = new Uint8Array(
            encodedForSim.buffer,
            encodedForSim.byteOffset,
            encodedForSim.byteLength
          );

          const simulation = await solanaClient.simulateTransaction(bytesForSim);
          console.log('Simulation result:', simulation);
          console.log('Simulation logs:', simulation.logs);

          // Check for simulation errors
          if (simulation.err) {
            console.error('⚠️ SIMULATION ERROR:', simulation.err);
            console.error('Logs:', simulation.logs);
            // Note: We log the error but don't block execution
            // This is for debugging - production may want to block if simulation fails
          } else {
            console.log('✓ Simulation succeeded');
          }
          console.log('==============================');
        } catch (simErr) {
          console.error('Simulation failed:', simErr);
          // Note: Simulation failure doesn't block execution
          // User may still want to try the transaction
        }

        // 2h. Encode for transmission
        const encodedTx = encoder.encode(transaction);
        encodedBytes = new Uint8Array(
          encodedTx.buffer,
          encodedTx.byteOffset,
          encodedTx.byteLength
        );
      } else {
        // Legacy format: decode hex, append instruction, re-encode
        throw new Error('Pre-serialized transaction format not supported with payment instructions');
      }

      // Step 3: SERVER SIGNS FIRST (partial sign)
      // Security: Server validates transaction before signing
      const txBase64 = Buffer.from(encodedBytes).toString('base64');

      // Use relative path for production (works on any Vercel domain)
      // Only use VITE_BACKEND_URL if explicitly set (for custom backend)
      const apiUrl = import.meta.env.VITE_BACKEND_URL || '';
      const signEndpoint = apiUrl ? `${apiUrl}/api/sign-transaction` : '/api/sign-transaction';

      const response = await fetch(signEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: txBase64 }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server signing failed: ${errorText}`);
      }

      const { signed_transaction: serverSignedBase64 } = await response.json();

      // Step 4: Decode server-signed transaction for user signing
      const serverSignedBytes = Buffer.from(serverSignedBase64, 'base64');
      const serverSignedTx = decoder.decode(new Uint8Array(serverSignedBytes));

      // DEBUG: Log server-signed transaction
      console.log('=== SERVER-SIGNED TRANSACTION ===');
      console.log('Server signed tx:', serverSignedTx);
      console.log('Signatures:', serverSignedTx.signatures);
      console.log('=================================');

      // Step 5: USER SIGNS the server-signed transaction (adds second signature)
      const userSignedTx = await wallet.signTransaction(
        serverSignedTx as Parameters<NonNullable<typeof wallet.signTransaction>>[0]
      );

      // Step 6: Submit to Solana RPC
      // Transaction is fully signed (server + user signatures)
      setStatus('confirming');

      const signedBytes = encoder.encode(
        userSignedTx as unknown as Parameters<typeof encoder.encode>[0]
      );
      const signedBytesArray = new Uint8Array(
        signedBytes.buffer,
        signedBytes.byteOffset,
        signedBytes.byteLength
      );

      // Send transaction directly to Solana RPC using SolanaClientService
      const signature = await solanaClient.sendTransaction(signedBytesArray);

      setTxSignature(signature);
      setStatus('completed');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const lower = message.toLowerCase();

      let userError: string;

      if (lower.includes('reject') || lower.includes('cancel') || lower.includes('denied')) {
        userError = 'Transaction was rejected';
      } else if (lower.includes('insufficient') && lower.includes('balance')) {
        userError = 'Insufficient balance for this transaction';
      } else if (lower.includes('payment instruction')) {
        userError = 'Unable to create gas payment. Please check your token balance.';
      } else if (lower.includes('kora') || lower.includes('sign')) {
        userError = 'Fee payer signing failed. Please try again.';
      } else if (lower.includes('timeout') || lower.includes('timed out')) {
        userError = 'Transaction confirmation timed out. Check your wallet for status.';
      } else if (lower.includes('blockhash') && lower.includes('not found')) {
        userError = 'Transaction expired. Please try again with a fresh quote.';
      } else if (lower.includes('network') || lower.includes('fetch')) {
        userError = 'Network error. Please check your connection and try again.';
      } else {
        userError = message || 'Transaction failed';
      }

      setError(userError);
      setStatus('error');
      onResume?.(); // Resume quote refresh on error so user can retry with fresh quote
    } finally {
      isExecutingRef.current = false;
    }
  }, [quote, sourceTokenAddress, sourceTokenDecimals, wallet, solanaClient, onPause, onResume]);

  return {
    execute,
    isExecuting: status === 'signing' || status === 'confirming',
    txSignature,
    error,
    status,
    reset,
  };
}
