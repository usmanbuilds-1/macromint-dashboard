-- Disposable PostgreSQL-only fixtures for migration 0017.
-- Never apply these stub tables/functions to any real Supabase project.
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $sql$ BEGIN NEW.updated_at=now(); RETURN NEW; END $sql$;

CREATE OR REPLACE FUNCTION public.has_access(uid uuid DEFAULT auth.uid()) RETURNS boolean
LANGUAGE sql STABLE AS $sql$
  SELECT uid IS NOT NULL AND uid=auth.uid();
$sql$;

CREATE TABLE public.nutritional_goals (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  calorie_target integer NOT NULL DEFAULT 2200
);
CREATE TABLE public.saved_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  items jsonb NOT NULL
);
CREATE TABLE public.foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id),
  name text NOT NULL
);
CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  servings numeric NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  food_id uuid REFERENCES public.foods(id),
  name text NOT NULL,
  grams numeric NOT NULL,
  per100g jsonb NOT NULL,
  position integer NOT NULL DEFAULT 0
);
CREATE TABLE public.diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  meal_type text NOT NULL,
  food_id uuid REFERENCES public.foods(id),
  recipe_id uuid REFERENCES public.recipes(id),
  name text NOT NULL,
  brand text,
  grams numeric NOT NULL,
  portion_percent numeric NOT NULL DEFAULT 100,
  base_nutrients jsonb NOT NULL,
  nutrients jsonb NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_saved ON public.saved_meals TO authenticated
  USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
CREATE POLICY own_recipes ON public.recipes TO authenticated
  USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
CREATE POLICY own_recipe_ingredients ON public.recipe_ingredients TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes WHERE id=recipe_id AND user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes WHERE id=recipe_id AND user_id=auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.saved_meals, public.recipes,public.recipe_ingredients,
  public.nutritional_goals,public.diary_entries,public.foods TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_access(uuid),public.set_updated_at() TO authenticated;

INSERT INTO auth.users(id,email) VALUES
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','planner-a@example.invalid'),
  ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb','planner-b@example.invalid');
INSERT INTO public.saved_meals(id,user_id,name,items) VALUES
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
 'Daal meal','[{"name":"Daal","grams":200,"per100g":{"kcal":100,"protein":7,"fat":2}},{"name":"Roti","grams":40,"per100g":{"kcal":250,"protein":6,"fat":3}}]'),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
 'Private meal','[{"name":"Rice","grams":150,"per100g":{"kcal":130}}]');
INSERT INTO public.nutritional_goals(user_id) VALUES
 ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb');
