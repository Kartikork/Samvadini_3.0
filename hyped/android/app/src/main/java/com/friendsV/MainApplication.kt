package com.friendsV

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.modules.network.OkHttpClientProvider
import com.friendsV.devicebinding.DeviceBindingPackage
import com.friendsV.network.PinnedOkHttpClientFactory
import com.friendsV.security.SecurityPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
          add(DeviceBindingPackage())
          add(SecurityPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    // Enable certificate pinning for all React Native network requests (fetch, WebSocket, etc.)
    // to prevent Man-in-the-Middle attacks. Must be set before loadReactNative().
    OkHttpClientProvider.setOkHttpClientFactory(PinnedOkHttpClientFactory())
    loadReactNative(this)
  }
}
