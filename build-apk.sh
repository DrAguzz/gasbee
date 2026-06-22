#!/bin/bash
# ─────────────────────────────────────────────────────
# build-apk.sh — Build & sync Gasbee APK (User or Rider)
# Usage: ./build-apk.sh user   OR   ./build-apk.sh rider
# ─────────────────────────────────────────────────────
set -e

TARGET="${1:-user}"
MODE="${2:-debug}"

if [[ "$TARGET" != "user" && "$TARGET" != "rider" ]]; then
  echo "❌ Usage: ./build-apk.sh [user|rider] [debug|release]"
  exit 1
fi

if [[ "$MODE" != "debug" && "$MODE" != "release" ]]; then
  echo "❌ Mode must be 'debug' or 'release'"
  exit 1
fi

echo ""
echo "🐝 ═══════════════════════════════════════════"
echo "   Building Gasbee $MODE: $TARGET"
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

# 4. Update configurations (appId, deep links, etc.)
echo "🔧 Step 4: Running update-config.cjs for $TARGET..."
node update-config.cjs "$TARGET"

# 5. Compile the Android app using gradle
cd "android-$TARGET"
if [[ "$MODE" == "release" ]]; then
  echo "🏗️  Step 5: Compiling Release APK and AAB via Gradle..."
  ./gradlew assembleRelease bundleRelease
else
  echo "🏗️  Step 6: Compiling Debug APK via Gradle..."
  ./gradlew assembleDebug
fi
cd ..

# 6. Copy the compiled outputs to the root workspace
echo "💾 Step 6: Copying built files to workspace root..."
if [[ "$MODE" == "release" ]]; then
  cp "android-$TARGET/app/build/outputs/apk/release/app-release.apk" "gasbee-$TARGET-release.apk"
  cp "android-$TARGET/app/build/outputs/bundle/release/app-release.aab" "gasbee-$TARGET-release.aab"
  echo ""
  echo "🎉 Done! Release files are ready at:"
  echo "   - APK: gasbee-$TARGET-release.apk"
  echo "   - AAB: gasbee-$TARGET-release.aab"
else
  cp "android-$TARGET/app/build/outputs/apk/debug/app-debug.apk" "gasbee-$TARGET-debug.apk"
  echo ""
  echo "🎉 Done! Debug APK is ready at: gasbee-$TARGET-debug.apk"
fi
echo ""
