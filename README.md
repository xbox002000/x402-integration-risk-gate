# x402-integration-risk-gate

Self-serve **agent-native** gate for Web3 SDK / protocol / wallet / on-chain admin integrations.

Calls the **frozen** paid endpoint (do not invent alternatives):

```
POST https://x402-integration-risk.vercel.app/v1/decide/integration-risk
```

Price: **$0.10** (x402). Body:

```json
{ "repository": "<url|owner/name>", "intended_integration": "<what you will wire>" }
```

## Why call this?

Use it as an **automated decision gate inside a coding workflow** — not as a random research report.

```
Agent about to integrate Web3 SDK
  → gate (pay $0.10)
  → machine-readable decision
  → STOP / continue-with-mitigations / allow
```

Ignoring the decision after calling = workflow failure.

## Install (≤1 command)

```bash
# from GitHub (preferred once public)
npx --yes github:xbox002000/x402-integration-risk-gate -- help

# or clone
git clone https://github.com/xbox002000/x402-integration-risk-gate.git
cd x402-integration-risk-gate && npm install
```

Requires Node ≥20. Buyer payment env: see [PAYMENT.md](./PAYMENT.md).

## Agent skill (copy-paste, no hidden prompt)

Print portable skill markdown:

```bash
npx --yes github:xbox002000/x402-integration-risk-gate print-skill
```

Or copy [`skill/SKILL.md`](./skill/SKILL.md) into your agent skills folder as `web3-integration-risk-gate`.

## CLI

```bash
# gate
npx x402-integration-risk-gate gate \
  --repository https://github.com/OpenZeppelin/openzeppelin-contracts \
  --intended-integration "wire upgradeable proxy admin so agent can mint without timelock" \
  --out gate-result.json

# apply downstream behavior (MUST change what the agent does next)
npx x402-integration-risk-gate apply gate-result.json ./sandbox

# reproducible W01 caution demo
npx x402-integration-risk-gate demo-w01 gate-result.json
```

### Exit codes (behavior mapping)

| Code | Decision | Downstream |
|------|----------|------------|
| 0 | `PROCEED` | allow integrate |
| 20 | `PROCEED_WITH_CAUTION` | continue **only** with mitigations |
| 10 | `DO_NOT_INTEGRATE` | **hard stop** — no install / no integration code |
| 30 | `INSUFFICIENT_EVIDENCE` | stop / gather signals |
| 2 | transport/pay/parse error | fail closed |

## Reproducible W01

Same frozen URL as L1 proof. Expected for privileged mint-without-timelock intent: often `PROCEED_WITH_CAUTION` → exit 20 → `MITIGATIONS.md` written.

Self-pay settles prove **workflow fit**, not L3 economic adoption.

## Scope freeze

No UI. No extra public product endpoints. No outreach.
