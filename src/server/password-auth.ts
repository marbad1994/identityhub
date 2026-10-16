/**
 * Email + password accounts. Security properties, by design:
 *
 * - No account enumeration: sign-up, password reset and failed sign-in give
 *   the same answer whether or not the address is registered, and an unknown
 *   address costs the same Argon2id work as a real one.
 * - An address only joins an account after its owner clicks the emailed link
 *   (sign-up creates nothing until then), so addresses cannot be squatted.
 * - Brute force: per-IP and per-address windows in Postgres; the per-address
 *   lock is temporary (15 minutes) so it cannot be used to lock someone out
 *   for long.
 * - Optional TOTP second factor with single-use recovery codes and replay
 *   protection.
 * - Changing or resetting a password ends every other session and emails the
 *   owner. Email links are single use, short lived and stored only as hashes.
 */
import type pg from "pg";
import { one, rows, tx } from "./db";
import { decryptSecret, encryptSecret, randomToken, sha256, uid } from "./crypto";
import { appOrigin, secureCookies } from "./env";
import { mail, mailConfigured, normalizeEmail, validEmail } from "./email";
import {
  burnVerification,
  hashPassword,
  needsRehash,
  passwordProblem,
  verifyPassword,
} from "./password";
import { clear, hit, peek } from "./rate-limit";
import {
  challengeCookieName,
  createSession,
  embedChallengeCookieName,
  readCookie,
  revokeSessions,
  serializeCookie,
  serializeEmbedChallenge,
  countSessions,
  type SessionUser,
} from "./session";
import {
  newRecoveryCodes,
  newTotpSecret,
  normalizeRecoveryCode,
  otpauthUri,
  qrSvg,
  verifyTotp,
} from "./totp";
import { logActivity } from "./activity";
import { safeReturnTo } from "./oauth";

export type Ctx = {
  ip: string;
  userAgent: string | null;
  sessionTokenHash: string | null;
  cookieHeader?: string | null;
};
type Fail = { ok: false; error: string };

const CHECK_EMAIL = "Check your email. If the address can be used, we sent a link to continue.";
const BAD_LOGIN = "That email and password do not match an account.";
const SIGNUP_HOURS = 24;
const RESET_MINUTES = 30;
const CHALLENGE_MINUTES = 5;
const CHALLENGE_ATTEMPTS = 5;

const minutes = (seconds: number) => Math.max(1, Math.ceil(seconds / 60));
const tooMany = (seconds: number): Fail => ({
  ok: false,
  error: `Too many attempts. Try again in ${minutes(seconds)} minute${minutes(seconds) === 1 ? "" : "s"}.`,
});

export { challengeCookieName, embedChallengeCookieName };

type UserRow = {
  id: string;
  display_name: string;
  email: string | null;
  password_hash: string | null;
  mfa_secret: string | null;
  mfa_enabled_at: Date | null;
  mfa_last_step: string | null;
};

const USER_COLUMNS = `id, display_name, email, password_hash, mfa_secret, mfa_enabled_at, mfa_last_step`;

async function userByEmail(email: string): Promise<UserRow | undefined> {
  return one<UserRow>(`select ${USER_COLUMNS} from users where email_normalized = $1`, [
    normalizeEmail(email),
  ]);
}

async function userById(id: string, client?: pg.PoolClient): Promise<UserRow | undefined> {
  return one<UserRow>(`select ${USER_COLUMNS} from users where id = $1`, [id], client);
}

function link(path: string, token: string): string {
  return `${appOrigin()}${path}?token=${encodeURIComponent(token)}`;
}

async function issueEmailToken(input: {
  purpose: "signup" | "add_email" | "reset_password";
  email: string;
  userId?: string;
  displayName?: string;
  passwordHash?: string;
  returnTo?: string;
  minutes: number;
}): Promise<string> {
  const token = randomToken("em_");
  await rows(
    `insert into email_tokens (token_hash, purpose, user_id, email, display_name, password_hash, return_to, expires_at)
     values ($1, $2, $3, $4, $5, $6, $7, now() + make_interval(mins => $8))`,
    [
      sha256(token),
      input.purpose,
      input.userId ?? null,
      input.email,
      input.displayName ?? null,
      input.passwordHash ?? null,
      input.returnTo ?? "/workspace",
      input.minutes,
    ],
  );
  return token;
}

