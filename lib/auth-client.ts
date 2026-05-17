import { createAuthClient } from "better-auth/react";

// Use the current page's origin in the browser so it always resolves correctly
// regardless of whether the app is accessed via localhost or a network IP.
export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000"),
});

export const { signIn, signOut, signUp, useSession } = authClient;
