BEGIN;

-- 0017: owner-scoped planned meals and day-specific goals.
-- Apply after 0016. Plan/consume are guarded SECURITY DEFINER RPC transactions; recipe editing runs as invoker.
-- Deployment and two-account RLS tests are independent release gates.

CREATE OR REPLACE FUNCTION public.valid_goal_day_targets(p jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
DECLARE
  t record;
  key text;
  n numeric;
BEGIN
  IF p IS NULL OR jsonb_typeof(p) <> 'object' THEN RETURN false; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(p)) > 7 THEN RETURN false; END IF;
  FOR t IN SELECT * FROM jsonb_each(p) LOOP
    IF t.key !~ '^[0-6]$' OR jsonb_typeof(t.value) <> 'object'
      OR (SELECT count(*) FROM jsonb_object_keys(t.value)) <> 4 THEN RETURN false; END IF;
    FOREACH key IN ARRAY ARRAY['calorieTarget','proteinG','carbsG','fatG'] LOOP
      IF jsonb_typeof(t.value->key) <> 'number' THEN RETURN false; END IF;
      n := (t.value->>key)::numeric;
      IF n <> trunc(n) THEN RETURN false; END IF;
      IF (key='calorieTarget' AND (n < 800 OR n > 10000))
        OR (key='proteinG' AND (n < 10 OR n > 500))
        OR (key='carbsG' AND (n < 0 OR n > 1200))
        OR (key='fatG' AND (n < 10 OR n > 400)) THEN RETURN false; END IF;
    END LOOP;
  END LOOP;
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

ALTER TABLE public.nutritional_goals
  ADD COLUMN IF NOT EXISTS day_targets jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.nutritional_goals
  DROP CONSTRAINT IF EXISTS nutritional_goals_day_targets_valid;
ALTER TABLE public.nutritional_goals
  ADD CONSTRAINT nutritional_goals_day_targets_valid
  CHECK (public.valid_goal_day_targets(day_targets));

CREATE TABLE IF NOT EXISTS public.planned_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snacks')),
  saved_meal_id uuid REFERENCES public.saved_meals(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  items jsonb NOT NULL CHECK (jsonb_typeof(items) = 'array'),
  state text NOT NULL DEFAULT 'planned' CHECK (state IN ('planned','eaten')),
  logged_entry_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  eaten_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT planned_meals_state_consistency CHECK (
    (state='planned' AND eaten_at IS NULL AND cardinality(logged_entry_ids)=0) OR
    (state='eaten' AND eaten_at IS NOT NULL AND cardinality(logged_entry_ids)>0)
  )
);
CREATE INDEX IF NOT EXISTS planned_meals_user_date_idx
  ON public.planned_meals (user_id, entry_date, created_at);
ALTER TABLE public.planned_meals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.planned_meals FROM public, anon;
GRANT SELECT, DELETE ON public.planned_meals TO authenticated;
-- INSERT/UPDATE require the guarded RPCs; clients cannot forge eaten status.
CREATE POLICY "planned_meals own read" ON public.planned_meals FOR SELECT TO authenticated
  USING (user_id=auth.uid() AND public.has_access(user_id));
CREATE POLICY "planned_meals own insert" ON public.planned_meals FOR INSERT TO authenticated
  WITH CHECK (user_id=auth.uid() AND public.has_access(user_id) AND state='planned');
CREATE POLICY "planned_meals own update" ON public.planned_meals FOR UPDATE TO authenticated
  USING (user_id=auth.uid() AND public.has_access(user_id))
  WITH CHECK (user_id=auth.uid() AND public.has_access(user_id));
CREATE POLICY "planned_meals own delete" ON public.planned_meals FOR DELETE TO authenticated
  USING (user_id=auth.uid() AND public.has_access(user_id) AND state='planned');
CREATE TRIGGER planned_meals_updated BEFORE UPDATE ON public.planned_meals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Snapshot only a saved meal belonging to the authenticated user. Nothing
-- enters the diary until the user explicitly marks this plan as eaten.
CREATE OR REPLACE FUNCTION public.plan_saved_meal(
  p_saved_meal_id uuid, p_entry_date date, p_meal_type text
) RETURNS public.planned_meals LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
DECLARE m public.saved_meals%ROWTYPE; out_plan public.planned_meals%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_access(auth.uid()) THEN
    RAISE EXCEPTION 'Active account required' USING ERRCODE='42501';
  END IF;
  IF p_entry_date IS NULL OR p_entry_date < current_date-31 OR p_entry_date > current_date+365
     OR p_meal_type NOT IN ('breakfast','lunch','dinner','snacks') THEN
    RAISE EXCEPTION 'Invalid planning date or meal' USING ERRCODE='22023';
  END IF;
  SELECT * INTO m FROM public.saved_meals
    WHERE id=p_saved_meal_id AND user_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Saved meal unavailable' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(m.items) <> 'array' OR jsonb_array_length(m.items) NOT BETWEEN 1 AND 30
     OR octet_length(m.items::text) > 50000 THEN
    RAISE EXCEPTION 'Saved meal data is invalid' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.planned_meals(user_id,entry_date,meal_type,saved_meal_id,name,items)
    VALUES(auth.uid(),p_entry_date,p_meal_type,m.id,m.name,m.items)
    RETURNING * INTO out_plan;
  RETURN out_plan;
