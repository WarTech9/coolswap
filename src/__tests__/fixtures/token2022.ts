/**
 * Mock Token-2022 data structures for testing
 */

import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, ExtensionType } from '@solana/spl-token';
import type { Mint, TransferFeeConfig } from '@solana/spl-token';
import type { AccountInfo } from '@solana/web3.js';
import { address } from '@solana/addresses';

/**
 * Mock Token-2022 mint with transfer fee extension
 */
export const mockToken2022MintWithFee: Mint = {
  address: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  mintAuthority: null,
  supply: 1000000000n,
  decimals: 6,
  isInitialized: true,
  freezeAuthority: null,
  // tlvData contains extension data - mock with empty buffer for testing
  tlvData: Buffer.from([]),
};

/**
 * Mock transfer fee configuration with 1% fee
 */
export const mockTransferFeeConfig: TransferFeeConfig = {
  newerTransferFee: {
    epoch: 0n,
    maximumFee: 5000n,
    transferFeeBasisPoints: 100, // 1%
  },
  olderTransferFee: {
    epoch: 0n,
    maximumFee: 5000n,
    transferFeeBasisPoints: 100, // 1%
  },
  transferFeeConfigAuthority: null,
  withdrawWithheldAuthority: null,
  withheldAmount: 0n,
};

/**
 * Mock transfer fee configuration with 0.5% fee
 */
export const mockTransferFeeConfigLowFee: TransferFeeConfig = {
  newerTransferFee: {
    epoch: 0n,
    maximumFee: 1000n,
    transferFeeBasisPoints: 50, // 0.5%
  },
  olderTransferFee: {
    epoch: 0n,
    maximumFee: 1000n,
    transferFeeBasisPoints: 50, // 0.5%
  },
  transferFeeConfigAuthority: null,
  withdrawWithheldAuthority: null,
  withheldAmount: 0n,
};

/**
 * Mock transfer fee configuration with 5% fee
 */
export const mockTransferFeeConfigHighFee: TransferFeeConfig = {
  newerTransferFee: {
    epoch: 0n,
    maximumFee: 50000n,
    transferFeeBasisPoints: 500, // 5%
  },
  olderTransferFee: {
    epoch: 0n,
    maximumFee: 50000n,
    transferFeeBasisPoints: 500, // 5%
  },
  transferFeeConfigAuthority: null,
  withdrawWithheldAuthority: null,
  withheldAmount: 0n,
};

/**
 * Mock transfer fee configuration with 10% fee
 */
export const mockTransferFeeConfigVeryHighFee: TransferFeeConfig = {
  newerTransferFee: {
    epoch: 0n,
    maximumFee: 100000n,
    transferFeeBasisPoints: 1000, // 10%
  },
  olderTransferFee: {
    epoch: 0n,
    maximumFee: 100000n,
    transferFeeBasisPoints: 1000, // 10%
  },
  transferFeeConfigAuthority: null,
  withdrawWithheldAuthority: null,
  withheldAmount: 0n,
};

/**
 * Mock account info for Token-2022 mint account
 */
export const mockAccountInfoToken2022: AccountInfo<Buffer> = {
  owner: TOKEN_2022_PROGRAM_ID,
  data: Buffer.from([]), // Actual mint data would be here
  lamports: 2039280,
  executable: false,
  rentEpoch: 0,
};

/**
 * Mock account info for regular SPL Token mint account
 */
export const mockAccountInfoSPLToken: AccountInfo<Buffer> = {
  owner: TOKEN_PROGRAM_ID,
  data: Buffer.from([]), // Actual mint data would be here
  lamports: 2039280,
  executable: false,
  rentEpoch: 0,
};

/**
 * Mock extension types for different scenarios
 */
export const mockExtensionTypes = {
  withTransferFee: [ExtensionType.TransferFee],
  withMemo: [ExtensionType.MemoTransfer],
  withBoth: [ExtensionType.TransferFee, ExtensionType.MemoTransfer],
  empty: [] as ExtensionType[],
};
