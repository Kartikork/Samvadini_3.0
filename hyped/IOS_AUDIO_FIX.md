# iOS Audio/Video Call Fix

## Problem
The app was crashing on iOS when initiating audio/video calls with the following error:
```
EXC_CRASH (SIGABRT)
AudioUnitInitialize failed
_ReportRPCTimeout
AURemoteIO::SetProperty
```

This indicated that the iOS audio session was not properly configured before WebRTC attempted to initialize the audio unit.

## Solution
Added proper iOS audio session configuration before requesting user media (microphone/camera access) via WebRTC.

## Changes Made

### File: `src/services/WebRTCMediaService/index.ts`

#### 1. Added iOS Audio Session Configuration Helper
Added a new helper function `configureIOSAudioSession()` that:
- Configures the iOS audio session before getUserMedia is called
- Attempts to use WebRTCModule's native audio session configuration if available
- Falls back to react-native-incall-manager for audio session setup
- Logs all configuration attempts for debugging

#### 2. Updated getUserMedia Calls
Modified two locations where `mediaDevices.getUserMedia()` is called:

**Location 1: In `createPeerConnection()` method**
- Added iOS audio session configuration before requesting media for the peer connection
- Ensures audio session is ready before WebRTC initializes

**Location 2: In `getLocalMediaPreview()` method**
- Added iOS audio session configuration before requesting media for preview
- Ensures audio session is ready even when showing preview before call starts

#### 3. Added Audio Session Cleanup
Modified the `endCall()` method to:
- Properly stop the iOS audio session via InCallManager when call ends
- Prevents audio session from staying active after call completion
- Ensures clean state for next call

## Technical Details

### iOS Audio Session Requirements
On iOS, WebRTC requires the audio session to be configured with the correct category and mode before accessing the microphone. Without this configuration, the system's AudioUnitInitialize fails, causing the app to crash.

### Configuration Approach
1. **Primary Method**: Use WebRTCModule's native `configureAudioSession()` if available
2. **Fallback Method**: Use InCallManager's `start()` method with audio media type
3. **Graceful Degradation**: If neither method is available, log a warning and let WebRTC try with defaults

### Cleanup Approach
- Use InCallManager's `stop()` method to properly release the audio session
- This ensures the audio routing returns to normal after the call

## Testing
To test the fix:
1. Reload the app (no new build needed as changes are JavaScript-only)
2. Initiate an audio or video call
3. Verify that:
   - The call connects without crashing
   - Audio works properly
   - Speaker/earpiece routing works
   - Audio session is properly released after call ends

## Logs to Monitor
Look for these log messages:
- `🔧 Configuring iOS audio session...`
- `✅ iOS audio session configured via WebRTCModule` or `✅ iOS audio session configured via InCallManager`
- `🔇 iOS audio session stopped via InCallManager` (on call end)

## Dependencies
- `react-native-webrtc`: Core WebRTC functionality
- `react-native-incall-manager`: Audio session and routing management

Both dependencies are already installed in the project.

## Notes
- This fix is iOS-specific and does not affect Android functionality
- The changes are entirely in JavaScript/TypeScript, so no native rebuild is required
- The fix handles cases where InCallManager might not be available gracefully
- Pre-existing TypeScript type definition warnings for react-native-webrtc do not affect runtime behavior
