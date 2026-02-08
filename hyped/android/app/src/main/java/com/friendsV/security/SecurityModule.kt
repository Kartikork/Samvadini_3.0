package com.friendsV.security

import android.app.Activity
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class SecurityModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val securityManager = SecurityManager(reactContext.applicationContext)

    override fun getName(): String {
        return "SecurityModule"
    }

    /**
     * Perform comprehensive security check
     */
    @ReactMethod
    fun performSecurityCheck(promise: Promise) {
        try {
            val result = securityManager.performSecurityCheck()
            
            val resultMap = Arguments.createMap()
            resultMap.putString("riskLevel", result.riskLevel.name)
            resultMap.putInt("riskScore", result.riskScore)
            
            val threatsArray = Arguments.createArray()
            result.threats.forEach { threat ->
                threatsArray.pushString(threat.name)
            }
            resultMap.putArray("threats", threatsArray)
            
            val detailsMap = Arguments.createMap()
            result.details.forEach { (key, value) ->
                when (value) {
                    is Boolean -> detailsMap.putBoolean(key, value)
                    is Int -> detailsMap.putInt(key, value)
                    is String -> detailsMap.putString(key, value)
                    is List<*> -> {
                        val listArray = Arguments.createArray()
                        value.forEach { item ->
                            if (item is String) {
                                listArray.pushString(item)
                            }
                        }
                        detailsMap.putArray(key, listArray)
                    }
                    is Map<*, *> -> {
                        val nestedMap = Arguments.createMap()
                        value.forEach { (k, v) ->
                            if (k is String && v is Boolean) {
                                nestedMap.putBoolean(k, v)
                            }
                        }
                        detailsMap.putMap(key, nestedMap)
                    }
                }
            }
            resultMap.putMap("details", detailsMap)
            
            promise.resolve(resultMap)
        } catch (e: Exception) {
            promise.reject("SECURITY_CHECK_ERROR", "Failed to perform security check: ${e.message}", e)
        }
    }

    /**
     * Enable screenshot protection on current activity
     */
    @ReactMethod
    fun enableScreenshotProtection() {
        val activity = reactApplicationContext.currentActivity as? Activity
        if (activity != null) {
            securityManager.enableScreenshotProtection(activity)
        }
    }

    /**
     * Disable screenshot protection on current activity
     */
    @ReactMethod
    fun disableScreenshotProtection() {
        val activity = reactApplicationContext.currentActivity as? Activity
        if (activity != null) {
            securityManager.disableScreenshotProtection(activity)
        }
    }

    /**
     * Check if device is rooted
     */
    @ReactMethod
    fun isRooted(promise: Promise) {
        try {
            // Access private method via reflection or make it public
            val result = securityManager.performSecurityCheck()
            promise.resolve(result.details["root"] as? Boolean ?: false)
        } catch (e: Exception) {
            promise.reject("ROOT_CHECK_ERROR", "Failed to check root: ${e.message}", e)
        }
    }

    /**
     * Check if device is emulator
     */
    @ReactMethod
    fun isEmulator(promise: Promise) {
        try {
            val result = securityManager.performSecurityCheck()
            promise.resolve(result.details["emulator"] as? Boolean ?: false)
        } catch (e: Exception) {
            promise.reject("EMULATOR_CHECK_ERROR", "Failed to check emulator: ${e.message}", e)
        }
    }

    /**
     * Check if debugger is attached
     */
    @ReactMethod
    fun isDebuggerAttached(promise: Promise) {
        try {
            val result = securityManager.performSecurityCheck()
            promise.resolve(result.details["debugger"] as? Boolean ?: false)
        } catch (e: Exception) {
            promise.reject("DEBUGGER_CHECK_ERROR", "Failed to check debugger: ${e.message}", e)
        }
    }

    /**
     * Check if screen is being mirrored
     */
    @ReactMethod
    fun isScreenMirroring(promise: Promise) {
        try {
            val result = securityManager.performSecurityCheck()
            promise.resolve(result.details["screenMirroring"] as? Boolean ?: false)
        } catch (e: Exception) {
            promise.reject("SCREEN_MIRRORING_CHECK_ERROR", "Failed to check screen mirroring: ${e.message}", e)
        }
    }
}

