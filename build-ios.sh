#!/bin/bash
# ─────────────────────────────────────────────────────
# build-ios.sh — Build & sync Gasbee iOS (User or Rider)
# Usage: ./build-ios.sh user   OR   ./build-ios.sh rider
# ─────────────────────────────────────────────────────
set -e

TARGET="${1:-user}"

if [[ "$TARGET" != "user" && "$TARGET" != "rider" ]]; then
  echo "❌ Usage: ./build-ios.sh [user|rider]"
  exit 1
fi

echo ""
echo "🐝 ═══════════════════════════════════════════"
echo "   Building Gasbee iOS: $TARGET"
echo "═══════════════════════════════════════════════"
echo ""

# 1. Build the Vite app with the right env
echo "📦 Step 1: Building Vite app with mode=$TARGET..."
npx vite build --mode "$TARGET"

# 2. Copy the right Capacitor config
echo "⚙️  Step 2: Setting Capacitor config for $TARGET..."
cp "capacitor.config.$TARGET.ts" capacitor.config.ts

# 3. Add iOS platform directory if not exists
if [ ! -d "ios-$TARGET" ]; then
  echo "📱 Step 3: Bootstrapping iOS project ios-$TARGET..."
  npx cap add ios || {
    echo "⚠️  Warning: npx cap add ios completed with warnings or errors."
    echo "   This is expected if CocoaPods (pod) is not installed."
  }
else
  echo "📱 Step 3: iOS project directory ios-$TARGET already exists."
fi

# 4. Sync to iOS
echo "🔄 Step 4: Syncing to iOS project..."
npx cap sync ios || {
  echo "⚠️  Warning: npx cap sync ios completed with warnings or errors."
  echo "   This is expected if CocoaPods (pod) is not installed on this machine."
  echo "   Continuing to apply Info.plist configurations..."
}

# 5. Update configurations (appId, plist keys, etc.)
echo "🔧 Step 5: Running update-config.cjs for $TARGET..."
node update-config.cjs "$TARGET"

echo ""
echo "🎉 Done! iOS project is ready at: ios-$TARGET"
echo ""
echo "👉 To open in Xcode, run:"
echo "   npx cap open ios (make sure capacitor.config.ts is set for $TARGET)"
echo "   or open: ios-$TARGET/App/App.xcworkspace"
echo ""
