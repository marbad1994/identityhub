import type { FormEvent } from "react";
import { Copy } from "lucide-react";
import { createApp, updateApp } from "@/lib/api";
import { useAction } from "@/lib/use-action";
import type { DeveloperAppView } from "@/server/workspace";
import { ErrorNote } from "./shell";

export function SecretNotice({
  clientId,
  secret,
  onDone,
}: {
  clientId: string;
  secret: string;
  onDone: () => void;
}) {
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
            <button
              type="button"
              aria-label="Copy secret"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-bg"
              onClick={() => navigator.clipboard.writeText(secret)}
            >
              <Copy className="size-4" aria-hidden="true" />
            </button>
          </dd>
        </div>
      </dl>
      <button
        type="button"
        className="mt-3 min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink"
        onClick={onDone}
      >
        I saved it
      </button>
    </div>
  );
}

export function AppForm({
  app,
  onSaved,
}: {
  app?: DeveloperAppView;
  onSaved: (result: { appId: string; clientId: string; clientSecret: string } | null) => void;
}) {
  const { error, run } = useAction();
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields = {
      name: String(form.get("name") ?? ""),
      homepageUrl: String(form.get("homepageUrl") ?? ""),
      redirectUris: String(form.get("redirectUris") ?? "")
        .split(/\s+/)
        .filter(Boolean),
    };
    if (app) {
      const result = await run(() => updateApp({ data: { ...fields, appId: app.id } }));
      if (result?.ok) onSaved(null);
    } else {
      const result = await run(() => createApp({ data: fields }));
      if (result?.ok)
        onSaved({
          appId: result.appId,
          clientId: result.clientId,
          clientSecret: result.clientSecret,
        });
    }
  };
  const input = "mt-1 w-full min-h-11 rounded-xl border border-line bg-bg px-3";
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-line p-4">
      <label className="text-sm font-medium">
        Name
        <input
          name="name"
          required
          defaultValue={app?.name}
          className={input}
          placeholder="SocialPostAPI"
        />
      </label>
      <label className="text-sm font-medium">
        Homepage URL
        <input
          name="homepageUrl"
          type="url"
          required
          defaultValue={app?.homepageUrl}
          className={input}
          placeholder="https://socialpostapi.makketing.com"
        />
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
      <button
        type="submit"
        className="min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink"
      >
        {app ? "Save" : "Register app"}
      </button>
      <ErrorNote message={error} />
    </form>
  );
}
