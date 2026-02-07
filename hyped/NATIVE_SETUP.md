# Native Setup for Cold Start Calls

To enable cold start call recovery (accepting calls when app is killed), you need to configure Firebase and Notifee on both Android and iOS.

---

## 🤖 Android Setup

### 1. Firebase Configuration

**File: `android/app/google-services.json`**

Make sure this file exists and is properly configured with your Firebase project.

**File: `android/build.gradle`**

Add Google services plugin:

```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'  // Add this
    }
}
```

**File: `android/app/build.gradle`**

```gradle
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services'  // Add this at the bottom

android {
    defaultConfig {
        // ... existing config
        multiDexEnabled true  // Add this if not present
    }
}

dependencies {
    // Firebase
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
    
    // ... other dependencies
}
```

### 2. Android Permissions

**File: `android/app/src/main/AndroidManifest.xml`**

```xml
<manifest>
    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application>
        <!-- Firebase Messaging Service -->
        <service
            android:name="io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>

        <!-- Notification Channel (for Android 8+) -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="incoming_calls" />

        <!-- High priority for call notifications -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@drawable/ic_notification" />

        <meta-data
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/primary" />
    </application>
</manifest>
```

### 3. Notification Icon

Create notification icon at:
`android/app/src/main/res/drawable-mdpi/ic_notification.png`

Or use existing launcher icon.

### 4. ProGuard Rules (Release Build)

**File: `android/app/proguard-rules.pro`**

```proguard
# Firebase
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes SourceFile,LineNumberTable
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Notifee
-keep class app.notifee.** { *; }
-keep class androidx.core.app.NotificationCompat* { *; }
```

---

## 🍎 iOS Setup

### 1. Firebase Configuration

**File: `ios/GoogleService-Info.plist`**

Make sure this file exists in your Xcode project (downloaded from Firebase Console).

### 2. Install Pods

```bash
cd ios
pod install
cd ..
```

### 3. Enable Push Notifications Capability

In Xcode:
1. Open `ios/YourApp.xcworkspace`
2. Select your app target
3. Go to "Signing & Capabilities"
4. Click "+ Capability"
5. Add "Push Notifications"
6. Add "Background Modes"
   - Check "Remote notifications"
   - Check "Background fetch"
   - Check "Voice over IP" (for call quality)

### 4. Configure AppDelegate

**File: `ios/YourApp/AppDelegate.mm`**

```objc
#import <Firebase.h>
#import <UserNotifications/UserNotifications.h>
#import <RNCPushNotificationIOS.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Firebase initialization
  [FIRApp configure];
  
  // Register for remote notifications
  [UNUserNotificationCenter currentNotificationCenter].delegate = self;
  
  // ... existing code
  
  return YES;
}

// Handle notification received in foreground
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler
{
  completionHandler(UNNotificationPresentationOptionSound | UNNotificationPresentationOptionAlert | UNNotificationPresentationOptionBadge);
}

// Handle notification tapped
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
didReceiveNotificationResponse:(UNNotificationResponse *)response
         withCompletionHandler:(void(^)(void))completionHandler
{
  [[RNCPushNotificationIOS didReceiveNotificationResponse:response];
  completionHandler();
}

// Handle FCM token
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [[RNCPushNotificationIOS didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
  [[RNCPushNotificationIOS didFailToRegisterForRemoteNotificationsWithError:error];
}

// Handle remote notification
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo
fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  [[RNCPushNotificationIOS didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];
}

@end
```

### 5. Info.plist Permissions

**File: `ios/YourApp/Info.plist`**

```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
    <string>voip</string>
    <string>fetch</string>
</array>
<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access for audio calls</string>
<key>NSCameraUsageDescription</key>
<string>We need camera access for video calls</string>
```

---

## 🔧 Verify Setup

### Test FCM (Android)
```bash
# Send test notification using Firebase Console
# Or use this curl command:
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "DEVICE_FCM_TOKEN",
    "data": {
      "type": "incoming_call",
      "callId": "test-123",
      "callerId": "user-456",
      "callerName": "Test User",
      "callType": "audio",
      "timestamp": "1710000000000"
    }
  }'
```

### Test Background Handler (Kill App First!)
1. Kill the app completely
2. Send FCM push via backend
3. Check notification appears
4. Tap Accept
5. App should launch and connect

---

## 📦 Required Dependencies

Already added to `package.json`:

```json
{
  "dependencies": {
    "@react-native-firebase/app": "^23.8.6",
    "@react-native-firebase/messaging": "^23.8.6",
    "@notifee/react-native": "^9.1.6"
  }
}
```

Make sure to run:
```bash
npm install
cd ios && pod install && cd ..
```

---

## 🎯 Next Steps

1. **Configure Firebase project** in Firebase Console
2. **Download config files**:
   - Android: `google-services.json` → `android/app/`
   - iOS: `GoogleService-Info.plist` → `ios/YourApp/`
3. **Update native code** as shown above
4. **Rebuild app** (clean build recommended)
5. **Test foreground** → background → killed states
6. **Debug with logs** from COLD_START_TESTING.md

---

## 🔗 Documentation Links

- [React Native Firebase Setup](https://rnfirebase.io/)
- [Notifee Setup](https://notifee.app/react-native/docs/installation)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Android Background Restrictions](https://developer.android.com/about/versions/12/behavior-changes-12#notification-trampolines)

---

**⚠️ IMPORTANT**: Cold start recovery requires proper native setup. The JavaScript code is ready - you just need to configure Firebase/Notifee natively!