function emailWords(email: string, name = ""): string[] {
  const local = normalizeEmail(email).split("@")[0] ?? "";
  return [email, local, ...name.split(/\s+/)].filter((word) => word.length >= 4);
}

// ---------------------------------------------------------------------------
// Sign-up and email confirmation
// ---------------------------------------------------------------------------

export async function signUp(
  input: { name: string; email: string; password: string; returnTo: string },
  ctx: Ctx,
): Promise<{ ok: true; message: string } | Fail> {
  if (!mailConfigured())
    return { ok: false, error: "Email sign-up is not available on this hub yet." };
  const ipLimit = await hit(`signup:ip:${ctx.ip}`, 10, 3600);
  if (!ipLimit.allowed) return tooMany(ipLimit.retryAfterSeconds);
  const name = input.name.normalize("NFKC").trim().slice(0, 80);
  if (name.length < 1) return { ok: false, error: "Add your name." };
  if (!validEmail(input.email)) return { ok: false, error: "Enter a valid email address." };
  const problem = await passwordProblem(input.password, emailWords(input.email, name));
  if (problem) return { ok: false, error: problem };

  const email = input.email.normalize("NFKC").trim();
  // A quiet per-address cap keeps the hub from being used to flood an inbox.
  const mailLimit = await hit(`mail:${normalizeEmail(email)}`, 5, 3600);
  if (mailLimit.allowed) {
    if (await userByEmail(email)) {
      await mail.alreadyRegistered(email, `${appOrigin()}/forgot-password`);
    } else {
      const token = await issueEmailToken({
        purpose: "signup",
        email,
        displayName: name,
        passwordHash: await hashPassword(input.password),
        returnTo: safeReturnTo(input.returnTo, "/workspace"),
        minutes: SIGNUP_HOURS * 60,
      });
      await mail.signup(email, link("/api/auth/verify-email", token));
    }
  }
  return { ok: true, message: CHECK_EMAIL };
}

/** GET /api/auth/verify-email?token=...: confirm an address (new account, or one added in settings). */
export async function confirmEmail(
  token: string,
  ctx: Ctx,
): Promise<{ location: string; setCookie?: string }> {
  const row = await one<{
    purpose: "signup" | "add_email";
    user_id: string | null;
    email: string;
    display_name: string | null;
    password_hash: string | null;
    return_to: string;
  }>(
    `update email_tokens set used_at = now()
     where token_hash = $1 and used_at is null and expires_at > now() and purpose in ('signup', 'add_email')
     returning purpose, user_id, email, display_name, password_hash, return_to`,
    [sha256(token)],
  );
  if (!row)
    return {
      location: `/login?error=${encodeURIComponent("That link expired or was already used.")}`,
    };
  const normalized = normalizeEmail(row.email);

  if (row.purpose === "add_email") {
    const taken = await one(`select id from users where email_normalized = $1 and id <> $2`, [
      normalized,
      row.user_id,
    ]);
    if (taken)
      return {
        location: `/settings?error=${encodeURIComponent("That email belongs to another account.")}`,
      };
    await rows(
      `update users set email = $2, email_normalized = $3, email_verified_at = now(), password_hash = $4, password_changed_at = now()
       where id = $1`,
      [row.user_id, row.email, normalized, row.password_hash],
    );
    await rows(`delete from email_tokens where user_id = $1 and purpose = 'add_email'`, [
      row.user_id,
    ]);
    await logActivity(
      row.user_id!,
      "Email confirmed",
      `Password sign-in turned on for ${row.email}`,
    );
    return {
      location: `/settings?notice=${encodeURIComponent("Email confirmed. You can now sign in with your email and password.")}`,
    };
  }

  return tx(async (client) => {
    const existing = await one(
      `select id from users where email_normalized = $1`,
      [normalized],
      client,
    );
    if (existing) {
      return {
        location: `/login?notice=${encodeURIComponent("Your email is already confirmed. Sign in.")}`,
      };
    }
    const userId = uid();
    await rows(
      `insert into users (id, display_name, email, email_normalized, email_verified_at, password_hash, password_changed_at)
       values ($1, $2, $3, $4, now(), $5, now())`,
      [userId, row.display_name ?? row.email, row.email, normalized, row.password_hash],
      client,
    );
    // Other pending sign-ups for this address are now meaningless.
    await rows(
      `delete from email_tokens where purpose = 'signup' and lower(email) = $1`,
      [normalized],
      client,
    );
    await logActivity(userId, "Account created", `With email ${row.email}`, client);
    const setCookie = await createSession(userId, ctx.userAgent, client);
    return { location: safeReturnTo(row.return_to, "/workspace"), setCookie };
  });
}

