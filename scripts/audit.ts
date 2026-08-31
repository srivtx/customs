/**
 * audit.ts — re-walk the deterministic ledger's hash chain.
 * Writes results/audit_chain.json. `make audit` is the entry.
 */
import { Ledger } from "../src/lib/customs/ledger/ledger";
import { loadKeys } from "../src/lib/customs/gate/keys";
import { EngineDeps } from "../src/lib/customs/engine";
import { seedHistory } from "../src/lib/customs/runtime";
import { tamperEvent, verifyChain } from "../src/lib/customs/ledger/chain";
import { writeFileSync, mkdirSync } from "node:fs";

const ledger = new Ledger(null);
const keys = loadKeys(null);
const deps: EngineDeps = {
  ledger,
  privateKeyPem: keys.privateKeyPem,
  publicKeyPem: keys.publicKeyPem,
  merchantFingerprint: keys.fingerprint,
};
seedHistory(deps);
const events = [...ledger.all()];
const verdict = verifyChain(events);

// negative control: tamper one historical byte and prove the chain catches it
const tampered = [...events];
const idx = Math.floor(tampered.length / 2);
tampered[idx] = tamperEvent(tampered[idx]);
const tamperVerdict = verifyChain(tampered);

const out = {
  status: verdict.ok && !tamperVerdict.ok ? "pass" : "fail",
  measured_at: new Date().toISOString(),
  metrics: {
    length: verdict.length,
    headHash: verdict.headHash,
    tamperDetected: !tamperVerdict.ok,
    tamperBreakSeq: tamperVerdict.firstBreakSeq,
  },
  notes:
    "The deterministic seed ledger is re-walked link by link (sha256 over canonical JSON of each entry and its predecessor). The negative control mutates one historical entry by one paise and must break the chain at that seq.",
  regenerate: "make audit",
};
mkdirSync("results", { recursive: true });
writeFileSync("results/audit_chain.json", JSON.stringify(out, null, 2) + "\n");
console.log(`audit: chain ok=${verdict.ok} length=${verdict.length} tamperDetected=${!tamperVerdict.ok} (break at seq ${tamperVerdict.firstBreakSeq})`);
if (!verdict.ok || tamperVerdict.ok) process.exit(1);
