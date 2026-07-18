import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="muted">Kelly Campaign Command Calendar</p>
        <h1>Sign in</h1>
        <p className="muted">
          Sign in with your campaign account. Real candidate schedule data remains
          prohibited until separately certified.
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
