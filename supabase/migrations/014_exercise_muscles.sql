-- Per-exercise muscle activation data, fed straight into the
-- `react-native-body-highlighter` muscle map. Each entry is
-- `{slug, intensity}` where slug matches the library's body-part names and
-- intensity 2 = primary mover, 1 = secondary / synergist.

alter table public.exercises
  add column muscles jsonb not null default '[]'::jsonb;

update public.exercises set muscles = m.muscles from (values
  -- Chest
  ('Bench Press',              '[{"slug":"chest","intensity":2},{"slug":"triceps","intensity":1},{"slug":"deltoids","intensity":1}]'::jsonb),
  ('Incline Bench Press',      '[{"slug":"chest","intensity":2},{"slug":"deltoids","intensity":1},{"slug":"triceps","intensity":1}]'::jsonb),
  ('Dumbbell Bench Press',     '[{"slug":"chest","intensity":2},{"slug":"triceps","intensity":1},{"slug":"deltoids","intensity":1}]'::jsonb),
  ('Incline Dumbbell Press',   '[{"slug":"chest","intensity":2},{"slug":"deltoids","intensity":1},{"slug":"triceps","intensity":1}]'::jsonb),
  ('Dumbbell Fly',             '[{"slug":"chest","intensity":2},{"slug":"deltoids","intensity":1}]'::jsonb),
  ('Cable Crossover',          '[{"slug":"chest","intensity":2}]'::jsonb),
  ('Push-Up',                  '[{"slug":"chest","intensity":2},{"slug":"triceps","intensity":1},{"slug":"deltoids","intensity":1}]'::jsonb),
  ('Chest Dip',                '[{"slug":"chest","intensity":2},{"slug":"triceps","intensity":1},{"slug":"deltoids","intensity":1}]'::jsonb),
  ('Machine Chest Press',      '[{"slug":"chest","intensity":2},{"slug":"triceps","intensity":1},{"slug":"deltoids","intensity":1}]'::jsonb),
  -- Back
  ('Deadlift',                 '[{"slug":"lower-back","intensity":2},{"slug":"upper-back","intensity":2},{"slug":"gluteal","intensity":1},{"slug":"hamstring","intensity":1},{"slug":"trapezius","intensity":1},{"slug":"forearm","intensity":1}]'::jsonb),
  ('Barbell Row',              '[{"slug":"upper-back","intensity":2},{"slug":"lower-back","intensity":1},{"slug":"biceps","intensity":1},{"slug":"forearm","intensity":1}]'::jsonb),
  ('Pull-Up',                  '[{"slug":"upper-back","intensity":2},{"slug":"biceps","intensity":1},{"slug":"forearm","intensity":1}]'::jsonb),
  ('Chin-Up',                  '[{"slug":"upper-back","intensity":2},{"slug":"biceps","intensity":2},{"slug":"forearm","intensity":1}]'::jsonb),
  ('Lat Pulldown',             '[{"slug":"upper-back","intensity":2},{"slug":"biceps","intensity":1}]'::jsonb),
  ('Seated Cable Row',         '[{"slug":"upper-back","intensity":2},{"slug":"biceps","intensity":1}]'::jsonb),
  ('Dumbbell Row',             '[{"slug":"upper-back","intensity":2},{"slug":"biceps","intensity":1},{"slug":"forearm","intensity":1}]'::jsonb),
  ('T-Bar Row',                '[{"slug":"upper-back","intensity":2},{"slug":"biceps","intensity":1},{"slug":"lower-back","intensity":1}]'::jsonb),
  -- Shoulders
  ('Overhead Press',           '[{"slug":"deltoids","intensity":2},{"slug":"triceps","intensity":1},{"slug":"trapezius","intensity":1}]'::jsonb),
  ('Dumbbell Shoulder Press',  '[{"slug":"deltoids","intensity":2},{"slug":"triceps","intensity":1}]'::jsonb),
  ('Arnold Press',             '[{"slug":"deltoids","intensity":2},{"slug":"triceps","intensity":1}]'::jsonb),
  ('Lateral Raise',            '[{"slug":"deltoids","intensity":2}]'::jsonb),
  ('Front Raise',              '[{"slug":"deltoids","intensity":2}]'::jsonb),
  ('Rear Delt Fly',            '[{"slug":"deltoids","intensity":2},{"slug":"upper-back","intensity":1}]'::jsonb),
  ('Face Pull',                '[{"slug":"deltoids","intensity":2},{"slug":"upper-back","intensity":1},{"slug":"trapezius","intensity":1}]'::jsonb),
  ('Barbell Shrug',            '[{"slug":"trapezius","intensity":2}]'::jsonb),
  -- Biceps
  ('Barbell Curl',             '[{"slug":"biceps","intensity":2},{"slug":"forearm","intensity":1}]'::jsonb),
  ('Dumbbell Curl',            '[{"slug":"biceps","intensity":2},{"slug":"forearm","intensity":1}]'::jsonb),
  ('Hammer Curl',              '[{"slug":"biceps","intensity":2},{"slug":"forearm","intensity":2}]'::jsonb),
  ('Preacher Curl',            '[{"slug":"biceps","intensity":2}]'::jsonb),
  ('Cable Curl',               '[{"slug":"biceps","intensity":2}]'::jsonb),
  -- Triceps
  ('Close-Grip Bench Press',   '[{"slug":"triceps","intensity":2},{"slug":"chest","intensity":1}]'::jsonb),
  ('Tricep Pushdown',          '[{"slug":"triceps","intensity":2}]'::jsonb),
  ('Skull Crusher',            '[{"slug":"triceps","intensity":2}]'::jsonb),
  ('Overhead Tricep Extension','[{"slug":"triceps","intensity":2}]'::jsonb),
  ('Tricep Dip',               '[{"slug":"triceps","intensity":2},{"slug":"chest","intensity":1}]'::jsonb),
  -- Quads
  ('Squat',                    '[{"slug":"quadriceps","intensity":2},{"slug":"gluteal","intensity":1},{"slug":"hamstring","intensity":1},{"slug":"lower-back","intensity":1}]'::jsonb),
  ('Front Squat',              '[{"slug":"quadriceps","intensity":2},{"slug":"gluteal","intensity":1},{"slug":"abs","intensity":1}]'::jsonb),
  ('Leg Press',                '[{"slug":"quadriceps","intensity":2},{"slug":"gluteal","intensity":1},{"slug":"hamstring","intensity":1}]'::jsonb),
  ('Leg Extension',            '[{"slug":"quadriceps","intensity":2}]'::jsonb),
  ('Bulgarian Split Squat',    '[{"slug":"quadriceps","intensity":2},{"slug":"gluteal","intensity":1},{"slug":"hamstring","intensity":1}]'::jsonb),
  ('Hack Squat',               '[{"slug":"quadriceps","intensity":2},{"slug":"gluteal","intensity":1}]'::jsonb),
  ('Walking Lunge',            '[{"slug":"quadriceps","intensity":2},{"slug":"gluteal","intensity":1},{"slug":"hamstring","intensity":1}]'::jsonb),
  ('Goblet Squat',             '[{"slug":"quadriceps","intensity":2},{"slug":"gluteal","intensity":1},{"slug":"abs","intensity":1}]'::jsonb),
  -- Hamstrings
  ('Romanian Deadlift',        '[{"slug":"hamstring","intensity":2},{"slug":"gluteal","intensity":1},{"slug":"lower-back","intensity":1}]'::jsonb),
  ('Lying Leg Curl',           '[{"slug":"hamstring","intensity":2}]'::jsonb),
  ('Seated Leg Curl',          '[{"slug":"hamstring","intensity":2}]'::jsonb),
  ('Good Morning',             '[{"slug":"hamstring","intensity":2},{"slug":"lower-back","intensity":2},{"slug":"gluteal","intensity":1}]'::jsonb),
  -- Glutes
  ('Hip Thrust',               '[{"slug":"gluteal","intensity":2},{"slug":"hamstring","intensity":1}]'::jsonb),
  ('Glute Bridge',             '[{"slug":"gluteal","intensity":2},{"slug":"hamstring","intensity":1}]'::jsonb),
  ('Cable Kickback',           '[{"slug":"gluteal","intensity":2}]'::jsonb),
  -- Calves
  ('Standing Calf Raise',      '[{"slug":"calves","intensity":2}]'::jsonb),
  ('Seated Calf Raise',        '[{"slug":"calves","intensity":2}]'::jsonb),
  -- Core
  ('Plank',                    '[{"slug":"abs","intensity":2},{"slug":"obliques","intensity":1}]'::jsonb),
  ('Crunch',                   '[{"slug":"abs","intensity":2}]'::jsonb),
  ('Hanging Leg Raise',        '[{"slug":"abs","intensity":2},{"slug":"obliques","intensity":1}]'::jsonb),
  ('Russian Twist',            '[{"slug":"obliques","intensity":2},{"slug":"abs","intensity":1}]'::jsonb),
  ('Ab Wheel Rollout',         '[{"slug":"abs","intensity":2},{"slug":"obliques","intensity":1}]'::jsonb),
  ('Cable Crunch',             '[{"slug":"abs","intensity":2}]'::jsonb),
  -- Full body
  ('Clean and Press',          '[{"slug":"deltoids","intensity":2},{"slug":"trapezius","intensity":1},{"slug":"quadriceps","intensity":1},{"slug":"upper-back","intensity":1},{"slug":"gluteal","intensity":1}]'::jsonb),
  ('Kettlebell Swing',         '[{"slug":"gluteal","intensity":2},{"slug":"hamstring","intensity":2},{"slug":"lower-back","intensity":1},{"slug":"abs","intensity":1}]'::jsonb),
  ('Farmer''s Carry',          '[{"slug":"forearm","intensity":2},{"slug":"trapezius","intensity":2},{"slug":"abs","intensity":1}]'::jsonb)
) as m(name, muscles)
where public.exercises.name = m.name;
