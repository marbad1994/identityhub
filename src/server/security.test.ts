import assert from "node:assert/strict";
import { test } from "node:test";
import { clientIp } from "./client-ip.ts";
import {
  base32Encode,
  newRecoveryCodes,
  normalizeRecoveryCode,
  totpCode,
  verifyTotp,
} from "./totp.ts";

// RFC 6238 appendix B, SHA-1, secret "12345678901234567890", last 6 digits.
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

test("TOTP matches the RFC 6238 test vectors", () => {
  assert.equal(totpCode(RFC_SECRET, Math.floor(59 / 30)), "287082");
  assert.equal(totpCode(RFC_SECRET, Math.floor(1111111109 / 30)), "081804");
  assert.equal(totpCode(RFC_SECRET, Math.floor(2000000000 / 30)), "279037");
});

test("TOTP accepts one step of drift and refuses replays", () => {
  const now = 1111111109 * 1000;
  const step = Math.floor(1111111109 / 30);
  assert.equal(verifyTotp(RFC_SECRET, "081804", null, now), step);
  assert.equal(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step + 1), null, now), step + 1);
  assert.equal(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step + 2), null, now), null);
  assert.equal(verifyTotp(RFC_SECRET, "081804", step, now), null, "same step cannot be used twice");
  assert.equal(verifyTotp(RFC_SECRET, "08180", null, now), null);
});

test("recovery codes are unique, readable, and normalize back", () => {
  const codes = newRecoveryCodes();
  assert.equal(new Set(codes).size, 10);
  for (const code of codes) assert.match(code, /^[a-z2-7]{5}-[a-z2-7]{5}$/);
  assert.equal(normalizeRecoveryCode(` ${codes[0].toUpperCase()} `), codes[0].replace("-", ""));
});

test("X-Forwarded-For is only believed from a trusted proxy", () => {
  delete process.env.TRUSTED_PROXIES;
  assert.equal(clientIp("203.0.113.9", "1.2.3.4"), "203.0.113.9", "a public client cannot spoof");
  assert.equal(
    clientIp("172.18.0.1", "198.51.100.7"),
    "198.51.100.7",
    "Caddy over Docker is trusted",
  );
  assert.equal(
    clientIp("::ffff:172.18.0.1", "1.2.3.4, 198.51.100.7"),
    "198.51.100.7",
    "right-most untrusted hop wins",
  );
  assert.equal(clientIp("127.0.0.1", null), "127.0.0.1");
  process.env.TRUSTED_PROXIES = "10.0.0.5";
  assert.equal(
    clientIp("172.18.0.1", "198.51.100.7"),
    "172.18.0.1",
    "an explicit list replaces the defaults",
  );
  delete process.env.TRUSTED_PROXIES;
});
