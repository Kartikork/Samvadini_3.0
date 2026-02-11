import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
import DemoImage from "../../../assets/gif/DemoImage.gif";
import DemoText from "../../../assets/gif/DemoText.gif";

const ICON_SIZE = 38;
const ARC_HEIGHT = 90;
const DOTS = 20;
const STATIC_DOTS = 100;

const bezier = (t, p0, p1, p2) => {
    const u = 1 - t;
    return {
        x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
        y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    };
};

function DataTransfer() {
    const start = { x: 0, y: ARC_HEIGHT };
    const end = { x: SCREEN_WIDTH - 100, y: ARC_HEIGHT };
    const control = { x: (start.x + end.x) / 2, y: 0 };

    const path = useMemo(
        () =>
            Array.from({ length: 40 }, (_, i) =>
                bezier(i / 41, start, control, end)
            ),
        []
    );

    const anims = useRef(
        Array.from({ length: DOTS }, () => new Animated.Value(0))
    ).current;

    useEffect(() => {
        anims.forEach((val, i) => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(val, {
                        toValue: 1,
                        duration: 1600,
                        delay: i * 200,
                        easing: Easing.linear,
                        useNativeDriver: false,
                    }),
                    Animated.timing(val, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        });
    }, []);

    return (
        <View style={styles.transferRow}>
            <MaterialCommunityIcons
                name="folder-open-outline"
                size={38}
                color="#ffffff"
            />

            <View style={styles.arcWrap}>
                {Array.from({ length: STATIC_DOTS }).map((_, i) => {
                    const p =
                        path[Math.floor((i / STATIC_DOTS) * path.length)];
                    return (
                        <View
                            key={i}
                            style={[styles.staticDot, { left: p.x, top: p.y }]}
                        />
                    );
                })}

                {anims.map((val, i) => {
                    const left = val.interpolate({
                        inputRange: path.map((_, i) => i / (path.length - 1)),
                        outputRange: path.map((p) => p.x),
                    });

                    const top = val.interpolate({
                        inputRange: path.map((_, i) => i / (path.length - 1)),
                        outputRange: path.map((p) => p.y),
                    });

                    return (
                        <Animated.View
                            key={i}
                            style={[styles.movingDot, { left, top }]}
                        />
                    );
                })}
            </View>
            <PhoneIcon size={ICON_SIZE} color="#ffffff" />
        </View>
    );
}

export default function ChatBackupScreen({ progress = 45 }) {
    return (
        <View style={styles.screen}>
            <Animated.Image source={DemoImage} style={styles.image} />
            <Animated.Image source={DemoText} style={styles.text} />
            <DataTransfer />
            <View style={styles.progressWrap}>
                <View
                    style={[
                        styles.progressFill,
                        { width: `${progress}%` },
                    ]}
                />
            </View>

            <Text style={styles.progressText}>
                {progress}% Complete
            </Text>
        </View>
    );
}

function PhoneIcon({ size, color }) {
    return (
        <View style={{ width: size, height: size }}>
            <View
                style={{
                    width: size * 0.6,
                    height: size * 0.9,
                    borderWidth: 2,
                    borderColor: color,
                    borderRadius: 8,
                    alignSelf: "center",
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#003ea0",
        alignItems: "center",
    },
    transferRow: {
        width: "90%",
        flexDirection: "row",
        alignItems: "center",
    },
    arcWrap: {
        flex: 1,
        height: ARC_HEIGHT + 100,
        position: "relative",
    },
    staticDot: {
        position: "absolute",
        width: 3,
        height: 3,
        borderRadius: 2,
        backgroundColor: "#D1D5DB",
    },
    movingDot: {
        position: "absolute",
        width: 6,
        height: 2,
        borderRadius: 3,
        backgroundColor: "#fff",
    },
    progressWrap: {
        width: "90%",
        height: 8,
        backgroundColor: "#E5E7EB",
        borderRadius: 4,
    },
    progressFill: {
        height: "100%",
        borderRadius: 4,
        backgroundColor: "#3b82f6",
    },
    caption: {
        fontSize: 18,
        color: "#ffffff",
        textAlign: "center",
        lineHeight: 26,
        maxWidth: "90%",
    },
    progressText: {
        fontSize: 18,
        color: "#ffffff",
        marginTop: 10,
    },
    image: {
        width: 370,
        height: 250,
        resizeMode: "contain",
    },
    text: {
        width: "100%",
        height: 70,
        resizeMode: "contain",
        position: "relative",
        top: "-30"
    },
});
