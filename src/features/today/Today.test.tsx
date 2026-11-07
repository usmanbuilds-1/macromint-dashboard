import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { TodayOverview } from "./TodayOverview";
import { TodayMeals } from "./TodayMeals";
import type { DiaryEntry } from "@/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) =>
    <a href={to} {...rest}>{children}</a>,
}));

const onRetry = vi.fn();
const onAddMeal = vi.fn();

describe("Today: clear hierarchy and contextual entry", () => {
  it("shows real numbers without an oversized calorie ring", () => {
    const { container } = render(
      <TodayOverview
        totals={{ kcal: 1420, protein: 91, carbs: 152, fat: 44 }}
        target={2200} proteinTarget={120} carbsTarget={250} fatTarget={70}
        loading={false} hasEntries
      />,
    );
    expect(screen.getByRole("heading", { name: "Today’s nutrition" })).toBeInTheDocument();
    expect(screen.getByText("1,420")).toBeInTheDocument();
    expect(screen.getByText(/780 kcal to your daily target/)).toBeInTheDocument();
    const meter = screen.getByRole("progressbar", { name: "Daily calorie progress" });
    expect(meter).toHaveAttribute("aria-valuenow", "1420");
    expect(meter).toHaveAttribute("aria-valuemax", "2200");
    expect(container.querySelector("svg, .mm-today-arc")).toBeNull();
  });

  it("shows genuine empty-day calorie and macro targets without invented intake", () => {
    const { container } = render(
      <TodayOverview totals={{}} target={2100} proteinTarget={130} carbsTarget={250}
        fatTarget={70} hasEntries={false} loading={false} />,
    );
    expect(screen.getByRole("heading", { name: "Daily target" })).toBeInTheDocument();
    expect(screen.getByText("2,100")).toBeInTheDocument();
    expect(container.querySelector(".mm-home-calories")).toBeNull();
    expect(container.querySelector(".mm-home-macro-grid")).toBeNull();
    expect(screen.getByRole("progressbar", { name: "Daily calorie progress" })).toHaveAttribute("aria-valuenow", "0");
    expect(container.querySelector(".mm-home-macro-plan")).toBeInTheDocument();
  });

  it("shows that nutrition is unknown rather than inventing zero calories", () => {
    const { container } = render(
      <TodayOverview totals={{ protein: null }} target={1800} proteinTarget={100}
        carbsTarget={200} fatTarget={60} hasEntries loading={false} />,
    );
    expect(screen.getByText("Calories aren't available for the foods entered yet.")).toBeInTheDocument();
    expect(container.querySelector(".mm-home-calories")?.textContent).toBe("—");
  });

  it("suggests a relevant first meal instead of rendering four empty sections", () => {
    onAddMeal.mockClear();
    const { container } = render(
      <TodayMeals entries={[]} error={null} loading={false}
        onRetry={onRetry} onAddMeal={onAddMeal} suggestedMeal="lunch" />,
    );
    expect(screen.getByText("Nothing logged yet")).toBeInTheDocument();
    expect(container.querySelectorAll(".mm-home-meal")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Add lunch" })).toBeNull();
  });

  it("keeps meal-specific logging and honest calorie values available", () => {
    const meal = {
      id: "logged-1", entryDate: "2026-11-06", mealType: "dinner",
      name: "Chapati", grams: 80, nutrients: { kcal: 170 },
    } as DiaryEntry;
    onAddMeal.mockClear();
    render(
      <TodayMeals entries={[meal]} error={null} loading={false}
        onRetry={onRetry} onAddMeal={onAddMeal} suggestedMeal="dinner" />,
    );
    expect(screen.getByText("Chapati")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Dinner.*1 item/ }));
    expect(screen.queryByText("Chapati")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Dinner.*1 item/ }));
    expect(screen.getByText("Chapati")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add food to Dinner" }));
    expect(onAddMeal).toHaveBeenCalledWith("dinner");
  });
});
