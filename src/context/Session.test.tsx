import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionProvider, useSession } from "./Session";

const mock = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  getProfile: vi.fn(),
  getGoals: vi.fn(),
  getEntitlement: vi.fn(),
  amIAdmin: vi.fn(),
  onAuthChange: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/backend", () => ({ backend: mock }));

const userA = { id: "account-a", email: "a@example.test", emailVerified: true };
let activeUser: typeof userA | null;
let authCallback: ((u: typeof userA | null) => void) | null;

function Gate() {
  const { loading, user, profile, refresh } = useSession();
  if (loading || !user) return <p>Loading gate</p>;
  return (
    <section>
      <nav data-testid="stable-tabs">Today Diary Foods Progress</nav>
      <span data-testid="profile">{profile?.name ?? "not loaded"}</span>
      <button onClick={() => { void refresh(); }}>Check account</button>
    </section>
  );
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  activeUser = userA;
  authCallback = null;
  mock.getSessionUser.mockImplementation(async () => activeUser);
  mock.getProfile.mockImplementation(async () => ({
    userId: activeUser?.id ?? "account-a", name: "Demo", onboardedAt: "2026-11-01T00:00:00Z",
  }));
  mock.getGoals.mockResolvedValue({ calorieTarget: 2000 });
  mock.getEntitlement.mockResolvedValue({
    state: "trial_active", trialEndsAt: "2099-12-31T00:00:00Z",
  });
  mock.amIAdmin.mockResolvedValue(false);
  mock.signOut.mockResolvedValue(undefined);
  mock.onAuthChange.mockImplementation((callback) => {
    authCallback = callback;
    callback(activeUser); // both Supabase INITIAL_SESSION and demo do this
    return () => {};
  });
});

afterEach(() => {
  authCallback = null;
});

describe("stable session on ordinary auth events", () => {
  it("initializes exactly once and keeps tab navigation mounted for repeat SIGNED_IN notifications", async () => {
    render(<SessionProvider><Gate /></SessionProvider>, { wrapper: makeWrapper() });
    await screen.findByTestId("stable-tabs");
    expect(mock.getProfile).toHaveBeenCalledTimes(1);

    await act(async () => { authCallback?.({ ...userA }); });
    expect(screen.getByTestId("stable-tabs")).toBeInTheDocument();
    expect(screen.queryByText("Loading gate")).not.toBeInTheDocument();
    expect(mock.getProfile).toHaveBeenCalledTimes(1);

    // Background account check returns the same values: no loading gate.
    await act(async () => { screen.getByRole("button", { name: "Check account" }).click(); });
    await waitFor(() => expect(mock.getProfile).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("stable-tabs")).toBeInTheDocument();
    expect(screen.queryByText("Loading gate")).not.toBeInTheDocument();
  });

  it("cannot restore private data when a pending request finishes after sign-out", async () => {
    render(<SessionProvider><Gate /></SessionProvider>, { wrapper: makeWrapper() });
    await screen.findByTestId("stable-tabs");
    let resolveProfile: ((value: unknown) => void) | undefined;
    mock.getProfile.mockImplementation(() => new Promise((resolve) => { resolveProfile = resolve; }));

    await act(async () => { screen.getByRole("button", { name: "Check account" }).click(); });
    await waitFor(() => expect(resolveProfile).toBeDefined());

    activeUser = null;
    await act(async () => { authCallback?.(null); });
    expect(screen.queryByTestId("stable-tabs")).not.toBeInTheDocument();

    await act(async () => { resolveProfile?.({ userId: "account-a", name: "Should not appear" }); });
    expect(screen.queryByTestId("stable-tabs")).not.toBeInTheDocument();
    expect(screen.queryByText("Should not appear")).not.toBeInTheDocument();
  });
});
