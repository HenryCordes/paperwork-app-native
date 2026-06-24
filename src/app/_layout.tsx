import type { ReactNode } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/api/queryClient";
import { AuthProvider } from "@/contexts/AuthContext";
import { useSessionManager } from "@/hooks/useSessionManager";

function SessionGate({ children }: { children: ReactNode }) {
  useSessionManager();
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="reset" />
            <Stack.Screen name="password-reset" />
            <Stack.Screen name="(drawer)" />
          </Stack>
        </SessionGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
