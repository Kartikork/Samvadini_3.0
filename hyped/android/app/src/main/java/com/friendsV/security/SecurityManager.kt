package com.friendsV.security

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.hardware.display.DisplayManager
import android.location.Location
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Debug
import android.provider.Settings
import android.provider.Telephony
import android.view.Display
import android.view.WindowManager
import android.view.accessibility.AccessibilityManager
import com.friendsV.BuildConfig
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.net.InetSocketAddress
import java.net.Proxy
import java.security.MessageDigest
import java.util.*

/**
 * Comprehensive Runtime Application Self-Protection (RASP) Manager
 * Implements WhatsApp-level security controls for Android React Native app
 */
class SecurityManager(private val context: Context) {

    // Risk levels
    enum class RiskLevel {
        LOW, MEDIUM, HIGH, CRITICAL
    }

    // Security event types
    enum class SecurityEvent {
        SCREEN_MIRRORING_DETECTED,
        HOOKING_DETECTED,
        ROOT_DETECTED,
        EMULATOR_DETECTED,
        DEBUGGER_DETECTED,
        MITM_DETECTED,
        PROXY_DETECTED,
        VPN_DETECTED,
        ACCESSIBILITY_ABUSE,
        APP_REPACKAGED,
        DEVELOPER_OPTIONS_ENABLED,
        APP_SPOOFING_DETECTED,
        TIME_MANIPULATION_DETECTED,
        MOCK_LOCATION_DETECTED,
        SMS_INTERCEPTION_DETECTED
    }

    data class SecurityCheckResult(
        val riskLevel: RiskLevel,
        val riskScore: Int,
        val threats: List<SecurityEvent>,
        val details: Map<String, Any>
    )

    /**
     * Perform comprehensive security check
     * Returns risk score and detected threats
     */
    fun performSecurityCheck(): SecurityCheckResult {
        val threats = mutableListOf<SecurityEvent>()
        val details = mutableMapOf<String, Any>()
        var riskScore = 0

        // Check for root
        if (isRooted()) {
            threats.add(SecurityEvent.ROOT_DETECTED)
            riskScore += 50
            details["root"] = true
            android.util.Log.w("SecurityManager", "⚠️ Root detected")
        }

        // Check for emulator
        if (isEmulator()) {
            threats.add(SecurityEvent.EMULATOR_DETECTED)
            riskScore += 5
            details["emulator"] = true
            android.util.Log.w("SecurityManager", "⚠️ Emulator detected")
        }

        // Check for debugger
        if (isDebuggerAttached()) {
            threats.add(SecurityEvent.DEBUGGER_DETECTED)
            riskScore += 40
            details["debugger"] = true
            android.util.Log.w("SecurityManager", "⚠️ Debugger attached")
        }

        // Check for hooking frameworks
        val hookingResult = detectHooking()
        if (hookingResult.isHooked) {
            threats.add(SecurityEvent.HOOKING_DETECTED)
            riskScore += 60
            details["hooking"] = hookingResult.details
            android.util.Log.w("SecurityManager", "⚠️ Hooking detected: ${hookingResult.details}")
        }

        // Check for screen mirroring
        if (isScreenMirroring()) {
            threats.add(SecurityEvent.SCREEN_MIRRORING_DETECTED)
            riskScore += 15
            details["screenMirroring"] = true
            android.util.Log.w("SecurityManager", "⚠️ Screen mirroring detected")
        }

        // Check for network threats
        val networkThreats = checkNetworkSecurity()
        if (networkThreats.isProxy) {
            threats.add(SecurityEvent.PROXY_DETECTED)
            riskScore += 5
            details["proxy"] = true
        }
        if (networkThreats.isVPN) {
            threats.add(SecurityEvent.VPN_DETECTED)
            riskScore += 5
            details["vpn"] = true
        }
        if (networkThreats.isMITM) {
            threats.add(SecurityEvent.MITM_DETECTED)
            riskScore += 70
            details["mitm"] = true
            if (com.friendsV.network.CertificatePinningFailureHolder.hasFailure()) {
                details["certificatePinningFailure"] = true
            }
        }

        // Check for accessibility abuse
        /*if (isAccessibilityAbused()) {
            threats.add(SecurityEvent.ACCESSIBILITY_ABUSE)
            riskScore += 35
            details["accessibilityAbuse"] = true
        }*/

        // Check for app repackaging
        val repackagingResult = checkAppRepackaging()
        if (repackagingResult.isRepackaged) {
            threats.add(SecurityEvent.APP_REPACKAGED)
            riskScore += 80
            details["repackaged"] = true
            details["repackagingDetails"] = repackagingResult.details
        }

        // Check for developer options enabled
        /*if (isDeveloperOptionsEnabled()) {
            threats.add(SecurityEvent.DEVELOPER_OPTIONS_ENABLED)
            riskScore += 20
            details["developerOptions"] = true
            android.util.Log.w("SecurityManager", "⚠️ Developer options enabled")
        }*/

        // Check for app spoofing
        val spoofingResult = checkAppSpoofing()
        /*if (spoofingResult.isSpoofed) {
            threats.add(SecurityEvent.APP_SPOOFING_DETECTED)
            riskScore += 90
            details["appSpoofing"] = true
            details["spoofingDetails"] = spoofingResult.details
            android.util.Log.w("SecurityManager", "⚠️ App spoofing detected: ${spoofingResult.details}")
        }*/

        // Check for time manipulation
        val timeManipulationResult = detectTimeManipulation()
        if (timeManipulationResult.isManipulated) {
            threats.add(SecurityEvent.TIME_MANIPULATION_DETECTED)
            riskScore += 5
            details["timeManipulation"] = true
            details["timeManipulationDetails"] = timeManipulationResult.details
            android.util.Log.w("SecurityManager", "⚠️ Time manipulation detected: ${timeManipulationResult.details}")
        }

        // Check for mock location / GPS spoofing
        val mockLocationResult = detectMockLocation()
        if (mockLocationResult.isMocked) {
            threats.add(SecurityEvent.MOCK_LOCATION_DETECTED)
            riskScore += 5
            details["mockLocation"] = true
            details["mockLocationDetails"] = mockLocationResult.details
            android.util.Log.w("SecurityManager", "⚠️ Mock location detected: ${mockLocationResult.details}")
        }

        // Check for SMS interception
        val smsInterceptionResult = detectSmsInterception()
        if (smsInterceptionResult.isIntercepted) {
            threats.add(SecurityEvent.SMS_INTERCEPTION_DETECTED)
            riskScore += 5
            details["smsInterception"] = true
            details["smsInterceptionDetails"] = smsInterceptionResult.details
            android.util.Log.w("SecurityManager", "⚠️ SMS interception detected: ${smsInterceptionResult.details}")
        }

        // Determine risk level
        val riskLevel = when {
            riskScore >= 70 -> RiskLevel.CRITICAL
            riskScore >= 40 -> RiskLevel.HIGH
            riskScore >= 20 -> RiskLevel.MEDIUM
            else -> RiskLevel.LOW
        }

        return SecurityCheckResult(riskLevel, riskScore, threats, details)
    }

