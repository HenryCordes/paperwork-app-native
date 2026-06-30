import { useQuery, UseQueryResult } from "@tanstack/react-query";

import authService from "@/api/services/authService";
import QueryKeys from "@/api/queryKeys";
import type { UserProfile } from "@/api/types";

export const useProfile = (): UseQueryResult<UserProfile, Error> => {
  return useQuery({
    queryKey: QueryKeys.auth.profile(),
    queryFn: () => authService.getProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export default useProfile;
