import { PlatformIcon } from "./marks";

/** Full-page links into the platform OAuth flow (`/api/auth/start`). */
export function PlatformButtons({
  platforms,
  intent,
  returnTo,
  verb,
}: {
  platforms: { id: string; label: string }[];
  intent: "login" | "connect";
  returnTo: string;
  verb: string;
}) {
  // Email and password is a form, not a redirect; callers render it separately.
  platforms = platforms.filter((platform) => platform.id !== "password");
  if (platforms.length === 0) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {platforms.map((platform) => (
        <a
          key={platform.id}
          href={`/api/auth/start?${new URLSearchParams({ platform: platform.id, intent, return_to: returnTo })}`}
          className="inline-flex min-h-11 items-center gap-3 rounded-full border border-line bg-bg px-4 text-sm font-semibold text-fg no-underline hover:bg-bg-alt"
        >
          <PlatformIcon id={platform.id} className="size-5" />
          {verb} {platform.label}
        </a>
      ))}
    </div>
  );
}
