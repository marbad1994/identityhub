import { useEffect, useRef, useState, type MouseEvent } from "react";
import { newRelayId, openPopup, waitForRelay } from "@/lib/popup";
import { PlatformIcon } from "./marks";

/**
 * Buttons into the platform OAuth flow (`/api/auth/start`). By default the
 * platform's sign-in opens in a popup that closes itself when done, and this
 * page then moves on. With popups blocked, or `popup={false}` (already inside
 * a popup), the link simply navigates.
 */
export function PlatformButtons({
  platforms,
  intent,
  returnTo,
  verb,
  popup = true,
}: {
  platforms: { id: string; label: string }[];
  intent: "login" | "connect";
  returnTo: string;
  verb: string;
  popup?: boolean;
}) {
  const [waiting, setWaiting] = useState<string | null>(null);
  const cancel = useRef<(() => void) | null>(null);
  useEffect(() => () => cancel.current?.(), []);

  // Email and password is a form, not a redirect; callers render it separately.
  platforms = platforms.filter((platform) => platform.id !== "password");
  if (platforms.length === 0) return null;

  const href = (id: string) =>
    `/api/auth/start?${new URLSearchParams({ platform: id, intent, return_to: returnTo })}`;

  const start = (event: MouseEvent<HTMLAnchorElement>, id: string, label: string) => {
    if (!popup || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const relay = newRelayId();
    const window_ = openPopup(`${href(id)}&relay=${relay}`);
    if (!window_) return; // Blocked: follow the link in this tab instead.
    event.preventDefault();
    cancel.current?.();
    const controller = new AbortController();
    cancel.current = () => {
      controller.abort();
      window_.close();
      setWaiting(null);
    };
    setWaiting(label);
    void waitForRelay(relay, controller.signal).then((location) => {
      if (location) window.location.assign(location);
      else if (!controller.signal.aborted) setWaiting(null);
    });
  };

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        {platforms.map((platform) => (
          <a
            key={platform.id}
            href={href(platform.id)}
            onClick={(event) => start(event, platform.id, platform.label)}
            aria-disabled={waiting !== null}
            className={`inline-flex min-h-11 items-center gap-3 rounded-full border border-line bg-bg px-4 text-sm font-semibold text-fg no-underline hover:bg-bg-alt ${waiting ? "pointer-events-none opacity-50" : ""}`}
          >
            <PlatformIcon id={platform.id} className="size-5" />
            {verb} {platform.label}
          </a>
        ))}
      </div>
      {waiting ? (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-bg-alt px-4 py-3 text-sm"
        >
          <span>Finish signing in with {waiting} in the popup window.</span>
          <button
            type="button"
            className="min-h-11 rounded-full px-3 font-medium text-link"
            onClick={() => cancel.current?.()}
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}
