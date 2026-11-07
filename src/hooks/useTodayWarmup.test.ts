import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { appDataKey } from "./app-data-key";
import { warmTodayQueries } from "./useTodayWarmup";

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}
const day = "2026-11-06";

describe("Today diary-only warmup", () => {
  it("warms exactly the critical diary key and never preloads water", async () => {
    const client = newClient();
    const diary = vi.fn(async () => []);
    await warmTodayQueries(client, "account-a", day, { diary });
    expect(client.getQueryData(appDataKey("account-a", "diary:day", [day]))).toEqual([]);
    expect(client.getQueryData(appDataKey("account-a", "water:day", [day]))).toBeUndefined();
    await warmTodayQueries(client, "account-a", day, { diary });
    expect(diary).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it("never shares cached diary records across accounts", async () => {
    const client = newClient();
    const diaryA = vi.fn(async () => []);
    await warmTodayQueries(client, "account-a", day, { diary: diaryA });
    const diaryB = vi.fn(async () => []);
    expect(client.getQueryData(appDataKey("account-b", "diary:day", [day]))).toBeUndefined();
    await warmTodayQueries(client, "account-b", day, { diary: diaryB });
    expect(diaryB).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it("deduplicates concurrent warmup and foreground reads", async () => {
    const client = newClient();
    let resolveDiary: ((value: []) => void) | undefined;
    const diary = vi.fn(() => new Promise<[]>((resolve) => { resolveDiary = resolve; }));
    const warmup = warmTodayQueries(client, "account-a", day, { diary });
    const foreground = client.fetchQuery({
      queryKey: appDataKey("account-a", "diary:day", [day]),
      queryFn: diary,
    });
    expect(diary).toHaveBeenCalledTimes(1);
    resolveDiary?.([]);
    await Promise.all([warmup, foreground]);
    expect(diary).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it("rechecks diary data after a mutation invalidates the account scope", async () => {
    const client = newClient();
    const diary = vi.fn(async () => []);
    await warmTodayQueries(client, "account-a", day, { diary });
    await client.invalidateQueries({ queryKey: ["app-data", "account-a"], refetchType: "none" });
    await warmTodayQueries(client, "account-a", day, { diary });
    expect(diary).toHaveBeenCalledTimes(2);
    client.clear();
  });
});