// ---------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------

export type LoginResult =
  | { ok: true; redirect: string; setCookies: string[] }
  | { ok: true; mfaRequired: true; setCookies: string[] }
  | { ok: true; handoff: string }
  | { ok: true; embedUnavailable: true }
  | Fail;

const HANDOFF_SECONDS = 60;

async function issueHandoff(userId: string, returnTo: string): Promise<string> {
  const token = randomToken("eh_");
  await rows(
    `insert into embed_handoffs (token_hash, user_id, return_to, expires_at)
     values ($1, $2, $3, now() + make_interval(secs => $4))`,
    [sha256(token), userId, returnTo, HANDOFF_SECONDS],
  );
  return token;
}

/**
 * https: ihub_part is the Partitioned canary. ihub_open alone means Partitioned
 * was dropped. http has no probe; Lax is enough.
 */
function embedMfaAvailable(cookieHeader: string | null | undefined): boolean {
  if (!secureCookies()) return true;
  return Boolean(readCookie(cookieHeader ?? null, "ihub_part"));
}

/** Single-use Lax session for the consent window. Replay fails closed. */
export async function redeemEmbedHandoff(
  token: string,
  ctx: Ctx,
): Promise<{ location: string; setCookie?: string }> {
  const expired = `/login?error=${encodeURIComponent("That link expired or was already used.")}`;
  if (!token) return { location: expired };
  const row = await one<{ user_id: string; return_to: string }>(
    `delete from embed_handoffs where token_hash = $1 and expires_at > now() returning user_id, return_to`,
    [sha256(token)],
  );
  if (!row) return { location: expired };
  return {
    location: safeReturnTo(row.return_to, "/login"),
    setCookie: await createSession(row.user_id, ctx.userAgent),
  };
}

