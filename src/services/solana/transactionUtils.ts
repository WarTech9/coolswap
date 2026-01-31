/**
 * Transaction utilities for Kora integration
 * Functions to modify transactions for gas sponsorship
 */

import {
  appendTransactionMessageInstruction,
  setTransactionMessageFeePayer,
  type Address,
  type Instruction,
  type TransactionMessage,
} from '@solana/kit';

/**
 * Append an instruction to an existing transaction message
 * @param transaction - Original transaction message
 * @param instruction - Instruction to append
 * @returns New transaction message with instruction appended
 */
export function appendInstruction<T extends TransactionMessage>(
  transaction: T,
  instruction: Instruction
): T {
  return appendTransactionMessageInstruction(instruction, transaction) as T;
}

/**
 * Set the fee payer for a transaction message
 * @param transaction - Transaction message
 * @param feePayer - Fee payer address
 * @returns New transaction message with fee payer set
 */
export function setFeePayer<T extends TransactionMessage>(
  transaction: T,
  feePayer: Address
): T {
  return setTransactionMessageFeePayer(feePayer, transaction) as T;
}
