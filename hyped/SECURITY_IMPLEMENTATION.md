# Security Implementation Guide

## Overview

Comprehensive security implementation including Runtime Application Self-Protection (RASP), device binding, and session management.

## Architecture

### 1. DeviceBindingService (`src/services/DeviceBindingService.ts`)

- **getAllSims()** - Get available SIM cards (Android)
- **getSimInfo(slotIndex)** - Get SIM info for slot
- **getDeviceFingerprint()** - Device fingerprint
- **initializeKeystore()** - Initialize Android Keystore
- **registerDevice()** - Register device with backend after login
- **validateSession()** - Validate session on app resume
- **startSimChangeListener()** - Listen for SIM changes
- **stopSimChangeListener()** - Stop SIM listener

### 2. SecurityService (`src/services/SecurityService.ts`)

- **performSecurityCheck()** - Run security checks
- **setModalCallback()** - Callback when threats detected
- **startSecurityMonitoring(intervalMs)** - Periodic checks
- **stopSecurityMonitoring()** - Stop monitoring
- **enableScreenshotProtection()** - FLAG_SECURE on screen
- **disableScreenshotProtection()** - Remove protection

### 3. SessionRevocationHandler (`src/services/SessionRevocationHandler.ts`)

- **clearAllSessionData()** - Clear auth and binding tokens
- **navigateToLogin(reason)** - Reset to LanguageSelection
- **handleValidationFailure(error, reason)** - Handle validation errors
- **handleSimChange()** - Handle SIM change events

## Integration Points

### App.tsx
- SecurityService initialization on mount
- SecurityModal for threat display
- DeviceBindingService.validateSession() on app resume
- Force logout handling

### LoginScreen
- SIM detection on Android mount
- SimSelectionModal, SimBindingConsentModal, SimBindingProgress
- DeviceBindingService.registerDevice() after OTP verification
- Auto-fill phone from SIM

## Risk Levels

- **CRITICAL** (≥70): Terminate session
- **HIGH** (≥40): Force re-verification
- **MEDIUM** (≥20): Restrict features
- **LOW** (<20): Allow normal operation
