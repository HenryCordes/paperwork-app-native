import type { ReactNode } from "react";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/api/queryClient";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { useSessionManager } from "@/hooks/useSessionManager";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useBadge } from "@/hooks/useBadge";
import { useNotificationReceiver } from "@/hooks/useNotificationReceiver";

function SessionGate({ children }: { children: ReactNode }) {
  useSessionManager();
  return <>{children}</>;
}

function AppInitializationGate({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const authed = isAuthenticated();
  const { initialize, isInitialized } = usePushNotifications();

  useBadge();
  useNotificationReceiver();

  useEffect(() => {
    if (!authed || isInitialized) {
      return;
    }
    initialize();
  }, [authed, isInitialized, initialize]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionGate>
          <AppInitializationGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="reset" />
              <Stack.Screen name="password-reset" />
              <Stack.Screen name="(drawer)" />
            </Stack>
          </AppInitializationGate>
        </SessionGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
