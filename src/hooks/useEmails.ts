import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from "@tanstack/react-query";

import emailsService from "@/api/services/emailsService";
import QueryKeys from "@/api/queryKeys";
import {
  EmailCreateUpdateRequest,
  EmailDetailResponse,
  EmailsQueryParams,
  EmailsResponse,
} from "@/api/types/emails";

export const useEmailsList = (
  params: EmailsQueryParams,
): UseQueryResult<EmailsResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.emails.list(params.offset),
    queryFn: () => emailsService.getEmails(params),
  });
};

export const useEmailById = (
  id: string | undefined,
): UseQueryResult<EmailDetailResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.emails.detail(id ?? "create"),
    queryFn: () => emailsService.getEmailById(id),
    enabled: !!id && id !== "create",
  });
};

export const useCreateOrUpdateEmail = (): UseMutationResult<
  EmailDetailResponse,
  Error,
  EmailCreateUpdateRequest
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EmailCreateUpdateRequest) => emailsService.createOrUpdateEmail(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.emails.base });
    },
  });
};

export const useDeleteEmail = (): UseMutationResult<{ success: boolean }, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => emailsService.deleteEmail(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.emails.base });
    },
  });
};

export const useSendEmail = (): UseMutationResult<
  EmailDetailResponse,
  Error,
  EmailCreateUpdateRequest
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EmailCreateUpdateRequest) => emailsService.sendEmail(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.emails.base });
    },
  });
};
