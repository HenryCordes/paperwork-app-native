import { useQuery, UseQueryResult } from "@tanstack/react-query";

import contactsService from "@/api/services/contactsService";
import QueryKeys from "@/api/queryKeys";
import { ContactsResponse } from "@/api/types/contacts";

export const useContactsList = (): UseQueryResult<ContactsResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.contacts.list(),
    queryFn: () => contactsService.getContacts(),
    staleTime: 5 * 60 * 1000,
  });
};

export default useContactsList;
