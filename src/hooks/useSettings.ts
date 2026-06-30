import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from "@tanstack/react-query";

import settingsService from "@/api/services/settingsService";
import vatNotificationPreferencesService from "@/api/services/vatNotificationPreferencesService";
import QueryKeys from "@/api/queryKeys";
import { SettingsResponse, SettingsUpdateRequest } from "@/api/types/settings";
import {
  VatNotificationPreferencesResponse,
  VatNotificationPreferencesUpdateRequest,
} from "@/api/types/vatNotificationPreferences";

export const useSettings = (): UseQueryResult<SettingsResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.settings.detail(),
    queryFn: () => settingsService.getSettings(),
  });
};

export const useUpdateSettings = (): UseMutationResult<
  SettingsResponse,
  Error,
  SettingsUpdateRequest
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SettingsUpdateRequest) => settingsService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.settings.detail() });
    },
  });
};

export const useVatPreferences = (): UseQueryResult<VatNotificationPreferencesResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.settings.vatPreferences(),
    queryFn: () => vatNotificationPreferencesService.getPreferences(),
  });
};

export const useUpdateVatPreferences = (): UseMutationResult<
  VatNotificationPreferencesResponse,
  Error,
  VatNotificationPreferencesUpdateRequest
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: VatNotificationPreferencesUpdateRequest) =>
      vatNotificationPreferencesService.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.settings.vatPreferences() });
    },
  });
};
