import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/shell";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Service · Identity Hub" }] }),
  component: Terms,
});

function Terms() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Terms of Service</h1>
        <div className="mt-6 space-y-4 text-muted">
          <p>Identity Hub connects products you register to social accounts you approve. You are responsible for the platform apps, callback URLs, and the scopes you request.</p>
          <p>Sandbox mode is a demonstration. It does not authenticate a social account and must not be presented to a customer as a live login.</p>
          <p>Paid plans limit how many live profiles a workspace can hold. Canceling a subscription stops new live connections from being added beyond the free cap once Stripe marks the subscription canceled.</p>
          <p>Dark Suite infrastructure is out of scope and must not be registered as a product on this hub.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
