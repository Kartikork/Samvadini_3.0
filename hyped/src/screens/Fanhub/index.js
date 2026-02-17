import React, { useRef, useState, useEffect, useCallback } from "react";
import { BackHandler, StyleSheet, SafeAreaView, Platform, View, ActivityIndicator, Dimensions, Text } from "react-native";
import { WebView } from "react-native-webview";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { getUserData } from "../../storage/sqllite/authentication/UserSettingSchema";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

const getLocalhostUrl = () => {
    if (Platform.OS === "android") {
        return "https://lrn.aicte-india.org/fanhub/";
    }
    return "https://lrn.aicte-india.org/fanhub/";
};

export default function FanHubWebView() {
    const webViewRef = useRef(null);
    const navigation = useNavigation();
    const [canGoBack, setCanGoBack] = useState(false);
    const [webReady, setWebReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [error, setError] = useState(null);

    // Get user info from Redux
    const selectedLanguage = useSelector(
        (state) => state.language?.lang || "en" // Fixed selector path based on languageSlice
    );

    const sendUserDataToWeb = useCallback(async () => {
        if (webViewRef.current && webReady && initialLoadComplete) {
            try {
                const sqliteData = await getUserData();

                const userData = {
                    userName: sqliteData?.firstName || "",
                    userId: sqliteData?.userId || "",
                    phoneNumber: sqliteData?.phoneNumber || "",
                    userPhoto: sqliteData?.profilePic || "",
                    selectedLanguage: await AsyncStorage.getItem("userLang") || selectedLanguage || "",
                    age: sqliteData?.age || null,
                    country: sqliteData?.country || "",
                    gender: sqliteData?.gender || "",
                    firstName: sqliteData?.firstName || "",
                };

                console.log("📤 Sending user data to web:", userData);

                const script = `
           try {
             window.postMessage(${JSON.stringify({
                    type: "USER_INFO",
                    payload: userData,
                })}, "*");
           } catch (e) {
             console.error("Error posting USER_INFO:", e);
           }
           true;
           `;

                webViewRef.current.injectJavaScript(script);
            } catch (err) {
                console.error("❌ Failed to send user data to web:", err);
            }
        }
    }, [webReady, initialLoadComplete, selectedLanguage]);

    // Handle messages from web app
    const handleWebMessage = useCallback((event) => {
        try {
            const message = JSON.parse(event.nativeEvent.data);

            if (message.type === "WEB_APP_READY") {
                console.log("🌐 Web app is ready");
                setWebReady(true);
                sendUserDataToWeb();
            } else if (message.type === "REQUEST_USER_INFO") {
                console.log("📨 Web app requesting user info");
                sendUserDataToWeb();
            } else if (message.type === "CLOSE_WEBAPP") {
                console.log("🔙 FanHub webapp requesting to close, navigating back to Samvadini");
                navigation.goBack();
            } else if (message.type === "EXIT_APP") {
                console.log("🚪 Web app requesting exit via double-tap");
                navigation.goBack();
            } else if (message.type === "GO_BACK_TO_MAIN_APP") {
                console.log("🏠 Logo clicked - going back to main app");
                navigation.goBack();
            } else if (message.type === "FETCH_ERROR") {
                console.warn("⚠️ Web App Network Error:", message.url, message.error);
                if (message.url && message.url.includes("localhost") && Platform.OS === "android") {
                    console.warn("💡 TIP: Your web app is trying to reach 'localhost'. On Android, 'localhost' refers to the device itself. Change your Web App's API configuration to use your computer's IP address (e.g., http://192.168.110.127:5000).");
                }
            }
        } catch (error) {
            console.error("Error parsing message from web app:", error);
        }
    }, [sendUserDataToWeb, navigation]);

    // ✅ Only send data when webReady changes, not on every render
    useEffect(() => {
        if (webReady && initialLoadComplete) {
            sendUserDataToWeb();
        }
    }, [webReady, initialLoadComplete]);

    // Android hardware back button
    useEffect(() => {
        if (Platform.OS === "android") {
            const backHandler = BackHandler.addEventListener(
                "hardwareBackPress",
                () => {
                    if (canGoBack && webViewRef.current) {
                        webViewRef.current.goBack();
                        return true;
                    }
                    return false;
                }
            );
            return () => backHandler.remove();
        }
    }, [canGoBack]);

    const handleLoadStart = useCallback(() => {
        console.log("WebView started loading");
        if (!initialLoadComplete) {
            setLoading(true);
        }
    }, [initialLoadComplete]);

    const handleLoadEnd = useCallback(() => {
        console.log("WebView finished loading");
        setLoading(false);
        setInitialLoadComplete(true);
        setError(null); // Clear any previous errors on successful load
    }, []);

    const handleError = useCallback((syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.log("WebView error:", nativeEvent);
        console.log("Error code:", nativeEvent.code);
        console.log("Error description:", nativeEvent.description);

        setError({
            code: nativeEvent.code,
            description: nativeEvent.description || "Failed to load page",
            domain: nativeEvent.domain,
        });
        setLoading(false);
        setInitialLoadComplete(true);
    }, []);

    const handleHttpError = useCallback((syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.log("WebView HTTP error:", nativeEvent);
        setError({
            code: nativeEvent.statusCode,
            description: `HTTP ${nativeEvent.statusCode}: ${nativeEvent.description || "Server error"}`,
        });
        setLoading(false);
    }, []);

    const injectedJavaScript = React.useMemo(() => `
    // Intercept Fetch requests to log errors to React Native
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      try {
        const response = await originalFetch(...args);
        return response;
      } catch (error) {
        let url = args[0];
        if (typeof url !== 'string' && url.url) url = url.url; 
        
        window.ReactNativeWebView?.postMessage(JSON.stringify({
          type: "FETCH_ERROR",
          url: url ? url.toString() : "unknown",
          error: error.message || "Unknown Network Error"
        }));
        throw error;
      }
    };

    // Intercept XHR
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        return originalOpen.apply(this, arguments);
    };
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function() {
        this.addEventListener('error', function() {
             window.ReactNativeWebView?.postMessage(JSON.stringify({
                type: "FETCH_ERROR",
                url: this._url ? this._url.toString() : "unknown",
                error: "XHR Error"
            }));
        });
        return originalSend.apply(this, arguments);
    };


    window.addEventListener("message", function(event) {
      if (event.data?.type === "WEB_APP_READY") {
        window.ReactNativeWebView?.postMessage(JSON.stringify(event.data));
      }
      if (event.data?.type === "REQUEST_USER_INFO") {
        window.ReactNativeWebView?.postMessage(JSON.stringify(event.data));
      }
    });

    window.requestUserInfo = function() {
      window.ReactNativeWebView?.postMessage(JSON.stringify({
        type: "REQUEST_USER_INFO",
        timestamp: new Date().toISOString()
      }));
    };

    // Signal that the web app is ready
    setTimeout(() => {
      window.ReactNativeWebView?.postMessage(JSON.stringify({
        type: "WEB_APP_READY",
        timestamp: new Date().toISOString()
      }));
    }, 1000);

    true;
  `, []);

    const handleRetry = useCallback(() => {
        setError(null);
        setLoading(true);
        setInitialLoadComplete(false);
        setWebReady(false);
        if (webViewRef.current) {
            webViewRef.current.reload();
        }
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            {loading && !error && (
                <View style={styles.loaderOverlay}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            )}
            {error && (
                <View style={styles.errorOverlay}>
                    <Text style={styles.errorTitle}>Connection Error</Text>
                    <Text style={styles.errorText}>
                        {error.description || `Error code: ${error.code}`}
                    </Text>
                    {Platform.OS === "android" && (
                        <Text style={styles.errorHint}>
                            Make sure your dev server is running and accessible at {"\n"}
                            {getLocalhostUrl()}
                            {"\n\n"}
                            For physical devices, use your computer's IP address instead of localhost.
                        </Text>
                    )}
                    <Text style={styles.retryButton} onPress={handleRetry}>
                        Retry
                    </Text>
                </View>
            )}
            <WebView
                ref={webViewRef}
                source={{ uri: getLocalhostUrl() }}
                onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
                onMessage={handleWebMessage}
                onLoadStart={handleLoadStart}
                onLoadEnd={handleLoadEnd}
                onError={handleError}
                onHttpError={handleHttpError}
                injectedJavaScript={injectedJavaScript}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState={false}
                scalesPageToFit={false} // Optimize for mobile viewport
                mixedContentMode="compatibility"
                allowsBackForwardNavigationGestures
                pullToRefreshEnabled={true} // Enable pull to refresh
                overScrollMode="content" // Smooth scrolling on Android
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        zIndex: 10,
    },
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        zIndex: 20,
        padding: 20,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#FF3B30",
        marginBottom: 10,
        textAlign: "center",
    },
    errorText: {
        fontSize: 16,
        color: "#333",
        marginBottom: 20,
        textAlign: "center",
    },
    errorHint: {
        fontSize: 14,
        color: "#666",
        marginBottom: 20,
        textAlign: "center",
        lineHeight: 20,
    },
    retryButton: {
        fontSize: 16,
        color: "#007AFF",
        fontWeight: "600",
        padding: 12,
        paddingHorizontal: 24,
        backgroundColor: "#E3F2FD",
        borderRadius: 8,
        overflow: "hidden",
    },
});

