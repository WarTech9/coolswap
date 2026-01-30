/**
 * Abstract bridge provider interface
 * Allows swapping between different bridge implementations (deBridge, Relay)
 */

import type { Chain, Token, QuoteRequest, Quote, OrderInfo } from './types';

export type CreateOrderError =
  | { code: 'INSUFFICIENT_LIQUIDITY'; message: string }
  | { code: 'AMOUNT_TOO_LOW'; message: string; minimum: string }
  | { code: 'AMOUNT_TOO_HIGH'; message: string; maximum: string }
  | { code: 'UNSUPPORTED_PAIR'; message: string };

export type CreateOrderResult =
  | { success: true; quote: Quote }
  | { success: false; error: CreateOrderError };

export interface IBridgeProvider {
  readonly name: string;
  getSupportedChains(): Promise<Chain[]>;
  getTokens(chainId: string): Promise<Token[]>;
  createOrder(request: QuoteRequest): Promise<CreateOrderResult>;
  getOrderStatus(orderId: string): Promise<OrderInfo>;
}
