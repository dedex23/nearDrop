# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm start              # Start Expo dev server
npm run android        # Build & run on Android device/emulator (expo run:android)
npm run ios            # Build & run on iOS simulator
npm run lint           # ESLint via expo lint
```

## Environment Variables

- `GOOGLE_MAPS_API_KEY` — required for Google Maps (set in `app.config.ts` via `process.env`)
- No `.env` file in the repo; set variables in your shell or CI

## Database

- **Drizzle ORM** with **expo-sqlite** (file: `neardrop.db`)
- Schema defined in `src/db/schema.ts`, queries in `src/db/queries.ts`
- Migrations in `src/db/migrations/` — auto-applied on app start via `useDatabase` hook
- Config: `drizzle.config.ts`; `.sql` files are inline-imported via babel plugin

## Architecture

### Config Files
- `app.config.ts` — Expo config (plugins, permissions, API keys from env vars)
- `babel.config.js` — Babel presets + `babel-plugin-inline-import` for `.sql` files
- `metro.config.js` — Metro bundler config (Drizzle SQL file resolution)
- `drizzle.config.ts` — Drizzle Kit config (migrations generation)

### Stack
React Native 0.83 + Expo 55 + TypeScript (strict) + Expo Router (file-based routing) + Zustand (state) + Drizzle ORM (SQLite) + react-native-paper (Material Design 3 UI)

### Source Layout (`src/`)
- **`app/`** — File-based routes (Expo Router). Tabs: map, places, settings. Place CRUD routes under `place/`. Import flow under `import/`.
- **`services/`** — Core business logic:
  - `geofencing.ts` — Two-stage proximity check: bounding-box pre-filter then Haversine distance. 24h cooldown per place. Grouped notifications.
  - `location.ts` — Background location via `expo-task-manager` (task: `NEARDROP_BACKGROUND_LOCATION`). Updates every 30s / 50m.
  - `notifications.ts` — Android notification channels + expo-notifications setup.
  - `share-intent.ts` — Parse shared content (Google Maps URLs, Instagram, Facebook, plain text) into place data.
  - `geocoding.ts` — OpenStreetMap Nominatim (rate-limited 1.1s between calls).
- **`stores/`** — Zustand stores. `app-store.ts` (places, search, filters, location). `settings-store.ts` (persisted to AsyncStorage: radius, cooldown, quiet mode, tracking toggle).
- **`db/`** — Drizzle schema, client, typed query functions.
- **`components/`** — Reusable UI: `place-card`, `place-form`, `category-chip`.
- **`hooks/`** — `useLocation` (location tracking), `useDatabase` (migration runner).
- **`utils/`** — `distance.ts` (Haversine), `constants.ts` (categories config), `address-parser.ts`.
- **`types/`** — Shared TypeScript types (`Place`, `PlaceCategory`, `Settings`).
- **`theme/`** — Material Design 3 theme colors.

### Data Flow
```
UI → Zustand Store → Drizzle/SQLite (places persistence)
Background Location Task → Geofencing Engine → Notifications
Settings Store → AsyncStorage (user preferences)
```

### Key Patterns
- Path aliases: `@/*` → `./src/*`, `@/assets/*` → `./assets/*`
- Place categories are an enum: restaurant, bar, cafe, shop, culture, sport, other (defined in schema + constants)
- `sourceType` tracks import origin: manual, share_intent, instagram, facebook, google_maps, csv
- Database rows use snake_case columns, app types use camelCase (conversion in queries.ts)
- Places have per-place radius override and `isActive` toggle
- **Background task registration**: `TaskManager.defineTask()` must be called at module scope (top of `location.ts`), not inside a function or component
- **Circular dependency avoidance**: `location.ts` uses `require('./geofencing')` inside the task callback to break the circular dep with `geofencing.ts`
- **Share intent flow**: `_layout.tsx` detects share intent → navigates to `/share-intent` → `share-intent.ts` parses content → pre-fills place form
- **Notification tap handling**: `_layout.tsx` listens via `addNotificationResponseReceivedListener`, reads `placeId` from notification data, navigates to `/place/[id]`
- **Active hours**: integer-only precision (hour granularity, e.g. 10 = 10:00). Supports overnight ranges (e.g. 22→06). Comparison uses `<` on end hour, so `end: 22` means active until 21:59

## Code Style

- Prettier: single quotes, trailing commas (ES5), 2-space indent, 100 char line width
- Functional components only, with hooks
- `useMemo`/`useCallback` for performance in list renders

## Testing

- No test framework configured. No unit or integration tests exist yet.