export async function login(
  input: { email: string; password: string; returnTo: string; embed?: boolean },
  ctx: Ctx,
): Promise<LoginResult> {
  const ipLimit = await hit(`login:ip:${ctx.ip}`, 30, 900);
  if (!ipLimit.allowed) return tooMany(ipLimit.retryAfterSeconds);
  const accountKey = `login:acct:${normalizeEmail(input.email)}`;
  const accountLimit = await peek(accountKey, 10, 900);
  if (!accountLimit.allowed) return tooMany(accountLimit.retryAfterSeconds);

  const user = validEmail(input.email) ? await userByEmail(input.email) : undefined;
  if (!user?.password_hash) {
    await burnVerification(input.password);
    await hit(accountKey, 10, 900);
    return { ok: false, error: BAD_LOGIN };
  }
  if (!(await verifyPassword(user.password_hash, input.password))) {
    await hit(accountKey, 10, 900);
    return { ok: false, error: BAD_LOGIN };
  }
  await clear(accountKey);
  if (needsRehash(user.password_hash)) {
    await rows(`update users set password_hash = $2 where id = $1`, [
      user.id,
      await hashPassword(input.password),
    ]);
  }
  const returnTo = safeReturnTo(input.returnTo, input.embed ? "/login" : "/workspace");

  if (user.mfa_enabled_at) {
    if (input.embed && !embedMfaAvailable(ctx.cookieHeader)) {
      return { ok: true, embedUnavailable: true };
    }
    const token = randomToken("ch_");
    await rows(`delete from login_challenges where expires_at < now()`);
    await rows(
      `insert into login_challenges (token_hash, user_id, return_to, expires_at) values ($1, $2, $3, now() + make_interval(mins => $4))`,
      [sha256(token), user.id, returnTo, CHALLENGE_MINUTES],
    );
    const challenge = input.embed
      ? serializeEmbedChallenge(token, CHALLENGE_MINUTES * 60)
      : serializeCookie(challengeCookieName(), token, CHALLENGE_MINUTES * 60);
    return { ok: true, mfaRequired: true, setCookies: [challenge] };
  }

  await logActivity(user.id, "Signed in", "With email and password");
  if (input.embed) return { ok: true, handoff: await issueHandoff(user.id, returnTo) };
  return {
    ok: true,
    redirect: returnTo,
    setCookies: [await createSession(user.id, ctx.userAgent)],
  };
}

export async function loginSecondFactor(
  input: { code: string; embed?: boolean },
  challengeToken: string | null,
  ctx: Ctx,
): Promise<
  | { ok: true; redirect: string; setCookies: string[] }
  | { ok: true; handoff: string; setCookies: string[] }
  | Fail
> {
  const expired: Fail = { ok: false, error: "This sign-in expired. Start again." };
  if (!challengeToken) return expired;
  const challenge = await one<{ user_id: string; return_to: string; attempts: number }>(
    `update login_challenges set attempts = attempts + 1 where token_hash = $1 and expires_at > now()
     returning user_id, return_to, attempts`,
    [sha256(challengeToken)],
  );
  if (!challenge) return expired;
  const userLimit = await hit(`mfa:user:${challenge.user_id}`, 10, 900);
  if (!userLimit.allowed) return tooMany(userLimit.retryAfterSeconds);
  if (challenge.attempts > CHALLENGE_ATTEMPTS) {
    await rows(`delete from login_challenges where token_hash = $1`, [sha256(challengeToken)]);
    return expired;
  }
  const user = await userById(challenge.user_id);
  if (!user?.mfa_enabled_at || !user.mfa_secret) return expired;

  let usedRecovery = false;
  const step = verifyTotp(
    decryptSecret(user.mfa_secret),
    input.code,
    user.mfa_last_step === null ? null : Number(user.mfa_last_step),
  );
  if (step !== null) {
    // Conditional update: two requests racing with the same code cannot both win.
    const advanced = await one(
      `update users set mfa_last_step = $2 where id = $1 and (mfa_last_step is null or mfa_last_step < $2) returning id`,
      [user.id, step],
    );
    if (!advanced)
      return { ok: false, error: "That code was already used. Wait for the next one." };
  } else {
    const recovered = await one(
      `update mfa_recovery_codes set used_at = now() where user_id = $1 and code_hash = $2 and used_at is null returning user_id`,
      [user.id, sha256(normalizeRecoveryCode(input.code))],
    );
    if (!recovered) return { ok: false, error: "That code is not valid." };
    usedRecovery = true;
  }

  await rows(`delete from login_challenges where token_hash = $1`, [sha256(challengeToken)]);
  await logActivity(
    user.id,
    "Signed in",
    usedRecovery ? "With password and a recovery code" : "With password and authenticator code",
  );
  if (usedRecovery && user.email) {
    await mail.notice(
      user.email,
      "A recovery code was used",
      "A recovery code was used to sign in to your Identity Hub account.",
    );
  }
  if (input.embed) {
    return {
      ok: true,
      handoff: await issueHandoff(user.id, safeReturnTo(challenge.return_to, "/login")),
      setCookies: [serializeEmbedChallenge("", 0), serializeCookie(challengeCookieName(), "", 0)],
    };
  }
  return {
    ok: true,
    redirect: challenge.return_to,
    setCookies: [
      await createSession(user.id, ctx.userAgent),
      serializeCookie(challengeCookieName(), "", 0),
    ],
  };
}