    /**
     * Enhanced root detection
     */
    private fun isRooted(): Boolean {
        // Method 1: Check for su binaries
        val suPaths = arrayOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
            "/su/bin/su",
            "/system/xbin/daemonsu",
            "/system/etc/init.d/99SuperSUDaemon"
        )
        
        if (suPaths.any { File(it).exists() }) {
            return true
        }

        // Method 2: Check for which su
        try {
            val process = Runtime.getRuntime().exec(arrayOf("/system/xbin/which", "su"))
            val inputStream = process.inputStream
            val scanner = Scanner(inputStream).useDelimiter("\\A")
            val result = if (scanner.hasNext()) scanner.next() else ""
            process.waitFor()
            if (result.isNotEmpty()) return true
        } catch (e: Exception) {
            // Ignore
        }

        // Method 3: Check for test-keys in build tags
        val buildTags = Build.TAGS
        if (buildTags != null && buildTags.contains("test-keys")) {
            return true
        }

        // Method 4: Check for dangerous properties
        try {
            val process = Runtime.getRuntime().exec(arrayOf("getprop", "ro.debuggable"))
            val inputStream = process.inputStream
            val scanner = Scanner(inputStream).useDelimiter("\\A")
            val result = if (scanner.hasNext()) scanner.next().trim() else ""
            process.waitFor()
            if (result == "1") return true
        } catch (e: Exception) {
            // Ignore
        }

