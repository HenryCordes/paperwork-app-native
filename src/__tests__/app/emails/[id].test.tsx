import { fireEvent, render } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import EmailDetails from "@/app/emails/[id]";
import { useEmailById, useDeleteEmail, useSendEmail } from "@/hooks/useEmails";
import type { Email } from "@/api/types/emails";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "e1" }),
  useNavigation: () => ({ setOptions: jest.fn() }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock("@/hooks/useEmails");
jest.mock("@/components/EmailBodyViewer", () => ({
  EmailBodyViewer: ({ html }: { html: string }) => {
    const { Text } = require("react-native");
    return <Text testID="viewer">{html}</Text>;
  },
}));

function makeEmail(overrides: Partial<Email> = {}): Email {
  return {
    _id: "e1", send: false, emailDate: "2026-01-15", subject: "Offerte",
    body: "<p>Hallo wereld</p>", contactId: "c1", contactName: "Acme BV",
    contactEmail: "a@b.nl", owner: "o1", createdAt: "2026-01-15",
    tenantId: "t1", emailNumber: 42, ...overrides,
  };
}

function renderScreen() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <EmailDetails />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  (useDeleteEmail as jest.Mock).mockReturnValue({ mutate: jest.fn() });
  (useSendEmail as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
});
afterEach(() => jest.clearAllMocks());

it("renders the email metadata and body via the viewer", () => {
  (useEmailById as jest.Mock).mockReturnValue({
    data: { success: true, data: makeEmail() }, isLoading: false, isError: false, error: null,
  });
  const { getByText, getByTestId } = renderScreen();
  expect(getByText("Acme BV")).toBeTruthy();
  expect(getByText("a@b.nl")).toBeTruthy();
  expect(getByTestId("viewer").props.children).toBe("<p>Hallo wereld</p>");
});

it("shows a Dutch error when loading fails", () => {
  (useEmailById as jest.Mock).mockReturnValue({
    data: undefined, isLoading: false, isError: true, error: new Error("boom"),
  });
  expect(renderScreen().getByText(/boom/)).toBeTruthy();
});

it("calls sendEmail when Verzenden is pressed", () => {
  const mutate = jest.fn();
  (useSendEmail as jest.Mock).mockReturnValue({ mutate, isPending: false });
  (useEmailById as jest.Mock).mockReturnValue({
    data: { success: true, data: makeEmail() }, isLoading: false, isError: false, error: null,
  });
  fireEvent.press(renderScreen().getByText("Verzenden"));
  expect(mutate).toHaveBeenCalled();
});
