# Kova design system

A dark, editorial, Wealthsimple-inspired aesthetic. Calm typography over visual chrome. One accent color (green) used sparingly. Hairlines, not cards-everywhere.

## Color tokens (`tailwind.config.js`)

| Token | Hex | Use |
| --- | --- | --- |
| `background` | `#0B0F14` | App canvas |
| `surface` | `#151B23` | Containers around charts / chart wells |
| `surface-2` | `#1E2630` | Insets, buttons, segmented controls |
| `border` | `#2A3441` | Strong borders (rarely used in new design) |
| `primary` | `#22C55E` | Accent, CTAs, active states |
| `primary-dim` | `#16803C` | Placeholder hints, dim accents |
| `accent` | `#F59E0B` | PR / streak orange — use rarely |
| `danger` | `#EF4444` | Destructive actions |
| `muted` | `#8B98A9` | Eyebrows, labels, captions |
| `white/5` – `white/15` | — | Hairlines and soft borders, prefer over `border` |

Default to hairlines (`border-white/5`) for dividers. Reach for `border` only when something must read as clearly bounded (e.g. dashed "Add" buttons).

## Typography

- **Eyebrows / section labels** — `text-[11px] font-bold uppercase tracking-[2.5px] text-muted`. Always paired with a section, never standalone.
- **Eyebrow suffix** (right side meta) — `text-[11px] font-medium uppercase tracking-[1.5px] text-muted/70`.
- **Hero numbers** — `font-extrabold`, tight letter-spacing (e.g. `letterSpacing: -2.5` for 64px, `-3` for 72px), always `fontVariant: ['tabular-nums']`. Always `numberOfLines={1}` + `adjustsFontSizeToFit`.
- **List row label** — `text-[15px] text-white`.
- **List row value** — `text-[15px] font-semibold text-white` (or `font-bold text-primary` when emphasised). Tabular nums.
- **Captions / meta** — `text-xs` or `text-sm` `text-muted`.

Avoid generic body fonts and avoid mixing weights mid-sentence. Lean on size, weight, and tracking for hierarchy.

## Section pattern (profile screen / general use)

A page is a sequence of unboxed sections separated by spacing or hairlines:

```tsx
<Section label="Records">
  <ListRow label="Heaviest set" value="315 lbs" />
  <ListRow label="Biggest session" value="18.2k" />
</Section>

<Hairline />

<Section label="Weekly Volume" eyebrowSuffix="12 weeks">
  <View className="rounded-2xl bg-surface p-4">
    <WeeklyVolumeChart data={weeklyVolume} />
  </View>
</Section>
```

Rules:
- **No nested cards.** Charts and gates get one `rounded-2xl bg-surface p-4` container; the surrounding section does not also have one.
- **Section spacing** is provided by the `Section` primitive (`pt-7` top padding).
- **Hairlines** (`mx-5 my-4 h-px bg-white/5`) separate major content groups, not every section.

## Reusable inline primitives (used in `src/app/(tabs)/index.tsx`)

- `Section({ label, eyebrowSuffix?, children })` — eyebrow + content with consistent padding.
- `ListRow({ label, value?, onPress?, emphasis? })` — Wealthsimple-style row with bottom hairline, optional right-aligned value, optional chevron when `onPress` is set. Tabular numbers in values.
- `BarRow({ label, pct, width })` — label + thin green `h-1.5` bar against `bg-white/5` track. `width` is relative to the biggest row in the group; cap row count (e.g. top 6).
- `PillStat({ label, value, unit?, icon? })` — column stat for the three-up overview row.
- `Hairline()` — horizontal page-level divider.

When you find yourself reaching for `bg-surface p-4` around text, ask first: would an eyebrow + raw content work?

## Post-workout modal (`WorkoutSummaryModal`)

A bottom-sheet modal with three clear zones:

1. **Fixed header** — handle bar + small green dot + `WORKOUT COMPLETE` eyebrow.
2. **Scrollable middle, edits at the top** — title (borderless underline input), photos (horizontal scroller with dashed add tile), visibility (single pill container with two halves, active half is solid green with inverted icon + label).
3. **Sticky footer** — outline `Share` + filled `Done`. Footer uses `flex: 1` ScrollView in the middle so the actions stay pinned regardless of content height.

Hero recap (volume number, meta tiles, PRs, muscle map) lives **below** the edits — the user does the active part first, then sees the celebration recap before tapping Done.

Use `KeyboardAvoidingView` + explicit `flex-1` on the sheet container so the footer stays above the keyboard.

## Workout screen patterns

- **Vertical scroll, no paging.** Exercises stack top-to-bottom in a single `ScrollView`. New exercises auto-scroll to end.
- **Inline mini muscle map** in each exercise header (right of the name, `~44px` wide, `<MuscleMap side="front" />`).
- **"Add Set" creates a draft row** (`border-primary-dim/40` border) with empty inputs and **dark green placeholders** (`#16803C`) showing last session's weight / reps. Commits to DB on blur once both fields are valid. Only one draft at a time — "Add Set" disabled while a draft exists.
- **Committed set rows** are inline editable (`SetRow`): tap weight or reps, blur to save. `selectTextOnFocus` highlights the value for one-tap overwrite.
- **"Add Exercise"** lives at the bottom of the list as a dashed-border button — matches the "Add Set" language; doubles as the empty state.
- **Collapsing header.** The active-workout screen has a floating blur band (see "Navigation headers") holding a **compact bar that's always visible: elapsed time + Discard/Finish**. The **title, summary stats row, and rest timer live at the top of the scrollable list** (`ExerciseList`'s `ListHeader`) so they scroll away under the blur — leaving just the compact bar once you scroll into the exercises. The band's measured height is the list's `topInset`.
- **Rest timer** sits in that scrollable header block (under the summary stats row), not pinned to the bottom. When idle, `RestTimer` renders a muted "Rest Timer" start button in the same slot (so a skipped/expired timer can be restarted manually); it ignores its mounted `trigger` value so it never auto-starts on a new workout.

