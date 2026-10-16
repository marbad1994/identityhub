// An inferred head() parameter is tied to this route's loader data and collapses that type.
function parentAppName(matches: unknown): string {
  const list = matches as { routeId: string; loaderData?: { app?: { name?: string } } }[];
  return list.find((match) => match.routeId === "/apps/$appId")?.loaderData?.app?.name ?? "App";
}

export function appHead(
  prefix: string,
): (ctx: { matches: unknown }) => { meta: { title: string }[] } {
  return (ctx) => ({
    meta: [{ title: `${prefix} · ${parentAppName(ctx.matches)} · Identity Hub` }],
  });
}
