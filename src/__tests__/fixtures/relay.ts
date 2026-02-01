/**
 * Relay API mock responses for testing
 * Matches RelayProvider expected response formats
 */

/** Mock Relay quote response with instructions format (new) */
export const mockRelayQuoteWithInstructions = {
  steps: [
    {
      id: 'swap-step',
      action: 'swap',
      description: 'Swap tokens via Relay',
      kind: 'transaction' as const,
      requestId: 'req-12345',
      items: [
        {
          status: 'pending',
          data: {
            chainId: 792703809,
            instructions: [
              {
                keys: [
                  { pubkey: 'Fe3Payer11111111111111111111111111111111', isSigner: true, isWritable: true },
                  { pubkey: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', isSigner: false, isWritable: false },
                ],
                programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                data: '0x030405',
              },
            ],
          },
        },
      ],
    },
  ],
  fees: {
    gas: { amount: '5000', amountFormatted: '0.000005', amountUsd: '0.001' },
    relayer: { amount: '10000', amountFormatted: '0.00001', amountUsd: '0.002' },
    relayerGas: { amount: '3000', amountFormatted: '0.000003', amountUsd: '0.0006' },
    relayerService: { amount: '7000', amountFormatted: '0.000007', amountUsd: '0.0014' },
  },
  details: {
    operation: 'swap',
    timeEstimate: 300,
    rate: '1.0',
    slippageTolerance: { origin: 0.01, destination: 0.01 },
    currencyIn: {
      currency: {
        chainId: 792703809,
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      },
      amount: '1000000',
      amountFormatted: '1.0',
      amountUsd: '1.0',
    },
    currencyOut: {
      currency: {
        chainId: 1,
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      },
      amount: '995000',
      amountFormatted: '0.995',
      amountUsd: '0.995',
    },
  },
  protocol: {
    orderId: 'order-abc123',
  },
};

/** Mock Relay quote with legacy txData format (Base64) */
export const mockRelayQuoteWithTxData = {
  ...mockRelayQuoteWithInstructions,
  steps: [
    {
      ...mockRelayQuoteWithInstructions.steps[0],
      items: [
        {
          status: 'pending',
          txData: 'AQABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9A',
        },
      ],
    },
  ],
};

/** Mock Relay quote with depositFeePayer set */
export const mockRelayQuoteWithDepositFeePayer = {
  ...mockRelayQuoteWithInstructions,
  fees: {
    ...mockRelayQuoteWithInstructions.fees,
    gas: { amount: '5000', amountFormatted: '0.000005', amountUsd: '0.001' },
  },
};

/** Mock Relay quote without depositFeePayer */
export const mockRelayQuoteWithoutDepositFeePayer = mockRelayQuoteWithInstructions;

/** Mock EVM transaction format */
export const mockRelayQuoteEVM = {
  ...mockRelayQuoteWithInstructions,
  steps: [
    {
      id: 'swap-step',
      action: 'swap',
      description: 'Swap tokens',
      kind: 'transaction' as const,
      items: [
        {
          status: 'pending',
          data: {
            chainId: 1,
            to: '0x1234567890123456789012345678901234567890',
            data: '0xa9059cbb00000000000000000000000012345678901234567890123456789012345678900000000000000000000000000000000000000000000000000000000000000064',
            value: '0',
          },
        },
      ],
    },
  ],
};

/** Mock Relay error responses */
export const mockRelayErrorResponses = {
  insufficientLiquidity: {
    message: 'Insufficient liquidity for this trading pair',
    statusCode: 400,
  },
  amountTooLow: {
    message: 'Amount below minimum threshold',
    statusCode: 400,
  },
  amountTooHigh: {
    message: 'Amount exceeds maximum limit',
    statusCode: 400,
  },
  unsupportedPair: {
    message: 'Trading pair not supported',
    statusCode: 400,
  },
  genericError: {
    message: 'An unexpected error occurred',
    statusCode: 500,
  },
};

/** Mock Relay status responses (v3 API) */
export const mockRelayStatusResponses = {
  pending: {
    status: 'pending',
    inTxHashes: ['sol-tx-hash-123'],
    updatedAt: 1704067200000,
    originChainId: 792703809,
    destinationChainId: 1,
  },
  created: {
    status: 'created',
    inTxHashes: ['sol-tx-hash-456'],
    updatedAt: 1704067200000,
    originChainId: 792703809,
    destinationChainId: 1,
  },
  fulfilled: {
    status: 'fulfilled',
    inTxHashes: ['sol-tx-hash-789'],
    txHashes: ['eth-tx-hash-abc'],
    updatedAt: 1704067500000,
    originChainId: 792703809,
    destinationChainId: 1,
  },
  completed: {
    status: 'completed',
    inTxHashes: ['sol-tx-hash-xyz'],
    txHashes: ['eth-tx-hash-def'],
    updatedAt: 1704067800000,
    originChainId: 792703809,
    destinationChainId: 1,
  },
  cancelled: {
    status: 'cancelled',
    inTxHashes: ['sol-tx-hash-111'],
    updatedAt: 1704067200000,
    originChainId: 792703809,
    destinationChainId: 1,
  },
  failed: {
    status: 'failed',
    inTxHashes: ['sol-tx-hash-222'],
    updatedAt: 1704067200000,
    originChainId: 792703809,
    destinationChainId: 1,
    details: 'Transaction execution failed',
  },
};

/** Mock chains response */
export const mockRelayChainsResponse = {
  chains: [
    {
      id: 792703809,
      name: 'Solana',
      displayName: 'Solana',
      nativeCurrency: { symbol: 'SOL', decimals: 9 },
      explorerUrl: 'https://explorer.solana.com',
    },
    {
      id: 1,
      name: 'Ethereum',
      displayName: 'Ethereum Mainnet',
      nativeCurrency: { symbol: 'ETH', decimals: 18 },
      explorerUrl: 'https://etherscan.io',
    },
    {
      id: 42161,
      name: 'Arbitrum',
      nativeCurrency: { symbol: 'ETH', decimals: 18 },
      explorerUrl: 'https://arbiscan.io',
    },
  ],
};

/** Mock tokens response (currencies/v2) */
export const mockRelayTokensResponse = [
  {
    chainId: 792703809,
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    metadata: { logoURI: 'https://example.com/usdc.png' },
  },
  {
    chainId: 792703809,
    address: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    metadata: { logoURI: 'https://example.com/sol.png' },
  },
  {
    chainId: 792703809,
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
  },
];
