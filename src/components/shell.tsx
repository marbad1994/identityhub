import { Link, useRouterState } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { UserButton } from "@/lib/auth/gates";
import { Mark } from "./marks";

const links = [
  { to: "/docs", label: "Docs" },
  { to: "/pricing", label: "Pricing" },
  { to: "/workspace", label: "Workspace" },
] as const;

export function SiteHeader() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, isPending } = useCurrentUserState();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-5">
        <Link to="/" className="flex items-center gap-2.5 text-fg no-underline">
          <Mark className="size-7" />
          <span className="text-base font-bold tracking-tight">
            Identity<span className="font-semibold text-muted"> Hub</span>
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="hidden min-h-11 items-center rounded-full px-3 text-sm font-medium text-muted no-underline hover:text-fg md:inline-flex"
              aria-current={path === link.to ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
          {isPending ? <span className="hidden h-8 w-24 animate-pulse rounded-full bg-bg-alt md:inline-block" /> : null}
          {!isPending && user ? (
            <span className="hidden md:inline-flex">
              <UserButton />
            </span>
          ) : null}
          {!isPending && !user ? (
            <Link to="/login" className="hidden min-h-11 items-center rounded-full px-3 text-sm font-medium text-muted no-underline hover:text-fg md:inline-flex">
              Sign in
            </Link>
          ) : null}
          <Link
            to={path === "/workspace" ? "/pricing" : "/workspace"}
            className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-on-ink no-underline hover:opacity-85"
          >
            {path === "/workspace" ? "Pricing" : "Open workspace"}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Mark className="size-7" />
          <div>
            <p className="text-base font-bold tracking-tight">
              Identity<span className="font-semibold text-muted"> Hub</span>
            </p>
            <p className="text-sm text-muted">One identity for the Makketing suite.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link to="/pricing" className="text-muted no-underline hover:text-fg">Pricing</Link>
          <Link to="/docs" className="text-muted no-underline hover:text-fg">Docs</Link>
          <Link to="/workspace" className="text-muted no-underline hover:text-fg">Workspace</Link>
          <Link to="/demo" className="text-muted no-underline hover:text-fg">Widget demo</Link>
          <Link to="/privacy" className="text-muted no-underline hover:text-fg">Privacy Policy</Link>
          <Link to="/terms" className="text-muted no-underline hover:text-fg">Terms of Service</Link>
          <Link to="/deletion" className="text-muted no-underline hover:text-fg">Data Deletion</Link>
          <a href="mailto:support@socialpostapi.makketing.com" className="text-link no-underline hover:underline">
            support@socialpostapi.makketing.com
          </a>
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-5 pb-8 text-sm text-muted">
        Sandbox profiles are not live logins. A platform stays off until its keys are configured.
      </p>
    </footer>
  );
}
