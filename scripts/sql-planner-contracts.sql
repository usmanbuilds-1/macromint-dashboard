-- Disposable PostgreSQL execution tests for migration 0017.
-- This catches syntax errors and verifies owner isolation in a staging-like
-- role context. It is NOT a substitute for two real Supabase test accounts.
SET ROLE authenticated;
SET request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

DO $test$
DECLARE
  p public.planned_meals%ROWTYPE;
  future_plan public.planned_meals%ROWTYPE;
  first_result jsonb;
  repeated jsonb;
  cnt integer;
BEGIN
  p := public.plan_saved_meal('11111111-1111-4111-8111-111111111111',current_date,'lunch');
  IF p.state <> 'planned' THEN RAISE EXCEPTION 'Plan was prematurely consumed'; END IF;
  SELECT count(*) INTO cnt FROM public.diary_entries WHERE user_id=auth.uid();
  IF cnt <> 0 THEN RAISE EXCEPTION 'Planning created diary rows'; END IF;
  first_result := public.consume_planned_meal(p.id);
  repeated := public.consume_planned_meal(p.id);
  IF first_result->>'alreadyLogged' <> 'false'
     OR repeated->>'alreadyLogged' <> 'true'
     OR first_result->'entryIds' <> repeated->'entryIds' THEN
    RAISE EXCEPTION 'Repeated consumption was not idempotent';
  END IF;
  SELECT count(*) INTO cnt FROM public.diary_entries WHERE user_id=auth.uid();
  IF cnt <> 2 THEN RAISE EXCEPTION 'Expected exactly two diary entries, found %',cnt; END IF;
  IF (SELECT sum((nutrients->>'kcal')::numeric)
      FROM public.diary_entries WHERE user_id=auth.uid()) <> 300 THEN
    RAISE EXCEPTION 'Calorie scaling from explicit grams was incorrect';
  END IF;
  future_plan := public.plan_saved_meal('11111111-1111-4111-8111-111111111111',current_date+10,'dinner');
  BEGIN
    PERFORM public.consume_planned_meal(future_plan.id);
    RAISE EXCEPTION 'Future plan was consumed';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  IF (SELECT state FROM public.planned_meals WHERE id=future_plan.id) <> 'planned'
    THEN RAISE EXCEPTION 'Future plan was modified'; END IF;
END $test$;

DO $test$
DECLARE r public.recipes%ROWTYPE;
  initial jsonb:='[{"name":"Lentils","grams":200,"per100g":{"kcal":300,"protein":20}}]';
  updated jsonb:='[{"name":"Lentils","grams":150,"per100g":{"kcal":300,"protein":20}}]';
  cnt int;
BEGIN
  r:=public.create_recipe_atomic('Home daal',2,null,initial);
  SELECT count(*) INTO cnt FROM public.recipe_ingredients WHERE recipe_id=r.id;
  IF cnt<>1 THEN RAISE EXCEPTION 'Create recipe was incomplete'; END IF;
  PERFORM public.replace_recipe(r.id,'Updated daal',3,'cooked',updated);
  IF (SELECT grams FROM public.recipe_ingredients WHERE recipe_id=r.id LIMIT 1)<>150
    THEN RAISE EXCEPTION 'Recipe edit did not replace ingredient'; END IF;
  BEGIN
    PERFORM public.replace_recipe(r.id,'Invalid',3,'',
      '[{"name":"Lentils","grams":-4,"per100g":{"kcal":300}}]');
    RAISE EXCEPTION 'Bad recipe payload was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  IF (SELECT grams FROM public.recipe_ingredients WHERE recipe_id=r.id LIMIT 1)<>150
     OR (SELECT name FROM public.recipes WHERE id=r.id)<>'Updated daal'
    THEN RAISE EXCEPTION 'Bad ingredient mutated stored recipe'; END IF;
END $test$;

-- Invalid goal ranges are rejected by the real CHECK constraint.
DO $test$
BEGIN
  UPDATE public.nutritional_goals SET day_targets=
    '{"1":{"calorieTarget":2500,"proteinG":140,"carbsG":260,"fatG":70}}'
    WHERE user_id=auth.uid();
  BEGIN
    UPDATE public.nutritional_goals SET day_targets=
      '{"1":{"calorieTarget":100,"proteinG":140,"carbsG":260,"fatG":70}}'
      WHERE user_id=auth.uid();
    RAISE EXCEPTION 'Invalid target was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $test$;
RESET ROLE;

-- Switch to a second account; row-level owner checks must apply.
SET ROLE authenticated;
SET request.jwt.claim.sub='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
DO $test$
DECLARE
  foreign_plan uuid;
  foreign_recipe uuid;
  cnt integer;
BEGIN
  SELECT count(*) INTO cnt FROM public.planned_meals;
  IF cnt<>0 THEN RAISE EXCEPTION 'Cross-account plans leaked'; END IF;
  BEGIN
    PERFORM public.plan_saved_meal('11111111-1111-4111-8111-111111111111',current_date,'lunch');
    RAISE EXCEPTION 'Another account planned a private meal';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  SELECT id INTO foreign_plan FROM public.planned_meals WHERE user_id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  IF foreign_plan IS NOT NULL THEN RAISE EXCEPTION 'Unauthorized plan enumeration'; END IF;
  SELECT id INTO foreign_plan FROM public.planned_meals; -- RLS still empty
  -- Guess an ID from privileged fixture in separate scalar context (known
  -- UUID payload below is invalid by construction, and must not leak rows).
  BEGIN
    PERFORM public.consume_planned_meal('11111111-1111-4111-8111-111111111111');
    RAISE EXCEPTION 'Consumed foreign/nonexistent plan';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  SELECT count(*) INTO cnt FROM public.recipes;
  IF cnt<>0 THEN RAISE EXCEPTION 'Cross-account recipes leaked'; END IF;
END $test$;
RESET ROLE;
SELECT 'PASS: planner SQL execution, idempotence, recipe rollback, RLS and goals';
