export interface Contact {
  _id: string;
  companyName: string;
}

export interface ContactsResponse {
  success: boolean;
  data: {
    docs: Contact[];
  };
}
