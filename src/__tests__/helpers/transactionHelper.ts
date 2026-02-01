// @ts-nocheck
/**
 * Transaction helper utilities for backend API testing
 * Creates test transactions for sign-transaction.js tests
 *
 * Note: This file is currently not used but preserved for future backend testing.
 * @solana/web3.js is available in Node.js backend but not in frontend build.
 * TypeScript checking disabled for this file.
 */

import { vi } from 'vitest';
import {
  Keypair,
  VersionedTransaction,
  TransactionMessage,
  PublicKey,
  SystemProgram,
  ComputeBudgetProgram,
} from '@solana/web3.js';

/**
 * Create a server wallet keypair for testing
 */
export function createServerWallet(): Keypair {
  return Keypair.generate();
}

/**
 * Create a test transaction with specified fee payer and instruction count
 * @param feePayer - The fee payer keypair
 * @param instructionCount - Number of instructions to include
 * @param recentBlockhash - Optional blockhash (generates random if not provided)
 */
export function createTestTransaction(
  feePayer: Keypair,
  instructionCount: number,
  recentBlockhash?: string
): VersionedTransaction {
  const blockhash = recentBlockhash || PublicKey.unique().toBase58();

  // Create instructions
  const instructions = [];
  for (let i = 0; i < instructionCount; i++) {
    if (i === 0) {
      // First instruction: ComputeBudget (common pattern)
      instructions.push(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 60_000 })
      );
    } else {
      // Other instructions: simple transfer
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: feePayer.publicKey,
          toPubkey: Keypair.generate().publicKey,
          lamports: 1000,
        })
      );
    }
  }

  // Create message
  const message = new TransactionMessage({
    payerKey: feePayer.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  // Create versioned transaction
  return new VersionedTransaction(message);
}

/**
 * Encode transaction to base64 (matches API input format)
 */
export function encodeTransactionBase64(tx: VersionedTransaction): string {
  return Buffer.from(tx.serialize()).toString('base64');
}

/**
 * Create a mock HTTP request object
 */
export function createMockRequest(method: string, body: unknown = {}) {
  return {
    method,
    body,
  };
}

/**
 * Create a mock HTTP response object with spy functions
 */
export function createMockResponse() {
  const res: any = {
    statusCode: 200,
    _json: null,
  };

  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });

  res.json = vi.fn((data: any) => {
    res._json = data;
    return res;
  });

  return res;
}
