import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import EmailEdit from "@/app/emails/edit/[id]";
import { useEmailById, useCreateOrUpdateEmail, useSendEmail } from "@/hooks/useEmails";
import { useContactsList } from "@/hooks/useContacts";
import { useInvoicesList } from "@/hooks/useInvoices";

let mockId = "create";
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: mockId }),
  useNavigation: () => ({ setOptions: jest.fn() }),
  useRouter: () => ({ back: jest.fn() }),
}));
jest.mock("@/hooks/useEmails");
jest.mock("@/hooks/useContacts");
jest.mock("@/hooks/useInvoices");
let lastEditorInitialContent: string | undefined;
jest.mock("@/components/EmailBodyEditor", () => ({
  EmailBodyEditor: ({
    initialContent,
    onChange,
  }: {
    initialContent: string;
    onChange: (html: string) => void;
  }) => {
    lastEditorInitialContent = initialContent;
    const { Pressable, Text } = require("react-native");
    return (
      <Pressable testID="mock-editor" onPress={() => onChange("<p>Body</p>")}>
        <Text>editor</Text>
      </Pressable>
    );
  },
}));

function renderScreen() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <EmailEdit />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockId = "create";
  lastEditorInitialContent = undefined;
  (useEmailById as jest.Mock).mockReturnValue({ data: undefined });
  (useContactsList as jest.Mock).mockReturnValue({
    data: { data: { docs: [
      { _id: "c1", typeName: "Bedrijf", companyName: "Acme BV",
        firstName: "", lastName: "", emailAddress: "a@b.nl" },
    ] } },
    isError: false,
  });
  (useInvoicesList as jest.Mock).mockReturnValue({ data: { data: { docs: [] } } });
  (useCreateOrUpdateEmail as jest.Mock).mockReturnValue({ mutate: jest.fn() });
  (useSendEmail as jest.Mock).mockReturnValue({ mutate: jest.fn() });
});
afterEach(() => jest.clearAllMocks());

it("blocks save and shows validation errors when required fields are empty", () => {
  const mutate = jest.fn();
  (useCreateOrUpdateEmail as jest.Mock).mockReturnValue({ mutate });
  const { getByTestId, getByText } = renderScreen();

  fireEvent.press(getByTestId("email-save-button"));

  expect(getByText("Onderwerp is verplicht")).toBeTruthy();
  expect(mutate).not.toHaveBeenCalled();
});

it("saves a valid new email with the editor's HTML body", async () => {
  const mutate = jest.fn();
  (useCreateOrUpdateEmail as jest.Mock).mockReturnValue({ mutate });
  const { getByTestId, getByPlaceholderText, getByText } = renderScreen();

  fireEvent.changeText(getByPlaceholderText("Onderwerp van de email"), "Offerte");
  fireEvent.press(getByTestId("mock-editor")); // sets body
  fireEvent.changeText(getByTestId("email-date-input"), "2026-02-01");
  // select the contact from the dropdown modal using the established pattern
  fireEvent.press(getByTestId("contact-dropdown"));
  fireEvent.press(getByText("Acme BV"));

  fireEvent.press(getByTestId("email-save-button"));

  await waitFor(() =>
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "Offerte", body: "<p>Body</p>", contactId: "c1" }),
      expect.anything(),
    ),
  );
});

it("mounts the editor with the loaded body in edit mode and does not blank it on save", async () => {
  mockId = "email-42";
  const mutate = jest.fn();
  (useCreateOrUpdateEmail as jest.Mock).mockReturnValue({ mutate });
  (useEmailById as jest.Mock).mockReturnValue({
    data: {
      data: {
        _id: "email-42",
        send: false,
        emailDate: "2026-01-15",
        subject: "Bestaande email",
        body: "<p>Original</p>",
        invoiceId: "",
        contactId: "c1",
        contactName: "Acme BV",
        contactEmail: "a@b.nl",
        emailNumber: 1234,
      },
    },
  });

  const { getByTestId } = renderScreen();

  // Wait for hydration: the editor should appear once formData._id is set
  await waitFor(() => expect(lastEditorInitialContent).toBe("<p>Original</p>"));

  // Press save without touching the editor — body must NOT be blanked
  fireEvent.press(getByTestId("email-save-button"));

  await waitFor(() =>
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "email-42", body: "<p>Original</p>" }),
      expect.anything(),
    ),
  );
});
