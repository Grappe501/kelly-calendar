import { Suspense } from "react";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  const flags = getSharedAuthFlags();
  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="muted">Kelly Campaign Command Calendar</p>
        <h1>Sign in</h1>
        <p className="muted">
          {flags.candidateDataReady
            ? "Sign in with your campaign account. Authorized roles may work with real campaign schedule data."
            : "Sign in with your campaign account. Real candidate schedule data remains prohibited until certified."}
        </p>
      </header>

      <section className="panel" aria-labelledby="login-heading">
        <h2 id="login-heading">Campaign login</h2>
        <Suspense fallback={<p className="muted">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </section>
    </div>
  );
}
