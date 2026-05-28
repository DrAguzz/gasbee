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

# 4. Update configurations (appId, deep links, etc.)
echo "🔧 Step 4: Running update-config.cjs for $TARGET..."
node update-config.cjs "$TARGET"

# 5. Compile the Android app using gradle
echo "🏗️  Step 5: Compiling APK via Gradle..."
cd "android-$TARGET"
./gradlew assembleDebug
cd ..

# 6. Copy the compiled APK to the root workspace
echo "💾 Step 6: Copying APK to workspace root..."
cp "android-$TARGET/app/build/outputs/apk/debug/app-debug.apk" "gasbee-$TARGET-debug.apk"

echo ""
echo "🎉 Done! Latest APK is ready at: gasbee-$TARGET-debug.apk"
echo ""
