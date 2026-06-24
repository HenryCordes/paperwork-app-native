import { renderRouter, screen } from "expo-router/testing-library";

it("renders the dashboard placeholder at /dashboard", async () => {
  renderRouter("src/app", { initialUrl: "/dashboard" });
  // "Dashboard" also appears as the tab label and the drawer item, so this
  // asserts on the placeholder's subtitle, which renders exactly once.
  expect(await screen.findByText(/Bouwt in een latere fase/i)).toBeOnTheScreen();
});

it("redirects from / to /dashboard instead of hitting Unmatched Route", async () => {
  renderRouter("src/app", { initialUrl: "/" });
  expect(await screen.findByText(/Bouwt in een latere fase/i)).toBeOnTheScreen();
});
