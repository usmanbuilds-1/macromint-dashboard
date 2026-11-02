-- ═══════════════════════════════════════════════════════════════════════
-- Macromint 0004 — seed foods
-- Reference values for whole foods follow USDA-style composition data
-- (rounded). Composite dishes are marked verified = false: they are
-- estimates, and the UI labels them as such. Absent micronutrient keys
-- mean "unavailable" — never zero.
-- ═══════════════════════════════════════════════════════════════════════

insert into public.foods (owner_id, name, brand, category, source, verified, per100g, serving_label, serving_grams) values
-- Grains and staples
(null, 'Basmati rice, uncooked', null, 'Grains', 'seed', true, '{"kcal":356,"protein":8.1,"carbs":78.6,"fat":0.7,"fiber":1.7}', '100 g', 100),
(null, 'Basmati rice, cooked', null, 'Grains', 'seed', true, '{"kcal":130,"protein":2.7,"carbs":28,"fat":0.3}', '1 cup (160 g)', 160),
(null, 'Whole wheat flour (atta)', null, 'Grains', 'seed', true, '{"kcal":340,"protein":12,"carbs":72,"fat":1.9,"fiber":11,"iron":3.6}', '100 g', 100),
(null, 'Chapati (roti)', null, 'Grains', 'seed', true, '{"kcal":264,"protein":8.6,"carbs":46,"fat":6.5,"fiber":4.9,"iron":2.2}', '1 roti (40 g)', 40),
(null, 'Naan', null, 'Grains', 'seed', true, '{"kcal":310,"protein":8.7,"carbs":50,"fat":8.7,"fiber":2.2,"sodium":320}', '1 naan (90 g)', 90),
(null, 'Paratha', null, 'Prepared dishes', 'seed', false, '{"kcal":330,"protein":6.5,"carbs":38,"fat":16.5,"fiber":3}', '1 paratha (80 g)', 80),
(null, 'White bread', null, 'Grains', 'seed', true, '{"kcal":265,"protein":9,"carbs":49,"fat":3.2,"fiber":2.7,"sugar":5,"sodium":490}', '1 slice (30 g)', 30),
(null, 'Brown bread', null, 'Grains', 'seed', true, '{"kcal":247,"protein":10,"carbs":41,"fat":3.4,"fiber":6,"sugar":4.5,"sodium":450}', '1 slice (30 g)', 30),
(null, 'Oats, dry', null, 'Grains', 'seed', true, '{"kcal":389,"protein":16.9,"carbs":66.3,"fat":6.9,"fiber":10.6,"iron":4.7,"magnesium":177}', '40 g', 40),
(null, 'Cornflakes', null, 'Grains', 'seed', true, '{"kcal":357,"protein":7.5,"carbs":84,"fat":0.4,"sugar":8,"sodium":729,"iron":28}', '30 g', 30),
(null, 'Pasta, uncooked', null, 'Grains', 'seed', true, '{"kcal":371,"protein":13,"carbs":75,"fat":1.5,"fiber":3.2}', '100 g', 100),
(null, 'Pasta, cooked', null, 'Grains', 'seed', true, '{"kcal":158,"protein":5.8,"carbs":30.9,"fat":0.9,"fiber":1.8}', '1 cup (140 g)', 140),
(null, 'Instant noodles, dry block', null, 'Grains', 'seed', true, '{"kcal":436,"protein":9,"carbs":60,"fat":17,"fiber":2.5,"sodium":1700}', '1 block (70 g)', 70),
(null, 'Quinoa, uncooked', null, 'Grains', 'seed', true, '{"kcal":368,"protein":14.1,"carbs":64.2,"fat":6.1,"fiber":7,"iron":4.6,"magnesium":197}', '100 g', 100),

