import { createFileRoute, Link } from "@tanstack/react-router";
import { PLATFORMS } from "@/lib/platforms";
import { PlatformIcon } from "@/components/marks";
import { Page } from "@/components/shell";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Identity Hub · One login for the Makketing suite" }] }),
  component: Home,
});

const steps = [
  [
    "Sign in",
    "Log in with X, Instagram, Facebook, TikTok, LinkedIn, YouTube, Reddit or Snapchat. No new password.",
  ],
  ["Connect", "Add the other accounts you publish to. Tokens are encrypted and stay on the hub."],
  [
    "Choose",
    "When an app such as SocialPostAPI asks, pick exactly which accounts it may use. Revoke any time.",
  ],
];

function Home() {
  const { user } = useSession();
  return (
    <Page>
      <section>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl sm:leading-none">
          One login.
          <span className="block text-muted">Your platforms, your choice.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Identity Hub signs you in to every Makketing product with the social accounts you already
          have, and lets you decide which of them each product is allowed to use.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={user ? "/workspace" : "/login"}
            className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-on-ink no-underline hover:opacity-85"
          >
            {user ? "Open workspace" : "Sign in"}
          </Link>
          <Link
            to="/docs"
            className="inline-flex min-h-11 items-center rounded-full bg-bg-alt px-5 text-sm font-semibold text-fg no-underline"
          >
            Integrate an app
          </Link>
        </div>
        <ul className="mt-12 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium">
          {PLATFORMS.map((platform) => (
            <li key={platform.id} className="inline-flex items-center gap-2">
              <PlatformIcon id={platform.id} className="size-5" />
              {platform.label}
            </li>
          ))}
        </ul>
      </section>
      <ol className="mt-16 grid gap-4 md:grid-cols-3">
        {steps.map(([title, body], index) => (
          <li key={title} className="rounded-card border border-line bg-bg p-6 shadow-card">
            <p className="text-sm font-semibold text-muted">0{index + 1}</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 text-muted">{body}</p>
          </li>
        ))}
      </ol>
    </Page>
  );
}
