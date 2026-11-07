import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ProgressStart } from "./ProgressStart";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

describe("Progress first run uses actual logging dates", () => {
  it("displays seven unfilled days without invented streaks or nutrition data", () => {
    render(<ProgressStart foodDays={0} weighIns={0} today="2026-11-07" loggedDates={[]} />);
    expect(screen.getByText("0 of 7 logged")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /no food recorded/ })).toHaveLength(7);
    expect(screen.getByText("0 of 2 days logged")).toBeInTheDocument();
    expect(screen.getByText("0 of 2 weigh-ins recorded")).toBeInTheDocument();
    expect(screen.queryByText(/streak/i)).toBeNull();
  });
  it("marks only persisted days, never counting duplicate meals twice", () => {
    render(<ProgressStart foodDays={2} weighIns={0} today="2026-11-07"
      loggedDates={["2026-11-03", "2026-11-03", "2026-11-06", "2026-10-01"]} />);
    expect(screen.getByText("2 of 7 logged")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /food logged/ })).toHaveLength(2);
    expect(screen.getByRole("img", { name: "2026-11-06: food logged" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log food" })).toHaveAttribute("href", "/diary");
  });
});