-- Legumes and plant protein
(null, 'Red lentils (masoor), uncooked', null, 'Legumes', 'seed', true, '{"kcal":358,"protein":24,"carbs":63,"fat":1.1,"fiber":10.7,"iron":7.4,"folate":204}', '100 g', 100),
(null, 'Cooked red lentils (dal)', null, 'Legumes', 'seed', true, '{"kcal":116,"protein":9,"carbs":20,"fat":0.4,"fiber":7.6,"iron":3.3}', '100 g', 100),
(null, 'Chickpeas, uncooked', null, 'Legumes', 'seed', true, '{"kcal":378,"protein":20.5,"carbs":61,"fat":6,"fiber":17.4,"iron":6.2,"folate":557}', '100 g', 100),
(null, 'Chickpeas, cooked', null, 'Legumes', 'seed', true, '{"kcal":164,"protein":8.9,"carbs":27.4,"fat":2.6,"fiber":7.6,"iron":2.9}', '100 g', 100),
(null, 'Black beans, cooked', null, 'Legumes', 'seed', true, '{"kcal":132,"protein":8.9,"carbs":23.7,"fat":0.5,"fiber":8.7,"iron":2.1}', '100 g', 100),
(null, 'Kidney beans (rajma), cooked', null, 'Legumes', 'seed', true, '{"kcal":127,"protein":8.7,"carbs":22.8,"fat":0.5,"fiber":6.4,"iron":2.2}', '100 g', 100),
(null, 'Mung beans, cooked', null, 'Legumes', 'seed', true, '{"kcal":105,"protein":7.6,"carbs":19.2,"fat":0.4,"fiber":7.6,"iron":1.4}', '100 g', 100),
(null, 'Tofu, firm', null, 'Legumes', 'seed', true, '{"kcal":144,"protein":17.3,"carbs":2.8,"fat":8.7,"calcium":350,"iron":2.7}', '100 g', 100),
(null, 'Soy chunks', null, 'Legumes', 'seed', true, '{"kcal":345,"protein":52,"carbs":33,"fat":0.5,"fiber":13,"iron":9}', '50 g', 50),

-- Meat, poultry and fish
(null, 'Chicken breast, cooked, skinless', null, 'Meat & fish', 'seed', true, '{"kcal":165,"protein":31,"carbs":0,"fat":3.6,"sodium":74,"niacin":13.7}', '100 g', 100),
(null, 'Chicken thigh, cooked', null, 'Meat & fish', 'seed', true, '{"kcal":209,"protein":26,"carbs":0,"fat":10.9,"iron":1.3,"sodium":88}', '100 g', 100),
(null, 'Beef mince, cooked', null, 'Meat & fish', 'seed', true, '{"kcal":254,"protein":26,"carbs":0,"fat":15.8,"iron":2.6,"zinc":6.3,"vitaminB12":2.6}', '100 g', 100),
(null, 'Beef steak, cooked', null, 'Meat & fish', 'seed', true, '{"kcal":271,"protein":26,"carbs":0,"fat":18,"iron":2.2,"zinc":5.4}', '100 g', 100),
(null, 'Mutton (goat), cooked', null, 'Meat & fish', 'seed', true, '{"kcal":294,"protein":25.6,"carbs":0,"fat":21,"iron":3.9,"vitaminB12":2.6}', '100 g', 100),
(null, 'Egg, boiled', null, 'Meat & fish', 'seed', true, '{"kcal":155,"protein":12.6,"carbs":1.1,"fat":10.6,"cholesterol":373,"vitaminD":2.2,"vitaminB12":1.1}', '1 large egg (50 g)', 50),
(null, 'Omelette with oil', null, 'Prepared dishes', 'seed', false, '{"kcal":196,"protein":11,"carbs":1.5,"fat":16,"cholesterol":280}', '2 egg omelette (120 g)', 120),
(null, 'Salmon, cooked', null, 'Meat & fish', 'seed', true, '{"kcal":208,"protein":20.4,"carbs":0,"fat":13.4,"vitaminD":13.1,"vitaminB12":3.2}', '100 g', 100),
(null, 'Tuna, canned in water', null, 'Meat & fish', 'seed', true, '{"kcal":116,"protein":25.5,"carbs":0,"fat":0.8,"sodium":247,"vitaminB12":2.5}', '1 can (140 g)', 140),
(null, 'White fish (cod), cooked', null, 'Meat & fish', 'seed', true, '{"kcal":105,"protein":22.8,"carbs":0,"fat":0.9,"vitaminB12":1.1,"iodine":110}', '100 g', 100),
(null, 'Prawns, cooked', null, 'Meat & fish', 'seed', true, '{"kcal":99,"protein":24,"carbs":0.2,"fat":0.3,"cholesterol":189,"sodium":111}', '100 g', 100),
(null, 'Fried fish', null, 'Prepared dishes', 'seed', false, '{"kcal":232,"protein":18,"carbs":9,"fat":14.5}', '1 fillet (150 g)', 150),

