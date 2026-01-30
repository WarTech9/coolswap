/**
 * Chain configuration with normalized IDs
 * The app uses these normalized IDs; providers map them to their internal IDs
 */

import type { Chain } from '@/services/bridge/types';

export const CHAIN_IDS = {
  SOLANA: 'solana',
  ETHEREUM: 'ethereum',
  ARBITRUM: 'arbitrum',
  BASE: 'base',
  POLYGON: 'polygon',
  OPTIMISM: 'optimism',
  AVALANCHE: 'avalanche',
  BNB: 'bnb',
} as const;

export type ChainId = (typeof CHAIN_IDS)[keyof typeof CHAIN_IDS];

// deBridge internal chain IDs
export const DEBRIDGE_CHAIN_IDS: Record<ChainId, number> = {
  solana: 7565164,
  ethereum: 1,
  arbitrum: 42161,
  base: 8453,
  polygon: 137,
  optimism: 10,
  avalanche: 43114,
  bnb: 56,
};

export const SUPPORTED_CHAINS: Record<ChainId, Chain> = {
  solana: {
    id: 'solana',
    name: 'Solana',
    nativeCurrency: {
      symbol: 'SOL',
      decimals: 9,
    },
    blockExplorerUrl: 'https://explorer.solana.com',
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    nativeCurrency: {
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: 'https://etherscan.io',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    nativeCurrency: {
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: 'https://arbiscan.io',
  },
  base: {
    id: 'base',
    name: 'Base',
    nativeCurrency: {
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: 'https://basescan.org',
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    nativeCurrency: {
      symbol: 'MATIC',
      decimals: 18,
    },
    blockExplorerUrl: 'https://polygonscan.com',
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    nativeCurrency: {
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: 'https://optimistic.etherscan.io',
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche',
    nativeCurrency: {
      symbol: 'AVAX',
      decimals: 18,
    },
    blockExplorerUrl: 'https://snowtrace.io',
  },
  bnb: {
    id: 'bnb',
    name: 'BNB Chain',
    nativeCurrency: {
      symbol: 'BNB',
      decimals: 18,
    },
    blockExplorerUrl: 'https://bscscan.com',
  },
};

// Source chain for MVP (Solana only)
export const SOURCE_CHAIN = SUPPORTED_CHAINS.solana;

// Destination chains (all EVM chains)
export const DESTINATION_CHAINS = Object.values(SUPPORTED_CHAINS).filter(
  (chain) => chain.id !== 'solana'
);
