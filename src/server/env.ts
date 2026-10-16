/** Read an env var, treating empty or whitespace as unset. */
export function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function requireEnv(name: string): string {
  const value = env(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** Public origin of the hub, e.g. https://identityhub.makketing.com. No trailing slash. */
export function appOrigin(): string {
  return (env("APP_ORIGIN") ?? "http://localhost:8080").replace(/\/+$/, "");
}

/** Session cookies are Secure whenever the hub is served over https. */
export function secureCookies(): boolean {
  return appOrigin().startsWith("https://");
}
