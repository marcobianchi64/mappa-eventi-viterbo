#!/usr/bin/env node
/**
 * Fase 0bis — verifica che repo e automazioni siano configurabili in sicurezza.
 * Non richiede credenziali Supabase.
 */
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
let failed = 0;

function ok(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg) {
  console.log(`✗ ${msg}`);
  failed += 1;
}

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

console.log("=== verify:automation (Fase 0bis) ===\n");

const requiredWorkflows = [
  ".github/workflows/ci.yml",
  ".github/workflows/collect.yml",
  ".github/workflows/sync-utilities.yml",
  ".github/workflows/deploy.yml",
];

for (const wf of requiredWorkflows) {
  if (existsSync(resolve(root, wf))) ok(`Workflow presente: ${wf}`);
  else fail(`Workflow mancante: ${wf}`);
}

for (const envExample of [
  "apps/web/.env.example",
  "apps/admin/.env.example",
  "packages/collector/.env.example",
]) {
  if (existsSync(resolve(root, envExample))) ok(`Template env: ${envExample}`);
  else fail(`Template env mancante: ${envExample}`);
}

const gitignore = read(".gitignore");
if (gitignore.includes(".env")) ok(".gitignore esclude .env");
else fail(".gitignore deve contenere .env");

const trackedEnv = execSync("git ls-files", { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter((f) => f.endsWith(".env") && !f.endsWith(".env.example"));
if (trackedEnv.length === 0) ok("Nessun file .env tracciato da git");
else fail(`File .env in git: ${trackedEnv.join(", ")}`);

const sensitivePatterns = [
  { name: "JWT-like in tracked files", re: /eyJ[A-Za-z0-9_-]{20,}/ },
  { name: "sb_secret in tracked files", re: /sb_secret_[A-Za-z0-9_-]+/ },
];
const tracked = execSync("git ls-files", { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) => !f.endsWith(".env.example") && !f.includes("node_modules"));

for (const { name, re } of sensitivePatterns) {
  let hit = false;
  for (const file of tracked) {
    const path = resolve(root, file);
    if (!existsSync(path) || path.endsWith(".png")) continue;
    try {
      const text = readFileSync(path, "utf8");
      if (re.test(text)) {
        fail(`${name}: possibile segreto in ${file}`);
        hit = true;
        break;
      }
    } catch {
      /* binary */
    }
  }
  if (!hit) ok(`Nessun ${name} nei file tracciati`);
}

try {
  const mainTree = execSync("git ls-tree -r --name-only origin/main 2>/dev/null", {
    cwd: root,
    encoding: "utf8",
  });
  if (!mainTree.includes(".github/workflows/collect.yml")) {
    console.log(
      "\n⚠  origin/main non contiene ancora i workflow: i cron GitHub non girano finché non si fa merge.",
    );
  } else {
    ok("origin/main contiene workflow collect");
  }
} catch {
  console.log("\n⚠  Impossibile leggere origin/main (offline?)");
}

const collectYml = existsSync(resolve(root, ".github/workflows/collect.yml"))
  ? read(".github/workflows/collect.yml")
  : "";
if (collectYml.includes("workflow_dispatch")) ok("collect.yml supporta avvio manuale");
else fail("collect.yml dovrebbe avere workflow_dispatch");

if (collectYml.includes("SUPABASE_SERVICE_ROLE_KEY")) ok("collect.yml usa SUPABASE_SERVICE_ROLE_KEY");
else fail("collect.yml deve referenziare SUPABASE_SERVICE_ROLE_KEY");

console.log("");
if (failed > 0) {
  console.log(`verify:automation FAILED (${failed} controlli)`);
  process.exit(1);
}
console.log("verify:automation OK");
