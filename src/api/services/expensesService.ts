import { AxiosError, AxiosInstance } from "axios";

import { ApiError } from "../types";
import {
  ExpensesResponse,
  ExpensesQueryParams,
  ExpenseDetailResponse,
  ExpenseCreateUpdateRequest,
} from "../types/expenses";
import axiosInstance from "../axiosInstance";

export class ExpensesService {
  private axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  async getExpenses(
    params: ExpensesQueryParams = { offset: 0, limit: 10 },
  ): Promise<ExpensesResponse> {
    try {
      const response = await this.axios.get<ExpensesResponse>("expenses", { params });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij ophalen kosten");
    }
  }

  async getExpenseById(id?: string): Promise<ExpenseDetailResponse> {
    if (!id || id === "create") {
      throw new Error("Geen geldig kosten ID opgegeven");
    }

    try {
      const response = await this.axios.get<ExpenseDetailResponse>(`expense/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij ophalen kosten details");
    }
  }

  async createOrUpdateExpense(
    expenseData: ExpenseCreateUpdateRequest,
  ): Promise<ExpenseDetailResponse> {
    try {
      const response = await this.axios.post<ExpenseDetailResponse>("expense", expenseData);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const operation = expenseData._id ? "bijwerken" : "aanmaken";
      throw new Error(axiosError.response?.data?.message || `Fout bij ${operation} kosten`);
    }
  }

  async deleteExpense(id: string): Promise<{ success: boolean }> {
    try {
      await this.axios.delete(`expense/${id}`);
      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij verwijderen kosten");
    }
  }
}

export const expensesService = new ExpensesService(axiosInstance);

export default expensesService;