-- Dairy
(null, 'Whole milk', null, 'Dairy', 'seed', true, '{"kcal":61,"protein":3.2,"carbs":4.8,"fat":3.3,"calcium":113,"vitaminB12":0.5}', '1 glass (250 ml)', 250),
(null, 'Skim milk', null, 'Dairy', 'seed', true, '{"kcal":34,"protein":3.4,"carbs":5,"fat":0.1,"calcium":122}', '1 glass (250 ml)', 250),
(null, 'Greek yogurt, full fat', null, 'Dairy', 'seed', true, '{"kcal":97,"protein":9,"carbs":3.9,"fat":5,"calcium":100}', '1 pot (170 g)', 170),
(null, 'Greek yogurt, 0% fat', null, 'Dairy', 'seed', true, '{"kcal":59,"protein":10.2,"carbs":3.6,"fat":0.4,"calcium":110}', '1 pot (170 g)', 170),
(null, 'Curd (dahi)', null, 'Dairy', 'seed', true, '{"kcal":61,"protein":3.5,"carbs":4.7,"fat":3.3,"calcium":121}', '1 bowl (150 g)', 150),
(null, 'Cheddar cheese', null, 'Dairy', 'seed', true, '{"kcal":403,"protein":24.9,"carbs":1.3,"fat":33.1,"calcium":710,"sodium":653,"vitaminB12":1.1}', '30 g', 30),
(null, 'Mozzarella', null, 'Dairy', 'seed', true, '{"kcal":300,"protein":22.2,"carbs":2.2,"fat":22.4,"calcium":505,"sodium":627}', '30 g', 30),
(null, 'Paneer', null, 'Dairy', 'seed', true, '{"kcal":296,"protein":20,"carbs":3.4,"fat":22.9,"calcium":480}', '50 g', 50),
(null, 'Butter', null, 'Dairy', 'seed', true, '{"kcal":717,"protein":0.9,"carbs":0.1,"fat":81.1,"vitaminA":684}', '1 tbsp (14 g)', 14),
(null, 'Single cream', null, 'Dairy', 'seed', true, '{"kcal":195,"protein":2.5,"carbs":3,"fat":19.5}', '1 tbsp (15 g)', 15),
(null, 'Vanilla ice cream', null, 'Dairy', 'seed', true, '{"kcal":207,"protein":3.5,"carbs":23.6,"fat":11,"sugar":21,"calcium":128}', '2 scoops (100 g)', 100),
(null, 'Processed cheese slice', null, 'Dairy', 'seed', true, '{"kcal":290,"protein":16,"carbs":5.7,"fat":22.9,"sodium":1320,"calcium":530}', '1 slice (21 g)', 21),

-- Fruit
(null, 'Banana', null, 'Fruit', 'seed', true, '{"kcal":89,"protein":1.1,"carbs":22.8,"fat":0.3,"fiber":2.6,"sugar":12.2,"potassium":358,"vitaminC":8.7}', '1 medium (118 g)', 118),
(null, 'Apple', null, 'Fruit', 'seed', true, '{"kcal":52,"protein":0.3,"carbs":13.8,"fat":0.2,"fiber":2.4,"sugar":10.4,"vitaminC":4.6}', '1 medium (182 g)', 182),
(null, 'Orange', null, 'Fruit', 'seed', true, '{"kcal":47,"protein":0.9,"carbs":11.8,"fat":0.1,"fiber":2.4,"sugar":9.4,"vitaminC":53.2}', '1 medium (140 g)', 140),
(null, 'Mango', null, 'Fruit', 'seed', true, '{"kcal":60,"protein":0.8,"carbs":15,"fat":0.4,"fiber":1.6,"sugar":13.7,"vitaminC":36.4,"vitaminA":54}', '100 g', 100),
(null, 'Grapes', null, 'Fruit', 'seed', true, '{"kcal":69,"protein":0.7,"carbs":18.1,"fat":0.2,"fiber":0.9,"sugar":15.5}', '100 g', 100),
(null, 'Watermelon', null, 'Fruit', 'seed', true, '{"kcal":30,"protein":0.6,"carbs":7.6,"fat":0.2,"sugar":6.2,"vitaminA":28,"vitaminC":8.1}', '100 g', 100),
(null, 'Strawberries', null, 'Fruit', 'seed', true, '{"kcal":32,"protein":0.7,"carbs":7.7,"fat":0.3,"fiber":2,"sugar":4.9,"vitaminC":58.8}', '100 g', 100),
(null, 'Medjool dates', null, 'Fruit', 'seed', true, '{"kcal":277,"protein":1.8,"carbs":75,"fat":0.2,"fiber":6.7,"sugar":66.5,"potassium":696}', '1 date (24 g)', 24),
(null, 'Avocado', null, 'Fruit', 'seed', true, '{"kcal":160,"protein":2,"carbs":8.5,"fat":14.7,"fiber":6.7,"potassium":485}', '1/2 avocado (100 g)', 100),
(null, 'Guava', null, 'Fruit', 'seed', true, '{"kcal":68,"protein":2.6,"carbs":14.3,"fat":1,"fiber":5.4,"vitaminC":228.3}', '100 g', 100),