        return false
    }

    /**
     * Enhanced emulator detection - Ultra strict to avoid false positives on real devices
     * Only uses definitive checks that absolutely cannot be on real devices
     * USB debugging or developer options will NOT trigger this
     */
    private fun isEmulator(): Boolean {
        // Only use the most definitive checks that are IMPOSSIBLE on real devices
        
        // Check 1: QEMU kernel property (MOST RELIABLE - only exists on emulators)
        var hasQemuProperty = false
        try {
            val process = Runtime.getRuntime().exec(arrayOf("getprop", "ro.kernel.qemu"))
            val inputStream = process.inputStream
            val scanner = Scanner(inputStream).useDelimiter("\\A")
            val result = if (scanner.hasNext()) scanner.next().trim() else ""
            process.waitFor()
            if (result == "1") {
                hasQemuProperty = true
            }
        } catch (e: Exception) {
            // Ignore
        }
        
        // Check 2: Emulator-specific files (definitive - these don't exist on real devices)
        val emulatorFiles = arrayOf(
            "/system/lib/libc_malloc_debug_qemu.so",
            "/sys/qemu_trace",
            "/system/bin/qemu-props",
            "/dev/socket/qemud",
            "/dev/qemu_pipe"
        )
        val hasEmulatorFiles = emulatorFiles.any { File(it).exists() }
        
        // Check 3: Hardware type from Build (definitive emulator hardware)
        val hasEmulatorHardware = Build.HARDWARE.contains("goldfish") || 
                                  Build.HARDWARE.contains("ranchu") || 
                                  Build.HARDWARE.contains("vbox86")
        
        // Check 4: Hardware type from system property (double-check)
        var hasEmulatorHardwareProp = false
        try {
            val process = Runtime.getRuntime().exec(arrayOf("getprop", "ro.hardware"))
            val inputStream = process.inputStream
            val scanner = Scanner(inputStream).useDelimiter("\\A")
            val result = if (scanner.hasNext()) scanner.next().trim().lowercase() else ""
            process.waitFor()
            if (result.contains("goldfish") || result.contains("ranchu") || result.contains("vbox")) {
                hasEmulatorHardwareProp = true
            }
        } catch (e: Exception) {
            // Ignore
        }
        
        // Check 5: Very specific product names (only exact matches for known emulators)
        val product = Build.PRODUCT.lowercase()
        val hasEmulatorProduct = product == "google_sdk" || 
                                 product == "sdk" ||
                                 product.contains("sdk_x86") ||
                                 product.contains("vbox86") ||
                                 product.contains("genymotion") ||
                                 (product.contains("emulator") && product.contains("x86"))
        
        // Check 6: Brand + Device combination (only if BOTH are "generic")
        val hasGenericBrandDevice = Build.BRAND.equals("generic", ignoreCase = true) && 
                                    Build.DEVICE.equals("generic", ignoreCase = true)
        
        // Count only the most definitive indicators
        val definitiveIndicators = listOf(
            hasQemuProperty,           // QEMU property = 1 (definitive)
            hasEmulatorFiles,          // QEMU files exist (definitive)
            hasEmulatorHardware,       // Emulator hardware in Build (definitive)
            hasEmulatorHardwareProp,   // Emulator hardware in property (definitive)
            hasEmulatorProduct,        // Specific emulator product names (definitive)
            hasGenericBrandDevice      // Both brand and device are "generic" (definitive)
        ).count { it }
        
        // Require at least 2 definitive indicators to avoid ANY false positives
        // Real devices with USB debugging will have 0 definitive indicators
        // Only actual emulators will have 2+ definitive indicators
        return definitiveIndicators >= 2
    }

    /**
     * Debugger detection
     */
    private fun isDebuggerAttached(): Boolean {
        // Method 1: Check Debug.isDebuggerConnected()
        if (Debug.isDebuggerConnected()) {
            return true
        }

        // Method 2: Check tracerpid
        try {
            val tracerPid = File("/proc/self/status").readText()
                .lines()
                .find { it.startsWith("TracerPid:") }
                ?.substringAfter(":")?.trim()?.toIntOrNull() ?: 0
            if (tracerPid > 0) return true
        } catch (e: Exception) {
            // Ignore
        }

        return false
    }

    /**
     * Detect hooking frameworks (Frida, Xposed, Substrate)
     */
    private fun detectHooking(): HookingResult {
        val details = mutableMapOf<String, Any>()

        // Check for Frida
        val fridaIndicators = arrayOf(
            "frida-server",
            "frida_agent",
            "libfrida",
            "gum-js-loop",
            "linjector"
        )

        val loadedLibraries = getLoadedLibraries()
        val fridaDetected = fridaIndicators.any { indicator ->
            loadedLibraries.any { it.contains(indicator, ignoreCase = true) }
        }

        if (fridaDetected) {
            details["frida"] = true
            android.util.Log.w("SecurityManager", "⚠️ Frida detected")
        }

        // Check for Xposed
        try {
            val xposedClass = Class.forName("de.robv.android.xposed.XposedBridge")
            details["xposed"] = true
            android.util.Log.w("SecurityManager", "⚠️ Xposed detected")
        } catch (e: ClassNotFoundException) {
            // Xposed not present
        }

        // Check for Substrate
        try {
            val substrateClass = Class.forName("com.saurik.substrate.MS$2")
            details["substrate"] = true
            android.util.Log.w("SecurityManager", "⚠️ Substrate detected")
        } catch (e: ClassNotFoundException) {
            // Substrate not present
        }

        // Check for suspicious native libraries
        val suspiciousLibs = loadedLibraries.filter { lib ->
            lib.contains("hook", ignoreCase = true) ||
            lib.contains("inject", ignoreCase = true) ||
            lib.contains("bypass", ignoreCase = true)
        }

        if (suspiciousLibs.isNotEmpty()) {
            details["suspiciousLibraries"] = suspiciousLibs
        }

        // Stack trace anomaly detection
        val stackTrace = Thread.currentThread().stackTrace
        val suspiciousFrames = stackTrace.filter { frame ->
            frame.className.contains("frida", ignoreCase = true) ||
            frame.className.contains("xposed", ignoreCase = true) ||
            frame.className.contains("substrate", ignoreCase = true)
        }

        if (suspiciousFrames.isNotEmpty()) {
            details["suspiciousStackTrace"] = true
        }

        return HookingResult(
            isHooked = details.isNotEmpty(),
            details = details
        )
    }

    /**
     * Get loaded native libraries
     */
    private fun getLoadedLibraries(): List<String> {
        val libraries = mutableListOf<String>()
        try {
            val mapsFile = File("/proc/self/maps")
            if (mapsFile.exists()) {
                mapsFile.readLines().forEach { line ->
                    if (line.contains(".so") && line.contains("r-xp")) {
                        val libName = line.substringAfterLast("/")
                        if (libName.isNotEmpty()) {
                            libraries.add(libName)
                        }
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("SecurityManager", "Error reading maps: ${e.message}")
        }
        return libraries.distinct()
    }

    /**
     * Detect screen mirroring and casting
     * Improved to check for ACTIVE mirroring, not just settings
     */
    private fun isScreenMirroring(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
            try {
                val displayManager = context.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
                val displays = displayManager.displays

                // Check for active external displays (not just present in list)
                if (displays.size > 1) {
                    val hasActiveExternalDisplay = displays.any { display ->
                        val isNotDefault = display.displayId != Display.DEFAULT_DISPLAY
                        val isPresentation = (display.flags and Display.FLAG_PRESENTATION) != 0
                        
                        // Check if display is actually ON (API 20+)
                        var isPresent = true
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
                            isPresent = display.state == Display.STATE_ON
                        }
                        
                        // Only consider it mirroring if display is actually ON and active
                        isNotDefault && isPresentation && isPresent
                    }
                    if (hasActiveExternalDisplay) {
                        android.util.Log.d("SecurityManager", "Active external display detected")
                        return true
                    }
                }
            } catch (e: Exception) {
                android.util.Log.w("SecurityManager", "Error checking displays: ${e.message}")
            }
        }

        // Note: MediaRouter is deprecated in API 30+, so we rely on DisplayManager check above
        // which is more reliable for detecting active screen mirroring

        // Fallback: Check wifi_display_on setting, but only if we can verify it's actually active
        // This setting can persist even after casting stops, so we use it as a last resort
        try {
            val wifiDisplayOn = Settings.Global.getInt(
                context.contentResolver,
                "wifi_display_on",
                0
            )
            // Only trust this if we also have an active external display
            // Otherwise, the setting might be stale
            if (wifiDisplayOn == 1) {
                // Double-check with display manager to ensure it's actually active
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
                    val displayManager = context.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
                    val displays = displayManager.displays
                    val hasActiveDisplay = displays.any { display ->
                        val isNotDefault = display.displayId != Display.DEFAULT_DISPLAY
                        var isOn = true
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
                            isOn = display.state == Display.STATE_ON
                        }
                        isNotDefault && isOn
                    }
                    if (hasActiveDisplay) {
                        android.util.Log.d("SecurityManager", "WiFi display setting ON with active display")
                        return true
                    } else {
                        android.util.Log.d("SecurityManager", "WiFi display setting ON but no active display - ignoring")
                        return false
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.w("SecurityManager", "Error checking wifi_display_on: ${e.message}")
        }

        return false
    }

    /**
     * Network security checks
     */
    private fun checkNetworkSecurity(): NetworkThreats {
        val threats = NetworkThreats()

        // Check for proxy
        val proxyHost = System.getProperty("http.proxyHost")
        val proxyPort = System.getProperty("http.proxyPort")
        if (!proxyHost.isNullOrEmpty() || !proxyPort.isNullOrEmpty()) {
            threats.isProxy = true
        }

        // Check system proxy settings
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val network = connectivityManager.activeNetwork
            network?.let {
                val capabilities = connectivityManager.getNetworkCapabilities(it)
                if (capabilities != null) {
                    // Check for VPN
                    if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) {
                        threats.isVPN = true
                    }
                }
            }
        }

        // If certificate pinning failed (server cert didn't match pinned SHA-256), show MITM warning in modal
        if (com.friendsV.network.CertificatePinningFailureHolder.hasFailure()) {
            threats.isMITM = true
        }

        return threats
    }

    /**
     * Check for accessibility service abuse
     * Simplified version that checks installed packages instead of enabled services
     */
    private fun isAccessibilityAbused(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
            try {
                val packageManager = context.packageManager
                
                // Check for suspicious accessibility-related packages
                val suspiciousPackageNames = listOf(
                    "automation",
                    "macro",
                    "clicker",
                    "auto.clicker",
                    "automate",
                    "tasker"
                )
                
                // Get all installed packages
                val installedPackages = packageManager.getInstalledPackages(0)
                
                // Check if any suspicious packages are installed
                val hasSuspiciousPackage = installedPackages.any { packageInfo ->
                    val packageName = packageInfo.packageName.lowercase()
                    suspiciousPackageNames.any { suspicious ->
                        packageName.contains(suspicious, ignoreCase = true)
                    }
                }
                
                if (hasSuspiciousPackage) {
                    android.util.Log.w("SecurityManager", "Suspicious accessibility-related package detected")
                }
                
                return hasSuspiciousPackage
            } catch (e: Exception) {
                // If we can't check, assume no abuse
                android.util.Log.w("SecurityManager", "Could not check accessibility abuse: ${e.message}")
                return false
            }
        }
        return false
    }

    /**
     * Check if app is repackaged - Enhanced detection
     */
    data class RepackagingResult(
        val isRepackaged: Boolean,
        val details: Map<String, Any>
    )

    private fun checkAppRepackaging(): RepackagingResult {
        val details = mutableMapOf<String, Any>()
        var isRepackaged = false

        try {
            val packageInfo = context.packageManager.getPackageInfo(
                context.packageName,
                PackageManager.GET_SIGNATURES
            )

            // Get app signature hash
            val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.signingInfo?.apkContentsSigners
            } else {
                @Suppress("DEPRECATION")
                packageInfo.signatures
            }

            if (signatures != null && signatures.isNotEmpty()) {
                val signature = signatures[0]
                val md = MessageDigest.getInstance("SHA-256")
                val signatureHash = md.digest(signature.toByteArray())
                val signatureHashString = signatureHash.joinToString("") { "%02x".format(it) }
                details["signatureHash"] = signatureHashString

                // Check 1: App is debuggable (repackaged apps often are)
                val appInfo = context.applicationInfo
                val isDebuggable = (appInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
                if (isDebuggable) {
                    details["debuggable"] = true
                    // In production builds, this should be false
                    // Only flag as repackaged if it's a release build that's debuggable
                    if (!BuildConfig.DEBUG) {
                        isRepackaged = true
                        details["reason"] = "Release build is debuggable"
                    }
                }

                // Check 2: Signature mismatch (if we have expected signature stored)
                // TODO: Store expected signature hash securely (e.g., in native code or obfuscated)
                // For now, we rely on debuggable check and other indicators

                // Check 3: Check if app was installed from Play Store
                val installerPackageName = context.packageManager.getInstallerPackageName(context.packageName)
                details["installer"] = installerPackageName ?: "unknown"
                
                // If not installed from Play Store and is debuggable, likely repackaged
                if (installerPackageName != "com.android.vending" && 
                    installerPackageName != "com.google.android.packageinstaller" &&
                    isDebuggable && !BuildConfig.DEBUG) {
                    isRepackaged = true
                    details["reason"] = "App not from Play Store and is debuggable"
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("SecurityManager", "Error checking app repackaging: ${e.message}")
            details["error"] = e.message ?: "Unknown error"
        }

        return RepackagingResult(isRepackaged, details)
    }

    /**
     * Check if developer options are enabled
     * Made stricter to avoid false positives on OEM devices (e.g., Oppo/ColorOS)
     * Only checks ADB_ENABLED as it's the most reliable indicator
     */
    private fun isDeveloperOptionsEnabled(): Boolean {
        try {
            // Check ADB debugging enabled (most reliable indicator)
            // ADB_ENABLED is in Settings.Global, not Settings.Secure
            // If ADB is enabled, developer options MUST be enabled
            val adbEnabled = try {
                Settings.Global.getInt(
                    context.contentResolver,
                    Settings.Global.ADB_ENABLED,
                    0
                ) == 1
            } catch (e: Exception) {
                false
            }

            // Check development settings enabled flag as secondary confirmation
            // Some OEMs may have ADB_ENABLED set incorrectly, so we verify with this
            val devSettingsEnabled = try {
                Settings.Global.getInt(
                    context.contentResolver,
                    "development_settings_enabled",
                    0
                ) == 1
            } catch (e: Exception) {
                false
            }

            // On some OEM devices (like Oppo), ADB_ENABLED might be set even when developer options are off
            // So we require BOTH to be true to avoid false positives
            // This ensures developer options are truly enabled, not just a quirk of the OEM
            val isEnabled = adbEnabled && devSettingsEnabled

            // Log for debugging (only if at least one is true)
            if (adbEnabled || devSettingsEnabled) {
                android.util.Log.d(
                    "SecurityManager",
                    "Developer options check: ADB=$adbEnabled, DevSettings=$devSettingsEnabled, Result=$isEnabled"
                )
            }

            return isEnabled
        } catch (e: Exception) {
            android.util.Log.w("SecurityManager", "Error checking developer options: ${e.message}")
            return false
        }
    }

    /**
     * Check for app spoofing - detect if app identity has been compromised
     */
    data class SpoofingResult(
        val isSpoofed: Boolean,
        val details: Map<String, Any>
    )

    private fun checkAppSpoofing(): SpoofingResult {
        val details = mutableMapOf<String, Any>()
        var isSpoofed = false

        try {
            val packageManager = context.packageManager
            val expectedPackageName = context.packageName
            details["expectedPackage"] = expectedPackageName

            // Check 1: Verify package name matches expected
            val packageInfo = packageManager.getPackageInfo(
                expectedPackageName,
                PackageManager.GET_META_DATA
            )
            
            if (packageInfo.packageName != expectedPackageName) {
                isSpoofed = true
                details["reason"] = "Package name mismatch"
                details["actualPackage"] = packageInfo.packageName
            }

            // Check 2: Verify app is installed from trusted source (Play Store)
            val installerPackageName = packageManager.getInstallerPackageName(expectedPackageName)
            details["installer"] = installerPackageName ?: "unknown"
            
            // If not from Play Store, flag as potential spoofing
            if (installerPackageName != "com.android.vending" && 
                installerPackageName != "com.google.android.packageinstaller") {
                details["sideloaded"] = true
                // Only flag as spoofing if combined with other suspicious indicators
                val appInfo = packageInfo.applicationInfo
                if (appInfo != null && (appInfo.flags and ApplicationInfo.FLAG_SYSTEM == 0)) {
                    // Not a system app and not from Play Store
                    details["warning"] = "App not installed from Play Store"
                }
            }

            // Check 3: Verify app signature matches expected (basic check)
            val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.signingInfo?.apkContentsSigners
            } else {
                @Suppress("DEPRECATION")
                packageInfo.signatures
            }

            if (signatures != null && signatures.isNotEmpty()) {
                val signature = signatures[0]
                val md = MessageDigest.getInstance("SHA-256")
                val signatureHash = md.digest(signature.toByteArray())
                val signatureHashString = signatureHash.joinToString("") { "%02x".format(it) }
                details["signatureHash"] = signatureHashString
                
                // TODO: Compare with expected signature hash stored securely
                // For now, we check other indicators
            }

            // Check 4: Detect if multiple apps with similar package names exist (spoofing attempt)
            // Optimized: Only check a limited number of packages to avoid memory issues
            try {
                val installedPackages = packageManager.getInstalledPackages(PackageManager.GET_META_DATA)
                val packageNameSuffix = expectedPackageName.substringAfterLast(".")
                val similarPackages = installedPackages
                    .take(100) // Limit to first 100 packages to avoid memory issues
                    .filter { pkg ->
                        val pkgName = pkg.packageName
                        pkgName != expectedPackageName && 
                        (pkgName.contains(packageNameSuffix) ||
                         expectedPackageName.contains(pkgName.substringAfterLast(".")))
                    }
                    .map { it.packageName }
                    .take(5) // Limit results to 5 similar packages
                
                if (similarPackages.isNotEmpty()) {
                    details["similarPackages"] = similarPackages
                    details["warning"] = "Similar package names detected"
                }
            } catch (e: OutOfMemoryError) {
                // Skip this check if memory is low
                android.util.Log.w("SecurityManager", "Skipping similar packages check due to memory constraints")
            } catch (e: Exception) {
                android.util.Log.w("SecurityManager", "Error checking similar packages: ${e.message}")
            }

            // Check 5: Verify app label matches expected (spoofing apps often change labels)
            val appInfo = packageInfo.applicationInfo
            if (appInfo != null) {
                val appLabel = packageManager.getApplicationLabel(appInfo).toString()
                details["appLabel"] = appLabel
            }
            
            // Check 6: Verify app version code and name are reasonable
            details["versionCode"] = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode.toLong()
            }
            details["versionName"] = packageInfo.versionName ?: "unknown"

            // Final determination: Flag as spoofed if critical indicators are present
            if (details.containsKey("reason") || 
                (details["sideloaded"] == true && details["warning"] != null)) {
                isSpoofed = true
            }

        } catch (e: Exception) {
            android.util.Log.e("SecurityManager", "Error checking app spoofing: ${e.message}")
            details["error"] = e.message ?: "Unknown error"
        }

        return SpoofingResult(isSpoofed, details)
    }

    /**
     * Enable FLAG_SECURE on window to prevent screenshots
     * Must run on UI thread to avoid "only the original thread that created a view hierarchy can touch its views" error
     */
    fun enableScreenshotProtection(activity: Activity) {
        activity.runOnUiThread {
            activity.window.setFlags(
                WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE
            )
        }
    }

    /**
     * Disable FLAG_SECURE on window
     * Must run on UI thread to avoid "only the original thread that created a view hierarchy can touch its views" error
     */
    fun disableScreenshotProtection(activity: Activity) {
        activity.runOnUiThread {
            activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
    }

    /**
     * Time manipulation detection
     * Detects if system time has been tampered with (for bypassing OTP expiry, session timeouts, etc.)
     * Only flags actual time reversals - ignores forward jumps as they could be legitimate (network sync, DST, etc.)
     */
    private fun detectTimeManipulation(): TimeManipulationResult {
        val details = mutableMapOf<String, Any>()
        var isManipulated = false

        try {
            val systemTime = System.currentTimeMillis()
            val elapsedRealtime = android.os.SystemClock.elapsedRealtime()
            val prefs = context.getSharedPreferences("SecurityPrefs", Context.MODE_PRIVATE)
            val lastCheckRealtime = prefs.getLong("lastCheckRealtime", 0)
            val lastSystemTime = prefs.getLong("lastSystemTime", 0)
            
            // Use elapsedRealtime as a baseline - it's monotonically increasing and not affected by system time changes
            // This allows us to detect time reversals even after app restarts
            
            if (lastCheckRealtime > 0 && lastSystemTime > 0) {
                val elapsedSinceLastCheck = elapsedRealtime - lastCheckRealtime
                val systemTimeDelta = systemTime - lastSystemTime
                
                // Safety check: If elapsedRealtime is less than lastCheckRealtime, device was rebooted
                // Reset the baseline in this case
                if (elapsedSinceLastCheck < 0) {
                    android.util.Log.d("SecurityManager", "Device rebooted - resetting time check baseline")
                    details["deviceRebooted"] = true
                } else if (elapsedSinceLastCheck > 0) {
                    // Only check for time going backwards - this is the most reliable indicator of manipulation
                    // elapsedRealtime always increases, so if system time decreases relative to elapsedRealtime,
                    // it means system time was manually adjusted backwards
                    // Allow 2 second tolerance for clock adjustments
                    if (systemTimeDelta < -2000) {
                        details["method"] = "time_reversal"
                        details["timeWentBackward"] = Math.abs(systemTimeDelta)
                        details["elapsedSinceLastCheck"] = elapsedSinceLastCheck
                        details["systemTimeDelta"] = systemTimeDelta
                        isManipulated = true
                        android.util.Log.w("SecurityManager", "⚠️ Time reversal detected: system time went back ${Math.abs(systemTimeDelta)}ms")
                    }
                    // Note: We intentionally don't check for forward jumps as they can be legitimate:
                    // - Network time synchronization
                    // - Daylight saving time adjustments
                    // - Manual time corrections
                    // - Timezone changes
                }
            } else {
                // First check or reset - initialize values but don't flag as manipulation
                details["firstCheck"] = true
                android.util.Log.d("SecurityManager", "Time manipulation check initialized")
            }

            // Store informational data (not used for detection)
            val autoTimeEnabled = Settings.Global.getInt(
                context.contentResolver,
                Settings.Global.AUTO_TIME,
                1
            ) == 1
            
            if (!autoTimeEnabled) {
                details["autoTimeDisabled"] = true
                details["info"] = "Auto time is disabled"
            }

            val autoTimezoneEnabled = Settings.Global.getInt(
                context.contentResolver,
                Settings.Global.AUTO_TIME_ZONE,
                1
            ) == 1
            
            if (!autoTimezoneEnabled) {
                details["autoTimezoneDisabled"] = true
            }
            
            // Store current values for next check
            // Use elapsedRealtime instead of systemTime for tracking - it's monotonic and reliable
            prefs.edit()
                .putLong("lastCheckRealtime", elapsedRealtime)
                .putLong("lastSystemTime", systemTime)
                .apply()

        } catch (e: Exception) {
            android.util.Log.e("SecurityManager", "Error detecting time manipulation: ${e.message}")
            details["error"] = e.message ?: "Unknown error"
            // Don't flag as manipulated on errors
        }

        return TimeManipulationResult(isManipulated, details)
    }

    /**
     * Mock location / GPS spoofing detection
     * Detects if location is being spoofed using mock location apps
     */
    private fun detectMockLocation(): MockLocationResult {
        val details = mutableMapOf<String, Any>()
        var isMocked = false

        try {
            val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            if (locationManager == null) {
                details["error"] = "LocationManager not available"
                return MockLocationResult(false, details)
            }

            // Method 1: Check if mock location is enabled in developer options
            val mockLocationEnabled = Settings.Secure.getInt(
                context.contentResolver,
                Settings.Secure.ALLOW_MOCK_LOCATION,
                0
            ) == 1

            if (mockLocationEnabled) {
                details["mockLocationEnabled"] = true
                details["method"] = "developer_mock_location"
                isMocked = true
            }

            // Method 2: Check for mock location apps (requires Android 6.0+)
            // Note: MOCK_LOCATION_APP constant is not available in all Android versions
            // We use the string constant directly for compatibility
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    val mockLocationApps = Settings.Secure.getString(
                        context.contentResolver,
                        "mock_location_app"
                    )
                    
                    if (!mockLocationApps.isNullOrEmpty()) {
                        details["mockLocationApp"] = mockLocationApps
                        details["method"] = "mock_location_app"
                        isMocked = true
                    }
                } catch (e: Exception) {
                    // MOCK_LOCATION_APP setting may not be available on all devices
                    android.util.Log.w("SecurityManager", "Could not check mock location app: ${e.message}")
                }
            }

            // Method 3: Check installed packages for known mock location apps
            val packageManager = context.packageManager
            val knownMockLocationApps = listOf(
                "com.lexa.fakegps",
                "com.theappninjas.gpsjoystick",
                "com.evezzon.fakegps",
                "com.blogspot.newapphorizons.fakegps",
                "com.incorporateapps.fakegps.free",
                "com.rovio.angrybirdstransformers",
                "com.arlosoft.macrodroid",
                "io.mocklocation.pro",
                "com.drg.fakegps",
                "ru.gavrikov.mocklocations"
            )
            
            val installedMockApps = mutableListOf<String>()
            for (packageName in knownMockLocationApps) {
                try {
                    packageManager.getPackageInfo(packageName, PackageManager.GET_ACTIVITIES)
                    installedMockApps.add(packageName)
                } catch (e: PackageManager.NameNotFoundException) {
                    // App not installed, continue
                }
            }
            
            if (installedMockApps.isNotEmpty()) {
                details["installedMockApps"] = installedMockApps
                if (!isMocked) {
                    details["method"] = "installed_mock_location_apps"
                    details["warning"] = "Known mock location apps detected"
                }
            }

            // Method 4: Try to get last known location and check if it's marked as mock (Android 18+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
                try {
                    val lastLocation = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                    if (lastLocation != null) {
                        // isMock() is available from API 18, but deprecated in API 31
                        @Suppress("DEPRECATION")
                        if (lastLocation.isMock) {
                            details["lastLocationIsMock"] = true
                            details["method"] = "location_is_mock"
                            isMocked = true
                        }
                    }
                } catch (e: SecurityException) {
                    details["warning"] = "Location permission not granted"
                } catch (e: Exception) {
                    // Ignore other exceptions
                }
            }

            // Method 5: Check for location spoofing apps by searching package names
            try {
                val installedPackages = packageManager.getInstalledPackages(PackageManager.GET_META_DATA)
                val suspiciousKeywords = listOf("fake", "mock", "spoof", "gps", "location", "fakelocation", "gpsjoystick")
                val suspiciousApps = installedPackages
                    .filter { pkg ->
                        val packageName = pkg.packageName.lowercase()
                        suspiciousKeywords.any { keyword -> 
                            packageName.contains(keyword) && 
                            (packageName.contains("location") || packageName.contains("gps"))
                        }
                    }
                    .map { it.packageName }
                    .take(10) // Limit to 10 results
                
                if (suspiciousApps.isNotEmpty() && !isMocked) {
                    details["suspiciousLocationApps"] = suspiciousApps
                    details["warning"] = "Suspicious location-related apps detected"
                }
            } catch (e: Exception) {
                android.util.Log.w("SecurityManager", "Error checking suspicious location apps: ${e.message}")
            }

        } catch (e: Exception) {
            android.util.Log.e("SecurityManager", "Error detecting mock location: ${e.message}")
            details["error"] = e.message ?: "Unknown error"
        }

        return MockLocationResult(isMocked, details)
    }

    /**
     * SMS interception detection
     * Detects if SMS channels are compromised (OTP interception, SMS forwarding, etc.)
     */
    private fun detectSmsInterception(): SmsInterceptionResult {
        val details = mutableMapOf<String, Any>()
        var isIntercepted = false

        try {
            val packageManager = context.packageManager

            // Method 1: Check if default SMS app is a known suspicious app
            val defaultSmsApp = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                Telephony.Sms.getDefaultSmsPackage(context)
            } else {
                null
            }
            
            val currentAppPackage = context.packageName
            
            if (defaultSmsApp != null && defaultSmsApp != currentAppPackage) {
                details["defaultSmsApp"] = defaultSmsApp
                details["currentAppPackage"] = currentAppPackage
                details["method"] = "default_sms_app_changed"
                
                // Check if default SMS app is a known malicious/suspicious app
                val knownSuspiciousSmsApps = listOf(
                    "com.sms.forwarder",
                    "com.smsforward",
                    "com.sms.interceptor",
                    "com.sms.catcher",
                    "com.sms.manager",
                    "com.message.forwarder"
                )
                
                val isSuspicious = knownSuspiciousSmsApps.any { 
                    defaultSmsApp.lowercase().contains(it.lowercase()) 
                }
                
                if (isSuspicious) {
                    details["isSuspiciousApp"] = true
                    isIntercepted = true
                } else {
                    details["warning"] = "Default SMS app changed to: $defaultSmsApp"
                }
            }

            // Method 2: Check for installed SMS interception/forwarding apps
            val knownSmsInterceptorApps = listOf(
                "com.sms.forwarder",
                "com.smsforward",
                "com.sms.interceptor",
                "com.sms.catcher",
                "com.message.forwarder",
                "com.sms.manager",
                "com.forward.sms",
                "com.sms.redirect",
                "com.smsbackup",
                "ru.smsintercept",
                "com.smsproxy"
            )
            
            val installedInterceptorApps = mutableListOf<String>()
            for (packageName in knownSmsInterceptorApps) {
                try {
                    packageManager.getPackageInfo(packageName, PackageManager.GET_ACTIVITIES)
                    installedInterceptorApps.add(packageName)
                } catch (e: PackageManager.NameNotFoundException) {
                    // App not installed, continue
                }
            }
            
            if (installedInterceptorApps.isNotEmpty()) {
                details["installedInterceptorApps"] = installedInterceptorApps
                details["method"] = "sms_interceptor_apps_installed"
                isIntercepted = true
            }

            // Method 3: Check for apps with SMS-related permissions and suspicious package names
            try {
                val installedPackages = packageManager.getInstalledPackages(PackageManager.GET_PERMISSIONS)
                val suspiciousKeywords = listOf("sms", "intercept", "forward", "catch", "redirect", "proxy")
                val appsWithSmsPermission = installedPackages
                    .filter { pkg ->
                        val hasSmsPermission = pkg.requestedPermissions?.any { perm ->
                            perm.contains("SMS") || perm.contains("RECEIVE_SMS") || perm.contains("READ_SMS")
                        } ?: false
                        
                        val packageName = pkg.packageName.lowercase()
                        val hasSuspiciousKeyword = suspiciousKeywords.any { keyword ->
                            packageName.contains(keyword)
                        }
                        
                        hasSmsPermission && hasSuspiciousKeyword && pkg.packageName != currentAppPackage
                    }
                    .map { it.packageName }
                    .take(10) // Limit to 10 results
                
                if (appsWithSmsPermission.isNotEmpty() && !isIntercepted) {
                    details["appsWithSmsPermission"] = appsWithSmsPermission
                    details["warning"] = "Apps with SMS permissions and suspicious names detected"
                }
            } catch (e: Exception) {
                android.util.Log.w("SecurityManager", "Error checking SMS permission apps: ${e.message}")
            }

            // Method 4: Check for accessibility services that might intercept SMS
            try {
                val accessibilityManager = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
                if (accessibilityManager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                    // Define suspicious keywords in this scope
                    val suspiciousKeywordsForAccessibility = listOf("sms", "intercept", "forward", "catch", "redirect", "proxy")
                    
                    // Use FEEDBACK_ALL_MASK constant value directly (all feedback types)
                    // FEEDBACK_ALL_MASK = 0xFFFFFFFF or -1
                    val enabledServices = accessibilityManager.getEnabledAccessibilityServiceList(
                        -1  // FEEDBACK_ALL_MASK value
                    )
                    
                    val suspiciousAccessibilityServices = enabledServices
                        .filter { service ->
                            val packageName = service.resolveInfo.serviceInfo.packageName.lowercase()
                            suspiciousKeywordsForAccessibility.any { keyword ->
                                packageName.contains(keyword) && 
                                (packageName.contains("sms") || packageName.contains("message"))
                            }
                        }
                        .map { it.resolveInfo.serviceInfo.packageName }
                    
                    if (suspiciousAccessibilityServices.isNotEmpty() && !isIntercepted) {
                        details["suspiciousAccessibilityServices"] = suspiciousAccessibilityServices
                        details["warning"] = "Accessibility services with SMS-related functionality detected"
                    }
                }
            } catch (e: Exception) {
                android.util.Log.w("SecurityManager", "Error checking accessibility services: ${e.message}")
            }

        } catch (e: Exception) {
            android.util.Log.e("SecurityManager", "Error detecting SMS interception: ${e.message}")
            details["error"] = e.message ?: "Unknown error"
        }

        return SmsInterceptionResult(isIntercepted, details)
    }

    data class HookingResult(
        val isHooked: Boolean,
        val details: Map<String, Any>
    )

    data class TimeManipulationResult(
        val isManipulated: Boolean,
        val details: Map<String, Any>
    )

    data class MockLocationResult(
        val isMocked: Boolean,
        val details: Map<String, Any>
    )

    data class SmsInterceptionResult(
        val isIntercepted: Boolean,
        val details: Map<String, Any>
    )

    data class NetworkThreats(
        var isProxy: Boolean = false,
        var isVPN: Boolean = false,
        var isMITM: Boolean = false
    )
}

