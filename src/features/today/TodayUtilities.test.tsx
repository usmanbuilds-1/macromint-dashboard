import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TodayUtilities } from "./TodayUtilities";

const spy = vi.hoisted(() => ({ enabled: false, add: vi.fn(), loader: vi.fn() }));
vi.mock("@/lib/backend", () => ({
  backend: { getWater: (...args: unknown[]) => spy.loader(...args) },
}));
vi.mock("@/hooks/useData", () => ({
  useAsyncData: (_loader: unknown, _deps: unknown, _key: string, enabled: boolean) => {
    spy.enabled = enabled;
    return { data: null, loading: enabled, error: null, reload: vi.fn() };
  },
}));
describe("Today secondary water utility", () => {
  it("keeps the water request disabled until opened", async () => {
    render(<TodayUtilities date="2026-11-07" waterTarget={2200} onAddWater={spy.add} />);
    expect(spy.enabled).toBe(false);
    expect(screen.getByText("Optional")).toBeInTheDocument();
    const details = screen.getByText("Water").closest("details");
    expect(details).not.toBeNull();
    fireEvent.toggle(details!, { target: { open: true } });
    await waitFor(() => expect(spy.enabled).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "Add 250 ml" }));
    expect(spy.add).toHaveBeenCalledTimes(1);
  });
});
