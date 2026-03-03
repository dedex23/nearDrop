# NearDrop

NearDrop is a mobile app that automatically notifies you when you're near your saved places — restaurants, bars, shops, cultural venues, and more.

Save a place from the app or share it directly from Google Maps, Instagram, or Facebook. NearDrop will remind you when you're nearby, even with the app in the background.

## Features

- **Proximity notifications** — Automatic alerts when you approach a saved place, even in the background
- **Import from other apps** — Share a place from Google Maps, Instagram or Facebook, NearDrop pre-fills the details
- **Interactive map** — View all your places on a Google Maps-powered map
- **Categories** — Restaurant, bar, cafe, shop, culture, sport, other
- **Custom radius** — Set a detection radius per place (default or custom)
- **Quiet mode** — Temporarily disable all notifications
- **Active hours** — Limit notifications to a time range (supports overnight ranges, e.g. 10pm→6am)
- **Cooldown** — Configurable delay between notifications for the same place to avoid spam

## Tech stack

- React Native 0.83 + Expo 55 + TypeScript
- Expo Router (file-based navigation)
- Zustand (state management, persisted via AsyncStorage)
- Drizzle ORM + expo-sqlite (local database)
- react-native-paper (Material Design 3)
- react-native-maps (Google Maps)
- expo-location + expo-task-manager (background GPS tracking)
- expo-notifications (local notifications)
- expo-share-intent (import from other apps)

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **Android SDK** (via Android Studio) with:
  - Android SDK Platform 36 (set automatically by Expo 55)
  - Android SDK Build-Tools
  - Android NDK (side by side)
- **JDK 17** (included with Android Studio)
- **Environment variable**: `GOOGLE_MAPS_API_KEY` for Google Maps

## Installation

```bash
git clone https://github.com/dedex23/nearDrop.git
cd nearDrop
npm install
```

## Development

```bash
# Start the Expo dev server
npm start

# Build and run on a connected Android device/emulator
npm run android

# Build and run on iOS simulator
npm run ios

# Lint
npm run lint

# Unit tests
npm test
```

## Building the APK

### Debug APK

```bash
npm run android
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK

```bash
npm run build:apk
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

Build and install directly on a connected device:

```bash
npm run install:apk
```

> **Note**: The release build uses the default debug signing key. For Play Store distribution, configure a signing key in `android/app/build.gradle`.

## Tests

```bash
# Unit tests (Jest)
npm test

# Unit tests in watch mode
npm run test:watch

# TypeScript type checking
npx tsc --noEmit

# E2E tests (Maestro — requires an Android emulator)
./scripts/emu.sh test
```

## Project structure

```
src/
├── app/            # Routes (Expo Router) — tabs: map, places, settings
├── services/       # Business logic — geofencing, location, notifications, share-intent
├── stores/         # Zustand stores — app state + persisted settings
├── db/             # Drizzle schema, migrations, queries
├── components/     # Reusable UI — place-card, place-form, category-chip
├── hooks/          # useLocation, useDatabase
├── utils/          # Haversine distance, address parser, constants
├── types/          # Shared TypeScript types
└── theme/          # Material Design 3 theme
```