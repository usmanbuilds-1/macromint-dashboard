import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Onboarding } from "./Onboarding";

const mocks = vi.hoisted(() => ({
  updateProfile: vi.fn().mockResolvedValue(undefined),
  refresh: vi.fn().mockResolvedValue(undefined),
  navigate: vi.fn(),
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("@/lib/backend", () => ({ backend: { updateProfile: mocks.updateProfile } }));
vi.mock("@/context/Session", () => ({
  useSession: () => ({ profile: { name: "New Member", username: "newmember" }, refresh: mocks.refresh }),
}));
vi.mock("@/components/app/BrandMark", () => ({ Logo: () => <span>Macro Mint</span> }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe("first food before optional goals", () => {
  it("offers a single fast start that persists onboarding without invented goals", async () => {
    vi.clearAllMocks();
    mocks.updateProfile.mockResolvedValue(undefined);
    mocks.refresh.mockResolvedValue(undefined);
    render(<Onboarding />);
    expect(screen.getByRole("heading", { name: "Start with your first meal." })).toBeInTheDocument();
    expect(screen.queryByLabelText("Age")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start logging now" }));
    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ onboardedAt: expect.any(String), units: "metric" }),
    ));
    expect(mocks.navigate).toHaveBeenCalledWith("/today", { replace: true });
  });
  it("keeps personalized target setup available without forcing it", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByRole("button", { name: "Set up my calorie targets instead" }));
    expect(screen.getByRole("heading", { name: "A few basics" })).toBeInTheDocument();
    expect(screen.getByLabelText("Age")).toBeInTheDocument();
  });
});
