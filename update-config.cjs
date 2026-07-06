const fs = require('fs');
const path = require('path');

const variant = process.argv[2];
const isUser = variant === 'user';
const appId = isUser ? 'com.gasbee.app' : 'com.gasbee.rider';
const appName = isUser ? 'Gasbee' : 'Gasbee Rider';
const targetAndroidDir = isUser ? 'android-user' : 'android-rider';
const targetIosDir = isUser ? 'ios-user' : 'ios-rider';

// 1. Update capacitor.config.ts
const capConfigPath = path.join(__dirname, 'capacitor.config.ts');
if (fs.existsSync(capConfigPath)) {
  let content = fs.readFileSync(capConfigPath, 'utf8');
  content = content.replace(/appId:\s*['"`][^'"`]+['"`]/, `appId: '${appId}'`);
  content = content.replace(/appName:\s*['"`][^'"`]+['"`]/, `appName: '${appName}'`);
  fs.writeFileSync(capConfigPath, content, 'utf8');
  console.log(`Updated capacitor.config.ts -> appId: ${appId}, appName: ${appName}`);
}

// 2. Update android project build.gradle
const buildGradlePath = path.join(__dirname, targetAndroidDir, 'app', 'build.gradle');
if (fs.existsSync(buildGradlePath)) {
  let content = fs.readFileSync(buildGradlePath, 'utf8');
  content = content.replace(/namespace\s+['"`][^'"`]+['"`]/, `namespace "${appId}"`);
  content = content.replace(/applicationId\s+['"`][^'"`]+['"`]/, `applicationId "${appId}"`);
  fs.writeFileSync(buildGradlePath, content, 'utf8');
  console.log(`Updated ${targetAndroidDir}/app/build.gradle -> appId: ${appId}`);
}

// 3. Update strings.xml
const stringsXmlPath = path.join(__dirname, targetAndroidDir, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
if (fs.existsSync(stringsXmlPath)) {
  let content = fs.readFileSync(stringsXmlPath, 'utf8');
  content = content.replace(/<string name="app_name">[^<]+<\/string>/, `<string name="app_name">${appName}</string>`);
  content = content.replace(/<string name="title_activity_main">[^<]+<\/string>/, `<string name="title_activity_main">${appName}</string>`);
  content = content.replace(/<string name="package_name">[^<]+<\/string>/, `<string name="package_name">${appId}</string>`);
  fs.writeFileSync(stringsXmlPath, content, 'utf8');
  console.log(`Updated strings.xml -> appName: ${appName}`);
}

// 4. Patch AndroidManifest.xml with CHIP Deep Links
const manifestPath = path.join(__dirname, targetAndroidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
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
    console.log(`Patched ${targetAndroidDir} AndroidManifest.xml with deep links & singleTask launchMode.`);
  }
}

// 5. Update src/variant.ts
const variantTsPath = path.join(__dirname, 'src', 'variant.ts');
fs.writeFileSync(variantTsPath, `export const APP_VARIANT = (import.meta.env.VITE_APP_MODE || 'web') as 'user' | 'rider' | 'web';\n`, 'utf8');
console.log(`Updated src/variant.ts -> APP_VARIANT set to dynamic with 'web' fallback`);

// 6. Update iOS Info.plist if directory exists
const plistPath = path.join(__dirname, targetIosDir, 'App', 'App', 'Info.plist');
if (fs.existsSync(plistPath)) {
  let content = fs.readFileSync(plistPath, 'utf8');
  
  // 6a. Update Display Name (CFBundleDisplayName)
  const displayNameRegex = /<key>CFBundleDisplayName<\/key>\s*<string>[^<]+<\/string>/;
  if (displayNameRegex.test(content)) {
    content = content.replace(displayNameRegex, `<key>CFBundleDisplayName</key>\n\t<string>${appName}</string>`);
  } else {
    // If not found, insert after the first <dict>
    content = content.replace(/<dict>/, `<dict>\n\t<key>CFBundleDisplayName</key>\n\t<string>${appName}</string>`);
  }
  
  // 6b. Add/Update Geolocation permissions if not present
  if (!content.includes('NSLocationWhenInUseUsageDescription')) {
    const locationDescriptions = `
	<key>NSLocationWhenInUseUsageDescription</key>
	<string>Kami memerlukan akses lokasi anda untuk menjejaki pesanan dan mencari pemandu berhampiran.</string>
	<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
	<string>Kami memerlukan akses lokasi anda untuk menjejaki pesanan dan mengemas kini status penghantaran dalam latar belakang.</string>`;
    content = content.replace(/<\/dict>\s*<\/plist>/, `${locationDescriptions}\n</dict>\n</plist>`);
  }
  
  // 6c. Add/Update Deep Link schemes if CFBundleURLTypes is not present
  if (!content.includes('CFBundleURLTypes')) {
    const urlTypes = `
	<key>CFBundleURLTypes</key>
	<array>
		<dict>
			<key>CFBundleURLName</key>
			<string>${appId}</string>
			<key>CFBundleURLSchemes</key>
			<array>
				<string>gasbee</string>
			</array>
		</dict>
	</array>`;
    content = content.replace(/<\/dict>\s*<\/plist>/, `${urlTypes}\n</dict>\n</plist>`);
  }

  fs.writeFileSync(plistPath, content, 'utf8');
  console.log(`Updated ${targetIosDir} Info.plist -> CFBundleDisplayName: ${appName}, Location permissions & Deep Link Scheme: gasbee`);
}
