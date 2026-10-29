import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Fingerprint, LockKeyhole, ShieldCheck } from "lucide-react";
import type { WidgetAppearance } from "@/lib/widget-appearance";
import { widgetAppearance } from "@/lib/widget-appearance";
import { Mark } from "./marks";

/** The same welcome card on credential pages, in widget frames, and during consent. */
export function AuthSurface({
  children,
  title,
  description,
  appName = "IdentityHub",
  appearance,
  embed = false,
}: {
  children: ReactNode;
  title: string;
  description?: string;
  appName?: string;
  appearance?: WidgetAppearance;
  embed?: boolean;
}) {
  const design = widgetAppearance(appearance?.theme, appearance?.accent);
  return (
    <div
      className={`ih-auth ${embed ? "ih-embedded" : ""}`}
      data-theme={design.theme}
      data-accent={design.accent}
    >
      {!embed ? (
        <header className="ih-brand-bar">
          <Link to="/" className="ih-brand">
            <Mark className="size-8" />
            <span>
              Identity<span>Hub</span>
            </span>
          </Link>
          <span className="ih-brand-note">Your identity, on your terms.</span>
        </header>
      ) : null}
      <main className="ih-auth-stage">
        <section className="ih-card" aria-labelledby="auth-heading">
          <div className="ih-card-top">
            <LockKeyhole aria-hidden="true" />
            <span>Sign in with IdentityHub</span>
          </div>
          <div className="ih-card-body">
            <div className="ih-monogram" aria-hidden="true">
              {appName === "IdentityHub" ? (
                <Fingerprint />
              ) : (
                `${Array.from(appName.trim())[0]?.toLowerCase() || "a"}.`
              )}
            </div>
            <h1 id="auth-heading" className="ih-heading">
              {title}
            </h1>
            {description ? <p className="ih-description">{description}</p> : null}
            <div className="ih-card-content">{children}</div>
          </div>
          <footer className="ih-card-footer">
            <Fingerprint aria-hidden="true" />
            <span>
              Powered by <strong>IdentityHub</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>You choose what you share</span>
          </footer>
        </section>
        {!embed ? (
          <nav className="ih-legal" aria-label="Sign-in information">
            <Link to="/privacy">Privacy</Link>
            <span aria-hidden="true">·</span>
            <Link to="/terms">Terms</Link>
            <span aria-hidden="true">·</span>
            <a href="mailto:support@makketing.com">Need help?</a>
          </nav>
        ) : null}
      </main>
    </div>
  );
}

export function AuthPrivacyNote() {
  return (
    <div className="ih-privacy">
      <ShieldCheck aria-hidden="true" />
      <p>
        <strong>Your identity. Your choice.</strong>
        <span>Review what you share before an app gets access.</span>
      </p>
    </div>
  );
}
