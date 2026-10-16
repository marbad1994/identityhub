import { createFileRoute, notFound } from "@tanstack/react-router";
import { fetchAppGrants } from "@/lib/api";
import { platformLabel } from "@/lib/platforms";
import { appHead } from "@/lib/app-title";

export const Route = createFileRoute("/apps/$appId/grants")({
  head: appHead("Grants and tokens"),
  loader: async ({ params }) => {
    const grants = await fetchAppGrants({ data: { appId: params.appId } });
    if (grants === null) throw notFound();
    return grants;
  },
  component: Grants,
});

function Grants() {
  const grants = Route.useLoaderData();
  return (
    <section className="mt-8">
      <h2 className="text-2xl font-semibold tracking-tight">Grants and tokens</h2>
      <p className="mt-2 text-sm text-muted">
        A snapshot of current access, not a history. A grant date is the latest consent. A token
        date is the last use, or the issue time if it has not been used.
      </p>
      {grants.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-line p-4 text-sm text-muted">
          No grants or tokens yet.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {grants.map((row, index) => (
            <li
              key={`${row.kind}-${row.at}-${index}`}
              className="rounded-2xl border border-line p-4"
            >
              <p className="font-medium">{row.displayName}</p>
              {row.kind === "grant" ? (
                <p className="mt-1 text-sm">
                  {platformLabel(row.provider ?? "")} {row.handle}
                  {row.scopes ? ` · ${row.scopes}` : ""}
                </p>
              ) : (
                <p className="mt-1 text-sm">
                  {row.used ? "Token used" : "Token issued, not used yet"}
                </p>
              )}
              <p className="mt-1 text-sm text-muted">
                {row.kind === "grant" ? "Granted" : row.used ? "Used" : "Issued"}{" "}
                {new Date(row.at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