// ---------------------------------------------------------------------------
// Forgotten password
// ---------------------------------------------------------------------------

export async function requestPasswordReset(
  input: { email: string },
  ctx: Ctx,
): Promise<{ ok: true; message: string } | Fail> {
  if (!mailConfigured())
    return { ok: false, error: "Password reset by email is not available on this hub yet." };
  const ipLimit = await hit(`reset:ip:${ctx.ip}`, 10, 3600);
  if (!ipLimit.allowed) return tooMany(ipLimit.retryAfterSeconds);
  if (validEmail(input.email)) {
    const mailLimit = await hit(`mail:${normalizeEmail(input.email)}`, 5, 3600);
    const user = await userByEmail(input.email);
    if (mailLimit.allowed && user?.email) {
      await rows(`delete from email_tokens where user_id = $1 and purpose = 'reset_password'`, [
        user.id,
      ]);
      const token = await issueEmailToken({
        purpose: "reset_password",
        email: user.email,
        userId: user.id,
        minutes: RESET_MINUTES,
      });
      await mail.reset(user.email, link("/reset-password", token));
    }
  }
  return {
    ok: true,
    message:
      "If an account uses that address, we sent a link to reset the password. It expires in 30 minutes.",
  };
}

export async function resetTokenValid(token: string): Promise<boolean> {
  return Boolean(
    await one(
      `select 1 from email_tokens where token_hash = $1 and purpose = 'reset_password' and used_at is null and expires_at > now()`,
      [sha256(token)],
    ),
  );
}

