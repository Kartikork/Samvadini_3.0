package com.friendsV.network

import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.ReactCookieJarContainer
import okhttp3.Call
import okhttp3.CertificatePinner
import okhttp3.EventListener
import okhttp3.OkHttpClient
import java.io.IOException
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLPeerUnverifiedException

/**
 * Custom OkHttpClientFactory with Certificate Pinning
 * This factory is used by React Native to create OkHttpClient instances
 *
 * Certificate pinning prevents MITM attacks by ensuring only trusted certificates are accepted.
 * When the server cert doesn't match the pinned SHA-256 hashes, we record it so the security
 * modal can show a warning (CertificatePinningFailureHolder).
 */
class PinnedOkHttpClientFactory : OkHttpClientFactory {
    override fun createNewNetworkModuleClient(): OkHttpClient {
        val certificatePinner = CertificatePinningModule.createCertificatePinner()

        val builder = OkHttpClient.Builder()
            .cookieJar(ReactCookieJarContainer())
            .connectTimeout(0, TimeUnit.MILLISECONDS)
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .writeTimeout(0, TimeUnit.MILLISECONDS)

        builder.certificatePinner(certificatePinner)

        // Detect certificate pinning failures so we can show the security modal
        builder.eventListenerFactory(object : EventListener.Factory {
            override fun create(call: Call): EventListener = object : EventListener() {
                override fun callFailed(call: Call, ioe: IOException) {
                    val isPinningFailure = ioe is SSLPeerUnverifiedException ||
                        ioe.message?.contains("Certificate pinning", ignoreCase = true) == true
                    if (isPinningFailure) {
                        CertificatePinningFailureHolder.recordFailure()
                    }
                }
            }
        })

        android.util.Log.d("PinnedOkHttpClientFactory", "✅ Certificate pinning configured")

        return builder.build()
    }
}
