import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bumpData } from "@/lib/backend";
import { useAsyncData } from "./useCachedData";
import { useAppDataInvalidation } from "./useAppDataInvalidation";

let activeUserId = "account-a";
vi.mock("@/context/Session", () => ({
  useSession: () => ({ user: { id: activeUserId } }),
}));

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>
        <Bridge />
        {children}
      </QueryClientProvider>
    );
  };
}

function Bridge() {
  useAppDataInvalidation();
  return null;
}

afterEach(() => {
  activeUserId = "account-a";
});

describe("tab data cache", () => {
  it("reuses previously fetched data on a return visit, then revalidates after a mutation", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const load = vi.fn(async () => ["lunch"]);
    const wrapper = makeWrapper(client);
    const first = renderHook(() => useAsyncData(load, ["2026-11-06"], "diary:day"), { wrapper });
    await waitFor(() => expect(first.result.current.data).toEqual(["lunch"]));
    expect(load).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = renderHook(() => useAsyncData(load, ["2026-11-06"], "diary:day"), { wrapper });
    expect(second.result.current.data).toEqual(["lunch"]);
    expect(load).toHaveBeenCalledTimes(1);

    await act(async () => { bumpData(); });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(second.result.current.data).toEqual(["lunch"]);
    second.unmount();
    client.clear();
  });

  it("never displays another account's cached result after an account switch", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const load = vi.fn(async () => [activeUserId]);
    const wrapper = makeWrapper(client);
    const view = renderHook(() => useAsyncData(load, ["2026-11-06"], "diary:day"), { wrapper });
    await waitFor(() => expect(view.result.current.data).toEqual(["account-a"]));

    activeUserId = "account-b";
    view.rerender();
    expect(view.result.current.data).toBeNull();
    await waitFor(() => expect(view.result.current.data).toEqual(["account-b"]));
    expect(load).toHaveBeenCalledTimes(2);
    view.unmount();
    client.clear();
  });
});
