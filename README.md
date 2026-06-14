# Kova — Workout Tracker

A social strength-training tracker built with Expo (React Native), NativeWind,
and Supabase. Log workouts set by set, track your stats and body weight over
time, browse your workout history, keep streaks alive, and cheer on your
friends.

> Levels, EXP, and trophies are paused in the app for now. The underlying
> tables and the `finish_workout` engine still compute them, so the system can
> be switched back on later without data loss.

## Features

- **Smart logging** — seeded exercise library by muscle group, tap-friendly
  set logging (sets persist as you go), integrated rest timer, automatic PR
  detection (estimated 1RM via Epley, plus best set volume), and rest-day
  logging that protects a streak.
- **Deep stats** — lifetime totals, per-session averages, a weekly-volume
  trend chart, records (heaviest set, longest session, biggest session…),
  best lifts, top exercises, and a muscle-split breakdown.
- **History** — browse every finished workout and drill into the exact sets.
- **Body weight** — log in Settings, see the trend charted on your profile.
  set logging (sets persist as you go), integrated rest timer, automatic
  PR detection (estimated 1RM via Epley, plus best set volume).
- **Muscle map** — an anatomical front/back body figure that shades the
  specific regions each exercise trains (e.g. upper vs. lower chest), with
  colour intensity scaled by how hard a muscle is worked. Finishing a workout
  shows a combined figure of everything you hit that session.
- **Social feed** — follow friends, see their finished workouts, cheer and
  comment. Visibility is enforced by Row Level Security.

## Tech stack

- Expo SDK 54 + Expo Router (file-based navigation, `src/app/`)
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
    (tabs)/       # profile, feed, workout logger, stats
    history.tsx   # workout history (stacked screen)
    settings.tsx  # body-weight logging, account, sign out
    people.tsx    # find & follow friends (modal)
    workout/[id]  # single workout detail
  components/     # small reusable UI pieces
  hooks/          # useActiveWorkout (logging state machine)
  lib/            # supabase client, streak/formatting helpers, types
  providers/      # AuthProvider (session + profile context)
supabase/
  migrations/     # schema, RLS, gamification engine, seed data, body weights
```

Weights are stored in lbs.
