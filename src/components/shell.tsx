import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useSession } from "@/lib/session";
import { LogOut } from "lucide-react";
import { Mark } from "./marks";

function SignOutButton() {
  return (
    <form method="post" action="/api/auth/logout">
      <button
        type="submit"
        className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted hover:text-fg"
      >
        <LogOut className="size-4" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Sign out</span>
      </button>
    </form>
  );
}

export function SiteHeader() {
  const { user } = useSession();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-5">
        <Link to="/" className="flex items-center gap-2.5 text-fg no-underline">
          <Mark className="size-7" />
          <span className="text-base font-bold tracking-tight">
            Identity<span className="font-semibold text-muted"> Hub</span>
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <Link
            to="/docs"
            className="hidden min-h-11 sm:inline-flex items-center rounded-full px-3 text-sm font-medium text-muted no-underline hover:text-fg"
          >
            Docs
          </Link>
          {user ? (
            <>
              <Link
                to="/apps"
                className="hidden min-h-11 items-center rounded-full px-3 text-sm font-medium text-muted no-underline hover:text-fg sm:inline-flex"
              >
                Apps
              </Link>
              <Link
                to="/settings"
                className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-muted no-underline hover:text-fg"
              >
                Settings
              </Link>
              <Link
                to="/workspace"
                className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-on-ink no-underline hover:opacity-85"
              >
                Workspace
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-on-ink no-underline hover:opacity-85"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-sm text-muted">Identity Hub, part of the Makketing suite.</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link to="/docs" className="text-muted no-underline hover:text-fg">
            Docs
          </Link>
          <Link to="/privacy" className="text-muted no-underline hover:text-fg">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-muted no-underline hover:text-fg">
            Terms of Service
          </Link>
          <Link to="/deletion" className="text-muted no-underline hover:text-fg">
            Data Deletion
          </Link>
          <a href="mailto:support@makketing.com" className="text-link no-underline hover:underline">
            support@makketing.com
          </a>
        </div>
      </div>
    </footer>
  );
}

export function Page({
  children,
  width = "max-w-5xl",
  embed = false,
}: {
  children: ReactNode;
  width?: string;
  embed?: boolean;
}) {
  if (embed) {
    return (
      <>
        <header className="border-b border-line">
          <div className="mx-auto flex min-h-16 max-w-none items-center gap-2.5 px-4 text-fg">
            <Mark className="size-7" />
            <span className="text-base font-bold tracking-tight">
              Identity<span className="font-semibold text-muted"> Hub</span>
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-none px-4 py-8">{children}</main>
      </>
    );
  }
  return (
    <>
      <SiteHeader />
      <main className={`mx-auto ${width} px-4 py-12 sm:px-5 sm:py-16`}>{children}</main>
      <SiteFooter />
    </>
  );
}

export function ErrorNote({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
      {message}
    </p>
  );
}

export function SuccessNote({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p role="status" className="mt-4 rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">
      {message}
    </p>
  );
}
