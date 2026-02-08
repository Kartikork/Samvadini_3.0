package com.friendsV.devicebinding

import android.annotation.SuppressLint
import android.accounts.Account
import android.accounts.AccountManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import androidx.annotation.RequiresApi
import java.security.MessageDigest
import java.security.Signature
import java.util.*
import javax.crypto.Cipher
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.io.File
import java.security.KeyStore

data class SimInfo(
    val simId: String,
    val phoneNumber: String,
    val simIdHash: String,
    val carrierName: String = "",
    val slotIndex: Int = 0
)

data class DeviceFingerprint(
    val androidId: String,
    val androidIdHash: String,
    val appUuid: String,
    val deviceFingerprint: String
)

data class KeystoreInfo(
    val publicKey: String,
    val success: Boolean
)

data class SecurityInfo(
    val isRooted: Boolean,
    val isEmulator: Boolean,
    val hardwareSecurityLevel: String,
    val verifiedBootState: String
)

class DeviceBindingManager(private val context: Context) {
    private val KEYSTORE_ALIAS = "device_binding_key"
    private val KEYSTORE_PROVIDER = "AndroidKeyStore"
    private val PREFS_NAME = "device_binding_prefs"
    private val APP_UUID_KEY = "app_uuid"
    
    private var simChangeReceiver: BroadcastReceiver? = null
    private var simChangeCallback: ((SimInfo?) -> Unit)? = null

    @SuppressLint("HardwareIds", "MissingPermission")
    fun getAllSims(): List<SimInfo> {
        val simsList = mutableListOf<SimInfo>()
        val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                val subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
                val subscriptionInfoList = subscriptionManager.activeSubscriptionInfoList
                
                if (subscriptionInfoList != null && subscriptionInfoList.isNotEmpty()) {
                    subscriptionInfoList.forEach { info ->
                        val simId = info.subscriptionId.toString()
                        
                        // Try multiple methods to get phone number
                        var phoneNumber = ""
                        
                        // Method 1: Try SubscriptionInfo.number
                        phoneNumber = info.number ?: ""
                        android.util.Log.d("DeviceBinding", "Method 1 (SubscriptionInfo.number): '$phoneNumber'")
                        
                        // Method 2: If empty, try TelephonyManager with subscription ID (API 26+)
                        if (phoneNumber.isEmpty() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            try {
                                val tmForSub = telephonyManager.createForSubscriptionId(info.subscriptionId)
                                phoneNumber = tmForSub.line1Number ?: ""
                                android.util.Log.d("DeviceBinding", "Method 2 (TelephonyManager.createForSubscriptionId): '$phoneNumber'")
                            } catch (e: Exception) {
                                android.util.Log.w("DeviceBinding", "Method 2 failed for subscription ${info.subscriptionId}: ${e.message}")
                            }
                        }
                        
                        // Method 3: Try to get from Google Account (like BHIM and other Indian apps)
                        if (phoneNumber.isEmpty()) {
                            try {
                                phoneNumber = getPhoneNumberFromGoogleAccount()
                                android.util.Log.d("DeviceBinding", "Method 3 (Google Account): '$phoneNumber'")
                            } catch (e: Exception) {
                                android.util.Log.w("DeviceBinding", "Method 3 (Google Account) failed: ${e.message}")
                            }
                        }
                        
                        val carrierName = info.carrierName?.toString() ?: "SIM ${info.simSlotIndex + 1}"
                        val simIdHash = hashValue(simId)
                        
                        android.util.Log.d("DeviceBinding", "SIM ${info.simSlotIndex}: phoneNumber='$phoneNumber', carrier='$carrierName', simId='$simId'")
                        
                        simsList.add(SimInfo(
                            simId = simId,
                            phoneNumber = phoneNumber,
                            simIdHash = simIdHash,
                            carrierName = carrierName,
                            slotIndex = info.simSlotIndex
                        ))
                    }
                }
            }
            
