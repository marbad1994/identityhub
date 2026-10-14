import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { disconnectAccount, fetchSession, fetchWorkspace, revokeApp } from "@/lib/api";
import { platformLabel } from "@/lib/platforms";
import { PlatformIcon } from "@/components/marks";
import { ErrorNote, Page } from "@/components/shell";
import { useSession } from "@/lib/session";
import { PlatformButtons } from "@/components/platform-buttons";
import type { WorkspaceView } from "@/server/workspace";
import { useAction } from "@/lib/use-action";

export const Route = createFileRoute("/workspace")({
  head: () => ({ meta: [{ title: "Workspace · Identity Hub" }] }),
  validateSearch: (search: Record<string, unknown>): { error?: string } => ({
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  beforeLoad: async () => {
    const session = await fetchSession();
    if (!session.user) throw redirect({ to: "/login", search: { return_to: "/workspace" } });
  },
  loader: () => fetchWorkspace(),
  component: Workspace,
});

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {description ? <p className="mt-1 text-muted">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Workspace() {
  const workspace = Route.useLoaderData();
  const { error: flowError } = Route.useSearch();
  const { error, run } = useAction();
  const { methods } = useSession();
  return (
    <Page>
      <div className="flex items-center gap-3">
        {workspace.user.avatarUrl ? (
          <img src={workspace.user.avatarUrl} alt="" className="size-12 rounded-full" />
        ) : null}
        <div>
          <p className="text-sm font-semibold text-muted">Signed in</p>
          <h1 className="text-3xl font-semibold tracking-tight">{workspace.user.displayName}</h1>
        </div>
      </div>
      <ErrorNote message={flowError ?? error} />

      <Section
        title="Connected accounts"
        description="Apps can only use the accounts you choose for them."
      >
        {workspace.accounts.length === 0 ? <p className="text-muted">No accounts yet.</p> : null}
        <ul className="grid gap-2">
          {workspace.accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <PlatformIcon id={account.provider} className="size-5 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{account.displayName}</p>
                  <p className="truncate text-sm text-muted">
                    {platformLabel(account.provider)} · {account.handle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium text-danger hover:bg-danger-soft"
                onClick={() => {
                  if (confirm(`Disconnect ${account.handle}? Apps lose access to it.`))
                    void run(() => disconnectAccount({ data: { accountId: account.id } }));
                }}
              >
                Disconnect
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <PlatformButtons
            platforms={methods}
            intent="connect"
            returnTo="/workspace"
            verb="Connect"
          />
        </div>
      </Section>

      <Section
        title="Apps with access"
        description="Remove an app to revoke every token it holds for you."
      >
        <AuthorizedApps
          workspace={workspace}
          onRevoke={(appId) => run(() => revokeApp({ data: { appId } }))}
        />
      </Section>

      <Section
        title="Your apps"
        description="Register a product, choose its sign-in methods and copy its sign-in widget."
      >
        <Link
          to="/apps"
          className="inline-flex min-h-11 items-center rounded-full bg-bg-alt px-4 text-sm font-semibold text-fg no-underline"
        >
          Manage apps and widgets
        </Link>
      </Section>

      <Section title="Activity">
        {workspace.activity.length === 0 ? <p className="text-muted">Nothing yet.</p> : null}
        <ul className="divide-y divide-line">
          {workspace.activity.map((event) => (
            <li key={event.id} className="flex flex-wrap justify-between gap-x-4 py-2 text-sm">
              <span>
                <span className="font-medium">{event.action}</span>{" "}
                <span className="text-muted">{event.detail}</span>
              </span>
              <time className="text-muted" dateTime={event.at}>
                {new Date(event.at).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  );
}

function AuthorizedApps({
  workspace,
  onRevoke,
}: {
  workspace: WorkspaceView;
  onRevoke: (appId: string) => void;
}) {
  if (workspace.authorizedApps.length === 0)
    return <p className="text-muted">No app has access yet.</p>;
  const accounts = new Map(workspace.accounts.map((account) => [account.id, account]));
  return (
    <ul className="grid gap-3">
      {workspace.authorizedApps.map((app) => (
        <li key={app.appId} className="rounded-2xl border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <a
              href={app.homepageUrl}
              className="font-semibold text-fg no-underline hover:underline"
              rel="noreferrer"
              target="_blank"
            >
              {app.name}
            </a>
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-danger hover:bg-danger-soft"
              onClick={() => {
                if (confirm(`Remove ${app.name}'s access to all your accounts?`))
                  onRevoke(app.appId);
              }}
            >
              Remove access
            </button>
          </div>
          <ul className="mt-2 grid gap-1 text-sm text-muted">
            {app.grants.map((grant) => {
              const account = accounts.get(grant.accountId);
              return (
                <li key={grant.accountId}>
                  {account
                    ? `${platformLabel(account.provider)} ${account.handle}`
                    : "Removed account"}{" "}
                  · {grant.scopes.join(", ")}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}
