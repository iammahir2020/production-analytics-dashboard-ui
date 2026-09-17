import { render, screen } from "@testing-library/react";
import type { AnalyticsSummary } from "@/lib/types/analytics";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { getSummaryStats } from "@/lib/api/analytics";

const summaryFixture: AnalyticsSummary = {
  totalRevenue: 4559700,
  totalOrders: 200,
  activeCustomers: 32,
  conversionRate: 0.0348,
  averageOrderValue: 22800,
  revenueDelta: { changeFraction: 0.12, direction: "up" },
  ordersDelta: { changeFraction: -0.05, direction: "down" },
  revenueSparkline: [1000, 1800, 1500, 2200],
};

// jest.mock() calls are hoisted above every other top-level statement in
// the file (including imports), so the mock factory can't close over an
// outer `summaryFixture` const declared above it in source — by the time
// it actually runs, that const isn't initialized yet. jest.mocked() gives
// a typed handle to the already-mocked function instead, set up inside
// beforeEach once the fixture safely exists.
jest.mock("@/lib/api/analytics", () => ({
  getSummaryStats: jest.fn(),
}));

beforeEach(() => {
  jest.mocked(getSummaryStats).mockResolvedValue(summaryFixture);
});

describe("SummaryCards", () => {
  it("renders the fetched summary values, correctly formatted", async () => {
    // SummaryCards is an async Server Component — it takes no props and
    // fetches its own data via getSummaryStats(). Next's own Jest docs
    // are explicit that Jest doesn't support rendering async Server
    // Components the normal way ("we recommend E2E tests for async
    // components"). Calling the function directly and awaiting the JSX
    // it returns — then handing that already-resolved element to
    // render() — sidesteps that limitation without a real RSC test
    // runner: by the time render() sees it, it's a plain, synchronous
    // React element tree, which is all render() ever needed.
    render(await SummaryCards());

    expect(screen.getByText("৳45,59,700.00")).toBeInTheDocument(); // totalRevenue
    expect(screen.getByText("200")).toBeInTheDocument(); // totalOrders
    expect(screen.getByText("32")).toBeInTheDocument(); // activeCustomers
    expect(screen.getByText("3.5%")).toBeInTheDocument(); // conversionRate
    expect(screen.getByText("৳22,800.00")).toBeInTheDocument(); // averageOrderValue
    expect(screen.getByText("12.0%")).toBeInTheDocument(); // revenueDelta magnitude
    expect(screen.getByText("5.0%")).toBeInTheDocument(); // ordersDelta magnitude
  });
});
