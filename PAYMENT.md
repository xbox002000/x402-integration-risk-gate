# Payment / CDP setup (buyer)

The gate **pays** $0.10 USDC on Base Sepolia (development) via Coinbase CDP x402 client.

## Minimal env (copy-paste)

Create `.env` in the working directory (or export in the shell):

```bash
# CDP API credentials from https://portal.cdp.coinbase.com/
CDP_API_KEY_ID=your_api_key_id
CDP_API_KEY_SECRET=your_api_key_secret
CDP_WALLET_SECRET=your_wallet_secret

# Buyer client environment (Base Sepolia)
# Optional overrides:
# PUBLIC_BASE_URL=https://x402-integration-risk.vercel.app
```

Load before running:

```bash
set -a; source .env; set +a
npx x402-integration-risk-gate demo-w01
```

## Fund testnet USDC (Base Sepolia)

1. Create / use a CDP-managed EVM address (CLI prints `payer_prefix` on success).
2. Fund Base Sepolia ETH + USDC via CDP faucet / portal for that address.
3. Re-run the gate.

## Mainnet

Do **not** switch to production / mainnet unless you intentionally change spend controls. Default gate client uses `environment: "development"` (Base Sepolia).

## Security

- Never commit `.env` or secrets.
- Treat self-pay demos as L1/L2 fit evidence, **not** L3 revenue proof.
