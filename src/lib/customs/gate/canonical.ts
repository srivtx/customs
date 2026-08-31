/**
 * Canonical JSON — the byte-stable form every signature is computed over.
 *
 * Rules (AGENTS.md invariant 6):
 *  - object keys sorted lexicographically, recursively
 *  - no whitespace
 *  - numbers must be safe integers (money is integer paise; floats never sign)
 *  - arrays keep order
 *  - undefined / functions / symbols are refused
 */

export class CanonicalError extends Error {
  constructor(path: string, reason: string) {
    super(`canonical JSON refused at ${path || "<root>"}: ${reason}`);
    this.name = "CanonicalError";
  }
}

export function canonicalJson(value: unknown): string {
  return serialize(value, "");
}

function serialize(value: unknown, path: string): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return serializeNumber(value, path);
    case "string":
      return JSON.stringify(value);
    case "object":
      return Array.isArray(value)
        ? serializeArray(value, path)
        : serializeObject(value as Record<string, unknown>, path);
    default:
      throw new CanonicalError(path, `${typeof value} is not representable`);
  }
}

function serializeNumber(n: number, path: string): string {
  if (!Number.isFinite(n)) throw new CanonicalError(path, "non-finite number");
  if (!Number.isSafeInteger(n)) {
    throw new CanonicalError(path, "non-integer number — money must be integer paise");
  }
  return String(n);
}

/**
 * Lenient stable stringify — same ordering rules, but any JSON value is
 * representable. Used ONLY for hash-chaining ledger events, which must be
 * able to record malformed inputs as attack evidence (a forged float in an
 * audit record is evidence, not arithmetic). Money never flows through this
 * path; signatures never use it.
 */
export function stableStringify(value: unknown): string {
  return lenient(value);
}

function lenient(value: unknown): string {
  if (value === null || value === undefined) return "null";
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return Number.isFinite(value) ? String(value) : "null";
    case "string":
      return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) return `[${value.map((v) => lenient(v)).join(",")}]`;
      const keys = Object.keys(value as Record<string, unknown>)
        .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
        .sort();
      return `{${keys
        .map(
          (k) =>
            `${JSON.stringify(k)}:${lenient((value as Record<string, unknown>)[k])}`
        )
        .join(",")}}`;
    }
    default:
      return "null";
  }
}


function serializeObject(obj: Record<string, unknown>, path: string): string {
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined);
  keys.sort();
  const parts = keys.map(
    (k) => `${JSON.stringify(k)}:${serialize(obj[k], path ? `${path}.${k}` : k)}`
  );
  return `{${parts.join(",")}}`;
}

function serializeArray(arr: unknown[], path: string): string {
  const parts = arr.map((v, i) => serialize(v, `${path}[${i}]`));
  return `[${parts.join(",")}]`;
}
