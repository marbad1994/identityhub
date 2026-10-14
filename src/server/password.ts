/**
 * Password policy and hashing, following NIST SP 800-63B-4 and the OWASP
 * Password Storage and Authentication cheat sheets:
 *
 * - Length is the only composition rule: at least 15 characters (the NIST
 *   minimum for a password used as a single factor), at most 256. Every
 *   printable character, spaces and Unicode included, is allowed; nothing is
 *   truncated. Passwords are NFKC-normalized before hashing so the same
 *   password typed on different keyboards matches.
 * - Passwords found in known breaches (Have I Been Pwned, k-anonymity range
 *   API: only the first five hex characters of the SHA-1 leave the server)
 *   and passwords built from the person's own email or name or this
 *   service's name are refused.
 * - Storage is Argon2id with OWASP's minimum parameters (19 MiB memory,
 *   2 iterations, 1 lane) and a 16-byte random salt, in PHC string format.
 *   Hashes made with weaker parameters are upgraded on the next sign-in.
 */
import { createHash, randomBytes } from "node:crypto";
import { argon2Verify, argon2id } from "hash-wasm";

export const PASSWORD_MIN = 15;
export const PASSWORD_MAX = 256;

const PARAMS = { memorySize: 19456, iterations: 2, parallelism: 1, hashLength: 32 };
const PWNED_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const SERVICE_WORDS = ["identityhub", "identity hub", "makketing", "socialpostapi"];

export function normalizePassword(password: string): string {
  return password.normalize("NFKC");
}

export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    ...PARAMS,
    password: normalizePassword(password),
    salt: randomBytes(16),
    outputType: "encoded",
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2Verify({ hash, password: normalizePassword(password) });
  } catch {
    return false;
  }
}

/** True when a stored hash uses weaker parameters than the current policy. */
export function needsRehash(hash: string): boolean {
  const match = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$/.exec(hash);
  if (!match) return true;
  const [, m, t, p] = match.map(Number);
  return m < PARAMS.memorySize || t < PARAMS.iterations || p !== PARAMS.parallelism;
}

let dummyHash: Promise<string> | undefined;

/**
 * Spend the same work as a real verification when there is no account, so
 * response time does not reveal whether an email is registered.
 */
export async function burnVerification(password: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(32).toString("base64url"));
  await verifyPassword(await dummyHash, password);
}

/** Times the password appears in known breaches, or null when the lookup failed. */
export async function breachCount(password: string): Promise<number | null> {
  const sha1 = createHash("sha1")
    .update(normalizePassword(password), "utf8")
    .digest("hex")
    .toUpperCase();
  try {
    const response = await fetch(`${PWNED_RANGE_URL}${sha1.slice(0, 5)}`, {
      // Padding hides the real number of matches from anyone watching the traffic.
      headers: { "Add-Padding": "true", "user-agent": "IdentityHub" },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    for (const line of (await response.text()).split("\n")) {
      const [suffix, count] = line.trim().split(":");
      if (suffix === sha1.slice(5)) return Number(count) || 0;
    }
    return 0;
  } catch {
    return null;
  }
}

/** A reason the password is not acceptable, or null when it is. */
export async function passwordProblem(password: string, context: string[]): Promise<string | null> {
  const normalized = normalizePassword(password);
  const length = [...normalized].length;
  if (length < PASSWORD_MIN)
    return `Use at least ${PASSWORD_MIN} characters. A few unrelated words work well.`;
  if (length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  if (/^(.)\1+$/u.test(normalized)) return "Do not repeat a single character.";
  const lower = normalized.toLowerCase();
  for (const word of [...SERVICE_WORDS, ...context.map((value) => value.toLowerCase())]) {
    if (word.length >= 4 && lower.includes(word))
      return "Do not use your name, email or this service's name in the password.";
  }
  const breached = await breachCount(normalized);
  if (breached === null) {
    // Fail open: an unreachable breach service must not lock everyone out.
    console.warn("[password] breach check unavailable; accepted without it");
  } else if (breached > 0) {
    return "This password has appeared in a data breach. Choose a different one.";
  }
  return null;
}
