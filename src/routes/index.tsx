import { createFileRoute, Link } from "@tanstack/react-router";
import { PLANNED, PROVIDERS } from "@/lib/hub";
import { PlatformIcon } from "@/components/marks";
import { SiteFooter, SiteHeader } from "@/components/shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Identity Hub · One identity. Every connection." }],
  }),
  component: Home,
});

const snippet = `IdentityHub.mount("#identity-hub", {
  appName: "SocialPostAPI",
  clientId: "ihub_pk_...",
  redirectUri: "https://socialpostapi.makketing.com",
  mode: "live"
});`;

function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-6xl px-5 pb-8 pt-16 sm:pt-24">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-line bg-bg-alt px-3 text-sm font-medium text-muted">
              <span className="size-1.5 rounded-full bg-ok" aria-hidden="true" />
              Private beta. Sandbox works before platform keys are added.
            </span>
          </div>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-fg sm:text-7xl sm:leading-none">
            One identity.
            <span className="block text-muted">Every connection.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Connect your customers' social accounts once. Then grant each product only the access it needs —
            without handing platform tokens to the browser.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/workspace"
              className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-on-ink no-underline hover:opacity-85"
            >
              Open workspace
            </Link>
            <Link
              to="/demo"
              className="inline-flex min-h-11 items-center rounded-full bg-bg-alt px-5 text-sm font-semibold text-fg no-underline"
            >
              Try the widget
            </Link>
          </div>
          <ul id="platforms" className="mt-12 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-fg">
            {PROVIDERS.map((provider) => (
              <li key={provider.id} className="inline-flex items-center gap-2">
                <PlatformIcon id={provider.id} className="size-5" />
                {provider.name}
              </li>
            ))}
            <li className="inline-flex items-center gap-2 text-muted">{PLANNED[0].name} · soon</li>
          </ul>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-5 py-12 md:grid-cols-3">
          {[
            {
              title: "One tenant per workspace",
              body: "Each signed-in owner gets a separate workspace, client ids, and an activity log. Dark Suite stays unregistered.",
            },
            {
              title: "Tokens stay on the hub",
              body: "Live access and refresh tokens are encrypted before they are stored. Products receive a short-lived hub token, never the platform secret.",
            },
            {
              title: "Grants you can revoke",
              body: "SocialPostAPI and Makketing are registered to start. Disconnecting an account removes its grants and asks the platform to revoke the token.",
            },
          ].map((card) => (
            <article key={card.title} className="rounded-card border border-line bg-bg p-6 shadow-card">
              <h2 className="text-xl font-semibold tracking-tight">{card.title}</h2>
              <p className="mt-2 text-muted">{card.body}</p>
            </article>
          ))}
        </section>

        <section id="how" className="bg-bg-alt">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Connect. Grant. Exchange.</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ["01", "Connect", "Save a sandbox profile today, or start a real OAuth login once that platform’s keys are set."],
                ["02", "Grant", "The person approves one app, one account, and a subset of the scopes that account allowed."],
                ["03", "Exchange", "Your server trades a one-time code for a hub token. The platform token never leaves the hub."],
              ].map(([step, title, body]) => (
                <li key={step} className="rounded-card bg-bg p-6 shadow-card">
                  <p className="text-sm font-semibold text-muted">{step}</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="widget" className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">A widget any app can host.</h2>
            <p className="mt-3 text-muted">
              One script and a shadow root. Sandbox mode returns a selection with no token. Live mode sends the
              person to the consent screen on this hub.
            </p>
            <Link
              to="/demo"
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-on-ink no-underline"
            >
              Open the live widget
            </Link>
          </div>
          <pre className="overflow-x-auto rounded-card bg-ink p-5 text-sm leading-relaxed text-on-ink shadow-card">
            {snippet}
          </pre>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="rounded-card bg-ink px-6 py-8 text-on-ink sm:px-10">
            <h2 className="text-2xl font-semibold tracking-tight">Live logins wait on your keys.</h2>
            <p className="mt-3 max-w-3xl text-on-ink-muted">
              Sandbox profiles, grants, and the widget work before any secret is set. Real platform logins turn
              on when each app’s client id and secret are configured, tokens are encrypted, and a Stripe price is
              attached to the plan. Snapchat stays planned, and identity-only.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
