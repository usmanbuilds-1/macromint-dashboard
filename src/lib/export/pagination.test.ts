import { describe, expect, it } from "vitest";
import { EXPORT_PAGE_SIZE, fetchEveryExportPage } from "./pagination";

describe("account data export never silently truncates", () => {
  it("downloads multiple pages past the default 1000-row response limit", async () => {
    const rows = Array.from({ length: 1051 }, (_, i) => ({ id: i + 1 }));
    const requested: Array<[number, number]> = [];
    const result = await fetchEveryExportPage("diary", (from, to) => {
      requested.push([from, to]);
      return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
    });
    expect(result).toHaveLength(1051);
    expect(result.at(-1)?.id).toBe(1051);
    expect(requested).toHaveLength(5);
    expect(requested[0]).toEqual([0, EXPORT_PAGE_SIZE - 1]);
  });
  it("rejects an error on later pages instead of reporting a partial download", async () => {
    let calls = 0;
    await expect(fetchEveryExportPage("weight", () => {
      calls++;
      return Promise.resolve(calls === 2
        ? { data: null, error: { message: "Database unavailable" } }
        : { data: Array.from({ length: EXPORT_PAGE_SIZE }, (_, i) => ({ id: i })), error: null });
    })).rejects.toThrow("Could not export weight: Database unavailable");
  });
  it("treats unexplained null results as failures, not empty collections", async () => {
    await expect(fetchEveryExportPage("goals", async () => ({ data: null, error: null })))
      .rejects.toThrow(/did not return records/);
  });
  it("handles no entries and an exact full page", async () => {
    expect(await fetchEveryExportPage("diary", async () => ({ data: [], error: null }))).toEqual([]);
    const rows = Array.from({length:EXPORT_PAGE_SIZE},(_,i)=>i);
    let calls=0;
    expect(await fetchEveryExportPage("diary",async (start,end)=>{
      calls++;
      return {data:rows.slice(start,end+1),error:null};
    })).toHaveLength(EXPORT_PAGE_SIZE);
    expect(calls).toBe(2);
  });
});