-- Vegetables
(null, 'Potato, boiled', null, 'Vegetables', 'seed', true, '{"kcal":87,"protein":1.9,"carbs":20.1,"fat":0.1,"fiber":1.8,"potassium":379,"vitaminC":13}', '100 g', 100),
(null, 'French fries', null, 'Vegetables', 'seed', true, '{"kcal":312,"protein":3.4,"carbs":41,"fat":15,"fiber":3.8,"sodium":210}', 'Medium portion (115 g)', 115),
(null, 'Sweet potato', null, 'Vegetables', 'seed', true, '{"kcal":86,"protein":1.6,"carbs":20.1,"fat":0.1,"fiber":3,"vitaminA":709}', '100 g', 100),
(null, 'Broccoli', null, 'Vegetables', 'seed', true, '{"kcal":34,"protein":2.8,"carbs":6.6,"fat":0.4,"fiber":2.6,"vitaminC":89.2,"folate":63}', '100 g', 100),
(null, 'Spinach', null, 'Vegetables', 'seed', true, '{"kcal":23,"protein":2.9,"carbs":3.6,"fat":0.4,"fiber":2.2,"iron":2.7,"vitaminA":469,"folate":194}', '100 g', 100),
(null, 'Tomato', null, 'Vegetables', 'seed', true, '{"kcal":18,"protein":0.9,"carbs":3.9,"fat":0.2,"fiber":1.2,"vitaminC":13.7,"potassium":237}', '1 medium (123 g)', 123),
(null, 'Onion', null, 'Vegetables', 'seed', true, '{"kcal":40,"protein":1.1,"carbs":9.3,"fat":0.1,"fiber":1.7,"vitaminC":7.4}', '1 medium (110 g)', 110),
(null, 'Cucumber', null, 'Vegetables', 'seed', true, '{"kcal":15,"protein":0.7,"carbs":3.6,"fat":0.1,"fiber":0.5,"vitaminK":16.4}', '100 g', 100),
(null, 'Carrot', null, 'Vegetables', 'seed', true, '{"kcal":41,"protein":0.9,"carbs":9.6,"fat":0.2,"fiber":2.8,"vitaminA":835}', '1 medium (61 g)', 61),
(null, 'Cauliflower', null, 'Vegetables', 'seed', true, '{"kcal":25,"protein":1.9,"carbs":5,"fat":0.3,"fiber":2,"vitaminC":48.2}', '100 g', 100),
(null, 'Green peas', null, 'Vegetables', 'seed', true, '{"kcal":81,"protein":5.4,"carbs":14.5,"fat":0.4,"fiber":5.7,"vitaminC":40,"iron":1.5}', '100 g', 100),
(null, 'Bell pepper (capsicum)', null, 'Vegetables', 'seed', true, '{"kcal":26,"protein":1,"carbs":6,"fat":0.3,"fiber":2.1,"vitaminC":127.7}', '1 medium (119 g)', 119),
(null, 'Okra (bhindi)', null, 'Vegetables', 'seed', true, '{"kcal":33,"protein":1.9,"carbs":7.5,"fat":0.2,"fiber":3.2,"vitaminK":31.3}', '100 g', 100),
(null, 'Eggplant (baingan)', null, 'Vegetables', 'seed', true, '{"kcal":25,"protein":1,"carbs":5.9,"fat":0.2,"fiber":3}', '100 g', 100),
(null, 'Mixed salad greens', null, 'Vegetables', 'seed', true, '{"kcal":20,"protein":1.5,"carbs":3,"fat":0.3,"fiber":1.8,"vitaminA":370,"folate":90}', '1 bowl (85 g)', 85),

