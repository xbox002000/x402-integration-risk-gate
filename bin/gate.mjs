#!/usr/bin/env node
/**
 * L1 workflow gate runner (W01).
 * Calls frozen POST /v1/decide/integration-risk with x402 settle,
 * then maps decision → downstream action (must change behavior).
 *
 * Exit codes:
 *   0  PROCEED → allow integration work to continue
 *  20  PROCEED_WITH_CAUTION → continue only with mitigations
 *  10  DO_NOT_INTEGRATE → HARD STOP (do not write integration code)
 *  30  INSUFFICIENT_EVIDENCE → stop / gather more signals
 *   2  transport / payment / parse failure
 *
 * Usage:
 *   node scripts/with-dotenv.mjs node scripts/l1-gate-runner.mjs \
 *     --repository https://github.com/org/repo \
 *     --intended-integration "..."
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { CdpX402Client } from "@coinbase/cdp-sdk/x402";
import { wrapFetchWithPayment } from "@x402/fetch";

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  const envKey = name.replace(/-/g, "_").toUpperCase();
  return process.env[envKey] ?? fallback;
}

const base = (
  process.env.PUBLIC_BASE_URL ||
  "https://x402-integration-risk.vercel.app"
).replace(/\/$/, "");
const url = `${base}/v1/decide/integration-risk`;
const repository = arg("repository");
const intended =
  arg("intended-integration") || arg("intended_integration");
const outPath = arg("out");
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

if (!repository || !intended) {
  console.error(
    JSON.stringify({
      error: "missing_args",
      need: ["--repository", "--intended-integration"],
    }),
  );
  process.exit(2);
}

function normalizeDecision(raw) {
  const d = String(raw || "").toUpperCase();
  if (["DO_NOT_INTEGRATE", "DO_NOT_INTEGRATE", "REJECT", "BLOCK"].includes(d))
    return "DO_NOT_INTEGRATE";
  if (
    ["PROCEED_WITH_CAUTION", "PROCEED_WITH_CAUTION", "CAUTION"].includes(d)
  )
    return "PROCEED_WITH_CAUTION";
  if (["PROCEED", "PROCEED", "ALLOW"].includes(d)) return "PROCEED";
  if (["INSUFFICIENT_EVIDENCE", "INSUFFICIENT_EVIDENCE"].includes(d))
    return "INSUFFICIENT_EVIDENCE";
  return d || "INSUFFICIENT_EVIDENCE";
}

function downstreamFor(decision) {
  switch (decision) {
    case "DO_NOT_INTEGRATE":
      return {
        action: "HARD_STOP",
        may_write_integration_code: false,
        may_install_dependency: false,
        note: "Stop coding/install. Report block reasons from critical_risks.",
        exit_code: 10,
      };
    case "PROCEED_WITH_CAUTION":
      return {
        action: "CONTINUE_WITH_MITIGATIONS",
        may_write_integration_code: true,
        may_install_dependency: true,
        note: "Continue only while applying recommended_action / risk mitigations (pin tag, no admin key, sandbox).",
        exit_code: 20,
      };
    case "PROCEED":
      return {
        action: "ALLOW",
        may_write_integration_code: true,
        may_install_dependency: true,
        note: "Decision allows continue.",
        exit_code: 0,
      };
    case "INSUFFICIENT_EVIDENCE":
    default:
      return {
        action: "STOP_GATHER_SIGNALS",
        may_write_integration_code: false,
        may_install_dependency: false,
        note: "Do not pretend PROCEED. Gather public signals or stop.",
        exit_code: 30,
      };
  }
}

const client = new CdpX402Client({
  environment: "development",
  spendControls: {
    maxAmountPerPayment: { atomic: 500_000n, asset: USDC },
  },
});

const fetchPay = wrapFetchWithPayment(fetch, client);
const started = new Date().toISOString();
const res = await fetchPay(url, {
  method: "POST",
  headers: { "content-type": "application/json", accept: "application/json" },
  body: JSON.stringify({
    repository,
    intended_integration: intended,
  }),
});

const bodyText = await res.text();
let body = null;
try {
  body = JSON.parse(bodyText);
} catch {
  body = null;
}

const paymentResponseHdr =
  res.headers.get("payment-response") || res.headers.get("PAYMENT-RESPONSE");
let paymentResponse = null;
if (paymentResponseHdr) {
  try {
    const pad = "=".repeat((4 - (paymentResponseHdr.length % 4)) % 4);
    paymentResponse = JSON.parse(
      Buffer.from(
        paymentResponseHdr.replace(/-/g, "+").replace(/_/g, "/") + pad,
        "base64",
      ).toString("utf8"),
    );
  } catch {
    paymentResponse = { decode_error: true };
  }
}

if (res.status !== 200 || !body) {
  const fail = {
    ok: false,
    status: res.status,
    url,
    repository,
    intended_integration: intended,
    body: body ?? bodyText.slice(0, 400),
    payment_response: paymentResponse
      ? {
          success: paymentResponse.success,
          network: paymentResponse.network,
          payer_prefix: paymentResponse.payer
            ? String(paymentResponse.payer).slice(0, 12) + "…"
            : null,
        }
      : null,
  };
  console.log(JSON.stringify(fail, null, 2));
  process.exit(2);
}

const decision = normalizeDecision(body.decision ?? body.decision);
const downstream = downstreamFor(decision);

const result = {
  ok: true,
  workflow: "W01_web3_integration_gate",
  layer: "L1",
  trigger: {
    kind: "coding_task_about_to_integrate_web3",
    repository,
    intended_integration: intended,
    at: started,
  },
  call: {
    method: "POST",
    url,
    status: res.status,
    paid: Boolean(paymentResponse?.success),
    network: paymentResponse?.network ?? null,
    payer_prefix: paymentResponse?.payer
      ? String(paymentResponse.payer).slice(0, 12) + "…"
      : null,
    tx_prefix: paymentResponse?.transaction
      ? String(paymentResponse.transaction).slice(0, 14) + "…"
      : null,
  },
  decision: {
    value: decision,
    confidence: body.confidence ?? body.confidence ?? null,
    critical_risks: body.critical_risks ?? body.critical_risks ?? [],
    recommended_action:
      body.recommended_action ?? body.recommended_action ?? null,
    schema_version: body.schema_version ?? body.schema_version ?? null,
  },
  downstream,
  l1_fit:
    downstream.action !== "IGNORE"
      ? "PASS_decision_changes_behavior"
      : "FAIL_decision_ignored",
};

console.log(JSON.stringify(result, null, 2));

if (outPath) {
  mkdirSync(outPath.replace(/\/[^/]+$/, "") || ".", { recursive: true });
  writeFileSync(outPath, JSON.stringify(result, null, 2));
}

process.exit(downstream.exit_code);
