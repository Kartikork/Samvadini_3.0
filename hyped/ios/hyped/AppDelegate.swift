import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore
import PushKit

// ReactNativeDelegate provides bundleURL and default RCTReactNativeFactoryDelegate implementations.
class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func bundleURL() -> URL? {
    #if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  // PushKit registry – keeps reference alive so VoIP pushes are delivered
  private var voipRegistry: PKPushRegistry?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    FirebaseApp.configure()
    application.registerForRemoteNotifications()

    // Register for VoIP pushes (PushKit) – the ONLY reliable way to wake a
    // killed iOS app instantly for an incoming call and show the CallKit UI.
    setupVoIPPushKit()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "hyped",
      in: window,
      launchOptions: launchOptions
    )
    return true
  }

  // MARK: - PushKit

  private func setupVoIPPushKit() {
    voipRegistry = PKPushRegistry(queue: DispatchQueue.main)
    voipRegistry?.delegate = self
    voipRegistry?.desiredPushTypes = [.voIP]
  }

  // MARK: - APNS

  func application(_ application: UIApplication,
                   didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    // Firebase Messaging handles this automatically via method swizzling.
  }

  func application(_ application: UIApplication,
                   didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("[AppDelegate] Failed to register for remote notifications: \(error.localizedDescription)")
  }
}

// MARK: - PKPushRegistryDelegate

extension AppDelegate: PKPushRegistryDelegate {

  /// Called when iOS assigns/updates the VoIP push token.
  /// react-native-callkeep emits a 'registration' event to JS with this token.
  func pushRegistry(_ registry: PKPushRegistry,
                    didUpdate pushCredentials: PKPushCredentials,
                    for type: PKPushType) {
    guard type == .voIP else { return }
    let token = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
    print("[AppDelegate] VoIP push token: \(token.prefix(16))…")
    // react-native-callkeep handles token registration via its JS 'registration' event
  }

  /// Called when a VoIP push arrives – even if the app is completely killed.
  /// MUST call RNCallKeep.reportNewIncomingCall so CallKit shows immediately.
  func pushRegistry(_ registry: PKPushRegistry,
                    didReceiveIncomingPushWith payload: PKPushPayload,
                    for type: PKPushType,
                    completion: @escaping () -> Void) {
    guard type == .voIP else { completion(); return }

    // PKPushPayload.dictionaryPayload is [AnyHashable: Any]; convert to [String: Any]
    var dict = [String: Any]()
    for (key, value) in payload.dictionaryPayload {
      if let k = key as? String { dict[k] = value }
    }

    // Backend places call data under the "data" key (matching fcm.js payload)
    let data = dict["data"] as? [String: Any] ?? dict

    let callId     = (data["callId"]     as? String) ?? UUID().uuidString
    let callerId   = (data["callerId"]   as? String) ?? "unknown"
    var callerName = (data["callerName"] as? String) ?? "Unknown"
    if callerName.isEmpty { callerName = "Unknown" }
    let hasVideo   = (data["callType"]   as? String) == "video"

    print("[AppDelegate] VoIP push – callId: \(callId), caller: \(callerName)")

    // Report to CallKit → shows native full-screen call UI (green Answer + red Decline)
    // This works even when the app is completely killed.
    RNCallKeep.reportNewIncomingCall(
      callId,
      handle: callerId,
      handleType: "generic",
      hasVideo: hasVideo,
      localizedCallerName: callerName,
      supportsHolding: false,
      supportsDTMF: false,
      supportsGrouping: false,
      supportsUngrouping: false,
      fromPushKit: true,
      payload: dict,
      withCompletionHandler: completion
    )
  }

  func pushRegistry(_ registry: PKPushRegistry,
                    didInvalidatePushTokenFor type: PKPushType) {
    print("[AppDelegate] VoIP push token invalidated")
  }
}
