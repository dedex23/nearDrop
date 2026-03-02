#!/usr/bin/env bash
# NearDrop — Emulator helper script
# Usage:
#   ./scripts/emu.sh start      Start the emulator
#   ./scripts/emu.sh stop       Stop the emulator
#   ./scripts/emu.sh app        Launch NearDrop on the emulator
#   ./scripts/emu.sh screenshot Take a screenshot → /tmp/emu_screen.png
#   ./scripts/emu.sh logs       Show React Native JS logs
#   ./scripts/emu.sh gps <lon> <lat>   Mock GPS location
#   ./scripts/emu.sh ui         Dump UI hierarchy → /tmp/emu_ui.xml
#   ./scripts/emu.sh tap <x> <y>       Tap at coordinates
#   ./scripts/emu.sh test       Run Maestro E2E tests
#   ./scripts/emu.sh metro      Start Metro bundler (required for debug builds)

set -euo pipefail

ADB=~/Library/Android/sdk/platform-tools/adb
EMU=~/Library/Android/sdk/emulator/emulator
AVD="Medium_Phone_API_33"
PKG="com.neardrop.app"
DEVICE="emulator-5554"

case "${1:-help}" in
  start)
    echo "Starting emulator $AVD..."
    $EMU -avd "$AVD" -no-snapshot -no-audio &
    echo "Waiting for boot..."
    $ADB -s $DEVICE wait-for-device
    for i in $(seq 1 60); do
      BOOT=$($ADB -s $DEVICE shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
      if [ "$BOOT" = "1" ]; then
        echo "Emulator ready after ${i}s"
        exit 0
      fi
      sleep 2
    done
    echo "Boot timeout"
    exit 1
    ;;

  stop)
    echo "Stopping emulator..."
    $ADB -s $DEVICE emu kill 2>/dev/null || true
    echo "Done"
    ;;

  app)
    echo "Launching $PKG..."
    $ADB -s $DEVICE shell monkey -p $PKG -c android.intent.category.LAUNCHER 1
    ;;

  screenshot)
    OUT="${2:-/tmp/emu_screen.png}"
    $ADB -s $DEVICE shell screencap -p /sdcard/screen.png
    $ADB -s $DEVICE pull /sdcard/screen.png "$OUT"
    echo "Screenshot saved to $OUT"
    ;;

  logs)
    COUNT="${2:-50}"
    $ADB -s $DEVICE logcat -s ReactNativeJS:V -d -t "$COUNT"
    ;;

  gps)
    if [ $# -lt 3 ]; then
      echo "Usage: emu.sh gps <longitude> <latitude>"
      exit 1
    fi
    $ADB -s $DEVICE emu geo fix "$2" "$3"
    echo "GPS set to lon=$2 lat=$3"
    ;;

  ui)
    OUT="${2:-/tmp/emu_ui.xml}"
    $ADB -s $DEVICE shell uiautomator dump /sdcard/ui.xml
    $ADB -s $DEVICE pull /sdcard/ui.xml "$OUT"
    echo "UI hierarchy saved to $OUT"
    ;;

  tap)
    if [ $# -lt 3 ]; then
      echo "Usage: emu.sh tap <x> <y>"
      exit 1
    fi
    $ADB -s $DEVICE shell input tap "$2" "$3"
    ;;

  metro)
    if lsof -i :8081 2>/dev/null | grep -q LISTEN; then
      echo "Metro already running on :8081"
    else
      echo "Starting Metro bundler..."
      npx expo start --port 8081 &
      sleep 5
      echo "Metro started (background PID: $!)"
    fi
    ;;

  test)
    if ! lsof -i :8081 2>/dev/null | grep -q LISTEN; then
      echo "⚠ Metro not running — starting it first..."
      npx expo start --port 8081 &
      sleep 8
    fi
    # Workaround: Android 16 emulator registers touchscreen as STYLUS,
    # triggering handwriting overlay on text fields (makes inputText ~2min/field).
    # ADB Keyboard bypasses the IME handwriting framework.
    PREV_IME=$($ADB -s $DEVICE shell settings get secure default_input_method 2>/dev/null)
    if $ADB -s $DEVICE shell pm list packages 2>/dev/null | grep -q com.android.adbkeyboard; then
      echo "Switching to ADB Keyboard for fast text input..."
      $ADB -s $DEVICE shell ime set com.android.adbkeyboard/.AdbIME 2>/dev/null
    else
      echo "⚠ ADB Keyboard not installed — inputText will be slow on API 36."
      echo "  Install: adb install <path-to-ADBKeyboard.apk>"
    fi
    export PATH="$PATH:$HOME/.maestro/bin"
    export MAESTRO_CLI_NO_ANALYTICS=1
    export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true
    maestro --device $DEVICE test .maestro/
    TEST_EXIT=$?
    # Retry once on failure (expo-router useLinking race condition can cause
    # random navigation failures — a second run usually passes)
    if [ $TEST_EXIT -ne 0 ]; then
      echo ""
      echo "⚠ Some flows failed — retrying once (expo-router race condition workaround)..."
      echo ""
      maestro --device $DEVICE test .maestro/
      TEST_EXIT=$?
    fi
    # Restore previous keyboard
    if [ -n "$PREV_IME" ] && [ "$PREV_IME" != "null" ]; then
      echo "Restoring keyboard: $PREV_IME"
      $ADB -s $DEVICE shell ime set "$PREV_IME" 2>/dev/null
    fi
    exit $TEST_EXIT
    ;;

  help|*)
    echo "NearDrop Emulator Helper"
    echo ""
    echo "Usage: ./scripts/emu.sh <command>"
    echo ""
    echo "Commands:"
    echo "  start              Start the Android emulator"
    echo "  stop               Stop the emulator"
    echo "  app                Launch NearDrop"
    echo "  screenshot [path]  Take screenshot (default: /tmp/emu_screen.png)"
    echo "  logs [count]       Show JS logs (default: 50 lines)"
    echo "  gps <lon> <lat>    Mock GPS (e.g. gps 2.3522 48.8566)"
    echo "  ui [path]          Dump UI hierarchy"
    echo "  tap <x> <y>        Tap at coordinates"
    echo "  test               Run Maestro E2E tests (auto-starts Metro)"
    echo "  metro              Start Metro bundler (required for debug builds)"
    ;;
esac