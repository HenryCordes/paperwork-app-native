import { Redirect } from "expo-router";

import { useAuthContext } from "@/contexts/AuthContext";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return null;
  }

  return <Redirect href={isAuthenticated ? "/dashboard" : "/login"} />;
}
