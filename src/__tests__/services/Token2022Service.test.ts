/**
 * Unit tests for Token2022Service
 * Tests Token-2022 detection and fee extraction with RPC mocking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Token2022Service } from '@/services/token/Token2022Service';
import type { SolanaClientService } from '@/services/solana/SolanaClientService';
import {
  mockToken2022MintWithFee,
  mockTransferFeeConfig,
  mockTransferFeeConfigLowFee,
  mockTransferFeeConfigHighFee,
  mockTransferFeeConfigVeryHighFee,
  mockAccountInfoToken2022,
  mockAccountInfoSPLToken,
  mockExtensionTypes,
} from '../fixtures/token2022';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Mock @solana/spl-token module - define mocks inside the factory to avoid hoisting issues
vi.mock('@solana/spl-token', async () => {
  const actual = await vi.importActual('@solana/spl-token');
  return {
    ...actual,
    getMint: vi.fn(),
    getTransferFeeConfig: vi.fn(),
    getExtensionTypes: vi.fn(),
  };
});

describe('Token2022Service', () => {
  let service: Token2022Service;
  let mockSolanaClient: SolanaClientService;
  let mockGetMint: any;
  let mockGetTransferFeeConfig: any;
  let mockGetExtensionTypes: any;

  const testMintAddress = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  const testRpcEndpoint = 'https://api.mainnet-beta.solana.com';

  beforeEach(async () => {
    // Import the mocked functions
    const splToken = await import('@solana/spl-token');
    mockGetMint = splToken.getMint as any;
    mockGetTransferFeeConfig = splToken.getTransferFeeConfig as any;
    mockGetExtensionTypes = splToken.getExtensionTypes as any;

    // Create mock Solana client
    mockSolanaClient = {
      getAccountInfo: vi.fn(),
    } as unknown as SolanaClientService;

    // Create service instance
    service = new Token2022Service(mockSolanaClient, testRpcEndpoint);

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('detectToken2022 - Token-2022 Detection', () => {
    it('detects Token-2022 with transfer fee', async () => {
      // Mock getAccountInfo to return Token-2022 program owner
      (mockSolanaClient.getAccountInfo as any).mockResolvedValue(
        mockAccountInfoToken2022
      );

      // Mock getMint to return mint with extensions
      mockGetMint.mockResolvedValue(mockToken2022MintWithFee);

      // Mock getTransferFeeConfig to return fee config
      mockGetTransferFeeConfig.mockReturnValue(mockTransferFeeConfig);

      // Mock getExtensionTypes to return empty array (no memo)
      mockGetExtensionTypes.mockReturnValue(mockExtensionTypes.empty);

      const result = await service.detectToken2022(testMintAddress);

      expect(result.isToken2022).toBe(true);
      expect(result.transferFeePercent).toBe(0.01); // 100 bps = 1%
      expect(result.transferFeeBasisPoints).toBe(100);
      expect(result.maximumFee).toBe(5000n);
      expect(result.requiresMemoTransfers).toBe(false);

      // Verify RPC calls
      expect(mockSolanaClient.getAccountInfo).toHaveBeenCalledWith(
        testMintAddress
      );
      expect(mockGetMint).toHaveBeenCalledWith(
        expect.anything(), // Connection instance
        expect.anything(), // PublicKey instance
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      );
    });

    it('detects Token-2022 without transfer fee', async () => {
      // Mock getAccountInfo to return Token-2022 program owner
      (mockSolanaClient.getAccountInfo as any).mockResolvedValue(
        mockAccountInfoToken2022
      );

      // Mock getMint to return mint without transfer fee extension
      mockGetMint.mockResolvedValue(mockToken2022MintWithFee);

      // Mock getTransferFeeConfig to return null (no fee config)
      mockGetTransferFeeConfig.mockReturnValue(null);

      // Mock getExtensionTypes to return empty array
      mockGetExtensionTypes.mockReturnValue(mockExtensionTypes.empty);

      const result = await service.detectToken2022(testMintAddress);

      expect(result.isToken2022).toBe(true);
      expect(result.transferFeePercent).toBeNull();
      expect(result.transferFeeBasisPoints).toBeNull();
      expect(result.maximumFee).toBeNull();
      expect(result.requiresMemoTransfers).toBe(false);
    });

    it('detects Token-2022 with MemoTransfer extension', async () => {
      // Mock getAccountInfo to return Token-2022 program owner
      (mockSolanaClient.getAccountInfo as any).mockResolvedValue(
        mockAccountInfoToken2022
      );

      // Mock getMint to return mint with extensions
      mockGetMint.mockResolvedValue(mockToken2022MintWithFee);

      // Mock getTransferFeeConfig to return fee config
      mockGetTransferFeeConfig.mockReturnValue(mockTransferFeeConfig);

      // Mock getExtensionTypes to return MemoTransfer
      mockGetExtensionTypes.mockReturnValue(mockExtensionTypes.withMemo);

      const result = await service.detectToken2022(testMintAddress);

      expect(result.isToken2022).toBe(true);
      expect(result.transferFeePercent).toBe(0.01);
      expect(result.transferFeeBasisPoints).toBe(100);
      expect(result.maximumFee).toBe(5000n);
      expect(result.requiresMemoTransfers).toBe(true);
    });

    it('detects regular SPL Token (not Token-2022)', async () => {
      // Mock getAccountInfo to return regular SPL Token program owner
      (mockSolanaClient.getAccountInfo as any).mockResolvedValue(
        mockAccountInfoSPLToken
      );

      const result = await service.detectToken2022(testMintAddress);

      expect(result.isToken2022).toBe(false);
      expect(result.transferFeePercent).toBeNull();
      expect(result.transferFeeBasisPoints).toBeNull();
      expect(result.maximumFee).toBeNull();
      expect(result.requiresMemoTransfers).toBe(false);

      // Should not call getMint for non-Token-2022 accounts
      expect(mockGetMint).not.toHaveBeenCalled();
    });

    it('handles non-existent account (null response)', async () => {
      // Mock getAccountInfo to return null owner (account doesn't exist)
      (mockSolanaClient.getAccountInfo as any).mockResolvedValue({
        owner: null,
      });

      const result = await service.detectToken2022(testMintAddress);

      expect(result.isToken2022).toBe(false);
      expect(result.transferFeePercent).toBeNull();
      expect(result.transferFeeBasisPoints).toBeNull();
      expect(result.maximumFee).toBeNull();
      expect(result.requiresMemoTransfers).toBe(false);

      // Should not call getMint for non-existent accounts
      expect(mockGetMint).not.toHaveBeenCalled();
    });

    it('handles RPC error during getMint', async () => {
      // Mock getAccountInfo to return Token-2022 program owner
      (mockSolanaClient.getAccountInfo as any).mockResolvedValue(
        mockAccountInfoToken2022
      );

      // Mock getMint to throw error
      mockGetMint.mockRejectedValue(new Error('RPC connection failed'));

      // Mock console.warn to verify error logging
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await service.detectToken2022(testMintAddress);

      // Should still return Token-2022 detected, but with null fee info
      expect(result.isToken2022).toBe(true);
      expect(result.transferFeePercent).toBeNull();
      expect(result.transferFeeBasisPoints).toBeNull();
      expect(result.maximumFee).toBeNull();
      expect(result.requiresMemoTransfers).toBe(false);

      // Verify error was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to get transfer fee config:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('handles RPC error during getTransferFeeConfig', async () => {
      // Mock getAccountInfo to return Token-2022 program owner
      (mockSolanaClient.getAccountInfo as any).mockResolvedValue(
        mockAccountInfoToken2022
      );

      // Mock getMint to succeed
      mockGetMint.mockResolvedValue(mockToken2022MintWithFee);

      // Mock getTransferFeeConfig to throw error
      mockGetTransferFeeConfig.mockImplementation(() => {
        throw new Error('Failed to parse transfer fee config');
      });

      // Mock console.warn to verify error logging
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await service.detectToken2022(testMintAddress);

      // Should still return Token-2022 detected, but with null fee info
      expect(result.isToken2022).toBe(true);
      expect(result.transferFeePercent).toBeNull();
      expect(result.transferFeeBasisPoints).toBeNull();
      expect(result.maximumFee).toBeNull();

      // Verify error was logged
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('detects multiple extension types (TransferFee + MemoTransfer)', async () => {
      // Mock getAccountInfo to return Token-2022 program owner
      (mockSolanaClient.getAccountInfo as any).mockResolvedValue(
        mockAccountInfoToken2022
      );

      // Mock getMint to return mint with extensions
      mockGetMint.mockResolvedValue(mockToken2022MintWithFee);

      // Mock getTransferFeeConfig to return fee config
      mockGetTransferFeeConfig.mockReturnValue(mockTransferFeeConfig);

      // Mock getExtensionTypes to return both extensions
      mockGetExtensionTypes.mockReturnValue(mockExtensionTypes.withBoth);

      const result = await service.detectToken2022(testMintAddress);

      expect(result.isToken2022).toBe(true);
      expect(result.requiresMemoTransfers).toBe(true);
      expect(result.transferFeePercent).toBe(0.01);
    });

    it('handles different fee basis points (0.5%, 5%, 10%)', async () => {
      // Mock getAccountInfo to return Token-2022 program owner
      (mockSolanaClient.getAccountInfo as any).mockResolvedValue(
        mockAccountInfoToken2022
      );

      // Mock getMint to return mint with extensions
      mockGetMint.mockResolvedValue(mockToken2022MintWithFee);

      // Mock getExtensionTypes to return empty array
      mockGetExtensionTypes.mockReturnValue(mockExtensionTypes.empty);

      // Test 0.5% fee
      mockGetTransferFeeConfig.mockReturnValue(mockTransferFeeConfigLowFee);
      let result = await service.detectToken2022(testMintAddress);
      expect(result.transferFeePercent).toBe(0.005); // 50 bps = 0.5%
      expect(result.transferFeeBasisPoints).toBe(50);

      // Test 5% fee
      mockGetTransferFeeConfig.mockReturnValue(mockTransferFeeConfigHighFee);
      result = await service.detectToken2022(testMintAddress);
      expect(result.transferFeePercent).toBe(0.05); // 500 bps = 5%
      expect(result.transferFeeBasisPoints).toBe(500);

      // Test 10% fee
      mockGetTransferFeeConfig.mockReturnValue(mockTransferFeeConfigVeryHighFee);
      result = await service.detectToken2022(testMintAddress);
      expect(result.transferFeePercent).toBe(0.1); // 1000 bps = 10%
      expect(result.transferFeeBasisPoints).toBe(1000);
    });
  });
});
