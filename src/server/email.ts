import { appendFile } from "node:fs/promises";
import nodemailer, { type Transporter } from "nodemailer";
import { appOrigin, env } from "./env";

/** Lowercased, NFKC-normalized address used as the unique key. */
export function normalizeEmail(email: string): string {
  return email.normalize("NFKC").trim().toLowerCase();
}

/** Syntax check only; ownership is proven by the emailed link. */
export function validEmail(email: string): boolean {
  const value = email.normalize("NFKC").trim();
  if (value.length > 254) return false;
  const at = value.lastIndexOf("@");
  if (at < 1 || at !== value.indexOf("@")) return false;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (local.length > 64 || /[\s\p{Cc}]/u.test(value)) return false;
  return /^[^.\s@]+(\.[^.\s@]+)+$/u.test(domain) && !domain.includes("..");
}

/** Email links and password sign-in are available once outgoing mail is configured. */
export function mailConfigured(): boolean {
  return Boolean((env("SMTP_HOST") && env("SMTP_FROM_EMAIL")) || env("MAIL_FILE"));
}

let transporter: Transporter | undefined;

type Message = {
  to: string;
  subject: string;
  lines: string[];
  link?: { label: string; url: string };
};

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );

async function send(message: Message): Promise<void> {
  const text = [
    ...message.lines,
    ...(message.link ? ["", `${message.link.label}: ${message.link.url}`] : []),
  ].join("\n");
  const html = [
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.5;color:#111">`,
    ...message.lines.map((line) => `<p>${escape(line)}</p>`),
    ...(message.link
      ? [
          `<p><a href="${escape(message.link.url)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#111;color:#fff;text-decoration:none;font-weight:600">${escape(message.link.label)}</a></p>`,
          `<p style="color:#6e6e73;font-size:13px">Or paste this link into your browser: ${escape(message.link.url)}</p>`,
        ]
      : []),
    `<p style="color:#6e6e73;font-size:13px">Identity Hub · ${escape(appOrigin())}</p></div>`,
  ].join("");

  // Test transport: one JSON line per message, read by the E2E run.
  const file = env("MAIL_FILE");
  if (file) {
    await appendFile(
      file,
      `${JSON.stringify({ to: message.to, subject: message.subject, text, link: message.link?.url ?? null })}\n`,
    );
    return;
  }
  // Same variables as SocialPostAPI, so one mailbox serves both.
  const host = env("SMTP_HOST");
  if (!host) throw new Error("SMTP_HOST is not set");
  const port = Number(env("SMTP_PORT") ?? 587);
  transporter ??= nodemailer.createTransport({
    host,
    port,
    // 465 is implicit TLS; other ports upgrade with STARTTLS, required unless SMTP_USE_TLS=false.
    secure: port === 465,
    requireTLS: port !== 465 && env("SMTP_USE_TLS") !== "false",
    auth: env("SMTP_USER")
      ? { user: env("SMTP_USER")!, pass: env("SMTP_PASSWORD") ?? "" }
      : undefined,
    tls: { minVersion: "TLSv1.2" },
  });
  await transporter.sendMail({
    from: { name: "Identity Hub", address: env("SMTP_FROM_EMAIL")! },
    to: message.to,
    subject: message.subject,
    text,
    html,
  });
}

/** Send without letting a mail failure change the HTTP response (that would leak whether an account exists). */
export async function sendQuietly(message: Message): Promise<void> {
  try {
    await send(message);
  } catch (error) {
    console.error("[mail] send failed:", error instanceof Error ? error.message : error);
  }
}

export const mail = {
  signup: (to: string, url: string) =>
    sendQuietly({
      to,
      subject: "Confirm your email for Identity Hub",
      lines: [
        "Confirm this address to finish creating your Identity Hub account. The link works once and expires in 24 hours.",
        "If you did not sign up, ignore this email.",
      ],
      link: { label: "Confirm email", url },
    }),
  alreadyRegistered: (to: string, resetUrl: string) =>
    sendQuietly({
      to,
      subject: "You already have an Identity Hub account",
      lines: [
        "Someone tried to create an Identity Hub account with this address, which already has one.",
        "If it was you, sign in instead, or reset your password if you forgot it. If it was not you, you can ignore this email.",
      ],
      link: { label: "Reset password", url: resetUrl },
    }),
  addEmail: (to: string, url: string) =>
    sendQuietly({
      to,
      subject: "Confirm your email for Identity Hub",
      lines: [
        "Confirm this address to add email and password sign-in to your Identity Hub account. The link works once and expires in 24 hours.",
        "If you did not ask for this, ignore this email.",
      ],
      link: { label: "Confirm email", url },
    }),
  reset: (to: string, url: string) =>
    sendQuietly({
      to,
      subject: "Reset your Identity Hub password",
      lines: [
        "Use this link to choose a new password. It works once and expires in 30 minutes.",
        "If you did not ask for this, ignore this email; your password stays the same.",
      ],
      link: { label: "Choose a new password", url },
    }),
  notice: (to: string, subject: string, line: string) =>
    sendQuietly({
      to,
      subject,
      lines: [
        line,
        "If this was not you, reset your password now and contact support@makketing.com.",
      ],
      link: { label: "Reset password", url: `${appOrigin()}/forgot-password` },
    }),
};
