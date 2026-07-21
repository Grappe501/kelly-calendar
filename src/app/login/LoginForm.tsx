"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  /** Server-resolved post-login path (avoids useSearchParams CSR bailout). */
  nextPath?: string;
};

export function LoginForm({ nextPath = "/" }: Props) {
  const router = useRouter();
  const safeNext = nextPath.startsWith("/") ? nextPath : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const raw = await response.text();
      let data: { ok?: boolean; error?: { message?: string; code?: string } } =
        {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        setError(
          response.status >= 500
            ? "Sign-in service is unavailable. Try again shortly."
            : "Sign-in failed.",
        );
        setPending(false);
        return;
      }
      if (!response.ok || !data.ok) {
        setError(data.error?.message ?? "Sign-in failed.");
        setPending(false);
        return;
      }
      router.replace(safeNext);
      router.refresh();
    } catch {
      setError("Sign-in failed.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form-stack">
      <label>
        Email
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error ? (
        <p role="alert" className="error-text">
          {error}
        </p>
      ) : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
