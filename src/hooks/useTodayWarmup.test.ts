import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { appDataKey } from "./app-data-key";
import { warmTodayQueries } from "./useTodayWarmup";

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const day = "2026-11-06";

describe("Today's eager data warmup", () => {
  it("prefetches both resources once and shares the exact screen cache keys", async () => {
    const client = newClient();
    const diary = vi.fn(async () => []);
    const water = vi.fn(async () => []);
    await warmTodayQueries(client, "account-a", day, { diary, water });
    expect(client.getQueryData(appDataKey("account-a", "diary:day", [day]))).toEqual([]);
    expect(client.getQueryData(appDataKey("account-a", "water:day", [day]))).toEqual([]);
    await warmTodayQueries(client, "account-a", day, { diary, water });
    expect(diary).toHaveBeenCalledTimes(1);
    expect(water).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it("never serves another account's diary or water", async () => {
    const client = newClient();
    const diaryA = vi.fn(async () => []);
    const waterA = vi.fn(async () => []);
    await warmTodayQueries(client, "account-a", day, { diary: diaryA, water: waterA });
    const diaryB = vi.fn(async () => []);
    const waterB = vi.fn(async () => []);
    expect(client.getQueryData(appDataKey("account-b", "diary:day", [day]))).toBeUndefined();
    await warmTodayQueries(client, "account-b", day, { diary: diaryB, water: waterB });
    expect(diaryB).toHaveBeenCalledTimes(1);
    expect(waterB).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it("deduplicates concurrent warmup and foreground fetches", async () => {
    const client = newClient();
    let resolveDiary: ((value: []) => void) | undefined;
    const diary = vi.fn(() => new Promise<[]>((resolve) => { resolveDiary = resolve; }));
    const water = vi.fn(async () => []);
    const warmup = warmTodayQueries(client, "account-a", day, { diary, water });
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

  it("respects invalidation after meal or water changes", async () => {
    const client = newClient();
    const diary = vi.fn(async () => []);
    const water = vi.fn(async () => []);
    await warmTodayQueries(client, "account-a", day, { diary, water });
    await client.invalidateQueries({ queryKey: ["app-data", "account-a"], refetchType: "none" });
    await warmTodayQueries(client, "account-a", day, { diary, water });
    expect(diary).toHaveBeenCalledTimes(2);
    expect(water).toHaveBeenCalledTimes(2);
    client.clear();
  });
});
