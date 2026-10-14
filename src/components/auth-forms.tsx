import { useId, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { logIn, logInSecondFactor } from "@/lib/api";
import { ErrorNote } from "./shell";

export const inputClass = "mt-1 w-full min-h-11 rounded-xl border border-line bg-bg px-3 text-base";
export const primaryButton =
  "min-h-11 w-full rounded-full bg-ink px-4 text-sm font-semibold text-on-ink disabled:opacity-50";

/** Password input with a show/hide toggle. Paste and password managers always work. */
export function PasswordField({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return (
    <div className="text-sm font-medium">
      <label htmlFor={id}>{label}</label>
      <div className="relative mt-1">
        <input
          {...props}
          id={id}
          type={visible ? "text" : "password"}
          aria-describedby={hint ? `${id}-hint` : undefined}
          spellCheck={false}
          autoCapitalize="none"
          className={`${inputClass} mt-0 pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted hover:text-fg"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 font-normal text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const NEW_PASSWORD_HINT =
  "At least 15 characters. Any characters work, including spaces; a few unrelated words are easy to remember. Passwords found in data breaches are refused.";

/** Email + password sign-in, with the authenticator step when the account has two-factor on. */
export function PasswordLogin({ returnTo }: { returnTo: string }) {
  const [step, setStep] = useState<"password" | "code">("password");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (
    work: () => Promise<
      { ok: true; redirect?: string; mfaRequired?: true } | { ok: false; error: string }
    >,
  ) => {
    setBusy(true);
    setError(null);
    try {
      const result = await work();
      if (!result.ok) setError(result.error);
      else if (result.mfaRequired) setStep("code");
      else if (result.redirect) window.location.assign(result.redirect);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(() =>
      logIn({
        data: {
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
          returnTo,
        },
      }),
    );
  };

  const submitCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(() => logInSecondFactor({ data: { code: String(form.get("code") ?? "") } }));
  };

  if (step === "code") {
    return (
      <form onSubmit={submitCode} className="grid gap-3">
        <label className="block text-sm font-medium">
          Code from your authenticator app
          <input
            name="code"
            required
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={20}
            className={inputClass}
          />
          <span className="mt-1 block text-sm font-normal text-muted">
            Lost your phone? Enter one of your recovery codes instead.
          </span>
        </label>
        <button type="submit" disabled={busy} className={primaryButton}>
          Verify
        </button>
        <ErrorNote message={error} />
      </form>
    );
  }

  return (
    <form onSubmit={submitPassword} className="grid gap-3">
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
        autoComplete="current-password"
        maxLength={1024}
      />
      <button type="submit" disabled={busy} className={primaryButton}>
        Sign in
      </button>
      <ErrorNote message={error} />
      <p className="flex flex-wrap justify-between gap-2 text-sm">
        <Link to="/forgot-password" className="text-link no-underline hover:underline">
          Forgot password?
        </Link>
        <Link
          to="/signup"
          search={{ return_to: returnTo }}
          className="text-link no-underline hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-sm text-muted" role="separator">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
