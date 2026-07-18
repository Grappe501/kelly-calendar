export type CookieDefaults = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
};

export function getSecureCookieDefaults(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): CookieDefaults {
  return {
    httpOnly: true,
    secure: nodeEnv === "production",
    sameSite: "lax",
    path: "/",
  };
}

export type CookiePurpose = "session" | "csrf" | "oauth_state" | "return_path";

export function cookieOptionsFor(purpose: CookiePurpose) {
  const base = getSecureCookieDefaults();
  if (purpose === "csrf") {
    return { ...base, httpOnly: false };
  }
  return base;
}
