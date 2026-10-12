/**
 * The platforms offered for sign-in. Source of truth for the server
 * (`platform-providers.server.ts` configures the ones with credentials) and the
 * client sign-in buttons. Dependency-free so the browser bundle can import it.
 * `providerId` matches the id in `lib/broker/providers.ts` and is the OAuth
 * callback path segment (`/api/auth/oauth2/callback/<providerId>`).
 */
export type SignInProvider = {
  providerId: string;
  label: string;
};

export const SIGN_IN_PROVIDERS: readonly SignInProvider[] = [
  { providerId: "x", label: "X" },
  { providerId: "instagram", label: "Instagram" },
  { providerId: "facebook", label: "Facebook" },
  { providerId: "tiktok", label: "TikTok" },
  { providerId: "linkedin", label: "LinkedIn" },
  { providerId: "youtube", label: "YouTube" },
  { providerId: "reddit", label: "Reddit" },
];
