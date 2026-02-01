/**
 * Utility to build Solana transactions from Relay instruction arrays
 *
 * Relay API returns individual instructions that need to be assembled into
 * a transaction before signing. This is done at execution time to ensure
 * a fresh blockhash.
 */

import {
  address,
  type Address,
  type Instruction,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  compileTransaction,
  getTransactionEncoder,
  type Blockhash,
} from '@solana/kit';
import type { RelayInstruction } from '@/services/bridge/types';
import type { SolanaClientService } from './SolanaClientService';

/**
 * Account role values for @solana/kit
 * From: https://github.com/solana-foundation/solana-lib/blob/main/packages/instructions/src/account-meta.ts
 */
enum AccountRole {
  READONLY = 0,
  WRITABLE = 1,
  READONLY_SIGNER = 2,
  WRITABLE_SIGNER = 3,
}

/**
 * Convert Relay instruction format to Solana instruction format
 */
export function convertRelayInstruction(inst: RelayInstruction): Instruction {
  // Convert keys to account metas with proper roles
  const accounts = inst.keys.map((key) => {
    let role: AccountRole;
    if (key.isSigner && key.isWritable) {
      role = AccountRole.WRITABLE_SIGNER;
    } else if (key.isSigner) {
      role = AccountRole.READONLY_SIGNER;
    } else if (key.isWritable) {
      role = AccountRole.WRITABLE;
    } else {
      role = AccountRole.READONLY;
    }

    return {
      address: address(key.pubkey) as Address,
      role,
    };
  });

  // Decode hex data to bytes
  const dataHex = inst.data.startsWith('0x') ? inst.data.slice(2) : inst.data;

  // Validate hex string (must be even length and only hex chars)
  if (dataHex.length > 0) {
    if (dataHex.length % 2 !== 0) {
      throw new Error(`Invalid instruction data: hex string has odd length (${dataHex.length})`);
    }
    if (!/^[0-9a-fA-F]*$/.test(dataHex)) {
      throw new Error(`Invalid instruction data: contains non-hex characters`);
    }
  }

  // Parse hex to bytes (empty string → empty array)
  const data = new Uint8Array(
    dataHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  return {
    programAddress: address(inst.programId) as Address,
    accounts,
    data,
  } as Instruction;
}

/**
 * Build a Solana transaction from Relay instructions
 *
 * @param instructions - Array of Relay instructions from API response
 * @param feePayer - Address of the fee payer (Kora's address for depositFeePayer flow)
 * @param solanaClient - Solana client service for fetching blockhash
 * @returns Serialized transaction bytes
 */
export async function buildTransactionFromRelayInstructions(
  instructions: RelayInstruction[],
  feePayer: string,
  solanaClient: SolanaClientService
): Promise<Uint8Array> {
  // Validate instructions array
  if (!instructions || instructions.length === 0) {
    throw new Error('Instructions array cannot be empty');
  }

  // 1. Convert Relay instructions to Solana format
  const solanaInstructions = instructions.map(convertRelayInstruction);

  // 2. Get fresh blockhash
  const { blockhash, lastValidBlockHeight } =
    await solanaClient.getLatestBlockhash();

  // 3. Build transaction message
  // Start with empty message, then add fee payer, blockhash, and instructions
  const baseMessage = createTransactionMessage({ version: 0 });

  const messageWithFeePayer = setTransactionMessageFeePayer(
    address(feePayer),
    baseMessage
  );

  const messageWithBlockhash = setTransactionMessageLifetimeUsingBlockhash(
    {
      blockhash: blockhash as Blockhash,
      lastValidBlockHeight,
    },
    messageWithFeePayer
  );

  const messageWithInstructions = appendTransactionMessageInstructions(
    solanaInstructions,
    messageWithBlockhash
  );

  // 4. Compile to transaction
  // Use type assertion since the message types are complex generics
  const transaction = compileTransaction(
    messageWithInstructions as Parameters<typeof compileTransaction>[0]
  );

  // 5. Serialize to bytes
  const encoder = getTransactionEncoder();
  const bytes = encoder.encode(transaction);

  // Convert ReadonlyUint8Array to regular Uint8Array
  return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