END $$;

-- This entire RPC is one transaction. Row-level FOR UPDATE serialization
-- means a retry or double click cannot create duplicate diary entries.
CREATE OR REPLACE FUNCTION public.consume_planned_meal(p_plan_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
DECLARE
  p public.planned_meals%ROWTYPE;
  item jsonb;
  pair record;
  g numeric;
  v_base jsonb;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_id uuid;
  v_name text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_access(auth.uid()) THEN
    RAISE EXCEPTION 'Active account required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO p FROM public.planned_meals
    WHERE id=p_plan_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan unavailable' USING ERRCODE='42501'; END IF;
  IF p.state='eaten' THEN
    RETURN jsonb_build_object('state','eaten','entryIds',to_jsonb(p.logged_entry_ids),'alreadyLogged',true);
  END IF;
  -- Allow one-day UTC/local-day variance; reject clearly future consumption.
  IF p.entry_date > current_date + 1 THEN
    RAISE EXCEPTION 'Cannot log a future planned meal' USING ERRCODE='22023';
  END IF;
  IF jsonb_typeof(p.items) <> 'array' OR jsonb_array_length(p.items) NOT BETWEEN 1 AND 30
     OR octet_length(p.items::text) > 50000 THEN
    RAISE EXCEPTION 'Invalid planned meal' USING ERRCODE='22023';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p.items) LOOP
    v_name := btrim(item->>'name');
    IF jsonb_typeof(item) <> 'object'
       OR char_length(coalesce(v_name,'')) NOT BETWEEN 1 AND 160
       OR jsonb_typeof(item->'grams') <> 'number'
       OR jsonb_typeof(item->'per100g') <> 'object' THEN
      RAISE EXCEPTION 'Invalid planned ingredient' USING ERRCODE='22023';
    END IF;
    g := (item->>'grams')::numeric;
    IF g < 0.1 OR g > 10000 THEN RAISE EXCEPTION 'Invalid grams' USING ERRCODE='22023'; END IF;
    v_base := '{}'::jsonb;
    FOR pair IN SELECT key, value FROM jsonb_each(item->'per100g') LOOP
      IF pair.key NOT IN ('kcal','protein','carbs','fat','fiber','sugar','satFat',
        'transFat','cholesterol','sodium','potassium','calcium','iron','magnesium','zinc',
        'vitaminA','vitaminC','vitaminD','vitaminE','vitaminK','thiamin','riboflavin',
        'niacin','vitaminB6','folate','vitaminB12') THEN
        RAISE EXCEPTION 'Invalid nutrient key' USING ERRCODE='22023';
      END IF;
      IF pair.value = 'null'::jsonb THEN
        v_base := v_base || jsonb_build_object(pair.key,null);
      ELSIF jsonb_typeof(pair.value)='number'
        AND (pair.value::text)::numeric BETWEEN 0 AND 1000000 THEN
        v_base := v_base || jsonb_build_object(pair.key,round((pair.value::text)::numeric*g/100,1));
      ELSE
        RAISE EXCEPTION 'Invalid nutrient quantity' USING ERRCODE='22023';
      END IF;
    END LOOP;
    -- Null food_id is deliberate: saved snapshots may outlive deleted foods,
    -- and this avoids linking a plan to a different user's private food.
    INSERT INTO public.diary_entries(
      user_id,entry_date,meal_type,food_id,recipe_id,name,brand,grams,
      portion_percent,base_nutrients,nutrients,source
    ) VALUES (
      auth.uid(),p.entry_date,p.meal_type,null,null,v_name,
      nullif(btrim(coalesce(item->>'brand','')),''),
      g,100,v_base,v_base,'favorite'
    ) RETURNING id INTO v_id;
    v_ids := array_append(v_ids,v_id);
  END LOOP;
  UPDATE public.planned_meals SET
    state='eaten',eaten_at=now(),logged_entry_ids=v_ids
    WHERE id=p.id;
  RETURN jsonb_build_object('state','eaten','entryIds',to_jsonb(v_ids),'alreadyLogged',false);
END $$;

