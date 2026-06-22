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
- **Rest timer** sits in the workout **header** (under the summary stats row), not pinned to the bottom. `RestTimer` only renders when `remaining > 0`, and ignores its mounted `trigger` value so it never auto-starts on a new workout.

## Workout detail (`/workout/[id]`)

Header card → **photo carousel** (full-width 4:3, edge-to-edge inside a rounded card, white page dots when count > 1) → muscle map card → exercise list. Photos sit immediately under the header so they're the first thing the viewer sees after the title/stats.

## Data layer

- Workouts have `visibility` (`'public' | 'private'`). Private workouts are hidden from followers via RLS; the owner always sees them.
- Workout photos live in the `workout-photos` storage bucket (public, namespaced by user id) and are joined via `workout_photos` rows on the workout.
- Storage uploads use `base64-arraybuffer.decode` + `supabase.storage.from(...).upload(path, decoded, { contentType: 'image/jpeg' })`, mirroring the avatar upload pattern in Settings.

## What to avoid

- Card-in-card layouts (`bg-surface` inside `bg-surface`).
- The orange `accent` color on more than one element per screen.
- Generic icon decoration. Icons are sized small (14–18px), used only where they aid scanning (streak flame, chevron, action buttons).
- Trailing summaries / chrome after a hero number. Let the number breathe.
- Pre-filling editable form fields with last session's actual values — use placeholders instead so the user sees a hint, not pre-typed data.
