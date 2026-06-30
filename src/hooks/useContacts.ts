import { useQuery, UseQueryResult } from "@tanstack/react-query";

import contactsService from "@/api/services/contactsService";
import QueryKeys from "@/api/queryKeys";
import { ContactsQueryParams, ContactsResponse } from "@/api/types/contacts";

export const useContactsList = (
  params: ContactsQueryParams = { offset: 0 },
): UseQueryResult<ContactsResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.contacts.list(params.offset),
    queryFn: () => contactsService.getContacts(params),
    staleTime: 5 * 60 * 1000,
  });
};

export default useContactsList;