-- Nuts, fats and oils
(null, 'Almonds', null, 'Nuts & fats', 'seed', true, '{"kcal":579,"protein":21.2,"carbs":21.6,"fat":49.9,"fiber":12.5,"vitaminE":25.6,"magnesium":270}', '10 almonds (12 g)', 12),
(null, 'Walnuts', null, 'Nuts & fats', 'seed', true, '{"kcal":654,"protein":15.2,"carbs":13.7,"fat":65.2,"fiber":6.7,"magnesium":158}', '100 g', 100),
(null, 'Peanuts', null, 'Nuts & fats', 'seed', true, '{"kcal":567,"protein":25.8,"carbs":16.1,"fat":49.2,"fiber":8.5,"niacin":12.1}', '100 g', 100),
(null, 'Peanut butter', null, 'Nuts & fats', 'seed', true, '{"kcal":588,"protein":25,"carbs":20,"fat":50.4,"fiber":6,"sugar":9.2}', '1 tbsp (16 g)', 16),
(null, 'Cashews', null, 'Nuts & fats', 'seed', true, '{"kcal":553,"protein":18.2,"carbs":30.2,"fat":43.9,"iron":6.7,"zinc":5.8}', '100 g', 100),
(null, 'Chia seeds', null, 'Nuts & fats', 'seed', true, '{"kcal":486,"protein":16.5,"carbs":42.1,"fat":30.7,"fiber":34.4,"calcium":631}', '1 tbsp (12 g)', 12),
(null, 'Olive oil', null, 'Nuts & fats', 'seed', true, '{"kcal":884,"protein":0,"carbs":0,"fat":100,"satFat":13.8}', '1 tbsp (13.5 g)', 13.5),
(null, 'Vegetable oil', null, 'Nuts & fats', 'seed', true, '{"kcal":884,"protein":0,"carbs":0,"fat":100,"satFat":16}', '1 tbsp (13.5 g)', 13.5),
(null, 'Ghee', null, 'Nuts & fats', 'seed', true, '{"kcal":900,"protein":0,"carbs":0,"fat":100,"satFat":60,"cholesterol":250}', '1 tsp (4.5 g)', 4.5),
(null, 'Mayonnaise', null, 'Nuts & fats', 'seed', true, '{"kcal":680,"protein":1,"carbs":0.6,"fat":75,"sodium":635}', '1 tbsp (14 g)', 14),

-- Beverages
(null, 'Chai with whole milk and sugar', null, 'Beverages', 'seed', false, '{"kcal":55,"protein":1.6,"carbs":7.5,"fat":1.9,"sugar":6.5,"calcium":45}', '1 cup (150 ml)', 150),
(null, 'Black coffee, unsweetened', null, 'Beverages', 'seed', true, '{"kcal":2,"protein":0.1,"carbs":0,"fat":0,"potassium":49}', '1 cup (240 ml)', 240),
(null, 'Cola', null, 'Beverages', 'seed', true, '{"kcal":42,"protein":0,"carbs":10.6,"fat":0,"sugar":10.6,"sodium":4}', '330 ml can', 330),
(null, 'Orange juice', null, 'Beverages', 'seed', true, '{"kcal":45,"protein":0.7,"carbs":10.4,"fat":0.2,"sugar":8.4,"vitaminC":50}', '1 glass (250 ml)', 250),
(null, 'Sweet lassi', null, 'Beverages', 'seed', false, '{"kcal":100,"protein":2.8,"carbs":16,"fat":2.6,"sugar":13,"calcium":95}', '1 glass (250 ml)', 250),

