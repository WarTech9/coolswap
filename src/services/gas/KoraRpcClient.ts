/**
 * Minimal Kora RPC client - no Node.js dependencies
 *
 * WHY THIS EXISTS:
 * The official @solana/kora SDK imports Node.js 'crypto' for HMAC auth.
 * This causes Vite bundling issues with old 'readable-stream' polyfills.
 * CoolSwap doesn't use HMAC auth, so we use direct JSON-RPC calls instead.
 */

/** Response from getPayerSigner RPC call */
export interface PayerSignerResponse {
  signer_address: string;
  payment_destination: string;
}

/** Response from estimateTransactionFee RPC call */
export interface EstimateFeeResponse {
  fee_in_lamports: string;
  fee_in_token: string;
  payment_address: string;
  signer_pubkey: string;
}

/** Response from signAndSendTransaction RPC call */
export interface SignAndSendResponse {
  signature: string;
  signed_transaction: string;
  signer_pubkey: string;
}

/** Response from getConfig RPC call */
export interface ConfigResponse {
  fee_payer: string;
  validation_config: unknown;
}

/** Response from getSupportedTokens RPC call */
export interface SupportedTokensResponse {
  tokens: string[];
}

/** Response from signTransaction RPC call (signs without submitting) */
export interface SignTransactionResponse {
  signed_transaction: string;
  signer_pubkey: string;
}

/** JSON-RPC error structure */
interface RpcError {
  code: number;
  message: string;
}

/** JSON-RPC response structure */
interface RpcResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: RpcError;
}

/**
 * Minimal Kora RPC client
 * Makes direct JSON-RPC calls without Node.js crypto dependencies
 */
export class KoraRpcClient {
  constructor(private rpcUrl: string) {}

  /**
   * Make a JSON-RPC request to the Kora server
   */
  private async rpcRequest<T>(method: string, params?: unknown): Promise<T> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    const json = (await response.json()) as RpcResponse<T>;

    if (json.error) {
      throw new Error(`RPC Error ${json.error.code}: ${json.error.message}`);
    }

    return json.result as T;
  }

  /**
   * Get the fee payer signer address and payment destination
   */
  async getPayerSigner(): Promise<PayerSignerResponse> {
    return this.rpcRequest<PayerSignerResponse>('getPayerSigner');
  }

  /**
   * Get the server configuration (used for health checks)
   */
  async getConfig(): Promise<ConfigResponse> {
    return this.rpcRequest<ConfigResponse>('getConfig');
  }

  /**
   * Estimate transaction fee in lamports and tokens
   */
  async estimateTransactionFee(params: {
    transaction: string;
    fee_token: string;
    signer_key?: string;
    sig_verify?: boolean;
  }): Promise<EstimateFeeResponse> {
    return this.rpcRequest<EstimateFeeResponse>('estimateTransactionFee', params);
  }

  /**
   * Sign transaction with fee payer and submit to network
   */
  async signAndSendTransaction(params: {
    transaction: string;
  }): Promise<SignAndSendResponse> {
    return this.rpcRequest<SignAndSendResponse>('signAndSendTransaction', params);
  }

  /**
   * Get list of tokens supported for gas payment
   */
  async getSupportedTokens(): Promise<SupportedTokensResponse> {
    return this.rpcRequest<SupportedTokensResponse>('getSupportedTokens');
  }

  /**
   * Sign transaction with fee payer WITHOUT submitting to network
   * Used for Relay's depositFeePayer flow where Kora must sign first
   */
  async signTransaction(params: {
    transaction: string;
    signer_key?: string;
    sig_verify?: boolean;
  }): Promise<SignTransactionResponse> {
    return this.rpcRequest<SignTransactionResponse>('signTransaction', params);
  }
}
