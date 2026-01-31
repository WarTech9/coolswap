/**
 * Mock token data for testing
 */

import type { Token } from '@/services/bridge/types';

export const mockUSDCSolana: Token = {
  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  chainId: 'solana',
  logoUri: 'https://example.com/usdc.png',
};

export const mockUSDCArbitrum: Token = {
  address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  chainId: 'arbitrum',
  logoUri: 'https://example.com/usdc.png',
};

export const mockUSDTSolana: Token = {
  address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  symbol: 'USDT',
  name: 'Tether USD',
  decimals: 6,
  chainId: 'solana',
  logoUri: 'https://example.com/usdt.png',
};

export const mockSOL: Token = {
  address: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  chainId: 'solana',
  logoUri: 'https://example.com/sol.png',
};

export const mockWETHArbitrum: Token = {
  address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  symbol: 'WETH',
  name: 'Wrapped Ether',
  decimals: 18,
  chainId: 'arbitrum',
  logoUri: 'https://example.com/weth.png',
};

export const mockToken2022: Token = {
  address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  symbol: 'T22',
  name: 'Token 2022 Test',
  decimals: 6,
  chainId: 'solana',
  isToken2022: true,
  transferFeePercent: 0.01, // 1% transfer fee
};
