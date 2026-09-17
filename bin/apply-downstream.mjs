#!/usr/bin/env node
/**
 * Applies L1 downstream policy from a gate result JSON.
 * Simulates coding-agent behavior change (no UI).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

const gatePath = process.argv[2] || "proofs/l1-w01-gate-result.json";
const workDir = process.argv[3] || "proofs/l1-downstream-sandbox";
const gate = JSON.parse(readFileSync(gatePath, "utf8"));
const d = gate.downstream;
const decision = gate.decision?.value;

mkdirSync(workDir, { recursive: true });
const integrationFile = join(workDir, "INTEGRATION_STUB.md");
const mitigationsFile = join(workDir, "MITIGATIONS.md");

let applied;
if (!d?.may_write_integration_code) {
  if (existsSync(integrationFile)) rmSync(integrationFile);
  applied = {
    wrote_integration_stub: false,
    reason: d?.action || "blocked",
    decision,
  };
  writeFileSync(
    join(workDir, "BLOCKED.md"),
    `# Integration blocked\n\nDecision: ${decision}\nAction: ${d?.action}\n\n${d?.note || ""}\n`,
  );
} else if (d.action === "CONTINUE_WITH_MITIGATIONS") {
  writeFileSync(
    mitigationsFile,
    `# Required mitigations (from gate)\n\n- ${gate.decision?.recommended_action || "n/a"}\n\nRisks:\n${(gate.decision?.critical_risks || []).map((r) => `- [${r.severity}] ${r.id}: ${r.summary}`).join("\n")}\n`,
  );
  writeFileSync(
    integrationFile,
    `# Integration stub (caution path)\n\nAllowed only with mitigations in MITIGATIONS.md.\nRepo: ${gate.trigger?.repository}\nIntent: ${gate.trigger?.intended_integration}\n`,
  );
  applied = {
    wrote_integration_stub: true,
    wrote_mitigations: true,
    decision,
    action: d.action,
  };
} else {
  writeFileSync(
    integrationFile,
    `# Integration stub (allowed)\n\nRepo: ${gate.trigger?.repository}\nIntent: ${gate.trigger?.intended_integration}\n`,
  );
  applied = {
    wrote_integration_stub: true,
    wrote_mitigations: false,
    decision,
    action: d.action,
  };
}

const out = { gate_decision: decision, downstream_action: d?.action, applied, workDir };
console.log(JSON.stringify(out, null, 2));
writeFileSync(join(workDir, "applied.json"), JSON.stringify(out, null, 2));
process.exit(d?.exit_code ?? 2);
