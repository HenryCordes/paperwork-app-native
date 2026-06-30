import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from "@tanstack/react-query";

import notificationsService from "@/api/services/notificationsService";
import QueryKeys from "@/api/queryKeys";
import {
  FCMTokenRequest,
  FCMTokenResponse,
  NotificationSettingsRequest,
  NotificationSettingsResponse,
  GetTokensResponse,
  NotificationListResponse,
  NotificationFilter,
  UnreadCountResponse,
  MarkAsReadResponse,
  MarkAllReadResponse,
  DeleteNotificationResponse,
} from "@/api/types/notifications";

export function useNotificationTokens(): {
  tokens: GetTokensResponse["data"];
  isLoading: boolean;
  registerToken: UseMutationResult<FCMTokenResponse, Error, FCMTokenRequest>["mutate"];
  removeToken: UseMutationResult<FCMTokenResponse, Error, string>["mutate"];
} {
  const queryClient = useQueryClient();

  const tokensQuery = useQuery({
    queryKey: QueryKeys.notifications.tokens(),
    queryFn: () => notificationsService.getTokens(),
  });

  const registerTokenMutation = useMutation({
    mutationFn: (tokenData: FCMTokenRequest) => notificationsService.registerToken(tokenData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.notifications.tokens() });
    },
  });

  const removeTokenMutation = useMutation({
    mutationFn: (token: string) => notificationsService.removeToken(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.notifications.tokens() });
    },
  });

  return {
    tokens: tokensQuery.data?.data ?? [],
    isLoading: tokensQuery.isLoading,
    registerToken: registerTokenMutation.mutate,
    removeToken: removeTokenMutation.mutate,
  };
}

export function useNotificationSettings(): {
  updateSettings: UseMutationResult<
    NotificationSettingsResponse,
    Error,
    NotificationSettingsRequest
  >["mutate"];
} {
  const mutation = useMutation({
    mutationFn: (settings: NotificationSettingsRequest) =>
      notificationsService.updateSettings(settings),
  });

  return { updateSettings: mutation.mutate };
}

export function useNotificationsList(
  filter?: NotificationFilter,
): UseQueryResult<NotificationListResponse, Error> {
  return useQuery({
    queryKey: QueryKeys.notifications.list(filter),
    queryFn: () => notificationsService.getNotifications(filter),
  });
}

export function useUnreadCount(): UseQueryResult<UnreadCountResponse, Error> {
  return useQuery({
    queryKey: QueryKeys.notifications.unreadCount(),
    queryFn: () => notificationsService.getUnreadCount(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useMarkAsRead(): UseMutationResult<
  MarkAsReadResponse,
  Error,
  { notificationId: string; read?: boolean }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ notificationId, read }: { notificationId: string; read?: boolean }) =>
      notificationsService.markAsRead(notificationId, read),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.notifications.base });
    },
  });
}

export function useMarkAllAsRead(): UseMutationResult<MarkAllReadResponse, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.notifications.base });
    },
  });
}

export function useDeleteNotification(): UseMutationResult<
  DeleteNotificationResponse,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationsService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.notifications.base });
    },
  });
}

export function useMarkAsReceived(): UseMutationResult<MarkAsReadResponse, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationsService.markAsReceived(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.notifications.base });
    },
  });
}
