import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from "@tanstack/react-query";

import expensesService from "@/api/services/expensesService";
import QueryKeys from "@/api/queryKeys";
import {
  ExpenseCreateUpdateRequest,
  ExpenseDetailResponse,
  ExpensesQueryParams,
  ExpensesResponse,
} from "@/api/types/expenses";

export const useExpensesList = (
  params: ExpensesQueryParams,
): UseQueryResult<ExpensesResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.expenses.list(params),
    queryFn: () => expensesService.getExpenses(params),
  });
};

export const useExpenseById = (
  id: string | undefined,
): UseQueryResult<ExpenseDetailResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.expenses.detail(id ?? "create"),
    queryFn: () => expensesService.getExpenseById(id),
    enabled: !!id && id !== "create",
  });
};

export const useCreateOrUpdateExpense = (): UseMutationResult<
  ExpenseDetailResponse,
  Error,
  ExpenseCreateUpdateRequest
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ExpenseCreateUpdateRequest) => expensesService.createOrUpdateExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.expenses.base });
    },
  });
};

export const useDeleteExpense = (): UseMutationResult<{ success: boolean }, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => expensesService.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.expenses.base });
    },
  });
};
