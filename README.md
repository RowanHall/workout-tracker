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
- **Social feed** — follow friends, see their finished workouts, cheer and
  comment. Visibility is enforced by Row Level Security.
- **Share your workout** — turn any session into an image: a transparent stat
  overlay to drop onto an Instagram Story (Strava-style), or your own photo with
  the stats baked in to send through the native share sheet (Messages, WhatsApp…).
  Available right after you finish a workout and from any workout's detail page.

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

> The workout-share screen captures a view to a PNG with `react-native-view-shot`,
> which isn't bundled in Expo Go. Use a development build (`npx expo run:ios` /
> `run:android`, or an EAS dev build) to exercise that flow.

## Shipping to the App Store

The app is configured for EAS Build (`eas.json`), iOS bundle id
`com.kova.fitness`, and native Sign in with Apple. Remaining steps that need
your Apple/Supabase accounts:

1. **Install the tooling and link the project**
   ```bash
   npm install -g eas-cli
   eas login
   eas init            # creates the EAS project + writes extra.eas.projectId
   ```
2. **Configure Sign in with Apple** (so the native button works):
   - Apple Developer → enable the *Sign in with Apple* capability on the
     `com.kova.fitness` App ID, and create the Services ID `com.kova.fitness.service`.
   - Supabase → Authentication → Providers → Apple: add the **bundle id**
     `com.kova.fitness` to the authorized client IDs (for native sign-in) and the
     services id `com.kova.fitness.service` (for the web fallback).
3. **Host the privacy policy** ([`PRIVACY.md`](./PRIVACY.md)) at a public URL and
   add it in App Store Connect (fill in the contact email first).
4. **Build & submit**
   ```bash
   eas build --platform ios --profile preview      # internal test build (TestFlight-style)
   eas build --platform ios --profile production
   eas submit --platform ios --profile production
   ```
5. **App Store Connect**: create the app record, complete the privacy
   "nutrition label" (data collected: account, fitness, photos, user content),
   add screenshots, description, category, and age rating.

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
