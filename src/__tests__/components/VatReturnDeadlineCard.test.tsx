import { render } from "@testing-library/react-native";

import { VatReturnDeadlineCard } from "@/components/VatReturnDeadlineCard";
import { useTaxDeadline } from "@/hooks/useTaxes";

jest.mock("@/hooks/useTaxes");

function mockDeadline(overrides: object) {
  (useTaxDeadline as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  });
}

const makeDeadlineData = (daysUntilDeadline = 7) => ({
  data: {
    success: true,
    data: {
      deadline: "2026-04-30",
      label: "Q1 2026",
      daysUntilDeadline,
      periodType: "quarterly" as const,
    },
  },
  isLoading: false,
  isError: false,
});

describe("VatReturnDeadlineCard", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders null when loading", () => {
    mockDeadline({ isLoading: true });

    const { toJSON } = render(<VatReturnDeadlineCard periodType="quarterly" />);

    expect(toJSON()).toBeNull();
  });

  it("renders null when there is no deadline data", () => {
    mockDeadline({ data: undefined });

    const { toJSON } = render(<VatReturnDeadlineCard periodType="quarterly" />);

    expect(toJSON()).toBeNull();
  });

  it("renders null when daysUntilDeadline is greater than 14", () => {
    mockDeadline(makeDeadlineData(15));

    const { toJSON } = render(<VatReturnDeadlineCard periodType="quarterly" />);

    expect(toJSON()).toBeNull();
  });

  it("renders the deadline date and days remaining when within 14 days", () => {
    mockDeadline(makeDeadlineData(7));

    const { getByText } = render(<VatReturnDeadlineCard periodType="quarterly" />);

    expect(getByText(/7/)).toBeTruthy();
    expect(getByText(/BTW/i)).toBeTruthy();
  });

  it("renders 'dag' (singular) when 1 day remains", () => {
    mockDeadline(makeDeadlineData(1));

    const { getByText } = render(<VatReturnDeadlineCard periodType="quarterly" />);

    expect(getByText(/1 dag/)).toBeTruthy();
  });

  it("renders 'dagen' (plural) when multiple days remain", () => {
    mockDeadline(makeDeadlineData(5));

    const { getByText } = render(<VatReturnDeadlineCard periodType="quarterly" />);

    expect(getByText(/5 dagen/)).toBeTruthy();
  });

  it("passes the periodType to useTaxDeadline", () => {
    mockDeadline(makeDeadlineData(3));

    render(<VatReturnDeadlineCard periodType="monthly" />);

    expect(useTaxDeadline).toHaveBeenCalledWith("monthly");
  });
});
