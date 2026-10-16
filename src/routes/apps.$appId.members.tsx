import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { fetchAppMembers, removeAppMember } from "@/lib/api";
import { useAction } from "@/lib/use-action";
import { ErrorNote } from "@/components/shell";
import { appHead } from "@/lib/app-title";

export const Route = createFileRoute("/apps/$appId/members")({
  head: appHead("Members"),
  loader: ({ params }) => fetchAppMembers({ data: { appId: params.appId } }),
  component: Members,
});

function Members() {
  const { app } = useLoaderData({ from: "/apps/$appId" });
  const members = Route.useLoaderData();
  const { error, run } = useAction();
  return (
    <section className="mt-8">
      <h2 className="text-2xl font-semibold tracking-tight">Members</h2>
      <p className="mt-2 text-sm text-muted">
        People who have signed in to {app.name}. Removing someone ends their access. Signing in
        again starts it once more.
      </p>
      <ErrorNote message={error} />
      {members.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-line p-4 text-sm text-muted">
          No one has signed in yet.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4"
            >
              <div className="min-w-0">
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
              </div>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-danger hover:bg-danger-soft"
                onClick={async () => {
                  if (
                    !confirm(
                      `Remove ${member.displayName} from ${app.name}? Their access to this app ends.`,
                    )
                  )
                    return;
                  await run(() =>
                    removeAppMember({ data: { appId: app.id, userId: member.userId } }),
                  );
                }}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
