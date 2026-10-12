import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  const message = error instanceof Error && error.message ? error.message : "An unexpected error occurred. Try reloading the page.";
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <TriangleAlert className="size-10 text-danger" aria-hidden="true" />
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-md break-words text-sm text-muted">{message}</p>
      <Link to="/" className="min-h-11 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-on-ink no-underline">
        Home
      </Link>
    </main>
  );
}
