import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";

import authService from "@/api/services/authService";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuthentication: () => Promise<boolean>;
  setAuthenticated: (value: boolean) => void;
}

const defaultAuthContext: AuthContextType = {
  isAuthenticated: false,
  isLoading: true,
  checkAuthentication: async () => false,
  setAuthenticated: () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthentication = useCallback(async (): Promise<boolean> => {
    const status = await authService.isAuthenticated();
    setIsAuthenticated(status);
    return status;
  }, []);

  const setAuthenticated = (value: boolean): void => {
    setIsAuthenticated(value);
  };

  // expo-secure-store has no synchronous read, unlike paperwork-app's
  // localStorage-backed check - isLoading gates consumers (the root
  // redirect, Task 9) until this resolves, so nothing flashes the wrong
  // screen on cold start.
  useEffect(() => {
    checkAuthentication().finally(() => setIsLoading(false));
  }, [checkAuthentication]);

  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      checkAuthentication,
      setAuthenticated,
    }),
    [isAuthenticated, isLoading, checkAuthentication]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => useContext(AuthContext);

export default AuthContext;