-- Prepared dishes and street food (estimates, verified = false)
(null, 'Chicken biryani', null, 'Prepared dishes', 'seed', false, '{"kcal":180,"protein":8,"carbs":24,"fat":6,"fiber":1.2,"sodium":350}', '1 plate (350 g)', 350),
(null, 'Chicken karahi', null, 'Prepared dishes', 'seed', false, '{"kcal":165,"protein":14.5,"carbs":3.5,"fat":9.5,"sodium":380}', '1 serving (250 g)', 250),
(null, 'Dal tadka', null, 'Prepared dishes', 'seed', false, '{"kcal":105,"protein":5.5,"carbs":12,"fat":3.8,"fiber":4,"sodium":300}', '1 bowl (200 g)', 200),
(null, 'Nihari', null, 'Prepared dishes', 'seed', false, '{"kcal":190,"protein":12,"carbs":4,"fat":13.5,"sodium":480}', '1 bowl (300 g)', 300),
(null, 'Seekh kebab', null, 'Prepared dishes', 'seed', false, '{"kcal":220,"protein":17,"carbs":3,"fat":15,"sodium":420}', '2 kebabs (120 g)', 120),
(null, 'Vegetable samosa', null, 'Snacks & sweets', 'seed', false, '{"kcal":308,"protein":5,"carbs":32,"fat":17.5,"fiber":2.6,"sodium":400}', '1 samosa (100 g)', 100),
(null, 'Pakora', null, 'Snacks & sweets', 'seed', false, '{"kcal":280,"protein":6,"carbs":26,"fat":16,"fiber":2.4,"sodium":380}', '4 pieces (80 g)', 80),
(null, 'Chicken shawarma wrap', null, 'Prepared dishes', 'seed', false, '{"kcal":215,"protein":12,"carbs":22,"fat":9,"sodium":520}', '1 wrap (250 g)', 250),
(null, 'Falafel', null, 'Prepared dishes', 'seed', true, '{"kcal":333,"protein":13.3,"carbs":31.8,"fat":17.8,"fiber":4.9,"sodium":294}', '4 pieces (60 g)', 60),
(null, 'Sooji halwa', null, 'Snacks & sweets', 'seed', false, '{"kcal":380,"protein":3.5,"carbs":50,"fat":18.5,"sugar":35}', '1 bowl (100 g)', 100),
(null, 'Kheer (rice pudding)', null, 'Snacks & sweets', 'seed', false, '{"kcal":145,"protein":3.6,"carbs":21,"fat":5,"sugar":12,"calcium":110}', '1 bowl (150 g)', 150),

-- Snacks, sweets and extras
(null, 'Chocolate chip cookie', null, 'Snacks & sweets', 'seed', true, '{"kcal":488,"protein":5.7,"carbs":63.9,"fat":24.3,"fiber":2.4,"sugar":35,"sodium":355}', '1 cookie (16 g)', 16),
(null, 'Milk chocolate', null, 'Snacks & sweets', 'seed', true, '{"kcal":535,"protein":7.6,"carbs":59.4,"fat":29.7,"sugar":51.5,"calcium":189}', '4 squares (40 g)', 40),
(null, 'Chocolate brownie', null, 'Snacks & sweets', 'seed', false, '{"kcal":466,"protein":6,"carbs":60,"fat":24,"sugar":45}', '1 piece (60 g)', 60),
(null, 'Potato chips', null, 'Snacks & sweets', 'seed', true, '{"kcal":536,"protein":7,"carbs":53,"fat":34,"fiber":4.4,"sugar":0.3,"sodium":525}', '1 bag (30 g)', 30),
(null, 'Popcorn, air popped', null, 'Snacks & sweets', 'seed', true, '{"kcal":387,"protein":12.9,"carbs":77.8,"fat":4.5,"fiber":14.5,"magnesium":144}', '1 bowl (30 g)', 30),
(null, 'Honey', null, 'Snacks & sweets', 'seed', true, '{"kcal":304,"protein":0.3,"carbs":82.4,"fat":0,"sugar":82.1}', '1 tbsp (21 g)', 21),
(null, 'White sugar', null, 'Snacks & sweets', 'seed', true, '{"kcal":387,"protein":0,"carbs":100,"fat":0,"sugar":100}', '1 tsp (4 g)', 4),
(null, 'Whey protein powder', null, 'Supplements', 'seed', true, '{"kcal":400,"protein":80,"carbs":8,"fat":6,"calcium":500,"sodium":300}', '1 scoop (30 g)', 30);

-- Mark row counts for sanity in a comment:
-- 110 seeded foods. Custom and OFF foods are added at runtime, never here.