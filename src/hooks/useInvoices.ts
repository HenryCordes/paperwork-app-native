import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from "@tanstack/react-query";

import invoicesService from "@/api/services/invoicesService";
import QueryKeys from "@/api/queryKeys";
import {
  InvoiceCreateUpdateRequest,
  InvoiceDetailResponse,
  InvoicesQueryParams,
  InvoicesResponse,
} from "@/api/types/invoices";

export const useInvoicesList = (
  params: InvoicesQueryParams,
): UseQueryResult<InvoicesResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.invoices.list(params),
    queryFn: () => invoicesService.getInvoices(params),
  });
};

export const useInvoiceById = (
  id: string | undefined,
): UseQueryResult<InvoiceDetailResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.invoices.detail(id ?? "create"),
    queryFn: () => invoicesService.getInvoiceById(id!),
    enabled: !!id && id !== "create",
  });
};

export const useCreateOrUpdateInvoice = (): UseMutationResult<
  InvoiceDetailResponse,
  Error,
  InvoiceCreateUpdateRequest
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InvoiceCreateUpdateRequest) =>
      invoicesService.createOrUpdateInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.invoices.base });
    },
  });
};

export const useDeleteInvoice = (): UseMutationResult<{ success: boolean }, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoicesService.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.invoices.base });
    },
  });
};
