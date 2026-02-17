# iOS Permissions Update - Automatic System Dialogs

## Changes Made

Updated the permissions flow to automatically request permissions on the splash screen using native system dialogs instead of a custom UI modal.

### Modified Files

#### 1. `src/screens/SplashScreen/index.tsx`
- **Removed**: Custom `PermissionsModal` component integration
- **Added**: Direct permission request functions from `utils/permissions`
- **Added**: `requestAllPermissions()` function that automatically requests all iOS permissions sequentially
- **Logic**: 
  - After successful app bootstrap for logged-in users
  - Checks if permissions have been requested before (via AsyncStorage)
  - If not requested, calls `requestAllPermissions()` which shows native iOS permission dialogs
  - Marks permissions as requested in AsyncStorage
  - Continues to ChatList screen

#### 2. `src/screens/DashboardScreen/index.tsx`
- **Removed**: All permission-related code (PermissionsModal, AsyncStorage checks, state)
- **Reason**: Permissions are now handled entirely on splash screen, no fallback needed

#### 3. `src/components/PermissionsModal/index.tsx`
- **Deleted**: Entire custom permissions modal component
- **Reason**: No longer needed, using native system dialogs instead

### How It Works

1. **User launches app** → SplashScreen loads
2. **User is logged in** → App bootstrap starts
3. **Bootstrap successful** → Check if permissions requested before
4. **First time** → Automatically request all permissions:
   - Contacts (via `requestContactsPermission()`)
   - Location (via `requestLocationPermission()`)
   - Camera (via `requestCameraPermission()`)
   - Microphone (via `requestMicrophonePermission()`)
   - Photos (via `requestPhotoLibraryPermission()`)
5. **iOS shows native system dialogs** for each permission
6. **User grants or denies** each permission
7. **Flag saved in AsyncStorage** to prevent re-requesting
8. **Navigate to ChatList**

### Benefits

- ✅ **No custom UI** - Uses native iOS permission dialogs
- ✅ **Automatic** - User doesn't need to click anything extra
- ✅ **One-time** - Permissions only requested once per installation
- ✅ **Non-blocking** - Even if user denies, app continues normally
- ✅ **Cleaner code** - Removed unnecessary modal component
- ✅ **Better UX** - Follows iOS native patterns

### For Android

- Android permissions were already configured in the manifest
- The permission functions check `Platform.OS` and return `true` for Android where not applicable
- Android runtime permissions are requested when features are used (camera for calls, contacts for adding, etc.)

### Testing

To test on iOS:
1. Delete and reinstall the app (or clear app data)
2. Login
3. Watch for native iOS permission dialogs appearing automatically
4. Verify app continues to ChatList after permissions

To reset permissions for testing:
1. Go to iOS Settings → Your App → Reset permissions
2. Delete app and reinstall
3. Or clear AsyncStorage key: `permissions_requested`

### Info.plist Requirements

All required privacy usage descriptions are already present in `ios/hyped/Info.plist`:
- `NSContactsUsageDescription`
- `NSLocationWhenInUseUsageDescription`
- `NSCameraUsageDescription`
- `NSMicrophoneUsageDescription`
- `NSPhotoLibraryUsageDescription`
- `NSPhotoLibraryAddUsageDescription`

### No Native Rebuild Required

All changes are JavaScript/TypeScript only. Simply reload the app to see the changes.
