-- Expanded exercise library: equipment-specific variants (dumbbell/cable/machine)
-- and common lifts missing from the foundational seed. Muscle slugs follow the
-- `react-native-body-highlighter` names used in 014 (intensity 2 = primary,
-- 1 = secondary).

insert into public.exercises (name, muscle_group, muscles) values
  -- Chest
  ('Decline Bench Press',            'chest',      '[{"slug":"chest","intensity":2},{"slug":"triceps","intensity":1}]'::jsonb),
  ('Decline Dumbbell Press',         'chest',      '[{"slug":"chest","intensity":2},{"slug":"triceps","intensity":1}]'::jsonb),
  ('Pec Deck Fly',                   'chest',      '[{"slug":"chest","intensity":2}]'::jsonb),
  ('Incline Cable Fly',              'chest',      '[{"slug":"chest","intensity":2},{"slug":"deltoids","intensity":1}]'::jsonb),
  ('Smith Machine Bench Press',      'chest',      '[{"slug":"chest","intensity":2},{"slug":"triceps","intensity":1},{"slug":"deltoids","intensity":1}]'::jsonb),
  ('Incline Machine Press',          'chest',      '[{"slug":"chest","intensity":2},{"slug":"deltoids","intensity":1},{"slug":"triceps","intensity":1}]'::jsonb),
  -- Back
  ('Pendlay Row',                    'back',       '[{"slug":"upper-back","intensity":2},{"slug":"lower-back","intensity":1},{"slug":"biceps","intensity":1}]'::jsonb),
  ('Chest-Supported Row',            'back',       '[{"slug":"upper-back","intensity":2},{"slug":"biceps","intensity":1}]'::jsonb),
  ('Machine Row',                    'back',       '[{"slug":"upper-back","intensity":2},{"slug":"biceps","intensity":1}]'::jsonb),
  ('Straight-Arm Pulldown',          'back',       '[{"slug":"upper-back","intensity":2}]'::jsonb),
  ('Dumbbell Pullover',              'back',       '[{"slug":"upper-back","intensity":2},{"slug":"chest","intensity":1}]'::jsonb),
  ('Close-Grip Lat Pulldown',        'back',       '[{"slug":"upper-back","intensity":2},{"slug":"biceps","intensity":1}]'::jsonb),
  ('Rack Pull',                      'back',       '[{"slug":"upper-back","intensity":2},{"slug":"lower-back","intensity":2},{"slug":"trapezius","intensity":1},{"slug":"forearm","intensity":1}]'::jsonb),
  ('Inverted Row',                   'back',       '[{"slug":"upper-back","intensity":2},{"slug":"biceps","intensity":1}]'::jsonb),
  ('Back Extension',                 'back',       '[{"slug":"lower-back","intensity":2},{"slug":"gluteal","intensity":1},{"slug":"hamstring","intensity":1}]'::jsonb),
  -- Shoulders
  ('Dumbbell Lateral Raise',         'shoulders',  '[{"slug":"deltoids","intensity":2}]'::jsonb),
  ('Cable Lateral Raise',            'shoulders',  '[{"slug":"deltoids","intensity":2}]'::jsonb),
  ('Machine Lateral Raise',          'shoulders',  '[{"slug":"deltoids","intensity":2}]'::jsonb),
  ('Reverse Pec Deck',               'shoulders',  '[{"slug":"deltoids","intensity":2},{"slug":"upper-back","intensity":1}]'::jsonb),
  ('Cable Rear Delt Fly',            'shoulders',  '[{"slug":"deltoids","intensity":2},{"slug":"upper-back","intensity":1}]'::jsonb),
  ('Machine Shoulder Press',         'shoulders',  '[{"slug":"deltoids","intensity":2},{"slug":"triceps","intensity":1}]'::jsonb),
  ('Push Press',                     'shoulders',  '[{"slug":"deltoids","intensity":2},{"slug":"triceps","intensity":1},{"slug":"quadriceps","intensity":1}]'::jsonb),
  ('Landmine Press',                 'shoulders',  '[{"slug":"deltoids","intensity":2},{"slug":"chest","intensity":1},{"slug":"triceps","intensity":1}]'::jsonb),
  ('Upright Row',                    'shoulders',  '[{"slug":"deltoids","intensity":2},{"slug":"trapezius","intensity":1}]'::jsonb),
  ('Dumbbell Shrug',                 'shoulders',  '[{"slug":"trapezius","intensity":2}]'::jsonb),
  -- Biceps
  ('Incline Dumbbell Curl',          'biceps',     '[{"slug":"biceps","intensity":2}]'::jsonb),
  ('Concentration Curl',             'biceps',     '[{"slug":"biceps","intensity":2}]'::jsonb),
  ('EZ-Bar Curl',                    'biceps',     '[{"slug":"biceps","intensity":2},{"slug":"forearm","intensity":1}]'::jsonb),
  ('Spider Curl',                    'biceps',     '[{"slug":"biceps","intensity":2}]'::jsonb),
  ('Machine Bicep Curl',             'biceps',     '[{"slug":"biceps","intensity":2}]'::jsonb),
  ('Rope Hammer Curl',               'biceps',     '[{"slug":"biceps","intensity":2},{"slug":"forearm","intensity":2}]'::jsonb),
  ('Reverse Curl',                   'biceps',     '[{"slug":"forearm","intensity":2},{"slug":"biceps","intensity":1}]'::jsonb),
  -- Triceps
  ('Rope Pushdown',                  'triceps',    '[{"slug":"triceps","intensity":2}]'::jsonb),
  ('Cable Overhead Tricep Extension','triceps',    '[{"slug":"triceps","intensity":2}]'::jsonb),
  ('Tricep Kickback',                'triceps',    '[{"slug":"triceps","intensity":2}]'::jsonb),
  ('Machine Tricep Extension',       'triceps',    '[{"slug":"triceps","intensity":2}]'::jsonb),
  ('JM Press',                       'triceps',    '[{"slug":"triceps","intensity":2},{"slug":"chest","intensity":1}]'::jsonb),
  ('Diamond Push-Up',                'triceps',    '[{"slug":"triceps","intensity":2},{"slug":"chest","intensity":1}]'::jsonb),
  -- Quads
  ('Smith Machine Squat',            'quads',      '[{"slug":"quadriceps","intensity":2},{"slug":"gluteal","intensity":1}]'::jsonb),
  ('Pendulum Squat',                 'quads',      '[{"slug":"quadriceps","intensity":2},{"slug":"gluteal","intensity":1}]'::jsonb),
  ('Belt Squat',                     'quads',      '[{"slug":"quadriceps","intensity":2},{"slug":"gluteal","intensity":1}]'::jsonb),
  ('Sissy Squat',                    'quads',      '[{"slug":"quadriceps","intensity":2}]'::jsonb),
  ('Step-Up',                        'quads',      '[{"slug":"quadriceps","intensity":2},{"slug":"gluteal","intensity":1}]'::jsonb),
  ('Reverse Lunge',                  'quads',      '[{"slug":"quadriceps","intensity":2},{"slug":"gluteal","intensity":1},{"slug":"hamstring","intensity":1}]'::jsonb),
  ('Hip Adduction Machine',          'quads',      '[{"slug":"adductors","intensity":2}]'::jsonb),
  -- Hamstrings
  ('Stiff-Leg Deadlift',             'hamstrings', '[{"slug":"hamstring","intensity":2},{"slug":"gluteal","intensity":1},{"slug":"lower-back","intensity":1}]'::jsonb),
  ('Dumbbell Romanian Deadlift',     'hamstrings', '[{"slug":"hamstring","intensity":2},{"slug":"gluteal","intensity":1},{"slug":"lower-back","intensity":1}]'::jsonb),
  ('Single-Leg Romanian Deadlift',   'hamstrings', '[{"slug":"hamstring","intensity":2},{"slug":"gluteal","intensity":1}]'::jsonb),
  ('Standing Leg Curl',              'hamstrings', '[{"slug":"hamstring","intensity":2}]'::jsonb),
  ('Nordic Hamstring Curl',          'hamstrings', '[{"slug":"hamstring","intensity":2}]'::jsonb),
  ('Glute-Ham Raise',                'hamstrings', '[{"slug":"hamstring","intensity":2},{"slug":"gluteal","intensity":1}]'::jsonb),
  -- Glutes
  ('Sumo Deadlift',                  'glutes',     '[{"slug":"gluteal","intensity":2},{"slug":"quadriceps","intensity":1},{"slug":"hamstring","intensity":1},{"slug":"lower-back","intensity":1}]'::jsonb),
  ('Machine Hip Thrust',             'glutes',     '[{"slug":"gluteal","intensity":2},{"slug":"hamstring","intensity":1}]'::jsonb),
  ('Single-Leg Hip Thrust',          'glutes',     '[{"slug":"gluteal","intensity":2},{"slug":"hamstring","intensity":1}]'::jsonb),
  ('Hip Abduction Machine',          'glutes',     '[{"slug":"gluteal","intensity":2}]'::jsonb),
  -- Calves
  ('Leg Press Calf Raise',           'calves',     '[{"slug":"calves","intensity":2}]'::jsonb),
  ('Smith Machine Calf Raise',       'calves',     '[{"slug":"calves","intensity":2}]'::jsonb),
  ('Donkey Calf Raise',              'calves',     '[{"slug":"calves","intensity":2}]'::jsonb),
  ('Tibialis Raise',                 'calves',     '[{"slug":"tibialis","intensity":2}]'::jsonb),
  -- Core
  ('Sit-Up',                         'core',       '[{"slug":"abs","intensity":2}]'::jsonb),
  ('Lying Leg Raise',                'core',       '[{"slug":"abs","intensity":2}]'::jsonb),
  ('Bicycle Crunch',                 'core',       '[{"slug":"abs","intensity":2},{"slug":"obliques","intensity":1}]'::jsonb),
  ('Side Plank',                     'core',       '[{"slug":"obliques","intensity":2},{"slug":"abs","intensity":1}]'::jsonb),
  ('Dead Bug',                       'core',       '[{"slug":"abs","intensity":2}]'::jsonb),
  ('Cable Woodchopper',              'core',       '[{"slug":"obliques","intensity":2},{"slug":"abs","intensity":1}]'::jsonb),
  ('Machine Crunch',                 'core',       '[{"slug":"abs","intensity":2}]'::jsonb),
  -- Full body
  ('Power Clean',                    'full_body',  '[{"slug":"quadriceps","intensity":2},{"slug":"gluteal","intensity":2},{"slug":"trapezius","intensity":1},{"slug":"hamstring","intensity":1}]'::jsonb),
  ('Thruster',                       'full_body',  '[{"slug":"quadriceps","intensity":2},{"slug":"deltoids","intensity":2},{"slug":"gluteal","intensity":1},{"slug":"triceps","intensity":1}]'::jsonb),
  ('Burpee',                         'full_body',  '[{"slug":"quadriceps","intensity":2},{"slug":"chest","intensity":1},{"slug":"abs","intensity":1},{"slug":"deltoids","intensity":1}]'::jsonb),
  ('Sled Push',                      'full_body',  '[{"slug":"quadriceps","intensity":2},{"slug":"gluteal","intensity":2},{"slug":"calves","intensity":1}]'::jsonb)
on conflict (name) do nothing;
