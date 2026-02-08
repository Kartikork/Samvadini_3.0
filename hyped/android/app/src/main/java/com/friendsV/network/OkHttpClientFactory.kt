package com.friendsV.network

import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.ReactCookieJarContainer
import okhttp3.CertificatePinner
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

/**
 * Custom OkHttpClientFactory with Certificate Pinning
 * This factory is used by React Native to create OkHttpClient instances
 * 
 * Certificate pinning prevents MITM attacks by ensuring only trusted certificates are accepted
 */
class PinnedOkHttpClientFactory : OkHttpClientFactory {
    override fun createNewNetworkModuleClient(): OkHttpClient {
        val certificatePinner = CertificatePinningModule.createCertificatePinner()

        val builder = OkHttpClient.Builder()
            .cookieJar(ReactCookieJarContainer())
            .connectTimeout(0, TimeUnit.MILLISECONDS)
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .writeTimeout(0, TimeUnit.MILLISECONDS)

        // Apply certificate pinning
        // Note: If no pins are configured, CertificatePinner.Builder().build() returns
        // an empty pinner that allows all certificates (for development)
        builder.certificatePinner(certificatePinner)
        android.util.Log.d("PinnedOkHttpClientFactory", "✅ Certificate pinning configured")

        return builder.build()
    }
}