            // Fallback for older Android versions or if no subscription info
            if (simsList.isEmpty()) {
                try {
                    val simId = telephonyManager.simSerialNumber ?: ""
                    var phoneNumber = telephonyManager.line1Number ?: ""
                    
                    // Try alternative method for older Android
                    if (phoneNumber.isEmpty()) {
                        try {
                            phoneNumber = telephonyManager.line1Number ?: ""
                        } catch (e: Exception) {
                            android.util.Log.w("DeviceBinding", "Failed to get phone number: ${e.message}")
                        }
                    }
                    
                    if (simId.isNotEmpty()) {
                        val simIdHash = hashValue(simId)
                        android.util.Log.d("DeviceBinding", "Fallback SIM: phoneNumber='$phoneNumber', simId='$simId'")
                        simsList.add(SimInfo(
                            simId = simId,
                            phoneNumber = phoneNumber,
                            simIdHash = simIdHash,
                            carrierName = "SIM 1",
                            slotIndex = 0
                        ))
                    }
                } catch (e: SecurityException) {
                    // Permission not granted
                    throw e
                }
            }
        } catch (e: SecurityException) {
            throw SecurityException("Failed to get SIM info: ${e.message}", e)
        }
        
        return simsList
    }

    @SuppressLint("HardwareIds", "MissingPermission")
    fun getSimInfo(slotIndex: Int = 0): SimInfo {
        val allSims = getAllSims()
        if (allSims.isEmpty()) {
            throw SecurityException("No SIM cards found or permission denied")
        }
        
        // Return SIM at specified slot index, or first SIM if index not found
        return allSims.find { it.slotIndex == slotIndex } ?: allSims[0]
    }

    @SuppressLint("HardwareIds")
    fun getDeviceFingerprint(): DeviceFingerprint {
        val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: ""
        val androidIdHash = hashValue(androidId)
        val appUuid = getOrCreateAppUuid()
        
        val simInfo = getSimInfo()
        val combined = "$androidId:${simInfo.simIdHash}:$appUuid"
        val deviceFingerprint = hashValue(combined)
        
        return DeviceFingerprint(
            androidId = androidId,
            androidIdHash = androidIdHash,
            appUuid = appUuid,
            deviceFingerprint = deviceFingerprint
        )
    }

    private fun getOrCreateAppUuid(): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        var appUuid = prefs.getString(APP_UUID_KEY, null)
        
        if (appUuid == null) {
            appUuid = UUID.randomUUID().toString()
            prefs.edit().putString(APP_UUID_KEY, appUuid).apply()
        }
        
        return appUuid
    }

    fun initializeKeystore(): KeystoreInfo {
        try {
            val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER)
            keyStore.load(null)
            
            if (!keyStore.containsAlias(KEYSTORE_ALIAS)) {
                // Generate new key pair
                val keyGenerator = java.security.KeyPairGenerator.getInstance(
                    KeyProperties.KEY_ALGORITHM_RSA,
                    KEYSTORE_PROVIDER
                )
                
                val keyGenParameterSpec = KeyGenParameterSpec.Builder(
                    KEYSTORE_ALIAS,
                    KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
                )
                    .setDigests(KeyProperties.DIGEST_SHA256)
                    .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)
                    .setKeySize(2048)
                    .build()
                
                keyGenerator.initialize(keyGenParameterSpec)
                keyGenerator.generateKeyPair()
            }
            
            // Get public key
            val entry = keyStore.getEntry(KEYSTORE_ALIAS, null) as KeyStore.PrivateKeyEntry
            val publicKey = entry.certificate.publicKey
            val publicKeyBytes = publicKey.encoded
            val publicKeyBase64 = android.util.Base64.encodeToString(publicKeyBytes, android.util.Base64.NO_WRAP)
            
            return KeystoreInfo(
                publicKey = publicKeyBase64,
                success = true
            )
        } catch (e: Exception) {
            android.util.Log.e("DeviceBinding", "Keystore initialization failed: ${e.message}")
            return KeystoreInfo(
                publicKey = "",
                success = false
            )
        }
    }

    fun signChallenge(challenge: String): String {
        try {
            val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER)
            keyStore.load(null)
            
            val entry = keyStore.getEntry(KEYSTORE_ALIAS, null) as KeyStore.PrivateKeyEntry
            val privateKey = entry.privateKey
            
            // Decode Base64 challenge to get the actual bytes to sign
            // The backend sends Base64-encoded challenge, but we need to sign the decoded bytes
            val challengeBytes = android.util.Base64.decode(challenge, android.util.Base64.NO_WRAP)
            
            android.util.Log.d("DeviceBinding", "Signing challenge - Base64 length: ${challenge.length}, Decoded bytes length: ${challengeBytes.size}")
            
            val signature = Signature.getInstance("SHA256withRSA")
            signature.initSign(privateKey)
            signature.update(challengeBytes)  // Sign the decoded bytes, not the Base64 string
            val signatureBytes = signature.sign()
            
            return android.util.Base64.encodeToString(signatureBytes, android.util.Base64.NO_WRAP)
        } catch (e: Exception) {
            android.util.Log.e("DeviceBinding", "Signature failed: ${e.message}")
            throw e
        }
    }

    fun isRooted(): Boolean {
        return checkRootMethod1() || checkRootMethod2()
    }

    private fun checkRootMethod1(): Boolean {
        val paths = arrayOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
            "/su/bin/su"
        )
        return paths.any { File(it).exists() }
    }

    private fun checkRootMethod2(): Boolean {
        var process: Process? = null
        return try {
            process = Runtime.getRuntime().exec(arrayOf("/system/xbin/which", "su"))
            val `in` = process.inputStream
            val reader = java.util.Scanner(`in`).useDelimiter("\\A")
            val result = if (reader.hasNext()) reader.next() else ""
            process.waitFor()
            result.isNotEmpty()
        } catch (e: Exception) {
            false
        } finally {
            process?.destroy()
        }
    }

    fun isEmulator(): Boolean {
        return (Build.FINGERPRINT.startsWith("generic")
                || Build.FINGERPRINT.startsWith("unknown")
                || Build.MODEL.contains("google_sdk")
                || Build.MODEL.contains("Emulator")
                || Build.MODEL.contains("Android SDK built for x86")
                || Build.MANUFACTURER.contains("Genymotion")
                || (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
                || "google_sdk" == Build.PRODUCT
                || Build.HARDWARE.contains("goldfish")
                || Build.HARDWARE.contains("ranchu"))
    }

    fun getSecurityInfo(): SecurityInfo {
        val isRooted = isRooted()
        val isEmulator = isEmulator()
        
        // Get hardware security level
        val hardwareSecurityLevel = try {
            val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER)
            keyStore.load(null)
            if (keyStore.containsAlias(KEYSTORE_ALIAS)) {
                val entry = keyStore.getEntry(KEYSTORE_ALIAS, null) as KeyStore.PrivateKeyEntry
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val keyInfo = entry.privateKey as? android.security.keystore.KeyInfo
                    when (keyInfo?.securityLevel) {
                        KeyProperties.SECURITY_LEVEL_STRONGBOX -> "STRONGBOX"
                        KeyProperties.SECURITY_LEVEL_TRUSTED_ENVIRONMENT -> "TEE"
                        KeyProperties.SECURITY_LEVEL_SOFTWARE -> "SOFTWARE"
                        else -> "UNKNOWN"
                    }
                } else {
                    "TEE"
                }
            } else {
                "UNKNOWN"
            }
        } catch (e: Exception) {
            "UNKNOWN"
        }
        
        // Get verified boot state (simplified - actual implementation would use KeyAttestation)
        val verifiedBootState = if (isRooted) "UNVERIFIED" else "VERIFIED"
        
        return SecurityInfo(
            isRooted = isRooted,
            isEmulator = isEmulator,
            hardwareSecurityLevel = hardwareSecurityLevel,
            verifiedBootState = verifiedBootState
        )
    }

    fun startSimChangeListener(callback: (SimInfo?) -> Unit) {
        simChangeCallback = callback
        
        // Use string literals for compatibility with all Android versions
        val ACTION_SIM_STATE_CHANGED = "android.intent.action.SIM_STATE_CHANGED"
        val ACTION_SIM_CARD_STATE_CHANGED = "android.telephony.action.SIM_CARD_STATE_CHANGED"
        val ACTION_SUBSCRIPTION_CARRIER_IDENTITY_CHANGED = "android.telephony.action.SUBSCRIPTION_CARRIER_IDENTITY_CHANGED"
        
        simChangeReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val action = intent?.action
                android.util.Log.d("DeviceBinding", "SIM state broadcast received: $action")
                
                // Handle all SIM-related state changes
                if (action == ACTION_SIM_STATE_CHANGED ||
                    action == ACTION_SIM_CARD_STATE_CHANGED ||
                    action == ACTION_SUBSCRIPTION_CARRIER_IDENTITY_CHANGED ||
                    action == TelephonyManager.ACTION_PHONE_STATE_CHANGED) {
                    
                    // Small delay to ensure SIM state has settled
                    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                        try {
                            // Try to get SIM info - if it fails, SIM was removed
                            val simInfo = getSimInfo()
                            android.util.Log.d("DeviceBinding", "SIM info retrieved successfully: ${simInfo.simIdHash}")
                            callback(simInfo)
                        } catch (e: SecurityException) {
                            // SIM removed or permission denied
                            android.util.Log.w("DeviceBinding", "SIM removed or inaccessible: ${e.message}")
                            // Create a SimInfo with null/empty values to indicate SIM removal
                            callback(SimInfo(
                                simId = "",
                                phoneNumber = "",
                                simIdHash = "",
                                carrierName = "",
                                slotIndex = -1
                            ))
                        } catch (e: Exception) {
                            android.util.Log.e("DeviceBinding", "Error getting SIM info: ${e.message}")
                            // Try again - might be a transient error
                            try {
                                val simInfo = getSimInfo()
                                callback(simInfo)
                            } catch (e2: Exception) {
                                // If still fails, assume SIM removed
                                callback(SimInfo(
                                    simId = "",
                                    phoneNumber = "",
                                    simIdHash = "",
                                    carrierName = "",
                                    slotIndex = -1
                                ))
                            }
                        }
                    }, 500) // 500ms delay to let SIM state settle
                }
            }
        }
        
        val filter = IntentFilter().apply {
            // Register for all SIM-related actions
            addAction(ACTION_SIM_STATE_CHANGED) // Available on all Android versions
            
            // Only register for actions available on current Android version
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                addAction(ACTION_SIM_CARD_STATE_CHANGED)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                addAction(ACTION_SUBSCRIPTION_CARRIER_IDENTITY_CHANGED)
            }
            // Fallback for older versions - use PHONE_STATE_CHANGED
            addAction(TelephonyManager.ACTION_PHONE_STATE_CHANGED)
        }
        
        context.registerReceiver(simChangeReceiver, filter)
        android.util.Log.d("DeviceBinding", "SIM change listener registered")
    }

    fun stopSimChangeListener() {
        simChangeReceiver?.let {
            try {
                context.unregisterReceiver(it)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        simChangeReceiver = null
        simChangeCallback = null
    }

    private fun hashValue(value: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(value.toByteArray())
        return hashBytes.joinToString("") { "%02x".format(it) }
    }
    
    /**
     * Try to get phone number from Google Account (deprecated in Android 10+ but may work on older devices)
     */
    private fun getPhoneNumberFromGoogleAccount(): String {
        return try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                val accountManager = AccountManager.get(context)
                val accounts = accountManager.getAccountsByType("com.google")
                
                for (account in accounts) {
                    try {
                        val phoneNumber = accountManager.getUserData(account, "phone_number")
                        if (phoneNumber != null && phoneNumber.isNotEmpty()) {
                            android.util.Log.d("DeviceBinding", "Found phone number in Google account: $phoneNumber")
                            return phoneNumber
                        }
                    } catch (e: Exception) {
                        android.util.Log.w("DeviceBinding", "Error getting phone from account ${account.name}: ${e.message}")
                    }
                }
            }
            ""
        } catch (e: Exception) {
            android.util.Log.w("DeviceBinding", "Error accessing AccountManager: ${e.message}")
            ""
        }
    }
}