## Workout detail (`/workout/[id]`)

Header card → **photo carousel** (full-width 4:3, edge-to-edge inside a rounded card, white page dots when count > 1) → muscle map card → exercise list. Photos sit immediately under the header so they're the first thing the viewer sees after the title/stats.

## Navigation headers (blur)

Every pushed detail screen (back arrow + title) and the feed's floating header use a shared **frosted-glass header** so content scrolls *under* it and blurs through the frosted band as it reaches the top — no opaque bar clipping content, title and buttons stay legible. Defined in `src/lib/blurHeader.tsx`.

- `blurHeaderOptions` — spread into each `Stack.Screen` `options` in `src/app/_layout.tsx` (`headerTransparent` + `BlurHeaderBackground`). Add per-screen `title`/`headerRight` after the spread.
- `BlurHeaderBackground` — the band itself: a `BlurView` (dark, `intensity={44}`) plus a dark tint, both **feathered to zero** over the bottom ~45% via a vertical gradient mask (`@react-native-masked-view` + `expo-linear-gradient`) so there's no hard seam where the blur meets sharp content — it reads as a smooth no-blur → blur ramp.
- `useHeaderInset()` — returns `useHeaderHeight()`. Because the header is transparent it no longer reserves layout space, so **every screen must offset its scroll container** with `paddingTop: headerInset` (add the screen's existing top padding on top, e.g. `headerInset + 16`). Apply via `contentContainerStyle` on the `ScrollView`/`FlatList`.
- **Tab screens with their own header** (the feed) have no native header. They float a header `View` over the list, drop `<BlurHeaderBackground />` behind it, measure its height with `onLayout`, and feed that into the list's `paddingTop` / `scrollIndicatorInsets` / `RefreshControl progressViewOffset`.

## Floating glass pills & bars

> **`expo-glass-effect` is NOT real Liquid Glass.** Real iOS 26 Liquid Glass is system-driven — it only applies to *native* navigation components, and in React Native you need a dedicated native library (e.g. Callstack's) to get it. `expo-glass-effect`/`GlassView` is an approximation, same category as the `expo-blur` fallback. Don't call it "genuine/real Liquid Glass," and if the user actually wants the true system effect, reach for a Callstack-style lib, not this.

Floating capsules — the tab bar (`FloatingTabBar`), the resume-workout pill (`ActiveWorkoutPill`), and the feed's top-right actions pill (`HeaderActions` in `src/app/(tabs)/feed.tsx`) — currently share an `expo-glass-effect` + `expo-blur` pattern. Match it for consistency with the existing pills.

The pattern (copy it exactly):

```tsx
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

// Module scope — evaluate once, not per render.
const LIQUID_GLASS = isLiquidGlassAvailable();

// content lives in a `const row/buttons = (...)` so both branches share it.
if (LIQUID_GLASS) {
  return (
    <GlassView glassEffectStyle="regular" isInteractive style={{ borderRadius: 999, overflow: 'hidden' }}>
      {content}
    </GlassView>
  );
}
// Fallback for iOS < 26 / Android: frosted BlurView + bright rim + top sheen.
return (
  <View className="overflow-hidden rounded-full border border-white/20">
    <BlurView tint="systemUltraThinMaterialDark" intensity={60} style={StyleSheet.absoluteFill} />
    <LinearGradient
      colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)']}
      locations={[0, 0.5, 1]}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
    {content}
  </View>
);
```

Rules:
- **On the `GlassView` branch, add no manual blur, border, or sheen** — the effect provides them. Those only appear in the `expo-blur` fallback branch.
- Add `isInteractive` to `GlassView` when the whole capsule is tappable (resume pill), so it reacts to touch. A row of separate buttons inside one static capsule (tab bar, feed actions) can omit it.
- **Never nest glass on glass** (Apple guidance). Chips/buttons *inside* a glass capsule are plain translucent surfaces (`bg-white/10 border border-white/10`) or bare icons split by a `w-px bg-white/10` hairline — not their own `GlassView`.
- Wrap in a `styles.shadow` `View` (`shadowOpacity: 0.35`, `shadowRadius: 14`, `elevation: 10`) when the pill floats over scrolling content so it reads as lifted.

## Data layer

- Exercises flagged `is_bodyweight` (pull-ups, dips, …) store only the **added** load in set weights: `0` renders as `BW`, `45` as `+45`. Effective load = latest `body_weights` entry + added load; `finish_workout` applies this server-side for volume/PRs, and clients mirror it (`formatSetWeight` / `parseSetWeightInput` in `src/lib/format.ts`).
- Workouts have `visibility` (`'public' | 'private'`). Private workouts are hidden from followers via RLS; the owner always sees them.
- Workout photos live in the `workout-photos` storage bucket (public, namespaced by user id) and are joined via `workout_photos` rows on the workout.
- Storage uploads use `base64-arraybuffer.decode` + `supabase.storage.from(...).upload(path, decoded, { contentType: 'image/jpeg' })`, mirroring the avatar upload pattern in Settings.

## What to avoid

- Card-in-card layouts (`bg-surface` inside `bg-surface`).
- The orange `accent` color on more than one element per screen.
- Generic icon decoration. Icons are sized small (14–18px), used only where they aid scanning (streak flame, chevron, action buttons).
- Trailing summaries / chrome after a hero number. Let the number breathe.
- Pre-filling editable form fields with last session's actual values — use placeholders instead so the user sees a hint, not pre-typed data.