-- Recipe ingredient mutations happen within one database transaction. Diary
-- entries are snapshots and retain their originally logged nutrient values.
CREATE OR REPLACE FUNCTION public.replace_recipe(
  p_recipe_id uuid, p_name text, p_servings numeric, p_notes text, p_ingredients jsonb
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path = pg_catalog, public AS $$
DECLARE
  r public.recipes%ROWTYPE;
  item jsonb;
  pair record;
  idx int := 0;
  g numeric;
  source_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_access(auth.uid()) THEN
    RAISE EXCEPTION 'Active account required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO r FROM public.recipes
    WHERE id=p_recipe_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recipe unavailable' USING ERRCODE='42501'; END IF;
  IF char_length(btrim(coalesce(p_name,''))) NOT BETWEEN 1 AND 100
     OR p_servings IS NULL OR p_servings < 0.5 OR p_servings > 50
     OR char_length(coalesce(p_notes,'')) > 2000
     OR jsonb_typeof(p_ingredients) <> 'array'
     OR jsonb_array_length(p_ingredients) NOT BETWEEN 1 AND 30
     OR octet_length(p_ingredients::text) > 50000 THEN
    RAISE EXCEPTION 'Invalid recipe' USING ERRCODE='22023';
  END IF;
  -- Validate the entire payload *before* touching existing ingredients.
  FOR item IN SELECT value FROM jsonb_array_elements(p_ingredients) LOOP
    IF jsonb_typeof(item) <> 'object'
       OR char_length(btrim(coalesce(item->>'name',''))) NOT BETWEEN 1 AND 160
       OR jsonb_typeof(item->'grams') <> 'number'
       OR jsonb_typeof(item->'per100g') <> 'object' THEN
      RAISE EXCEPTION 'Invalid recipe ingredient' USING ERRCODE='22023';
    END IF;
    g := (item->>'grams')::numeric;
    IF g < 0.1 OR g > 10000 THEN RAISE EXCEPTION 'Invalid recipe grams' USING ERRCODE='22023'; END IF;
    FOR pair IN SELECT key,value FROM jsonb_each(item->'per100g') LOOP
      IF pair.key NOT IN ('kcal','protein','carbs','fat','fiber','sugar','satFat',
        'transFat','cholesterol','sodium','potassium','calcium','iron','magnesium','zinc',
        'vitaminA','vitaminC','vitaminD','vitaminE','vitaminK','thiamin','riboflavin',
        'niacin','vitaminB6','folate','vitaminB12')
        OR (pair.value <> 'null'::jsonb AND
          (jsonb_typeof(pair.value) <> 'number'
           OR (pair.value::text)::numeric NOT BETWEEN 0 AND 1000000)) THEN
        RAISE EXCEPTION 'Invalid recipe nutrient' USING ERRCODE='22023';
      END IF;
    END LOOP;
  END LOOP;
  UPDATE public.recipes SET name=btrim(p_name),servings=p_servings,notes=nullif(btrim(coalesce(p_notes,'')),'')
    WHERE id=p_recipe_id AND user_id=auth.uid();
  DELETE FROM public.recipe_ingredients WHERE recipe_id=p_recipe_id;
  FOR item IN SELECT value FROM jsonb_array_elements(p_ingredients) LOOP
    source_id := null;
    IF item ? 'foodId' AND item->>'foodId' IS NOT NULL AND item->>'foodId' <> '' THEN
      source_id := (item->>'foodId')::uuid;
      IF NOT EXISTS (SELECT 1 FROM public.foods f WHERE f.id=source_id
        AND (f.owner_id IS NULL OR f.owner_id=auth.uid())) THEN
        RAISE EXCEPTION 'Ingredient source unavailable' USING ERRCODE='42501';
      END IF;
    END IF;
    INSERT INTO public.recipe_ingredients(recipe_id,food_id,name,grams,per100g,position)
      VALUES(p_recipe_id,source_id,btrim(item->>'name'),(item->>'grams')::numeric,item->'per100g',idx);
    idx := idx+1;
  END LOOP;
  RETURN true;
END $$;

-- Creation uses the same exhaustive ingredient validator and the same
-- transaction as recipe replacement. Failure rolls back the parent INSERT.
CREATE OR REPLACE FUNCTION public.create_recipe_atomic(
  p_name text, p_servings numeric, p_notes text, p_ingredients jsonb
) RETURNS public.recipes LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path = pg_catalog, public AS $
DECLARE r public.recipes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_access(auth.uid()) THEN
    RAISE EXCEPTION 'Active account required' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.recipes(user_id,name,servings,notes)
    VALUES(auth.uid(),coalesce(p_name,''),p_servings,p_notes) RETURNING * INTO r;
  PERFORM public.replace_recipe(r.id,p_name,p_servings,p_notes,p_ingredients);
  SELECT * INTO r FROM public.recipes WHERE id=r.id AND user_id=auth.uid();
  RETURN r;
END $;

REVOKE ALL ON FUNCTION public.plan_saved_meal(uuid,date,text),
  public.consume_planned_meal(uuid),
  public.replace_recipe(uuid,text,numeric,text,jsonb),
  public.create_recipe_atomic(text,numeric,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.plan_saved_meal(uuid,date,text),
  public.consume_planned_meal(uuid),
  public.replace_recipe(uuid,text,numeric,text,jsonb),
  public.create_recipe_atomic(text,numeric,text,jsonb) TO authenticated;

COMMIT;
