/**
 * Supported tokens for CoolSwap
 *
 * These lists define which Solana SPL tokens are supported for:
 * 1. Trading/swapping (allowedTokens)
 * 2. Gas payment (allowedSplPaidTokens)
 *
 * Previously fetched from Kora service, now maintained locally.
 */

/**
 * Tokens that can be swapped on CoolSwap
 * Includes stablecoins, SOL variants, wrapped assets, DeFi tokens, and meme tokens
 */
export const ALLOWED_TOKENS = [
  // Stablecoins
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
  "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr", // EURC

  // SOL variants
  "So11111111111111111111111111111111111111112",  // WSOL
  "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", // JitoSOL
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", // mSOL
  "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v", // JupSOL

  // Wrapped assets
  "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij", // cbBTC
  "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh", // WBTC (Wormhole)
  "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", // WETH (Wormhole)

  // DeFi/Infrastructure
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", // JUP
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", // RAY
  "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4", // JLP
  "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm", // INF

  // Meme/Community tokens
  "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN", // TRUMP
  "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn", // PUMP
  "Dfh5DzRgSvvCFDoYc2ciTkMrbDfRKybA4SoFbPmApump", // pippin
  "JDzPbXboQYWVmdxXS3LbvjM52RtsV1QaSv2AzoCiai2o", // FO
  "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump", // Fartcoin
  "Dz9mQ9NzkBcCsuGPFJ3r1bS4wgqKMHBPiVuniW8Mbonk", // USELESS
  "FViMp5phQH2bX81S7Yyn1yXjj3BRddFBNcMCbTH8FCze", // $TOAD
  "GsSUx3qENEAn5MDQLGYHYs7ThtPXsnwCkKwqv1ZWbonk", // GOLDCARD
  "7DKFa79o6QfbGGEtBZ5ZYBJw1qLJWyNuVoMD5rxbpump", // Lingang
  "Fy1RLA8gvudCj1x4tcpcCDRWG1jfuYHT7zpWKP1svJam", // COTS
  "dekNoN3D8mXa4JHLwTbVXz8aPAyJUkk443UjcSpJKi4", // peanie
  "GRFK7sv4KhkMzJ7BXDUBy4PLyZVBeXuW1FeaT6Mnpump", // RICH
  "Kruj63Qx9EQX9QzukLCBgx5g9AGW69gPDsSK25FRZAi", // KRAI
  "8GiNGBm7rRr82CKXZSEd6xnBiULAypKWbeQdHZKpump", // STRAWBERRY
  "HP6ypiCX4yjzSxpfJExEcydSU1BiuuvGhgrKCLKopump", // FRACTAL
  "EDkDcWMPCgP4CAT8JQjd2oeF4TN9akBU21xA8q29pump", // zesty
  "2CRofCstiF5zbmA9skYmeLUGro1VPMMEPewk35gmpump", // SB
  "71Jvq4Epe2FCJ7JFSF7jLXdNk1Wy4Bhqd9iL6bEFELvg", // GOR
  "4BBjpGwLgGmUxtT82YFK9xMhcvyy3zgf3HpxTRip1YoU", // Mundi
  "GmbC2HgWpHpq9SHnmEXZNT5e1zgcU9oASDqbAkGTpump", // CATANA
  "89S9RdgynPq5odSRmcCDAzg26iYuRw4wqUmzMbjUpump", // EKKO
  "D1ySHVWnaWQsf8WiskayoF7oHuvXLp4CXvYw3PaS8N7B", // PEPITO
  "DbaSVQ87gQumixFumMHCrMKFpq5dSYNtKiVNDw3Vpump", // INU
  "2tUS7AK6V9eLHYLZNuNkRiskw1L2sFe9Rvgo1Jr8pump", // MOB
  "LZboYF8CPRYiswZFLSQusXEaMMwMxuSA5VtjGPtpump", // KAWS
] as const;

/**
 * Tokens that can be used to pay for gas fees
 * Currently identical to ALLOWED_TOKENS
 */
export const ALLOWED_SPL_PAID_TOKENS = [
  // Stablecoins
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
  "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr", // EURC

  // SOL variants
  "So11111111111111111111111111111111111111112",  // WSOL
  "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", // JitoSOL
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", // mSOL
  "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v", // JupSOL

  // Wrapped assets
  "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij", // cbBTC
  "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh", // WBTC (Wormhole)
  "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", // WETH (Wormhole)

  // DeFi/Infrastructure
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", // JUP
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", // RAY
  "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4", // JLP
  "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm", // INF

  // Meme/Community tokens
  "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN", // TRUMP
  "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn", // PUMP
  "Dfh5DzRgSvvCFDoYc2ciTkMrbDfRKybA4SoFbPmApump", // pippin
  "JDzPbXboQYWVmdxXS3LbvjM52RtsV1QaSv2AzoCiai2o", // FO
  "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump", // Fartcoin
  "Dz9mQ9NzkBcCsuGPFJ3r1bS4wgqKMHBPiVuniW8Mbonk", // USELESS
  "FViMp5phQH2bX81S7Yyn1yXjj3BRddFBNcMCbTH8FCze", // $TOAD
  "GsSUx3qENEAn5MDQLGYHYs7ThtPXsnwCkKwqv1ZWbonk", // GOLDCARD
  "7DKFa79o6QfbGGEtBZ5ZYBJw1qLJWyNuVoMD5rxbpump", // Lingang
  "Fy1RLA8gvudCj1x4tcpcCDRWG1jfuYHT7zpWKP1svJam", // COTS
  "dekNoN3D8mXa4JHLwTbVXz8aPAyJUkk443UjcSpJKi4", // peanie
  "GRFK7sv4KhkMzJ7BXDUBy4PLyZVBeXuW1FeaT6Mnpump", // RICH
  "Kruj63Qx9EQX9QzukLCBgx5g9AGW69gPDsSK25FRZAi", // KRAI
  "8GiNGBm7rRr82CKXZSEd6xnBiULAypKWbeQdHZKpump", // STRAWBERRY
  "HP6ypiCX4yjzSxpfJExEcydSU1BiuuvGhgrKCLKopump", // FRACTAL
  "EDkDcWMPCgP4CAT8JQjd2oeF4TN9akBU21xA8q29pump", // zesty
  "2CRofCstiF5zbmA9skYmeLUGro1VPMMEPewk35gmpump", // SB
  "71Jvq4Epe2FCJ7JFSF7jLXdNk1Wy4Bhqd9iL6bEFELvg", // GOR
  "4BBjpGwLgGmUxtT82YFK9xMhcvyy3zgf3HpxTRip1YoU", // Mundi
  "GmbC2HgWpHpq9SHnmEXZNT5e1zgcU9oASDqbAkGTpump", // CATANA
  "89S9RdgynPq5odSRmcCDAzg26iYuRw4wqUmzMbjUpump", // EKKO
  "D1ySHVWnaWQsf8WiskayoF7oHuvXLp4CXvYw3PaS8N7B", // PEPITO
  "DbaSVQ87gQumixFumMHCrMKFpq5dSYNtKiVNDw3Vpump", // INU
  "2tUS7AK6V9eLHYLZNuNkRiskw1L2sFe9Rvgo1Jr8pump", // MOB
  "LZboYF8CPRYiswZFLSQusXEaMMwMxuSA5VtjGPtpump", // KAWS
] as const;

export type SupportedToken = typeof ALLOWED_TOKENS[number];
export type SupportedGasToken = typeof ALLOWED_SPL_PAID_TOKENS[number];
