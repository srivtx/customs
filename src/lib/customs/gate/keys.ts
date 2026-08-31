/**
 * Ed25519 keys for the demo merchant ("Fieldnote Supply").
 *
 * - node:crypto only; the gate has zero third-party dependencies by policy.
 * - The committed demo key is TEST-ONLY and regenerable; production rotates.
 * - In read-only/ephemeral runtimes (serverless cold boots) a fresh in-memory
 *   pair is generated and flagged — the UI never claims persistence it lacks.
 */
import { createHash, generateKeyPairSync, createPrivateKey, createPublicKey } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface KeyPair {
  privateKeyPem: string;
  publicKeyPem: string;
  /** sha256(public key DER), first 16 hex — shown in the UI as the desk's seal */
  fingerprint: string;
  ephemeral: boolean;
}

let cached: KeyPair | null = null;

function fingerprintOf(publicKeyPem: string): string {
  const der = createPublicKey(publicKeyPem).export({ type: "spki", format: "der" });
  return createHash("sha256").update(der).digest("hex").slice(0, 16);
}

export function generateKeyPair(): { privateKeyPem: string; publicKeyPem: string } {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

/** Deterministic pair from a fixed seed is NOT offered on purpose: Ed25519
 * keygen in node:crypto is random-only, and tests verify with whatever pair
 * they generate — determinism lives in the ledger, not the keys. */
export function loadKeys(stateDir: string | null): KeyPair {
  if (cached) return cached;
  if (stateDir === null) {
    const pair = generateKeyPair();
    cached = { ...pair, fingerprint: fingerprintOf(pair.publicKeyPem), ephemeral: true };
    return cached;
  }
  const dir = join(stateDir, "keys");
  const file = join(dir, "merchant.json");
  try {
    if (existsSync(file)) {
      const raw = JSON.parse(readFileSync(file, "utf8")) as {
        privateKeyPem: string;
        publicKeyPem: string;
      };
      createPrivateKey(raw.privateKeyPem); // throws if malformed
      cached = { ...raw, fingerprint: fingerprintOf(raw.publicKeyPem), ephemeral: false };
      return cached;
    }
    mkdirSync(dir, { recursive: true });
    const pair = generateKeyPair();
    const record = { createdAtMs: Date.now(), ...pair, note: "TEST-ONLY demo key. Rotate for any real deployment." };
    writeFileSync(file, JSON.stringify(record, null, 2));
    cached = { ...pair, fingerprint: fingerprintOf(pair.publicKeyPem), ephemeral: false };
    return cached;
  } catch {
    // read-only filesystem (serverless): in-memory pair, honestly flagged
    const pair = generateKeyPair();
    cached = { ...pair, fingerprint: fingerprintOf(pair.publicKeyPem), ephemeral: true };
    return cached;
  }
}

export function resetKeyCache(): void {
  cached = null;
}
