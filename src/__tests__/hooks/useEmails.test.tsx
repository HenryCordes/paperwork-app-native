import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import {
  useEmailsList,
  useEmailById,
  useCreateOrUpdateEmail,
  useDeleteEmail,
  useSendEmail,
} from "@/hooks/useEmails";
import emailsService from "@/api/services/emailsService";
import QueryKeys from "@/api/queryKeys";

jest.mock("@/api/services/emailsService", () => ({
  __esModule: true,
  default: {
    getEmails: jest.fn(),
    getEmailById: jest.fn(),
    createOrUpdateEmail: jest.fn(),
    deleteEmail: jest.fn(),
    sendEmail: jest.fn(),
  },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => jest.clearAllMocks());

it("useEmailsList forwards params to the service", async () => {
  (emailsService.getEmails as jest.Mock).mockResolvedValue({ success: true, data: { docs: [] } });
  const client = new QueryClient();
  renderHook(() => useEmailsList({ offset: 0, limit: 10 }), { wrapper: wrapper(client) });
  await waitFor(() =>
    expect(emailsService.getEmails).toHaveBeenCalledWith({ offset: 0, limit: 10 }),
  );
});

it("useEmailById is disabled for the create sentinel", () => {
  const client = new QueryClient();
  renderHook(() => useEmailById("create"), { wrapper: wrapper(client) });
  expect(emailsService.getEmailById).not.toHaveBeenCalled();
});

it("useCreateOrUpdateEmail invalidates the emails base key on success", async () => {
  (emailsService.createOrUpdateEmail as jest.Mock).mockResolvedValue({ success: true, data: {} });
  const client = new QueryClient();
  const spy = jest.spyOn(client, "invalidateQueries");
  const { result } = renderHook(() => useCreateOrUpdateEmail(), { wrapper: wrapper(client) });

  result.current.mutate({
    send: false, emailDate: "2026-01-01", subject: "s", body: "<p></p>",
    contactId: "c1", contactName: "n", contactEmail: "e", emailNumber: 1,
  });

  await waitFor(() =>
    expect(spy).toHaveBeenCalledWith({ queryKey: QueryKeys.emails.base }),
  );
});

it("useDeleteEmail invalidates the emails base key on success", async () => {
  (emailsService.deleteEmail as jest.Mock).mockResolvedValue({ success: true });
  const client = new QueryClient();
  const spy = jest.spyOn(client, "invalidateQueries");
  const { result } = renderHook(() => useDeleteEmail(), { wrapper: wrapper(client) });

  result.current.mutate("e1");

  await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: QueryKeys.emails.base }));
});

it("useSendEmail calls the service", async () => {
  (emailsService.sendEmail as jest.Mock).mockResolvedValue({ success: true, data: {} });
  const client = new QueryClient();
  const { result } = renderHook(() => useSendEmail(), { wrapper: wrapper(client) });

  result.current.mutate({
    send: true, emailDate: "2026-01-01", subject: "s", body: "<p></p>",
    contactId: "c1", contactName: "n", contactEmail: "e", emailNumber: 1,
  });

  await waitFor(() => expect(emailsService.sendEmail).toHaveBeenCalled());
});
