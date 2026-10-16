import { createFileRoute, Link, notFound, Outlet, redirect } from "@tanstack/react-router";
import { Page } from "@/components/shell";
import { fetchDeveloperApp, fetchSession } from "@/lib/api";
import { appHead } from "@/lib/app-title";

const tabs = [
  { to: "/apps/$appId", label: "Overview" },
  { to: "/apps/$appId/widget", label: "Widget" },
  { to: "/apps/$appId/credentials", label: "Credentials" },
  { to: "/apps/$appId/members", label: "Members" },
  { to: "/apps/$appId/grants", label: "Grants and tokens" },
] as const;

export const Route = createFileRoute("/apps/$appId")({
  head: appHead("App"),
  beforeLoad: async ({ location }) => {
    const session = await fetchSession();
    if (!session.user) throw redirect({ to: "/login", search: { return_to: location.pathname } });
  },
  loader: async ({ params }) => {
    const result = await fetchDeveloperApp({ data: { appId: params.appId } });
    if (!result.app) throw notFound();
    return { ...result, app: result.app };
  },
  component: AppLayout,
});

function AppLayout() {
  const { app } = Route.useLoaderData();
  const { appId } = Route.useParams();
  return (
    <Page width="max-w-5xl">
      <p className="text-sm font-semibold text-muted">App</p>
      <h1 className="text-4xl font-semibold tracking-tight">{app.name}</h1>
      <nav aria-label="App" className="mt-6">
        <ul className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <Link
                to={tab.to}
                params={{ appId }}
                activeOptions={{ exact: true }}
                className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 text-sm font-medium text-muted no-underline hover:text-fg"
                activeProps={{
                  "aria-current": "page",
                  className: "bg-ink text-on-ink hover:text-on-ink",
                }}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </Page>
  );
}
