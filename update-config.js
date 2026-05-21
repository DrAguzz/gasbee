const fs = require('fs');
const path = require('path');

const variant = process.argv[2];
const isUser = variant === 'user';
const appId = isUser ? 'com.gasbee.user' : 'com.gasbee.rider';
const appName = isUser ? 'Gasbee' : 'Gasbee Rider';

// 1. Update capacitor.config.ts
const capConfigPath = path.join(__dirname, 'capacitor.config.ts');
if (fs.existsSync(capConfigPath)) {
  let content = fs.readFileSync(capConfigPath, 'utf8');
  content = content.replace(/appId:\s*['"`][^'"`]+['"`]/, `appId: '${appId}'`);
  content = content.replace(/appName:\s*['"`][^'"`]+['"`]/, `appName: '${appName}'`);
  fs.writeFileSync(capConfigPath, content, 'utf8');
  console.log(`Updated capacitor.config.ts -> appId: ${appId}, appName: ${appName}`);
}

// 2. Update android/app/build.gradle
const buildGradlePath = path.join(__dirname, 'android', 'app', 'build.gradle');
if (fs.existsSync(buildGradlePath)) {
  let content = fs.readFileSync(buildGradlePath, 'utf8');
  content = content.replace(/namespace\s+['"`][^'"`]+['"`]/, `namespace "${appId}"`);
  content = content.replace(/applicationId\s+['"`][^'"`]+['"`]/, `applicationId "${appId}"`);
  fs.writeFileSync(buildGradlePath, content, 'utf8');
  console.log(`Updated android/app/build.gradle -> appId: ${appId}`);
}

// 3. Update strings.xml
const stringsXmlPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
if (fs.existsSync(stringsXmlPath)) {
  let content = fs.readFileSync(stringsXmlPath, 'utf8');
  content = content.replace(/<string name="app_name">[^<]+<\/string>/, `<string name="app_name">${appName}</string>`);
  content = content.replace(/<string name="title_activity_main">[^<]+<\/string>/, `<string name="title_activity_main">${appName}</string>`);
  content = content.replace(/<string name="package_name">[^<]+<\/string>/, `<string name="package_name">${appId}</string>`);
  fs.writeFileSync(stringsXmlPath, content, 'utf8');
  console.log(`Updated strings.xml -> appName: ${appName}`);
}

// 4. Patch AndroidManifest.xml with CHIP Deep Links
const manifestPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let content = fs.readFileSync(manifestPath, 'utf8');
  if (!content.includes('android:scheme="gasbee"')) {
    const deepLinkFilters = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="gasbee" />
            </intent-filter>`;
    
    // Insert intent filters before the closing tag of the MainActivity activity
    content = content.replace(/<\/activity>/, `${deepLinkFilters}\n        </activity>`);
    
    // Ensure launchMode is singleTask (standard for deep link routing)
    if (!content.includes('android:launchMode="singleTask"')) {
      content = content.replace(/android:name="\.MainActivity"/, `android:name="\.MainActivity"\n            android:launchMode="singleTask"`);
    }
    
    fs.writeFileSync(manifestPath, content, 'utf8');
    console.log("Patched AndroidManifest.xml with deep links & singleTask launchMode.");
  }
}

// 5. Update src/variant.ts
const variantTsPath = path.join(__dirname, 'src', 'variant.ts');
fs.writeFileSync(variantTsPath, `export const APP_VARIANT = '${variant}' as 'user' | 'rider';\n`, 'utf8');
console.log(`Updated src/variant.ts -> APP_VARIANT: ${variant}`);
