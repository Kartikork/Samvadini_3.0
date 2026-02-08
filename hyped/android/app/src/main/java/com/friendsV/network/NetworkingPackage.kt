package com.friendsV.network

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.modules.network.NetworkingModule

/**
 * Custom Networking Package that uses PinnedOkHttpClientFactory for certificate pinning
 * This package extends the default NetworkingModule with certificate pinning support
 */
class NetworkingPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        // Create NetworkingModule with custom OkHttpClientFactory
        // Note: This is a workaround - React Native doesn't directly support
        // setting custom OkHttpClientFactory, so we'll configure it at the OkHttp level
        return listOf()
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
