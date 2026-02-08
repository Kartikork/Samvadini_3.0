package com.friendsV.devicebinding

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class DeviceBindingModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val deviceBindingManager = DeviceBindingManager(reactContext.applicationContext)
    private var simChangeListener: DeviceBindingManager? = null

    override fun getName(): String {
        return "DeviceBindingModule"
    }

    @ReactMethod
    fun getAllSims(promise: Promise) {
        try {
            val sims = deviceBindingManager.getAllSims()
            val simsArray = Arguments.createArray()
            
            sims.forEach { sim ->
                val simMap = Arguments.createMap()
                simMap.putString("simId", sim.simId)
                simMap.putString("phoneNumber", sim.phoneNumber)
                simMap.putString("simIdHash", sim.simIdHash)
                simMap.putString("carrierName", sim.carrierName)
                simMap.putInt("slotIndex", sim.slotIndex)
                simsArray.pushMap(simMap)
            }
            
            promise.resolve(simsArray)
        } catch (e: Exception) {
            promise.reject("SIM_ERROR", "Failed to get SIM info: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getSimInfo(slotIndex: Int, promise: Promise) {
        try {
            val simInfo = deviceBindingManager.getSimInfo(slotIndex)
            val simMap = Arguments.createMap()
            simMap.putString("simId", simInfo.simId)
            simMap.putString("phoneNumber", simInfo.phoneNumber)
            simMap.putString("simIdHash", simInfo.simIdHash)
            simMap.putString("carrierName", simInfo.carrierName)
            simMap.putInt("slotIndex", simInfo.slotIndex)
            promise.resolve(simMap)
        } catch (e: Exception) {
            promise.reject("SIM_ERROR", "Failed to get SIM info: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getDeviceFingerprint(promise: Promise) {
        try {
            val fingerprint = deviceBindingManager.getDeviceFingerprint()
            val fingerprintMap = Arguments.createMap()
            fingerprintMap.putString("androidId", fingerprint.androidId)
            fingerprintMap.putString("androidIdHash", fingerprint.androidIdHash)
            fingerprintMap.putString("appUuid", fingerprint.appUuid)
            fingerprintMap.putString("deviceFingerprint", fingerprint.deviceFingerprint)
            promise.resolve(fingerprintMap)
        } catch (e: Exception) {
            promise.reject("FINGERPRINT_ERROR", "Failed to get device fingerprint: ${e.message}", e)
        }
    }

    @ReactMethod
    fun initializeKeystore(promise: Promise) {
        try {
            val keystoreInfo = deviceBindingManager.initializeKeystore()
            val keystoreMap = Arguments.createMap()
            keystoreMap.putString("publicKey", keystoreInfo.publicKey)
            keystoreMap.putBoolean("success", keystoreInfo.success)
            promise.resolve(keystoreMap)
        } catch (e: Exception) {
            promise.reject("KEYSTORE_ERROR", "Failed to initialize keystore: ${e.message}", e)
        }
    }

    @ReactMethod
    fun signChallenge(challenge: String, promise: Promise) {
        try {
            val signature = deviceBindingManager.signChallenge(challenge)
            promise.resolve(signature)
        } catch (e: Exception) {
            promise.reject("SIGNATURE_ERROR", "Failed to sign challenge: ${e.message}", e)
        }
    }

    @ReactMethod
    fun isRooted(promise: Promise) {
        try {
            val rooted = deviceBindingManager.isRooted()
            promise.resolve(rooted)
        } catch (e: Exception) {
            promise.reject("ROOT_CHECK_ERROR", "Failed to check root: ${e.message}", e)
        }
    }

    @ReactMethod
    fun isEmulator(promise: Promise) {
        try {
            val emulator = deviceBindingManager.isEmulator()
            promise.resolve(emulator)
        } catch (e: Exception) {
            promise.reject("EMULATOR_CHECK_ERROR", "Failed to check emulator: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getSecurityInfo(promise: Promise) {
        try {
            val securityInfo = deviceBindingManager.getSecurityInfo()
            val securityMap = Arguments.createMap()
            securityMap.putBoolean("isRooted", securityInfo.isRooted)
            securityMap.putBoolean("isEmulator", securityInfo.isEmulator)
            securityMap.putString("hardwareSecurityLevel", securityInfo.hardwareSecurityLevel)
            securityMap.putString("verifiedBootState", securityInfo.verifiedBootState)
            promise.resolve(securityMap)
        } catch (e: Exception) {
            promise.reject("SECURITY_ERROR", "Failed to get security info: ${e.message}", e)
        }
    }

    @ReactMethod
    fun startSimChangeListener() {
        try {
            deviceBindingManager.startSimChangeListener { simInfo ->
                val simMap = Arguments.createMap()
                
                // Check if SIM was removed (empty simIdHash indicates removal)
                if (simInfo != null && simInfo.simIdHash.isNotEmpty()) {
                    // SIM is present
                    simMap.putString("simId", simInfo.simId)
                    simMap.putString("phoneNumber", simInfo.phoneNumber)
                    simMap.putString("simIdHash", simInfo.simIdHash)
                    simMap.putString("carrierName", simInfo.carrierName)
                    simMap.putInt("slotIndex", simInfo.slotIndex)
                    simMap.putBoolean("simRemoved", false)
                } else {
                    // SIM was removed
                    simMap.putString("simId", "")
                    simMap.putString("phoneNumber", "")
                    simMap.putString("simIdHash", "")
                    simMap.putString("carrierName", "")
                    simMap.putInt("slotIndex", -1)
                    simMap.putBoolean("simRemoved", true)
                }
                
                reactApplicationContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("simChanged", simMap)
            }
        } catch (e: Exception) {
            android.util.Log.e("DeviceBinding", "Failed to start SIM change listener: ${e.message}")
        }
    }

    @ReactMethod
    fun stopSimChangeListener() {
        try {
            deviceBindingManager.stopSimChangeListener()
        } catch (e: Exception) {
            android.util.Log.e("DeviceBinding", "Failed to stop SIM change listener: ${e.message}")
        }
    }
}


