import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import Emails from "@/app/(drawer)/(tabs)/emails";
import { useEmailsList } from "@/hooks/useEmails";
import emailsService from "@/api/services/emailsService";
import QueryKeys from "@/api/queryKeys";
import type { Email, EmailsResponse } from "@/api/types/emails";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));
jest.mock("@/hooks/useEmails");
jest.mock("@/api/services/emailsService", () => ({
  __esModule: true,
  default: { getEmails: jest.fn() },
}));

const mockPush = jest.fn();

function renderScreen() {
  const client = new QueryClient();
  return {
    ...render(
      <QueryClientProvider client={client}>
        <Emails />
      </QueryClientProvider>,
    ),
    client,
  };
}

function makeEmail(overrides: Partial<Email> = {}): Email {
  return {
    _id: "e1",
    send: false,
    emailDate: "2026-01-15",
    subject: "Offerte",
    body: "<p>Hoi</p>",
    contactId: "c1",
    contactName: "Acme BV",
    contactEmail: "a@b.nl",
    owner: "o1",
    createdAt: "2026-01-15",
    tenantId: "t1",
    emailNumber: 42,
    ...overrides,
  };
}

function makeListResponse(
  docs: Email[],
  overrides: Partial<EmailsResponse["data"]> = {},
): EmailsResponse {
  return {
    success: true,
    data: {
      docs, totalDocs: docs.length, offset: 0, limit: 10, totalPages: 1,
      page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: false,
      prevPage: null, nextPage: null, ...overrides,
    },
  };
}

function mockList(overrides: Partial<ReturnType<typeof useEmailsList>>) {
  (useEmailsList as jest.Mock).mockReturnValue({
    data: undefined, isLoading: false, isError: false, error: null, ...overrides,
  });
}

describe("Emails List screen", () => {
  beforeEach(() => (useRouter as jest.Mock).mockReturnValue({ push: mockPush }));
  afterEach(() => jest.clearAllMocks());

  it("renders a card per email with its key fields and status badge", () => {
    mockList({ data: makeListResponse([makeEmail()]) });
    const { getByText } = renderScreen();
    expect(getByText("#42 - Offerte")).toBeTruthy();
    expect(getByText("Concept")).toBeTruthy();
  });

  it("shows the sent badge for a sent email", () => {
    mockList({ data: makeListResponse([makeEmail({ send: true })]) });
    const { getByText } = renderScreen();
    expect(getByText("Verzonden")).toBeTruthy();
  });

  it("shows the Dutch empty state", () => {
    mockList({ data: makeListResponse([]) });
    expect(renderScreen().getByText("Geen emails gevonden")).toBeTruthy();
  });

  it("shows a Dutch error message when the query fails", () => {
    mockList({ isError: true, error: new Error("network down") });
    expect(renderScreen().getByText(/network down/)).toBeTruthy();
  });

  it("filters by search text (subject and contact)", () => {
    mockList({
      data: makeListResponse([
        makeEmail({ _id: "e1", subject: "Offerte", emailNumber: 1 }),
        makeEmail({ _id: "e2", subject: "Herinnering", contactName: "Beta", emailNumber: 2 }),
      ]),
    });
    const { getByPlaceholderText, getByText, queryByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText("Zoek emails..."), "Herinnering");
    expect(getByText("#2 - Herinnering")).toBeTruthy();
    expect(queryByText("#1 - Offerte")).toBeNull();
  });

  it("navigates to details on card press", () => {
    mockList({ data: makeListResponse([makeEmail({ _id: "e42" })]) });
    fireEvent.press(renderScreen().getByText("#42 - Offerte"));
    expect(mockPush).toHaveBeenCalledWith("/emails/e42");
  });

  it("navigates to the create route from the FAB", () => {
    mockList({ data: makeListResponse([]) });
    fireEvent.press(renderScreen().getByTestId("emails-fab"));
    expect(mockPush).toHaveBeenCalledWith("/emails/edit/create");
  });

  it("loads the next page on endReached when hasNextPage is true", async () => {
    mockList({ data: makeListResponse([makeEmail({ _id: "e1" })], { hasNextPage: true }) });
    (emailsService.getEmails as jest.Mock).mockResolvedValue(
      makeListResponse([makeEmail({ _id: "e2", emailNumber: 99, subject: "Tweede" })]),
    );
    const { getByTestId, findByText } = renderScreen();
    fireEvent(getByTestId("emails-list"), "endReached");
    expect(await findByText("#99 - Tweede")).toBeTruthy();
    expect(emailsService.getEmails).toHaveBeenCalledWith({ offset: 10, limit: 10 });
  });

  it("invalidates the emails query on pull to refresh", async () => {
    mockList({ data: makeListResponse([makeEmail()]) });
    const { getByTestId, client } = renderScreen();
    const spy = jest.spyOn(client, "invalidateQueries");
    fireEvent(getByTestId("emails-list"), "refresh");
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: QueryKeys.emails.base }));
  });
});
