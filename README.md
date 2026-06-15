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

## Premium subscriptions (RevenueCat)

Kova Premium is an auto-renewing subscription (monthly + annual, with a free
trial) handled by **RevenueCat** over StoreKit. The live perk is CSV/Excel
**data export** (Settings → Data); the paywall lives in the **Premium** tab.
The app runs fine without any of this configured — premium just shows as locked.

To turn it on:

1. **App Store Connect → Subscriptions**: create a subscription group (e.g.
   "Kova Premium") with two auto-renewable products, and add a 7-day free trial
   as an introductory offer on each:
   - `com.kova.fitness.premium.monthly` — $5.99/month
   - `com.kova.fitness.premium.annual` — e.g. $39.99/year
   Also accept the **Paid Applications Agreement** and add tax/banking info, or
   purchases can't be sold.
2. **RevenueCat**: create a project, connect the App Store app (App Store
   Connect API key), create an **entitlement with the exact id `premium`**,
   attach both products to it, and add them to the default **Offering** as the
   Monthly and Annual packages.
3. **Set the SDK key**: copy RevenueCat's iOS **public** key into
   `EXPO_PUBLIC_REVENUECAT_IOS_KEY` — in `eas.json` (build profiles) for cloud
   builds, and in `.env` for local dev builds.
4. **Test on a build** (not Expo Go): create a Sandbox tester in App Store
   Connect, install a dev/TestFlight build, and run through purchase + restore.

> The entitlement id (`premium`) and the App Store product ids must match what
> you configure in RevenueCat — see `src/providers/PremiumProvider.tsx`.

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
