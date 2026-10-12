import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { openCheckout } from "@/lib/broker/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SiteFooter, SiteHeader } from "@/components/shell";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Pricing · Identity Hub" }] }),
  component: Pricing,
});

const plans = [
  {
    id: "starter" as const,
    name: "Starter",
    price: "$39",
    detail: "For the first product and a handful of live profiles.",
    points: ["5 live profiles", "Sandbox profiles stay free", "Grants, widget, and code exchange", "Email support"],
    featured: false,
  },
  {
    id: "growth" as const,
    name: "Growth",
    price: "$129",
    detail: "For a product already connecting customer accounts.",
    points: ["25 live profiles", "Sandbox profiles stay free", "Grants, widget, and code exchange", "Email support"],
    featured: true,
  },
  {
    id: "scale" as const,
    name: "Scale",
    price: "$349",
    detail: "For a suite that needs a higher live-profile cap.",
    points: ["100 live profiles", "Sandbox profiles stay free", "Grants, widget, and code exchange", "Priority support"],
    featured: false,
  },
];

function Pricing() {
  const { user, isPending } = useCurrentUserState();
  const [error, setError] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-sm font-semibold text-muted">Self-serve</p>
        <h1 className="mt-2 text-5xl font-semibold tracking-tight">Pick a plan</h1>
        <p className="mt-3 max-w-xl text-muted">Sandbox profiles stay free. Live OAuth uses the profile cap on the active plan. Cancel any time from Stripe.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`flex flex-col rounded-card border bg-bg p-6 shadow-card ${plan.featured ? "border-ink" : "border-line"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                {plan.featured ? <span className="rounded-full bg-bg-alt px-2.5 py-1 text-xs font-semibold">Most teams</span> : null}
              </div>
              <p className="mt-4 text-4xl font-semibold tracking-tight">
                {plan.price}
                <span className="text-base font-medium text-muted">/mo</span>
              </p>
              <p className="mt-3 text-sm text-muted">{plan.detail}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {plan.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              {isPending ? <span className="mt-6 h-11 animate-pulse rounded-full bg-bg-alt" /> : null}
              {!isPending && !user ? (
                <Link to="/login" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-on-ink no-underline">
                  Sign in to subscribe
                </Link>
              ) : null}
              {!isPending && user ? (
                <button
                  type="button"
                  disabled={pendingPlan !== null}
                  className="mt-6 min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink disabled:opacity-50"
                  onClick={async () => {
                    setPendingPlan(plan.id);
                    setError(null);
                    try {
                      const result = await openCheckout({ data: { plan: plan.id } });
                      if (!result.ok) setError(result.error);
                      else window.location.assign(result.url);
                    } catch (cause) {
                      setError(cause instanceof Error ? cause.message : "Checkout failed.");
                    } finally {
                      setPendingPlan(null);
                    }
                  }}
                >
                  {pendingPlan === plan.id ? "Opening checkout…" : `Start ${plan.name}`}
                </button>
              ) : null}
            </article>
          ))}
        </div>
        {error ? <p role="alert" className="mt-6 text-sm text-danger">{error}</p> : null}
        <p className="mt-8 text-sm text-muted">Need more than 100 profiles? Email support@socialpostapi.makketing.com.</p>
      </main>
      <SiteFooter />
    </>
  );
}
