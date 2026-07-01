export interface Email {
  _id: string;
  send: boolean;
  emailDate: string;
  subject: string;
  body: string;
  invoiceId?: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  owner: string;
  createdAt: string;
  tenantId: string;
  emailNumber: number;
  __v?: number;
  id?: string;
}

export interface EmailsResponse {
  success: boolean;
  data: {
    docs: Email[];
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

export interface EmailDetailResponse {
  success: boolean;
  data: Email;
}

export interface EmailsQueryParams {
  offset?: number;
  limit?: number;
  page?: number;
}

export interface EmailCreateUpdateRequest {
  _id?: string;
  send: boolean;
  emailDate: string;
  subject: string;
  body: string;
  invoiceId?: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  emailNumber: number;
}
