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
- **Gotcha Drizzle migrations** : les fichiers `.sql` avec plusieurs statements DOIVENT utiliser `--> statement-breakpoint` entre chaque statement. Sans ça, Drizzle exécute tout comme un seul statement qui échoue silencieusement (success=false sans erreur). Le journal (`meta/_journal.json`) et `migrations.js` doivent être mis à jour manuellement pour les migrations écrites à la main.

## Architecture

### Config Files
- `app.config.ts` — Expo config (plugins, permissions, API keys from env vars)
- `babel.config.js` — Babel presets + `babel-plugin-inline-import` for `.sql` files
- `metro.config.js` — Metro bundler config (Drizzle SQL file resolution)
- `drizzle.config.ts` — Drizzle Kit config (migrations generation)

### Stack
React Native 0.83 + Expo 55 + TypeScript (strict) + Expo Router (file-based routing) + Zustand (state) + Drizzle ORM (SQLite) + react-native-paper (Material Design 3 UI)

### Source Layout (`src/`)
- **`app/`** — File-based routes (Expo Router). Tabs: map, places, settings. Place CRUD routes under `place/`. Category management under `categories/`.
- **`services/`** — Core business logic:
  - `geofencing.ts` — Two-stage proximity check: bounding-box pre-filter then Haversine distance. 24h cooldown per place. Grouped notifications.
  - `location.ts` — Background location via `expo-task-manager` (task: `NEARDROP_BACKGROUND_LOCATION`). Updates every 30s / 50m.
  - `notifications.ts` — Android notification channels + expo-notifications setup.
  - `share-intent.ts` — Parse shared content (Google Maps URLs, Instagram, Facebook, plain text) into place data.
  - `geocoding.ts` — OpenStreetMap Nominatim (rate-limited 1.1s between calls).
  - `backup.ts` — Backup automatique SQLite (debounce 30s après mutation, rotation 3 copies). Déclenché depuis app-store après chaque CRUD.
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
- Place categories are dynamiques : table `categories` en BDD (id, name, color, icon, sortOrder). Places référencent via `categoryId` (FK). CRUD catégories dans `queries.ts` + `app-store.ts`. Max 30 catégories.
- `sourceType` tracks import origin: manual, share_intent, instagram, facebook, google_maps, csv
- Database rows use snake_case columns, app types use camelCase (conversion in queries.ts)
- Places have per-place radius override and `isActive` toggle
- **Background task registration**: `TaskManager.defineTask()` must be called at module scope (top of `location.ts`), not inside a function or component
- **Circular dependency avoidance**: `location.ts` uses `require('./geofencing')` inside the task callback to break the circular dep with `geofencing.ts`
- **Share intent flow**: `_layout.tsx` detects share intent → navigates to `/share-intent` → `share-intent.ts` parses content → pre-fills place form
- **Notification tap handling**: `_layout.tsx` listens via `addNotificationResponseReceivedListener`, reads `placeId` from notification data, navigates to `/place/[id]`
- **Active hours**: integer-only precision (hour granularity, e.g. 10 = 10:00). Supports overnight ranges (e.g. 22→06). Comparison uses `<` on end hour, so `end: 22` means active until 21:59
- **Dark mode** : `themeMode` ('system'|'light'|'dark') dans settings-store. Thème injecté via `PaperProvider` dans `_layout.tsx`. Toutes les couleurs doivent utiliser `useTheme()` de react-native-paper — **jamais de couleurs hardcodées** dans les StyleSheets. La carte utilise `customMapStyle` pour le mode sombre. Headers/tab bar configurés dans les layouts.
- **GestureHandlerRootView** : wrappé au niveau `RootLayout` (`_layout.tsx`). Requis pour `@gorhom/bottom-sheet` et `Swipeable` de react-native-gesture-handler. Ne PAS ajouter de `GestureHandlerRootView` supplémentaire dans les écrans enfants.

## Code Style

- Prettier: single quotes, trailing commas (ES5), 2-space indent, 100 char line width
- Functional components only, with hooks
- `useMemo`/`useCallback` for performance in list renders
- **Zustand selectors** : toujours utiliser `useAppStore((s) => s.field)` par champ, jamais `const { ... } = useAppStore()` qui subscribe à tout le store et cause des re-renders sur chaque changement (ex: location update toutes les 30s)
- **Gotcha Expo 55** : `@expo/log-box` nécessite `react-dom` installé même en mode natif. Si le bundling échoue avec `Unable to resolve "react-dom/client"`, lancer `npm install react-dom`

## Testing

- **Maestro E2E** : 8 flows dans `.maestro/` (01-app-launch, 02-navigation, 03-add-place, 04-place-crud, 05-search-filter, 06-settings, 07-category-management, 08-notification-proximity)
- **Gotcha Maestro** : `extendedWaitUntil` n'existe PAS dans Maestro — utiliser `assertVisible` (retry 5s par défaut) ou `scrollUntilVisible`
- **Gotcha Maestro expo-router** : la navigation peut échouer au premier essai (race condition `useLinking`). Ajouter un recovery block avec `stopApp`/`launchApp` dans les flows qui naviguent après `clearState`
- Lancer les tests : `export PATH="$PATH:$HOME/.maestro/bin" && maestro test .maestro/`
- Maestro installé via `curl -Ls "https://get.maestro.mobile.dev" | bash` (PAS `brew install maestro` qui installe le mauvais outil)
- **Gotcha Maestro inputText** : Sur émulateur API 36, le touchscreen virtuel est enregistré comme `STYLUS` — chaque `tapOn` sur un champ texte déclenche le handwriting overlay Android, rendant `inputText` extrêmement lent (~2min/champ). Workaround : installer [ADB Keyboard](https://github.com/senzhk/ADBKeyBoard) (`adb install ADBKeyboard.apk` + `adb shell ime set com.android.adbkeyboard/.AdbIME`). Le script `./scripts/emu.sh test` le fait automatiquement.
- **Gotcha Maestro scroll** : `scroll` ne prend pas `direction`, utiliser `swipe` avec `direction: UP/DOWN`
- **Unit tests** : Jest + jest-expo — 127 tests couvrant `distance`, `address-parser`, `share-intent`, `geofencing`, `settings-store`, `backup`
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

## Agent Team — File Ownership

| Agent | Zone | Fichiers |
|-------|------|----------|
| **dev** | Production code | `src/**/*.ts(x)` (sauf `*.test.ts`) |
| **qa** | Tests | `src/**/*.test.ts`, `.maestro/**/*`, `jest.config.js`, `jest.setup.ts` |
| **debug** | Config / Scripts | `scripts/*`, `app.config.ts`, `babel.config.js`, `metro.config.js`, `drizzle.config.ts`, `tsconfig.json` |

**Règle** : dev complète son travail avant que qa ne commence (séquentiel pour un même feature). Jamais deux agents sur le même fichier en parallèle.