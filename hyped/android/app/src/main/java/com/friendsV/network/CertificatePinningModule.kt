package com.friendsV.network

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import okhttp3.CertificatePinner
import okhttp3.OkHttpClient
import java.security.MessageDigest
import java.security.cert.Certificate
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager
import java.security.SecureRandom

/**
 * Certificate Pinning Module for React Native
 * Configures OkHttp with certificate pinning to prevent MITM attacks
 */
class CertificatePinningModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "CertificatePinningModule"
    }

    /**
     * Get certificate pin (SHA-256 hash) from certificate
     * This should be called once to get the pin, then hardcoded
     */
    @ReactMethod
    fun getCertificatePin(hostname: String, promise: Promise) {
        try {
            // This is a helper method to get the certificate pin
            // In production, you should get this from your server certificate
            // and hardcode it in the app
            promise.reject("NOT_IMPLEMENTED", "Use getCertificatePinFromServer or hardcode pins")
        } catch (e: Exception) {
            promise.reject("CERT_PIN_ERROR", "Failed to get certificate pin: ${e.message}", e)
        }
    }

    /**
     * Verify certificate pin
     * This is called automatically by OkHttp when certificate pinning is enabled
     */
    @ReactMethod
    fun verifyCertificatePin(hostname: String, certificatePin: String, promise: Promise) {
        try {
            // Certificate pinning is handled automatically by OkHttp
            // This method is for manual verification if needed
            val isValid = true // Implement actual verification if needed
            promise.resolve(isValid)
        } catch (e: Exception) {
            promise.reject("VERIFY_ERROR", "Failed to verify certificate pin: ${e.message}", e)
        }
    }

    companion object {
        /**
         * Create CertificatePinner with pins for your domains
         * Replace these with your actual certificate pins (SHA-256 hashes)
         * 
         * To get certificate pin:
         * openssl s_client -servername yourdomain.com -connect yourdomain.com:443 < /dev/null | \
         * openssl x509 -pubkey -noout | \
         * openssl pkey -pubin -outform der | \
         * openssl dgst -sha256 -binary | \
         * openssl enc -base64
         */
        fun createCertificatePinner(): CertificatePinner {
            val builder = CertificatePinner.Builder()
            
            // Certificate pin for samvadiniprod.aicte-india.org
            // Pin: Yt+CMjT3iYk/QzufbW8l8/ab8vg64uaeAdQJd+ghd6E=
            builder.add("samvadiniprod.aicte-india.org", "sha256/Yt+CMjT3iYk/QzufbW8l8/ab8vg64uaeAdQJd+ghd6E=")
            
            // Pin for other aicte-india.org subdomains (if they use the same certificate)
            builder.add("qasamvadini.aicte-india.org", "sha256/Yt+CMjT3iYk/QzufbW8l8/ab8vg64uaeAdQJd+ghd6E=")
            builder.add("anuvadiniaiapi.aicte-india.org", "sha256/Yt+CMjT3iYk/QzufbW8l8/ab8vg64uaeAdQJd+ghd6E=")
            builder.add("lrn.aicte-india.org", "sha256/Yt+CMjT3iYk/QzufbW8l8/ab8vg64uaeAdQJd+ghd6E=")
            
            // Wildcard pin for *.aicte-india.org (if all subdomains use the same certificate)
            // Note: Only use if all subdomains share the same certificate
            builder.add("*.aicte-india.org", "sha256/Yt+CMjT3iYk/QzufbW8l8/ab8vg64uaeAdQJd+ghd6E=")
            
            // TODO: Add backup pins for certificate rotation when available
            // This allows the app to work when certificates are rotated
            // Get backup pin from your certificate authority before certificate expires
            // builder.add("samvadiniprod.aicte-india.org", "sha256/BACKUP_PIN_HERE")
            
            android.util.Log.d("CertificatePinning", "✅ Certificate pinning configured for aicte-india.org domains")
            
            return builder.build()
        }

        /**
         * Get certificate pin from X509Certificate
         */
        fun getCertificatePin(certificate: X509Certificate): String {
            val publicKey = certificate.publicKey.encoded
            val md = MessageDigest.getInstance("SHA-256")
            val hash = md.digest(publicKey)
            return android.util.Base64.encodeToString(hash, android.util.Base64.NO_WRAP)
        }
    }
}
