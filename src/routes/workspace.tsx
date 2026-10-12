import { useState, type FormEvent } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import {
  createApp,
  deleteApp,
  disconnectAccount,
  fetchSession,
  fetchWorkspace,
  revokeApp,
  rotateAppSecret,
  updateApp,
} from "@/lib/api";
import { platformLabel } from "@/lib/platforms";
import { PlatformIcon } from "@/components/marks";
import { ErrorNote, Page, useSession } from "@/components/shell";
import { PlatformButtons } from "@/components/platform-buttons";
import type { DeveloperAppView, WorkspaceView } from "@/server/workspace";

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

type Outcome = { ok: true } | { ok: false; error: string };

/** Run a mutation, refresh the page data, and surface any error. */
function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const run = async <T extends Outcome>(work: () => Promise<T>): Promise<T | null> => {
    setError(null);
    try {
      const result = await work();
      if (!result.ok) setError(result.error);
      await router.invalidate();
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      return null;
    }
  };
  return { error, run };
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
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
  const { platforms } = useSession();
  return (
    <Page>
      <div className="flex items-center gap-3">
          {workspace.user.avatarUrl ? <img src={workspace.user.avatarUrl} alt="" className="size-12 rounded-full" /> : null}
          <div>
            <p className="text-sm font-semibold text-muted">Signed in</p>
            <h1 className="text-3xl font-semibold tracking-tight">{workspace.user.displayName}</h1>
          </div>
      </div>
      <ErrorNote message={flowError ?? error} />

      <Section title="Connected accounts" description="Apps can only use the accounts you choose for them.">
        {workspace.accounts.length === 0 ? <p className="text-muted">No accounts yet.</p> : null}
        <ul className="grid gap-2">
          {workspace.accounts.map((account) => (
            <li key={account.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
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
                  if (confirm(`Disconnect ${account.handle}? Apps lose access to it.`)) void run(() => disconnectAccount({ data: { accountId: account.id } }));
                }}
              >
                Disconnect
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <PlatformButtons platforms={platforms} intent="connect" returnTo="/workspace" verb="Connect" />
        </div>
      </Section>

      <Section title="Apps with access" description="Remove an app to revoke every token it holds for you.">
        <AuthorizedApps workspace={workspace} onRevoke={(appId) => run(() => revokeApp({ data: { appId } }))} />
      </Section>

      <Section title="Your apps" description="Register a product to let people sign in with Identity Hub and grant it accounts.">
        <DeveloperApps apps={workspace.developerApps} />
      </Section>

      <Section title="Activity">
        {workspace.activity.length === 0 ? <p className="text-muted">Nothing yet.</p> : null}
        <ul className="divide-y divide-line">
          {workspace.activity.map((event) => (
            <li key={event.id} className="flex flex-wrap justify-between gap-x-4 py-2 text-sm">
              <span>
                <span className="font-medium">{event.action}</span> <span className="text-muted">{event.detail}</span>
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

function AuthorizedApps({ workspace, onRevoke }: { workspace: WorkspaceView; onRevoke: (appId: string) => void }) {
  if (workspace.authorizedApps.length === 0) return <p className="text-muted">No app has access yet.</p>;
  const accounts = new Map(workspace.accounts.map((account) => [account.id, account]));
  return (
    <ul className="grid gap-3">
      {workspace.authorizedApps.map((app) => (
        <li key={app.appId} className="rounded-2xl border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <a href={app.homepageUrl} className="font-semibold text-fg no-underline hover:underline" rel="noreferrer" target="_blank">
              {app.name}
            </a>
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-danger hover:bg-danger-soft"
              onClick={() => {
                if (confirm(`Remove ${app.name}'s access to all your accounts?`)) onRevoke(app.appId);
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
                  {account ? `${platformLabel(account.provider)} ${account.handle}` : "Removed account"} · {grant.scopes.join(", ")}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function SecretNotice({ clientId, secret, onDone }: { clientId: string; secret: string; onDone: () => void }) {
  return (
    <div className="rounded-2xl border border-ok bg-ok-soft p-4 text-sm">
      <p className="font-semibold">Copy the client secret now. It is not shown again.</p>
      <dl className="mt-3 grid gap-2">
        <div>
          <dt className="text-muted">client_id</dt>
          <dd className="break-all">{clientId}</dd>
        </div>
        <div>
          <dt className="text-muted">client_secret</dt>
          <dd className="flex items-center gap-2 break-all">
            {secret}
            <button type="button" aria-label="Copy secret" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-bg" onClick={() => navigator.clipboard.writeText(secret)}>
              <Copy className="size-4" aria-hidden="true" />
            </button>
          </dd>
        </div>
      </dl>
      <button type="button" className="mt-3 min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink" onClick={onDone}>
        I saved it
      </button>
    </div>
  );
}

function AppForm({ app, onSaved }: { app?: DeveloperAppView; onSaved: (result: { clientId: string; clientSecret: string } | null) => void }) {
  const { error, run } = useAction();
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields = {
      name: String(form.get("name") ?? ""),
      homepageUrl: String(form.get("homepageUrl") ?? ""),
      redirectUris: String(form.get("redirectUris") ?? "").split(/\s+/).filter(Boolean),
    };
    if (app) {
      const result = await run(() => updateApp({ data: { ...fields, appId: app.id } }));
      if (result?.ok) onSaved(null);
    } else {
      const result = await run(() => createApp({ data: fields }));
      if (result?.ok) onSaved({ clientId: result.clientId, clientSecret: result.clientSecret });
    }
  };
  const input = "mt-1 w-full min-h-11 rounded-xl border border-line bg-bg px-3";
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-line p-4">
      <label className="text-sm font-medium">
        Name
        <input name="name" required defaultValue={app?.name} className={input} placeholder="SocialPostAPI" />
      </label>
      <label className="text-sm font-medium">
        Homepage URL
        <input name="homepageUrl" type="url" required defaultValue={app?.homepageUrl} className={input} placeholder="https://socialpostapi.makketing.com" />
      </label>
      <label className="text-sm font-medium">
        Redirect URIs, one per line
        <textarea
          name="redirectUris"
          required
          rows={3}
          defaultValue={app?.redirectUris.join("\n")}
          className={`${input} py-2`}
          placeholder="https://socialpostapi.makketing.com/auth/identityhub/callback"
        />
      </label>
      <button type="submit" className="min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink">
        {app ? "Save" : "Register app"}
      </button>
      <ErrorNote message={error} />
    </form>
  );
}

function DeveloperApps({ apps }: { apps: DeveloperAppView[] }) {
  const { error, run } = useAction();
  const [secret, setSecret] = useState<{ clientId: string; clientSecret: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <div className="grid gap-3">
      {secret ? <SecretNotice clientId={secret.clientId} secret={secret.clientSecret} onDone={() => setSecret(null)} /> : null}
      <ErrorNote message={error} />
      {apps.map((app) =>
        editing === app.id ? (
          <AppForm key={app.id} app={app} onSaved={() => setEditing(null)} />
        ) : (
          <div key={app.id} className="rounded-2xl border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{app.name}</p>
              <div className="flex flex-wrap gap-1">
                <button type="button" className="min-h-11 rounded-full px-3 text-sm font-medium hover:bg-bg-alt" onClick={() => setEditing(app.id)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium hover:bg-bg-alt"
                  onClick={async () => {
                    if (!confirm(`Rotate ${app.name}'s client secret? The old one stops working immediately.`)) return;
                    const result = await run(() => rotateAppSecret({ data: { appId: app.id } }));
                    if (result?.ok) setSecret({ clientId: app.clientId, clientSecret: result.clientSecret });
                  }}
                >
                  <KeyRound className="size-4" aria-hidden="true" />
                  New secret
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-danger hover:bg-danger-soft"
                  onClick={() => {
                    if (confirm(`Delete ${app.name}? Everyone's grants and tokens for it are removed.`)) void run(() => deleteApp({ data: { appId: app.id } }));
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </div>
            <dl className="mt-2 grid gap-1 text-sm">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted">client_id</dt>
                <dd className="break-all">{app.clientId}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted">Redirect URIs</dt>
                <dd className="break-all">{app.redirectUris.join(", ")}</dd>
              </div>
            </dl>
          </div>
        ),
      )}
      {creating ? (
        <AppForm
          onSaved={(created) => {
            setCreating(false);
            if (created) setSecret(created);
          }}
        />
      ) : (
        <button type="button" className="min-h-11 justify-self-start rounded-full bg-bg-alt px-4 text-sm font-semibold" onClick={() => setCreating(true)}>
          Register an app
        </button>
      )}
    </div>
  );
}
