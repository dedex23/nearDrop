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

- **Maestro E2E** : 6 flows dans `.maestro/` (01-app-launch, 02-navigation, 03-add-place, 04-place-crud, 05-search-filter, 06-settings)
- Lancer les tests : `export PATH="$PATH:$HOME/.maestro/bin" && maestro test .maestro/`
- Maestro installé via `curl -Ls "https://get.maestro.mobile.dev" | bash` (PAS `brew install maestro` qui installe le mauvais outil)
- **Gotcha Maestro inputText** : Sur émulateur API 36, le touchscreen virtuel est enregistré comme `STYLUS` — chaque `tapOn` sur un champ texte déclenche le handwriting overlay Android, rendant `inputText` extrêmement lent (~2min/champ). Workaround : installer [ADB Keyboard](https://github.com/senzhk/ADBKeyBoard) (`adb install ADBKeyboard.apk` + `adb shell ime set com.android.adbkeyboard/.AdbIME`). Le script `./scripts/emu.sh test` le fait automatiquement.
- **Gotcha Maestro scroll** : `scroll` ne prend pas `direction`, utiliser `swipe` avec `direction: UP/DOWN`
- **Unit tests** : Jest + jest-expo — 83 tests couvrant `distance`, `address-parser`, `share-intent`, `geofencing`
- Lancer : `npm test` / `npm run test:watch`
- Convention : fichiers `.test.ts` colocalisés avec le source (ex: `src/utils/distance.test.ts`)
- Analyse statique : `npx tsc --noEmit` (types) + `npm run lint` (ESLint)

## Android Debug & Emulator

- Script utilitaire : `./scripts/emu.sh` (start, stop, app, screenshot, logs, gps, ui, tap, test)
- ADB path : `~/Library/Android/sdk/platform-tools/adb`
- Émulateur AVD : `Medium_Phone_API_36.1` — démarrer avec `./scripts/emu.sh start`
- App package : `com.neardrop.app`
- Screenshot ADB : `adb shell screencap -p /sdcard/screen.png && adb pull /sdcard/screen.png /tmp/screen.png`
- Logs JS : `adb logcat -s ReactNativeJS:V -d -t 50`
- UI hierarchy : `adb shell uiautomator dump` → XML avec bounds pour cibler les taps
- Mock GPS (émulateur) : `adb -s emulator-5554 emu geo fix <lon> <lat>`
- **Gotcha** : le Pixel 9 physique se verrouille → screenshots noirs. Déverrouiller avec `adb shell input keyevent KEYCODE_WAKEUP && adb shell input swipe 540 1800 540 800 300`