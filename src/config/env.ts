/**
 * Environment configuration
 * All environment variables are validated at build time
 */

interface EnvConfig {
  SOLANA_RPC_URL: string;
  DEBRIDGE_DLN_API_URL: string;
  DEBRIDGE_STATS_API_URL: string;
  HELIUS_API_KEY?: string;
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
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

export const env: EnvConfig = {
  SOLANA_RPC_URL: getEnvVar(
    'VITE_SOLANA_RPC_URL',
    'https://api.mainnet-beta.solana.com'
  ),
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
    readonly VITE_DEBRIDGE_DLN_API_URL?: string;
    readonly VITE_DEBRIDGE_STATS_API_URL?: string;
    readonly VITE_HELIUS_API_KEY?: string;
  }
}
