import { Redirect } from "expo-router";

// No auth yet (Phase 1 adds it) — unconditionally land on the authenticated
// shell's primary tab, mirroring where paperwork-app's App.tsx redirects an
// authenticated user ("/" -> "/dashboard"). Phase 1 replaces this with a
// real isAuthenticated check ("/" -> "/dashboard" | "/login").
export default function Index() {
  return <Redirect href="/dashboard" />;
}
