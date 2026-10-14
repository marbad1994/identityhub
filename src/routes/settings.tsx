import { useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { Copy, ShieldCheck } from "lucide-react";
import {
  addEmailAndPassword,
  beginTwoFactor,
  changePassword,
  disableTwoFactor,
  enableTwoFactor,
  fetchSecurity,
  fetchSession,
  regenerateRecoveryCodes,
  signOutOtherSessions,
} from "@/lib/api";
import { ErrorNote, Page, SuccessNote } from "@/components/shell";
import { NEW_PASSWORD_HINT, PasswordField, inputClass } from "@/components/auth-forms";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · Identity Hub" }] }),
  validateSearch: (search: Record<string, unknown>): { notice?: string; error?: string } => ({
    notice: typeof search.notice === "string" ? search.notice : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  beforeLoad: async () => {
    const session = await fetchSession();
    if (!session.user) throw redirect({ to: "/login", search: { return_to: "/settings" } });
  },
  loader: () => fetchSecurity(),
  component: Settings,
});

type Outcome = { ok: true } | { ok: false; error: string };

const button =
  "min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink disabled:opacity-50";
const quietButton =
  "min-h-11 rounded-full bg-bg-alt px-4 text-sm font-semibold disabled:opacity-50";

function useForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async <T extends Outcome>(
    work: () => Promise<T>,
    success?: string,
  ): Promise<T | null> => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const result = await work();
      if (!result.ok) setError(result.error);
      else if (success) setDone(success);
      await router.invalidate();
      return result;
    } catch {
      setError("Something went wrong. Try again.");
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { error, done, busy, submit, setDone };
}

const field = (form: FormData, name: string) => String(form.get(name) ?? "");

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 rounded-2xl border border-line p-5 sm:p-6">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Settings() {
  const security = Route.useLoaderData();
  const { notice, error } = Route.useSearch();
  return (
    <Page width="max-w-2xl">
      <h1 className="text-4xl font-semibold tracking-tight">Settings</h1>
      <SuccessNote message={notice} />
      <ErrorNote message={error} />
      <EmailAndPassword security={security} />
      <TwoFactor security={security} />
      <Sessions count={security.sessions} />
      <Card title="Delete account">
        <p className="text-muted">
          Removes your account, connected accounts, app access and apps you registered.
        </p>
        <Link
          to="/deletion"
          className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-danger no-underline"
        >
          Delete my account
        </Link>
      </Card>
    </Page>
  );
}

type Security = ReturnType<typeof Route.useLoaderData>;

function EmailAndPassword({ security }: { security: Security }) {
  const { error, done, busy, submit } = useForm();
  if (!security.email) {
    if (!security.passwordSignInAvailable) {
      return (
        <Card title="Email and password">
          <p className="text-muted">Email sign-in is not available on this hub yet.</p>
        </Card>
      );
    }
    return (
      <Card title="Email and password">
        <p className="text-muted">
          Add an email and password so you can also sign in without a social platform.
        </p>
        {done ? (
          <SuccessNote message={done} />
        ) : (
          <form
            className="mt-4 grid gap-4"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void submit(async () => {
                const result = await addEmailAndPassword({
                  data: { email: field(form, "email"), password: field(form, "password") },
                });
                return result;
              }, "Check your email and click the link to turn on password sign-in.");
            }}
          >
            <label className="block text-sm font-medium">
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                maxLength={320}
                className={inputClass}
              />
            </label>
            <PasswordField
              label="Password"
              name="password"
              required
              minLength={15}
              maxLength={256}
              autoComplete="new-password"
              hint={NEW_PASSWORD_HINT}
            />
            <button type="submit" disabled={busy} className={button}>
              Send confirmation link
            </button>
            <ErrorNote message={error} />
          </form>
        )}
      </Card>
    );
  }
  return (
    <Card title="Email and password">
      <p className="text-muted">
        Signed in as <span className="font-medium text-fg">{security.email}</span>
      </p>
      <form
        className="mt-4 grid gap-4"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const target = event.currentTarget;
          const form = new FormData(target);
          if (field(form, "next") !== field(form, "confirm"))
            return void submit(async () => ({
              ok: false as const,
              error: "The new passwords do not match.",
            }));
          void submit(
            () =>
              changePassword({
                data: { current: field(form, "current"), next: field(form, "next") },
              }),
            "Password changed. Other devices were signed out.",
          ).then((result) => {
            if (result?.ok) target.reset();
          });
        }}
      >
        <PasswordField
          label="Current password"
          name="current"
          required
          maxLength={1024}
          autoComplete="current-password"
        />
        <PasswordField
          label="New password"
          name="next"
          required
          minLength={15}
          maxLength={256}
          autoComplete="new-password"
          hint={NEW_PASSWORD_HINT}
        />
        <PasswordField
          label="Repeat new password"
          name="confirm"
          required
          maxLength={256}
          autoComplete="new-password"
        />
        <button type="submit" disabled={busy} className={button}>
          Change password
        </button>
        <ErrorNote message={error} />
        <SuccessNote message={done} />
      </form>
    </Card>
  );
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  return (
    <div className="mt-4 rounded-2xl border border-ok bg-ok-soft p-4">
      <p className="font-semibold">Save these recovery codes now. They are not shown again.</p>
      <p className="mt-1 text-sm text-muted">
        Each works once if you lose your phone. Keep them in your password manager.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-1 text-sm tracking-wide">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={quietButton}
          onClick={() => navigator.clipboard.writeText(codes.join("\n"))}
        >
          <span className="inline-flex items-center gap-2">
            <Copy className="size-4" aria-hidden="true" />
            Copy codes
          </span>
        </button>
        <button type="button" className={button} onClick={onDone}>
          I saved them
        </button>
      </div>
    </div>
  );
}

