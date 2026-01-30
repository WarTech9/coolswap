/**
 * Environment configuration
 * All environment variables are validated at build time
 */

interface EnvConfig {
  SOLANA_RPC_URL: string;
  SOLANA_WS_URL: string;
  DEBRIDGE_DLN_API_URL: string;
  DEBRIDGE_STATS_API_URL: string;
  HELIUS_API_KEY?: string;
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
}

function deriveWsUrl(httpUrl: string): string {
  return httpUrl.replace('https://', 'wss://').replace('http://', 'ws://');
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnvVar(key: string): string | undefined {
  return import.meta.env[key];
}

const solanaRpcUrl = getEnvVar(
  'VITE_SOLANA_RPC_URL',
  'https://api.mainnet-beta.solana.com'
);

export const env: EnvConfig = {
  SOLANA_RPC_URL: solanaRpcUrl,
  SOLANA_WS_URL:
    getOptionalEnvVar('VITE_SOLANA_WS_URL') ?? deriveWsUrl(solanaRpcUrl),
  DEBRIDGE_DLN_API_URL: getEnvVar(
    'VITE_DEBRIDGE_DLN_API_URL',
    'https://dln.debridge.finance/v1.0'
  ),
  DEBRIDGE_STATS_API_URL: getEnvVar(
    'VITE_DEBRIDGE_STATS_API_URL',
    'https://dln-api.debridge.finance/api'
  ),
  HELIUS_API_KEY: getOptionalEnvVar('VITE_HELIUS_API_KEY'),
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
};

declare global {
  interface ImportMetaEnv {
    readonly VITE_SOLANA_RPC_URL?: string;
    readonly VITE_SOLANA_WS_URL?: string;
    readonly VITE_DEBRIDGE_DLN_API_URL?: string;
    readonly VITE_DEBRIDGE_STATS_API_URL?: string;
    readonly VITE_HELIUS_API_KEY?: string;
  }
}
