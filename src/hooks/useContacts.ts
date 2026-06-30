import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from "@tanstack/react-query";

import contactsService from "@/api/services/contactsService";
import QueryKeys from "@/api/queryKeys";
import {
  Contact,
  ContactCreateUpdateRequest,
  ContactsQueryParams,
  ContactsResponse,
} from "@/api/types/contacts";

export const useContactsList = (
  params: ContactsQueryParams = { offset: 0 },
): UseQueryResult<ContactsResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.contacts.list(params.offset),
    queryFn: () => contactsService.getContacts(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useContactById = (
  id: string | undefined,
): UseQueryResult<{ success: boolean; data: Contact }, Error> => {
  return useQuery({
    queryKey: QueryKeys.contacts.detail(id ?? "create"),
    queryFn: () => contactsService.getContactById(id),
    enabled: !!id && id !== "create",
  });
};

export const useCreateOrUpdateContact = (): UseMutationResult<
  { success: boolean; data: Contact },
  Error,
  ContactCreateUpdateRequest
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ContactCreateUpdateRequest) =>
      contactsService.createOrUpdateContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.contacts.base });
    },
  });
};

export const useDeleteContact = (): UseMutationResult<{ success: boolean }, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactsService.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.contacts.base });
    },
  });
};

export default useContactsList;
