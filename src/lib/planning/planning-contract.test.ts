import { describe,expect,it } from "vitest";
import { readFileSync } from "node:fs";
const migration = readFileSync("drizzle/migrations/0017_planned_meals_goal_days_recipe_edits.sql","utf8");
describe("planning migration security contract",()=>{
  it("uses a per-user RLS table with cascade deletion and explicit access checks",()=>{
    expect(migration).toMatch(/user_id uuid NOT NULL REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
    expect(migration).toMatch(/ALTER TABLE public\.planned_meals ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/GRANT SELECT, DELETE ON public\.planned_meals TO authenticated/);
    expect(migration).toMatch(/auth\.uid\(\) AND public\.has_access\(user_id\)/);
  });
  it("makes consumed transitions single-transaction and idempotent",()=>{
    expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public\.consume_planned_meal/);
    expect(migration).toMatch(/FOR UPDATE/);
    expect(migration).toMatch(/IF p\.state='eaten' THEN/);
    expect(migration).toMatch(/array_append\(v_ids,v_id\)/);
    expect(migration).toMatch(/state='eaten',eaten_at=now\(\),logged_entry_ids=v_ids/);
  });
  it("edits recipe ingredients inside the same database transaction",()=>{
    expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public\.replace_recipe/);
    expect(migration).toMatch(/DELETE FROM public\.recipe_ingredients WHERE recipe_id=p_recipe_id/);
    expect(migration).toMatch(/EXCEPTION|RAISE EXCEPTION/);
    expect(migration.trim()).toMatch(/COMMIT;$/);
  });
});
