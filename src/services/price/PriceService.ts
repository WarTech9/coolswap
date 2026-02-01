/**
 * Simple price service using Pyth Network HTTP API
 * Converts SOL lamports to token amounts for gas payment calculations
 *
 * Uses Pyth's public API (no auth required) - safe for frontend use
 */

const PYTH_PRICE_API = 'https://hermes.pyth.network/v2/updates/price/latest';

// Pyth price feed IDs for supported tokens
// IMPORTANT: Feed IDs must NOT have 0x prefix (Pyth API returns IDs without prefix)
// All tokens verified available in free Hermes API (no auth required)
const PRICE_FEED_IDS: Record<string, string> = {
  // Wrapped SOL
  'So11111111111111111111111111111111111111112': 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',

  // Stablecoins
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': '2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b', // USDT
  'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr': '76fa85158bf14ede77087fe3ae472f66213f6ea2f5b411cb2de472794990fa5c', // EURC

  // Liquid Staking Tokens (LSTs)
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': '67be9f519b95cf24338801051f9a808eff0a578ccb388db73b7f6fe1de019ffb', // JitoSOL
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'c2289a6a43d2ce91c6f55caec370f4acc38a2ed477f58813334c6d03749ff2a4', // mSOL
  'jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v': 'f8d8d6b6c866c8b2624fb5b679ae846738725e5fc887fa8e927c8d8645018a2b', // JupSOL

  // Wrapped BTC/ETH
  'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij': '2817d7bfe5c64b8ea956e9a26f573ef64e72e4d7891f2d6af9bcc93f7aff9a97', // cbBTC
  '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh': 'c9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33', // WBTC
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': '9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6', // WETH

  // DeFi Tokens
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': '0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996', // JUP
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': '91568baa8beb53db23eb3fb7f22c6e8bd303d103919e19733f2bb642d3e7987a', // RAY
  '5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm': '3e9961b890c4e77e9009c1a6d81dc556e24a3c190b02d1682c8f545c53b1d4a2', // INF

  // Meme Coins (Confirmed available in free Hermes API)
  '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN': '879551021853eec7a7dc827578e8e69da7e4fa8148339aa0d3d5296405be4b1a', // TRUMP
  'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn': '7a01fca212788bba7c5bf8c9efd576a8a722f070d2c17596ff7bb609b8d5c3b9', // PUMP
  '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump': '58cd29ef0e714c5affc44f269b2c1899a52da4169d7acc147b9da692e6953608', // Fartcoin
};

interface PythPriceResponse {
  parsed: Array<{
    id: string;
    price: {
      price: string;
      expo: number;
    };
  }>;
}

/**
 * Convert SOL lamports to token amount using Pyth prices
 *
 * @param lamports - Gas cost in lamports (from Relay's gasSolLamports)
 * @param tokenMint - Target token mint address
 * @param tokenDecimals - Target token decimals
 * @returns Token amount in raw units (with 10% buffer for price fluctuations)
 */
export async function convertLamportsToToken(
  lamports: bigint,
  tokenMint: string,
  tokenDecimals: number
): Promise<bigint> {
  const solFeedId = PRICE_FEED_IDS['So11111111111111111111111111111111111111112'];
  const tokenFeedId = PRICE_FEED_IDS[tokenMint];

  if (!tokenFeedId) {
    throw new Error(`Price feed not available for token: ${tokenMint}`);
  }

  // Fetch prices from Pyth (public API, no auth needed)
  const response = await fetch(
    `${PYTH_PRICE_API}?ids[]=${solFeedId}&ids[]=${tokenFeedId}`
  );

  if (!response.ok) {
    throw new Error(`Pyth API error: ${response.statusText}`);
  }

  const data: PythPriceResponse = await response.json();

  // Find SOL and token prices in response
  const solPriceData = data.parsed.find(p => p.id === solFeedId);
  const tokenPriceData = data.parsed.find(p => p.id === tokenFeedId);

  if (!solPriceData || !tokenPriceData) {
    throw new Error('Price data not found in Pyth response');
  }

  // Convert Pyth price format (price * 10^expo) to actual USD price
  const solPrice = parseFloat(solPriceData.price.price) * Math.pow(10, solPriceData.price.expo);
  const tokenPrice = parseFloat(tokenPriceData.price.price) * Math.pow(10, tokenPriceData.price.expo);

  if (solPrice === 0 || tokenPrice === 0) {
    throw new Error('Invalid price data from Pyth');
  }

  // Convert: lamports → SOL → USD → token
  const solAmount = Number(lamports) / 1e9;
  const usdValue = solAmount * solPrice;
  const tokenAmount = usdValue / tokenPrice;

  // Add 10% buffer to account for price fluctuations between quote and execution
  const rawAmount = Math.ceil(tokenAmount * 1.1 * Math.pow(10, tokenDecimals));

  return BigInt(rawAmount);
}
