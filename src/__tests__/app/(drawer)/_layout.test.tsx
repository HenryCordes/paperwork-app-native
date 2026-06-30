import { fireEvent, render } from "@testing-library/react-native";

import { CustomDrawerContent } from "@/app/(drawer)/_layout";

const mockNavigate = jest.fn();
const mockLogout = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ navigate: mockNavigate }),
}));

jest.mock("expo-router/drawer", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    DrawerContentScrollView: ({ children }: { children: unknown }) => children,
    DrawerItem: ({ label, onPress }: { label: string; onPress: () => void }) =>
      React.createElement(Text, { testID: `drawer-item-${label}`, onPress }, label),
  };
});

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

function renderDrawer() {
  const navigation = { closeDrawer: jest.fn() } as never;
  return render(<CustomDrawerContent navigation={navigation} state={{} as never} descriptors={{} as never} />);
}

describe("CustomDrawerContent navigation", () => {
  afterEach(() => jest.clearAllMocks());

  it.each([
    ["Dashboard", "/dashboard"],
    ["Facturen", "/invoices"],
    ["Contacten", "/contacts"],
    ["Belasting", "/taxes"],
    ["Notificaties", "/notifications"],
    ["Profiel", "/profile"],
  ])("navigates to %s by href, not a bare route name", (label, href) => {
    const { getByTestId } = renderDrawer();

    fireEvent.press(getByTestId(`drawer-item-${label}`));

    expect(mockNavigate).toHaveBeenCalledWith(href);
  });

  it("logs out without navigating when Uitloggen is pressed", () => {
    const { getByTestId } = renderDrawer();

    fireEvent.press(getByTestId("drawer-item-Uitloggen"));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
