#!/bin/bash

# Script to create server wallet ATAs for popular tokens
# Run this from the project root: bash api/setup-popular-atas.sh

echo "🚀 Creating server wallet ATAs for popular tokens..."
echo "Note: USDC and SOL (WSOL) were created earlier"
echo ""

# Array of token addresses to create ATAs for
# Format: "NAME:ADDRESS"
TOKENS=(
  # Stablecoins
  "USDT:Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
  "EURC:HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr"

  # SOL variants
  "JitoSOL:J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn"
  "mSOL:mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"
  "JupSOL:jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v"

  # Wrapped assets
  "cbBTC:cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij"
  "WBTC:3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh"
  "WETH:7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"

  # DeFi tokens
  "JUP:JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"
  "RAY:4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R"
)

# Counter for success/fail
SUCCESS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

# Loop through each token and create ATA
for TOKEN_ENTRY in "${TOKENS[@]}"; do
  # Split name and address
  TOKEN_NAME="${TOKEN_ENTRY%%:*}"
  TOKEN_ADDRESS="${TOKEN_ENTRY##*:}"

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Processing: $TOKEN_NAME"
  echo "Address: $TOKEN_ADDRESS"
  echo ""

  # Run the create-server-ata.js script
  if node api/create-server-ata.js "$TOKEN_ADDRESS"; then
    if grep -q "already exists" <<< "$(node api/create-server-ata.js "$TOKEN_ADDRESS" 2>&1)"; then
      echo "✅ Skipped (already exists)"
      ((SKIP_COUNT++))
    else
      echo "✅ Success"
      ((SUCCESS_COUNT++))
    fi
  else
    echo "❌ Failed"
    ((FAIL_COUNT++))
  fi

  echo ""

  # Small delay to avoid rate limiting
  sleep 1
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary:"
echo "   ✅ Created: $SUCCESS_COUNT"
echo "   ⏭️  Skipped: $SKIP_COUNT"
echo "   ❌ Failed: $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo "🎉 All ATAs set up successfully!"
else
  echo "⚠️  Some ATAs failed to create. Check the logs above."
  exit 1
fi
