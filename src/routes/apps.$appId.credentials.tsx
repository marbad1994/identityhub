import { useState } from "react";
import { createFileRoute, useLoaderData, useNavigate } from "@tanstack/react-router";
import { KeyRound, Trash2 } from "lucide-react";
import { deleteApp, rotateAppSecret } from "@/lib/api";
import { useAction } from "@/lib/use-action";
import { ErrorNote } from "@/components/shell";
import { AppForm, SecretNotice } from "@/components/app-form";
import { appHead } from "@/lib/app-title";

export const Route = createFileRoute("/apps/$appId/credentials")({
  head: appHead("Credentials"),
  component: Credentials,
});

function Credentials() {
  const { app } = useLoaderData({ from: "/apps/$appId" });
  const navigate = useNavigate();
  const { error, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  return (
    <section className="mt-8">
      <h2 className="text-2xl font-semibold tracking-tight">Credentials and redirects</h2>
      <ErrorNote message={error} />
      <div className="mt-4 grid gap-3">
        {secret ? (
          <SecretNotice clientId={app.clientId} secret={secret} onDone={() => setSecret(null)} />
        ) : null}
        {editing ? (
          <AppForm app={app} onSaved={() => setEditing(false)} />
        ) : (
          <div className="rounded-2xl border border-line p-4">
            <dl className="grid gap-2 text-sm">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted">client_id</dt>
                <dd className="break-all">{app.clientId}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted">Homepage</dt>
                <dd className="break-all">{app.homepageUrl}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted">Redirect URIs</dt>
                <dd className="break-all">{app.redirectUris.join(", ")}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-1">
              <button
                type="button"
                className="min-h-11 rounded-full px-3 text-sm font-medium hover:bg-bg-alt"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium hover:bg-bg-alt"
                onClick={async () => {
                  if (
                    !confirm(
                      `Rotate ${app.name}'s client secret? The old one stops working immediately.`,
                    )
                  )
                    return;
                  const result = await run(() => rotateAppSecret({ data: { appId: app.id } }));
                  if (result?.ok) setSecret(result.clientSecret);
                }}
              >
                <KeyRound className="size-4" aria-hidden="true" />
                New secret
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-danger hover:bg-danger-soft"
                onClick={async () => {
                  if (
                    !confirm(`Delete ${app.name}? Everyone's grants and tokens for it are removed.`)
                  )
                    return;
                  const result = await run(() => deleteApp({ data: { appId: app.id } }));
                  if (result?.ok) await navigate({ to: "/apps" });
                }}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Delete app
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
