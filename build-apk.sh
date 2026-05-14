#!/bin/bash
# ─────────────────────────────────────────────────────
# build-apk.sh — Build & sync Gasbee APK (User or Rider)
# Usage: ./build-apk.sh user   OR   ./build-apk.sh rider
# ─────────────────────────────────────────────────────
set -e

TARGET="${1:-user}"

if [[ "$TARGET" != "user" && "$TARGET" != "rider" ]]; then
  echo "❌ Usage: ./build-apk.sh [user|rider]"
  exit 1
fi

echo ""
echo "🐝 ═══════════════════════════════════════════"
echo "   Building Gasbee APK: $TARGET"
echo "═══════════════════════════════════════════════"
echo ""

# 1. Build the Vite app with the right env
echo "📦 Step 1: Building Vite app with mode=$TARGET..."
npx vite build --mode "$TARGET"

# 2. Copy the right Capacitor config
echo "⚙️  Step 2: Setting Capacitor config for $TARGET..."
cp "capacitor.config.$TARGET.ts" capacitor.config.ts

# 3. Sync to Android
echo "📱 Step 3: Syncing to Android project..."
npx cap sync android

echo ""
echo "✅ Done! Android project is at: android-$TARGET/"
echo ""
echo "📋 Next steps:"
echo "   1. Open Android Studio: npx cap open android"
echo "   2. Build > Build Bundle(s) / APK(s) > Build APK(s)"
echo "   3. APK will be at: android-$TARGET/app/build/outputs/apk/debug/app-debug.apk"
echo ""
