# Arrow — Gamified Workout Tracker

A social, gamified strength-training tracker built with Expo (React Native),
NativeWind, and Supabase. Log workouts, earn EXP, level up, break PRs, keep
streaks alive, and cheer on your friends.

## Features

- **Gamification** — EXP for every workout (base + per-set + PR + streak
  bonuses), a scaling level curve, and unlockable trophies. All awarded
  atomically by the `finish_workout` Postgres function.
- **Smart logging** — seeded exercise library by muscle group, tap-friendly
  set logging (sets persist as you go), integrated rest timer, automatic
  PR detection (estimated 1RM via Epley, plus best set volume).
- **Muscle map** — an anatomical front/back body figure that shades the
  specific regions each exercise trains (e.g. upper vs. lower chest), with
  colour intensity scaled by how hard a muscle is worked. Finishing a workout
  shows a combined figure of everything you hit that session.
- **Social feed** — follow friends, see their finished workouts, cheer and
  comment. Visibility is enforced by Row Level Security.
- **Profile & analytics** — level/EXP bar, streaks, trophy case,
  GitHub-style consistency calendar, and volume-per-muscle-group chart.

## Tech stack

- Expo SDK 56 + Expo Router (file-based navigation, `src/app/`)
- NativeWind 4 (Tailwind CSS for React Native)
- Supabase (Postgres, Auth, RLS, SQL functions)

## Getting started

```bash
npm install
cp .env.example .env   # public Supabase keys
npx expo start         # scan the QR code with Expo Go
```

## Project layout

```
src/
  app/            # Expo Router routes
    (auth)/       # sign-in / sign-up
    (tabs)/       # feed, workout logger, profile
    people.tsx    # find & follow friends (modal)
  components/     # small reusable UI pieces
  hooks/          # useActiveWorkout (logging state machine)
  lib/            # supabase client, EXP math, formatting, types
  providers/      # AuthProvider (session + profile context)
supabase/
  migrations/     # schema, RLS, gamification engine, seed data
```

## Database

Applied migrations (also in `supabase/migrations/`):

1. `001_core_schema.sql` — profiles, exercises, workouts, workout_sets,
   personal_records, social_follows, feed_interactions, trophies.
2. `002_rls_policies.sql` — owner-write everywhere; followers can read
   workouts/PRs/interactions.
3. `003_gamification.sql` — signup trigger, level curve
   (`floor(100 * level^1.5)` EXP per level), and the `finish_workout` RPC
   that computes volume, detects PRs, awards EXP, updates streaks, and
   unlocks trophies in one transaction.
4. `004_seed_data.sql` — ~60 standard exercises and 11 trophies.

Weights are stored in lbs.
