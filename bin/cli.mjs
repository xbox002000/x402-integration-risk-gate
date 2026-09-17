#!/usr/bin/env node
/**
 * Public self-serve CLI for frozen x402 integration-risk endpoint.
 * Subcommands: gate | apply | demo-w01 | print-skill
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cmd = process.argv[2] || "help";
const rest = process.argv.slice(3);

function run(script, args) {
  const r = spawnSync(process.execPath, [join(root, "bin", script), ...args], {
    stdio: "inherit",
    env: process.env,
  });
  process.exit(r.status ?? 2);
}

if (cmd === "gate") run("gate.mjs", rest);
else if (cmd === "apply") run("apply-downstream.mjs", rest);
else if (cmd === "print-skill") {
  process.stdout.write(readFileSync(join(root, "skill", "SKILL.md"), "utf8"));
} else if (cmd === "demo-w01") {
  // Reproducible W01 caution path (self-pay if CDP env present)
  run("gate.mjs", [
    "--repository",
    "https://github.com/OpenZeppelin/openzeppelin-contracts",
    "--intended-integration",
    "wire upgradeable proxy admin key so our agent can mint without timelock",
    "--out",
    rest[0] || "gate-result.json",
  ]);
} else {
  console.log(`x402-integration-risk-gate — self-serve Web3 integration risk gate

Frozen endpoint:
  POST https://x402-integration-risk.vercel.app/v1/decide/integration-risk  ($0.10)

Usage:
  npx x402-integration-risk-gate gate --repository <url> --intended-integration <text> [--out result.json]
  npx x402-integration-risk-gate apply <result.json> [sandboxDir]
  npx x402-integration-risk-gate demo-w01 [result.json]
  npx x402-integration-risk-gate print-skill

Env (buyer wallet / CDP): see PAYMENT.md
Exit codes: 0 PROCEED | 20 CAUTION | 10 DO_NOT_INTEGRATE | 30 INSUFFICIENT | 2 error
`);
  process.exit(cmd === "help" || cmd === "-h" ? 0 : 2);
}
