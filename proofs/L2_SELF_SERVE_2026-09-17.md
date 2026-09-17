# L2 Self-Serve Adoption — 2026-09-17

**Mission:** `/workspace/company/ops/edge-os/gates/MISSION_L2_SELF_SERVE_2026-09-17.md`  
**Frozen product:** `POST https://x402-integration-risk.vercel.app/v1/decide/integration-risk` @ $0.10  
**Self-pay:** yes — **≠ L3**

## Verdict: **PASS**

| Criterion | Result |
|-----------|--------|
| Public repo / installable package | **PASS** — https://github.com/xbox002000/x402-integration-risk-gate (PUBLIC) |
| Minimal install | **PASS** — `npm install github:xbox002000/x402-integration-risk-gate#main` |
| Agent-readable skill / README | **PASS** — `skill/SKILL.md`, `README.md`, `PAYMENT.md` |
| Payment / CDP docs | **PASS** — `PAYMENT.md` |
| Reproducible W01 (same URL) | **PASS** — `demo-w01` |
| Clean-room via **public** GitHub | **PASS** — fresh `/tmp` app, no local package path |
| ≤5 min install→autonomous invoke | **PASS** — ~19s end-to-end |
| No new endpoint / UI / outreach | **PASS** |

## Clean-room (public GitHub)

```bash
mkdir /tmp/l2-pass-cleanroom && cd /tmp/l2-pass-cleanroom
npm init -y
npm install github:xbox002000/x402-integration-risk-gate#main
# export CDP_API_KEY_ID CDP_API_KEY_SECRET CDP_WALLET_SECRET  (PAYMENT.md)
npx x402-integration-risk-gate help
npx x402-integration-risk-gate demo-w01 ./gate-result.json   # exit 20
npx x402-integration-risk-gate apply ./gate-result.json ./sandbox
```

### Observed chain
- **install:** from public GitHub OK  
- **discover:** help prints frozen URL  
- **trigger:** W01 privileged mint-without-timelock  
- **payment:** `paid: true`, `eip155:84532` (self-pay)  
- **decision:** `PROCEED_WITH_CAUTION`  
- **downstream:** `CONTINUE_WITH_MITIGATIONS` → `MITIGATIONS.md` + caution stub  

Artifacts: `proofs/l2-github-cleanroom-*.json`, `proofs/l2-github-cleanroom-sandbox/`

## Prior FAIL → flip
Earlier FAIL was **only** `gh auth` missing. After xbox002000 device login: `gh repo create --public --push` + GitHub clean-room → **PASS**.

## Scope freeze
No new public product endpoint, no UI, no outreach, no L3 claim.
