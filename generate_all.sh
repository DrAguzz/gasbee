#!/bin/bash
set -e

echo "Starting build for User..."
npx vite build --mode user
cp capacitor.config.user.ts capacitor.config.ts
npx cap sync android
node update-config.cjs user
cd android-user
./gradlew assembleRelease bundleRelease
cd ..
cp android-user/app/build/outputs/apk/release/app-release.apk gasbee-user-release.apk
cp android-user/app/build/outputs/bundle/release/app-release.aab gasbee-user-release.aab

echo "Starting build for Rider..."
npx vite build --mode rider
cp capacitor.config.rider.ts capacitor.config.ts
npx cap sync android
node update-config.cjs rider
cd android-rider
./gradlew assembleRelease bundleRelease
cd ..
cp android-rider/app/build/outputs/apk/release/app-release.apk gasbee-rider-release.apk
cp android-rider/app/build/outputs/bundle/release/app-release.aab gasbee-rider-release.aab

echo "Build complete. Files generated:"
ls -lh gasbee-user-release.apk gasbee-user-release.aab gasbee-rider-release.apk gasbee-rider-release.aab
