/**
 * Mock deBridge API responses for testing
 */

export interface DeBridgeCreateTxResponse {
  orderId: string;
  estimation: {
    srcChainTokenIn: {
      amount: string;
    };
    dstChainTokenOut: {
      amount: string;
      maxRefundAmount: string;
    };
  };
  order: {
    approximateFulfillmentDelay: number;
  };
  tx: {
    data: string;
  };
  prependedOperatingExpenseCost?: string;
  fixFee?: string;
}

export interface DeBridgeOrderStatusResponse {
  orderId: string;
  status: string;
  srcChainId: number;
  dstChainId: number;
  srcChainTokenIn: {
    amount: string;
  };
  dstChainTokenOut: {
    amount: string;
  };
  srcTransactionHash?: string;
  dstTransactionHash?: string;
  srcExplorerLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeBridgeErrorResponse {
  errorId: string;
  errorCode?: string;
  errorMessage: string;
  constraints?: {
    minAmount?: string;
    maxAmount?: string;
  };
}

// Mock successful create-tx response
export const mockCreateTxResponse: DeBridgeCreateTxResponse = {
  orderId: '0x123456789abcdef',
  estimation: {
    srcChainTokenIn: {
      amount: '1000000000', // 1000 USDC (6 decimals)
    },
    dstChainTokenOut: {
      amount: '995000000000000000000', // 995 USDC on destination (18 decimals)
      maxRefundAmount: '5000000000000000000',
    },
  },
  order: {
    approximateFulfillmentDelay: 180, // 3 minutes
  },
  tx: {
    data: '0x1234567890abcdef',
  },
  prependedOperatingExpenseCost: '5000000', // 5 USDC
  fixFee: '5000000', // 0.005 SOL (9 decimals)
};

// Mock order status responses for different statuses
export const mockOrderStatusCreated: DeBridgeOrderStatusResponse = {
  orderId: '0x123456789abcdef',
  status: 'created',
  srcChainId: 7565164, // Solana
  dstChainId: 42161, // Arbitrum
  srcChainTokenIn: {
    amount: '1000000000',
  },
  dstChainTokenOut: {
    amount: '995000000000000000000',
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockOrderStatusPending: DeBridgeOrderStatusResponse = {
  ...mockOrderStatusCreated,
  status: 'pending',
  srcTransactionHash: '0xsource123',
  updatedAt: '2024-01-01T00:01:00Z',
};

export const mockOrderStatusFulfilled: DeBridgeOrderStatusResponse = {
  ...mockOrderStatusCreated,
  status: 'fulfilled',
  srcTransactionHash: '0xsource123',
  dstTransactionHash: '0xdest456',
  srcExplorerLink: 'https://explorer.solana.com/tx/0xsource123',
  updatedAt: '2024-01-01T00:03:00Z',
};

export const mockOrderStatusCompleted: DeBridgeOrderStatusResponse = {
  ...mockOrderStatusCreated,
  status: 'completed',
  srcTransactionHash: '0xsource123',
  dstTransactionHash: '0xdest456',
  srcExplorerLink: 'https://explorer.solana.com/tx/0xsource123',
  updatedAt: '2024-01-01T00:05:00Z',
};

export const mockOrderStatusClaimed: DeBridgeOrderStatusResponse = {
  ...mockOrderStatusCreated,
  status: 'claimed',
  srcTransactionHash: '0xsource123',
  dstTransactionHash: '0xdest456',
  srcExplorerLink: 'https://explorer.solana.com/tx/0xsource123',
  updatedAt: '2024-01-01T00:05:00Z',
};

export const mockOrderStatusCancelled: DeBridgeOrderStatusResponse = {
  ...mockOrderStatusCreated,
  status: 'cancelled',
  updatedAt: '2024-01-01T00:02:00Z',
};

export const mockOrderStatusFailed: DeBridgeOrderStatusResponse = {
  ...mockOrderStatusCreated,
  status: 'failed',
  srcTransactionHash: '0xsource123',
  updatedAt: '2024-01-01T00:02:00Z',
};

// Mock error responses
export const mockErrorInsufficientLiquidity: DeBridgeErrorResponse = {
  errorId: 'ERR_001',
  errorCode: 'INSUFFICIENT_LIQUIDITY',
  errorMessage: 'Insufficient liquidity for this swap',
};

export const mockErrorAmountTooLow: DeBridgeErrorResponse = {
  errorId: 'ERR_002',
  errorCode: 'AMOUNT_TOO_LOW',
  errorMessage: 'Amount is below minimum',
  constraints: {
    minAmount: '100000000', // 100 USDC
  },
};

export const mockErrorAmountTooHigh: DeBridgeErrorResponse = {
  errorId: 'ERR_003',
  errorCode: 'AMOUNT_TOO_HIGH',
  errorMessage: 'Amount exceeds maximum',
  constraints: {
    maxAmount: '10000000000000', // 10M USDC
  },
};

export const mockErrorUnsupportedPair: DeBridgeErrorResponse = {
  errorId: 'ERR_004',
  errorCode: 'UNSUPPORTED_PAIR',
  errorMessage: 'Token pair not supported',
};
