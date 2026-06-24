import {
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";

import { LoginRequest, LoginResponse, User } from "@/api/types";
import authService from "@/api/services/authService";
import QueryKeys from "@/api/queryKeys";
import { useAuthContext } from "@/contexts/AuthContext";
import { secureStorage, RECENT_LOGOUT_KEY } from "@/services/secureStorage";

export const useAuth = () => {
  const queryClient = useQueryClient();
  const authContext = useAuthContext();

  const login: UseMutationResult<LoginResponse, Error, LoginRequest> =
    useMutation({
      mutationFn: (credentials: LoginRequest) =>
        authService.login(credentials),
      onSuccess: (data) => {
        authContext.setAuthenticated(true);
        queryClient.invalidateQueries({ queryKey: QueryKeys.auth.base });
        queryClient.setQueryData(QueryKeys.auth.user(), data.user);
      },
    });

  const logout = async () => {
    await authService.logout();

    // Don't clear biometric credentials on logout - only block automatic
    // biometric re-login until the next manual login or biometric attempt.
    await secureStorage.setItem(RECENT_LOGOUT_KEY, "true");

    authContext.setAuthenticated(false);

    queryClient.invalidateQueries({ queryKey: QueryKeys.auth.base });
    queryClient.removeQueries({ queryKey: QueryKeys.auth.user() });
  };

  const isAuthenticated = () => authContext.isAuthenticated;

  const checkAuthentication = () => authContext.checkAuthentication();

  const getCurrentUser = () =>
    queryClient.getQueryData<User>(QueryKeys.auth.user());

  return {
    login,
    logout,
    isAuthenticated,
    checkAuthentication,
    getCurrentUser,
  };
};

export default useAuth;
