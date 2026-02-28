# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm start              # Start Expo dev server
npm run android        # Build & run on Android device/emulator (expo run:android)
npm run ios            # Build & run on iOS simulator
npm run lint           # ESLint via expo lint
```

## Database

- **Drizzle ORM** with **expo-sqlite** (file: `neardrop.db`)
- Schema defined in `src/db/schema.ts`, queries in `src/db/queries.ts`
- Migrations in `src/db/migrations/` — auto-applied on app start via `useDatabase` hook
- Config: `drizzle.config.ts`; `.sql` files are inline-imported via babel plugin

## Architecture

### Stack
React Native 0.83 + Expo 55 + TypeScript (strict) + Expo Router (file-based routing) + Zustand (state) + Drizzle ORM (SQLite) + react-native-paper (Material Design 3 UI)

### Source Layout (`src/`)
- **`app/`** — File-based routes (Expo Router). Tabs: map, places, settings. Place CRUD routes under `place/`. Import flow under `import/`.
- **`services/`** — Core business logic:
  - `geofencing.ts` — Two-stage proximity check: bounding-box pre-filter then Haversine distance. 24h cooldown per place. Grouped notifications.
  - `location.ts` — Background location via `expo-task-manager` (task: `NEARDROP_BACKGROUND_LOCATION`). Updates every 30s / 50m.
  - `notifications.ts` — Android notification channels + expo-notifications setup.
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

## Code Style

- Prettier: single quotes, trailing commas (ES5), 2-space indent, 100 char line width
- Functional components only, with hooks
- `useMemo`/`useCallback` for performance in list renders