function TwoFactor({ security }: { security: Security }) {
  const { error, busy, submit } = useForm();
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [confirming, setConfirming] = useState<"disable" | "codes" | null>(null);

  if (!security.hasPassword) {
    return (
      <Card title="Two-factor sign-in">
        <p className="text-muted">
          Two-factor protects password sign-in. Add an email and password first. Platform sign-ins
          use each platform's own two-factor.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Two-factor sign-in">
      {codes ? <RecoveryCodes codes={codes} onDone={() => setCodes(null)} /> : null}
      {security.mfaEnabled ? (
        <>
          <p className="inline-flex items-center gap-2 font-medium text-ok">
            <ShieldCheck className="size-5" aria-hidden="true" />
            On, with an authenticator app
          </p>
          <p className="mt-1 text-sm text-muted">
            {security.recoveryCodesLeft} unused recovery codes left.
          </p>
          {confirming ? (
            <form
              className="mt-4 grid gap-3"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                const password = field(new FormData(event.currentTarget), "password");
                if (confirming === "disable") {
                  void submit(() => disableTwoFactor({ data: { password } })).then(
                    (result) => result?.ok && setConfirming(null),
                  );
                } else {
                  void submit(() => regenerateRecoveryCodes({ data: { password } })).then(
                    (result) => {
                      if (result?.ok) {
                        setCodes(result.recoveryCodes);
                        setConfirming(null);
                      }
                    },
                  );
                }
              }}
            >
              <PasswordField
                label="Confirm with your password"
                name="password"
                required
                maxLength={1024}
                autoComplete="current-password"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className={confirming === "disable" ? `${button} bg-danger` : button}
                >
                  {confirming === "disable" ? "Turn off two-factor" : "Replace recovery codes"}
                </button>
                <button type="button" className={quietButton} onClick={() => setConfirming(null)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className={quietButton} onClick={() => setConfirming("codes")}>
                New recovery codes
              </button>
              <button
                type="button"
                className={`${quietButton} text-danger`}
                onClick={() => setConfirming("disable")}
              >
                Turn off
              </button>
            </div>
          )}
        </>
      ) : setup ? (
        <form
          className="grid gap-4"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const code = field(new FormData(event.currentTarget), "code");
            void submit(() => enableTwoFactor({ data: { code } })).then((result) => {
              if (result?.ok) {
                setCodes(result.recoveryCodes);
                setSetup(null);
              }
            });
          }}
        >
          <p className="text-muted">
            Scan this with an authenticator app (1Password, Google Authenticator, Authy and others),
            then enter the 6-digit code it shows.
          </p>
          <img
            src={`data:image/svg+xml;utf8,${encodeURIComponent(setup.qr)}`}
            alt="QR code for your authenticator app"
            className="size-48 rounded-xl border border-line bg-white p-2"
          />
          <p className="text-sm text-muted">
            Can't scan? Enter this key:{" "}
            <span className="break-all font-medium text-fg tracking-wide">{setup.secret}</span>
          </p>
          <label className="block text-sm font-medium">
            6-digit code
            <input
              name="code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              className={inputClass}
            />
          </label>
          <button type="submit" disabled={busy} className={button}>
            Turn on two-factor
          </button>
        </form>
      ) : (
        <>
          <p className="text-muted">
            Ask for a code from your phone each time you sign in with your password.
          </p>
          <button
            type="button"
            disabled={busy}
            className={`${button} mt-4`}
            onClick={() =>
              void submit(() => beginTwoFactor()).then((result) => {
                if (result?.ok) setSetup({ secret: result.secret, qr: result.qr });
              })
            }
          >
            Set up authenticator app
          </button>
        </>
      )}
      <ErrorNote message={error} />
    </Card>
  );
}

function Sessions({ count }: { count: number }) {
  const { error, done, busy, submit } = useForm();
  return (
    <Card title="Signed-in devices">
      <p className="text-muted">
        Signed in on {count} device{count === 1 ? "" : "s"}, including this one.
      </p>
      <button
        type="button"
        disabled={busy || count <= 1}
        className={`${quietButton} mt-4`}
        onClick={() =>
          void submit(() => signOutOtherSessions(), "Every other device was signed out.")
        }
      >
        Sign out everywhere else
      </button>
      <ErrorNote message={error} />
      <SuccessNote message={done} />
    </Card>
  );
}
