-- Foundational exercise library and trophy definitions.

insert into public.exercises (name, muscle_group) values
  -- Chest
  ('Bench Press', 'chest'),
  ('Incline Bench Press', 'chest'),
  ('Dumbbell Bench Press', 'chest'),
  ('Incline Dumbbell Press', 'chest'),
  ('Dumbbell Fly', 'chest'),
  ('Cable Crossover', 'chest'),
  ('Push-Up', 'chest'),
  ('Chest Dip', 'chest'),
  ('Machine Chest Press', 'chest'),
  -- Back
  ('Deadlift', 'back'),
  ('Barbell Row', 'back'),
  ('Pull-Up', 'back'),
  ('Chin-Up', 'back'),
  ('Lat Pulldown', 'back'),
  ('Seated Cable Row', 'back'),
  ('Dumbbell Row', 'back'),
  ('T-Bar Row', 'back'),
  -- Shoulders
  ('Overhead Press', 'shoulders'),
  ('Dumbbell Shoulder Press', 'shoulders'),
  ('Arnold Press', 'shoulders'),
  ('Lateral Raise', 'shoulders'),
  ('Front Raise', 'shoulders'),
  ('Rear Delt Fly', 'shoulders'),
  ('Face Pull', 'shoulders'),
  ('Barbell Shrug', 'shoulders'),
  -- Biceps
  ('Barbell Curl', 'biceps'),
  ('Dumbbell Curl', 'biceps'),
  ('Hammer Curl', 'biceps'),
  ('Preacher Curl', 'biceps'),
  ('Cable Curl', 'biceps'),
  -- Triceps
  ('Close-Grip Bench Press', 'triceps'),
  ('Tricep Pushdown', 'triceps'),
  ('Skull Crusher', 'triceps'),
  ('Overhead Tricep Extension', 'triceps'),
  ('Tricep Dip', 'triceps'),
  -- Quads
  ('Squat', 'quads'),
  ('Front Squat', 'quads'),
  ('Leg Press', 'quads'),
  ('Leg Extension', 'quads'),
  ('Bulgarian Split Squat', 'quads'),
  ('Hack Squat', 'quads'),
  ('Walking Lunge', 'quads'),
  ('Goblet Squat', 'quads'),
  -- Hamstrings
  ('Romanian Deadlift', 'hamstrings'),
  ('Lying Leg Curl', 'hamstrings'),
  ('Seated Leg Curl', 'hamstrings'),
  ('Good Morning', 'hamstrings'),
  -- Glutes
  ('Hip Thrust', 'glutes'),
  ('Glute Bridge', 'glutes'),
  ('Cable Kickback', 'glutes'),
  -- Calves
  ('Standing Calf Raise', 'calves'),
  ('Seated Calf Raise', 'calves'),
  -- Core
  ('Plank', 'core'),
  ('Crunch', 'core'),
  ('Hanging Leg Raise', 'core'),
  ('Russian Twist', 'core'),
  ('Ab Wheel Rollout', 'core'),
  ('Cable Crunch', 'core'),
  -- Full body
  ('Clean and Press', 'full_body'),
  ('Kettlebell Swing', 'full_body'),
  ('Farmer''s Carry', 'full_body');

insert into public.trophies (code, name, description, icon) values
  ('first_workout', 'First Steps', 'Complete your first workout', '🎯'),
  ('streak_3', 'On a Roll', 'Work out 3 days in a row', '🔥'),
  ('streak_7', 'Unstoppable', 'Work out 7 days in a row', '⚡'),
  ('streak_30', 'Iron Will', 'Work out 30 days in a row', '💎'),
  ('volume_10k', 'Heavy Lifter', 'Lift 10,000 lbs total', '🏋️'),
  ('volume_100k', 'Ton Mover', 'Lift 100,000 lbs total', '🚛'),
  ('volume_1m', 'Million Pound Club', 'Lift 1,000,000 lbs total', '👑'),
  ('first_pr', 'Record Breaker', 'Set your first personal record', '📈'),
  ('level_5', 'Rising Star', 'Reach level 5', '⭐'),
  ('level_10', 'Veteran', 'Reach level 10', '🌟'),
  ('level_25', 'Legend', 'Reach level 25', '🏆');
