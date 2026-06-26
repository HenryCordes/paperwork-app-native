export interface Expense {
  _id: string;
  state: string;
  contactId: string;
  contactName: string;
  expenseNumber: number;
  expenseDate: string;
  info: string;
  tax: number;
  taxLow: number;
  price: number;
  createdAt: string;
  tenantId: string;
  expenseFile?: string;
  // OBSOLETE
  priceWOTaxes: number;
}

export interface ExpensesResponse {
  success: boolean;
  data: {
    docs: Expense[];
    totalDocs: number;
    offset: number;
    limit: number;
    totalPages: number;
    page: number;
    pagingCounter: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    prevPage: number | null;
    nextPage: number | null;
  };
}

export interface ExpenseDetailResponse {
  success: boolean;
  data: Expense;
}

export interface ExpensesQueryParams {
  offset?: number;
  limit?: number;
  page?: number;
}

export interface ExpenseCreateUpdateRequest {
  _id?: string;
  contactId: string;
  contactName: string;
  expenseNumber: number;
  expenseDate: string;
  info: string;
  tax: number;
  taxLow: number;
  price: number;
  expenseFile?: string;
  // OBSOLETE
  priceWOTaxes: number;
}
