import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { fetchRecentMembers } from "@/lib/api";
import { appHead } from "@/lib/app-title";

export const Route = createFileRoute("/apps/$appId/")({
  head: appHead("Overview"),
  loader: ({ params }) => fetchRecentMembers({ data: { appId: params.appId } }),
  component: Overview,
});

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function Overview() {
  const { app, summary } = useLoaderData({ from: "/apps/$appId" });
  const recent = Route.useLoaderData();
  const lastUsed = summary?.lastUsedAt
    ? new Date(summary.lastUsedAt).toLocaleString()
    : "No token has been used yet.";
  return (
    <div className="mt-8">
      <p className="text-sm text-muted">
        <a href={app.homepageUrl} className="text-link no-underline hover:underline">
          {hostOf(app.homepageUrl)}
        </a>
        <span className="mx-2">·</span>
        Created {new Date(app.createdAt).toLocaleString()}
      </p>
      <dl className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          ["Members", String(summary?.memberCount ?? 0)],
          ["Sign-in methods", String(app.methods.length)],
          ["Redirect URIs", String(app.redirectUris.length)],
          ["Last token use", lastUsed],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line p-4">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <h2 className="mt-10 text-sm font-semibold">Sign-in methods</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {app.methods.map((method) => (
          <li key={method.id}>
            <Link
              to="/apps/$appId/widget"
              params={{ appId: app.id }}
              className="inline-flex min-h-11 items-center rounded-full border border-line px-3 text-sm font-medium text-fg no-underline hover:bg-bg-alt"
            >
              {method.id === "password" ? "Email and password" : method.label}
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="mt-10 text-2xl font-semibold tracking-tight">Recent members</h2>
      {recent.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-line p-4 text-sm text-muted">
          <p>No one has signed in yet.</p>
          <Link
            to="/apps/$appId/widget"
            params={{ appId: app.id }}
            className="mt-2 inline-flex min-h-11 items-center text-link no-underline hover:underline"
          >
            Set up the widget
          </Link>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3">
          {recent.map((member) => (
            <li key={member.userId} className="rounded-2xl border border-line p-4">
              <p className="font-medium">{member.displayName}</p>
              <p className="text-sm text-muted">{member.email ?? "No email on this account"}</p>
              {member.accounts.length > 0 ? (
                <p className="mt-1 text-sm">{member.accounts.join(", ")}</p>
              ) : null}
              <p className="mt-1 text-sm text-muted">
                {member.lastUsedAt
                  ? `Last used ${new Date(member.lastUsedAt).toLocaleString()}`
                  : "Has not used a token yet"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