export async function resetPassword(
  input: { token: string; password: string },
  ctx: Ctx,
): Promise<{ ok: true } | Fail> {
  const ipLimit = await hit(`reset-submit:ip:${ctx.ip}`, 20, 3600);
  if (!ipLimit.allowed) return tooMany(ipLimit.retryAfterSeconds);
  const pending = await one<{ user_id: string; email: string; display_name: string }>(
    `select t.user_id, t.email, u.display_name from email_tokens t join users u on u.id = t.user_id
     where t.token_hash = $1 and t.purpose = 'reset_password' and t.used_at is null and t.expires_at > now()`,
    [sha256(input.token)],
  );
  if (!pending)
    return { ok: false, error: "This reset link expired or was already used. Ask for a new one." };
  const problem = await passwordProblem(
    input.password,
    emailWords(pending.email, pending.display_name),
  );
  if (problem) return { ok: false, error: problem };
  const passwordHash = await hashPassword(input.password);
  const done = await tx(async (client) => {
    const consumed = await one(
      `update email_tokens set used_at = now() where token_hash = $1 and used_at is null returning user_id`,
      [sha256(input.token)],
      client,
    );
    if (!consumed) return false;
    await rows(
      `update users set password_hash = $2, password_changed_at = now() where id = $1`,
      [pending.user_id, passwordHash],
      client,
    );
    await revokeSessions(pending.user_id, null, client);
    await rows(`delete from login_challenges where user_id = $1`, [pending.user_id], client);
    return true;
  });
  if (!done) return { ok: false, error: "This reset link was already used." };
  await clear(`login:acct:${normalizeEmail(pending.email)}`);
  await logActivity(pending.user_id, "Password reset", "Every session was signed out");
  await mail.notice(
    pending.email,
    "Your Identity Hub password was changed",
    "Your password was reset and every device was signed out.",
  );
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Settings: email, password, two-factor, sessions
// ---------------------------------------------------------------------------

export type SecurityView = {
  email: string | null;
  hasPassword: boolean;
  mfaEnabled: boolean;
  recoveryCodesLeft: number;
  sessions: number;
  passwordSignInAvailable: boolean;
};

export async function securityView(user: SessionUser): Promise<SecurityView> {
  const row = (await userById(user.id))!;
  const codes = await one<{ n: number }>(
    `select count(*)::int as n from mfa_recovery_codes where user_id = $1 and used_at is null`,
    [user.id],
  );
  return {
    email: row.email,
    hasPassword: Boolean(row.password_hash),
    mfaEnabled: Boolean(row.mfa_enabled_at),
    recoveryCodesLeft: codes?.n ?? 0,
    sessions: await countSessions(user.id),
    passwordSignInAvailable: mailConfigured(),
  };
}

/** A person who signed in with a platform adds an email and password; confirmed by link. */
export async function addEmailAndPassword(
  user: SessionUser,
  input: { email: string; password: string },
): Promise<{ ok: true; message: string } | Fail> {
  if (!mailConfigured())
    return { ok: false, error: "Email sign-in is not available on this hub yet." };
  const row = (await userById(user.id))!;
  if (row.email) return { ok: false, error: "This account already has an email address." };
  const limit = await hit(`add-email:user:${user.id}`, 5, 3600);
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);
  if (!validEmail(input.email)) return { ok: false, error: "Enter a valid email address." };
  const problem = await passwordProblem(input.password, emailWords(input.email, row.display_name));
  if (problem) return { ok: false, error: problem };
  const email = input.email.normalize("NFKC").trim();
  const mailLimit = await hit(`mail:${normalizeEmail(email)}`, 5, 3600);
  if (mailLimit.allowed) {
    if (await userByEmail(email)) {
      await mail.alreadyRegistered(email, `${appOrigin()}/forgot-password`);
    } else {
      await rows(`delete from email_tokens where user_id = $1 and purpose = 'add_email'`, [
        user.id,
      ]);
      const token = await issueEmailToken({
        purpose: "add_email",
        email,
        userId: user.id,
        passwordHash: await hashPassword(input.password),
        minutes: SIGNUP_HOURS * 60,
      });
      await mail.addEmail(email, link("/api/auth/verify-email", token));
    }
  }
  return { ok: true, message: "Check your email and click the link to turn on password sign-in." };
}

/** Re-authentication for sensitive changes. Limited per user like a sign-in. */
async function confirmPassword(row: UserRow, password: string): Promise<Fail | null> {
  if (!row.password_hash) return { ok: false, error: "This account has no password." };
  const limit = await peek(`reauth:user:${row.id}`, 10, 900);
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);
  if (!(await verifyPassword(row.password_hash, password))) {
    await hit(`reauth:user:${row.id}`, 10, 900);
    return { ok: false, error: "Your current password is not correct." };
  }
  return null;
}

export async function changePassword(
  user: SessionUser,
  input: { current: string; next: string },
  ctx: Ctx,
): Promise<{ ok: true } | Fail> {
  const row = (await userById(user.id))!;
  const denied = await confirmPassword(row, input.current);
  if (denied) return denied;
  const problem = await passwordProblem(input.next, emailWords(row.email ?? "", row.display_name));
  if (problem) return { ok: false, error: problem };
  await rows(`update users set password_hash = $2, password_changed_at = now() where id = $1`, [
    user.id,
    await hashPassword(input.next),
  ]);
  await revokeSessions(user.id, ctx.sessionTokenHash);
  await logActivity(user.id, "Password changed", "Other sessions were signed out");
  if (row.email)
    await mail.notice(
      row.email,
      "Your Identity Hub password was changed",
      "Your password was changed and other devices were signed out.",
    );
  return { ok: true };
}

export async function beginTwoFactor(
  user: SessionUser,
): Promise<{ ok: true; secret: string; qr: string } | Fail> {
  const row = (await userById(user.id))!;
  if (!row.password_hash)
    return { ok: false, error: "Add a password first. Two-factor protects password sign-in." };
  if (row.mfa_enabled_at) return { ok: false, error: "Two-factor is already on." };
  const secret = newTotpSecret();
  await rows(`update users set mfa_secret = $2, mfa_last_step = null where id = $1`, [
    user.id,
    encryptSecret(secret),
  ]);
  return { ok: true, secret, qr: await qrSvg(otpauthUri(secret, row.email ?? row.display_name)) };
}

