import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Register } from "./Register";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  getSessionUser: vi.fn(),
  setAuthUser: vi.fn(),
  refresh: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => mocks.navigate,
}));
vi.mock("./AuthShell", () => ({
  AuthShell: ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) =>
    <main><h1>{title}</h1><p>{subtitle}</p>{children}</main>,
}));
vi.mock("@/context/Session", () => ({
  useSession: () => ({ setAuthUser: mocks.setAuthUser, refresh: mocks.refresh }),
}));
vi.mock("@/lib/backend", () => ({
  backend: { signUp: mocks.signUp, signIn: mocks.signIn, getSessionUser: mocks.getSessionUser },
  BackendError: class BackendError extends Error {},
  IS_DEMO: false,
}));
vi.mock("@/lib/beta/config", () => ({
  INVITE_REGISTRATION_ENABLED: false, PUBLIC_REGISTRATION_ENABLED: true,
}));
vi.mock("@/lib/auth/username-config", () => ({
  USERNAME_AUTH_ENABLED: true, USERNAME_MIN_PASSWORD_LENGTH: 12,
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe("Username signup recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signUp.mockResolvedValue({
      needsVerification: false,
      recoveryCodes: Array.from({ length: 8 }, (_, index) => `demo-code-${index + 1}`),
    });
    mocks.signIn.mockResolvedValue(undefined);
    mocks.getSessionUser.mockResolvedValue({
      id: "registered-user", email: "tester@macromint.internal", emailVerified: false,
    });
    mocks.refresh.mockResolvedValue(undefined);
  });

  it("actually displays the eight issued codes and gates navigation on acknowledgement", async () => {
    render(<Register />);
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "tester" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a-long-unique-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("heading", { name: "Save your recovery codes" })).toBeInTheDocument();
    const codes = screen.getByLabelText("One-time backup recovery codes");
    expect(codes.querySelectorAll("code")).toHaveLength(8);
    expect(screen.queryByRole("button", { name: "Create account" })).toBeNull();
    const continueButton = screen.getByRole("button", { name: "Continue to onboarding" });
    expect(continueButton).toBeDisabled();
    expect(mocks.signIn).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I have securely saved/i }));
    expect(continueButton).toBeEnabled();
    fireEvent.click(continueButton);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/onboarding", { replace: true }));
    expect(mocks.signIn).toHaveBeenCalledTimes(1);
  });
});
