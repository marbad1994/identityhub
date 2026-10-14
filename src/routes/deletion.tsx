import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { deleteMyData, fetchSecurity, fetchSession } from "@/lib/api";
import { PasswordField } from "@/components/auth-forms";
import { ErrorNote, Page } from "@/components/shell";
import { useSession } from "@/lib/session";

// Linked from each platform's app settings as the data deletion URL.
export const Route = createFileRoute("/deletion")({
  head: () => ({ meta: [{ title: "Data Deletion · Identity Hub" }] }),
  loader: async () => {
    const session = await fetchSession();
    return { hasPassword: session.user ? (await fetchSecurity()).hasPassword : false };
  },
  component: Deletion,
});

function Deletion() {
  const { user } = useSession();
  const { hasPassword } = Route.useLoaderData();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Page width="max-w-3xl">
      <h1 className="text-4xl font-semibold tracking-tight">Data Deletion</h1>
      <p className="mt-4 text-muted">
        Deleting your Identity Hub account removes your profile, every connected account and its
        tokens, every app grant and token, any apps you registered, and your activity log. It does
        not delete anything on the platforms themselves; remove the app there too if you want the
        platform to forget the authorization.
      </p>
      {done ? (
        <p className="mt-6 font-medium text-ok">Your data was deleted.</p>
      ) : user ? (
        <div className="mt-6 grid max-w-sm gap-4">
          {hasPassword ? (
            <PasswordField
              label="Confirm with your password"
              name="password"
              autoComplete="current-password"
              maxLength={1024}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          ) : null}
          <button
            type="button"
            className="min-h-11 rounded-full bg-danger px-5 text-sm font-semibold text-on-ink"
            onClick={async () => {
              if (
                !confirm(
                  "Delete your Identity Hub account and all its data? This cannot be undone.",
                )
              )
                return;
              setError(null);
              try {
                const result = await deleteMyData({
                  data: { password: hasPassword ? password : undefined },
                });
                if (!result.ok) return setError(result.error);
                setDone(true);
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Could not delete the account.");
              }
            }}
          >
            Delete my account and data
          </button>
        </div>
      ) : (
        <p className="mt-6 text-muted">
          Sign in with the account you want removed, then come back here. Or email
          support@makketing.com.
        </p>
      )}
      <ErrorNote message={error} />
    </Page>
  );
}