async function storeRecoveryCodes(userId: string, client?: pg.PoolClient): Promise<string[]> {
  const codes = newRecoveryCodes();
  await rows(`delete from mfa_recovery_codes where user_id = $1`, [userId], client);
  for (const code of codes) {
    await rows(
      `insert into mfa_recovery_codes (user_id, code_hash) values ($1, $2)`,
      [userId, sha256(normalizeRecoveryCode(code))],
      client,
    );
  }
  return codes;
}

export async function enableTwoFactor(
  user: SessionUser,
  input: { code: string },
): Promise<{ ok: true; recoveryCodes: string[] } | Fail> {
  const row = (await userById(user.id))!;
  if (row.mfa_enabled_at) return { ok: false, error: "Two-factor is already on." };
  if (!row.mfa_secret) return { ok: false, error: "Start the setup again." };
  const limit = await hit(`mfa-setup:user:${user.id}`, 10, 900);
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);
  const step = verifyTotp(decryptSecret(row.mfa_secret), input.code, null);
  if (step === null)
    return {
      ok: false,
      error: "That code is not valid. Check the time on your phone and try the next code.",
    };
  const recoveryCodes = await tx(async (client) => {
    await rows(
      `update users set mfa_enabled_at = now(), mfa_last_step = $2 where id = $1`,
      [user.id, step],
      client,
    );
    return storeRecoveryCodes(user.id, client);
  });
  await logActivity(user.id, "Two-factor turned on", "Authenticator app");
  if (row.email)
    await mail.notice(
      row.email,
      "Two-factor sign-in turned on",
      "Two-factor sign-in was turned on for your Identity Hub account.",
    );
  return { ok: true, recoveryCodes };
}

export async function disableTwoFactor(
  user: SessionUser,
  input: { password: string },
): Promise<{ ok: true } | Fail> {
  const row = (await userById(user.id))!;
  const denied = await confirmPassword(row, input.password);
  if (denied) return denied;
  await tx(async (client) => {
    await rows(
      `update users set mfa_secret = null, mfa_enabled_at = null, mfa_last_step = null where id = $1`,
      [user.id],
      client,
    );
    await rows(`delete from mfa_recovery_codes where user_id = $1`, [user.id], client);
  });
  await logActivity(user.id, "Two-factor turned off", "");
  if (row.email)
    await mail.notice(
      row.email,
      "Two-factor sign-in turned off",
      "Two-factor sign-in was turned off for your Identity Hub account.",
    );
  return { ok: true };
}

export async function regenerateRecoveryCodes(
  user: SessionUser,
  input: { password: string },
): Promise<{ ok: true; recoveryCodes: string[] } | Fail> {
  const row = (await userById(user.id))!;
  if (!row.mfa_enabled_at) return { ok: false, error: "Two-factor is off." };
  const denied = await confirmPassword(row, input.password);
  if (denied) return denied;
  const recoveryCodes = await storeRecoveryCodes(user.id);
  await logActivity(user.id, "Recovery codes replaced", "The old codes stopped working");
  return { ok: true, recoveryCodes };
}

export async function signOutOtherSessions(user: SessionUser, ctx: Ctx): Promise<{ ok: true }> {
  await revokeSessions(user.id, ctx.sessionTokenHash);
  await logActivity(user.id, "Signed out other sessions", "");
  return { ok: true };
}

/** Accounts with a password must confirm it before deleting everything. */
export async function confirmDeletion(
  user: SessionUser,
  password: string | undefined,
): Promise<Fail | null> {
  const row = (await userById(user.id))!;
  if (!row.password_hash) return null;
  return confirmPassword(row, password ?? "");
}
