import React, { useRef, useState, useEffect, useCallback } from "react";
import { BackHandler, StyleSheet, SafeAreaView, View, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';

export default function LRNScreen() {
    const webViewRef = useRef(null);
    const navigation = useNavigation();
    const [webReady, setWebReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);

    const sendUserDataToWeb = useCallback(async () => {
        if (webViewRef.current && webReady && initialLoadComplete) {
            try {
                const sqliteData = {};
                const userData = {
                    userName: sqliteData?.firstName || "",
                    userId: sqliteData?.userId || "",
                    phoneNumber: sqliteData?.phoneNumber || "",
                    userPhoto: sqliteData?.profilePic || "",
                    selectedLanguage: await AsyncStorage.getItem("userLang") || "",
                    age: sqliteData?.age || null,
                    country: sqliteData?.country || "",
                    gender: sqliteData?.gender || "",
                    firstName: sqliteData?.firstName || "",
                };

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
    }, [webReady, initialLoadComplete]);

    // Handle messages from web app
    const handleWebMessage = useCallback((event) => {
        try {
            const message = JSON.parse(event.nativeEvent.data);

            if (message.type === "WEB_APP_READY") {
                setWebReady(true);
                sendUserDataToWeb();
            } else if (message.type === "REQUEST_USER_INFO") {
                sendUserDataToWeb();
            } else if (message.type === "CLOSE_WEBAPP") {
                navigation.goBack();
            } else if (message.type === "EXIT_APP") {
                navigation.goBack();
            } else if (message.type === "GO_BACK_TO_MAIN_APP") {
                navigation.goBack();
            }
        } catch (error) {
            console.error("Error parsing message from web app:", error);
        }
    }, [sendUserDataToWeb, navigation]);

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                navigation.navigate('Dashboard');
                return true;
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => backHandler.remove();
        }, [navigation]),
    );

    useEffect(() => {
        if (webReady && initialLoadComplete) {
            sendUserDataToWeb();
        }
    }, [webReady]);

    const handleLoadStart = useCallback(() => {
        if (!initialLoadComplete) {
            setLoading(true);
        }
    }, [initialLoadComplete]);

    const handleLoadEnd = useCallback(() => {
        setLoading(false);
        setInitialLoadComplete(true);
    }, []);

    const handleError = useCallback((syntheticEvent) => {
        setLoading(false);
        setInitialLoadComplete(true);
    }, []);

    const injectedJavaScript = `
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
  `;

    return (
        <SafeAreaView style={styles.container}>
            {loading && (
                <View style={styles.loaderOverlay}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            )}
            <WebView
                ref={webViewRef}
                source={{ uri: "https://lrn.aicte-india.org/expo" }}
                onMessage={handleWebMessage}
                onLoadStart={handleLoadStart}
                onLoadEnd={handleLoadEnd}
                onError={handleError}
                injectedJavaScript={injectedJavaScript}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState={false}
                scalesPageToFit={false}
                mixedContentMode="compatibility"
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
});