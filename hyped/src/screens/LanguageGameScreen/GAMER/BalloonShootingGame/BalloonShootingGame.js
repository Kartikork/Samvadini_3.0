import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ImageBackground, Image, AppState, BackHandler, Alert } from "react-native";
import { useNavigation } from '@react-navigation/native'; // Import useNavigation
import BalloonWheel from "./BalloonWheel";
import Slingshot from "./Slingshot";
import SoundPlayer from 'react-native-sound-player';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

// --- Game Rules ---
const TOTAL_BALLOONS = 7;
const TOTAL_SHOTS = 10;
const STREAK_THRESHOLD = 3;

// --- Asset Paths ---
const backgroundImage = require("../../GAMER/BalloonShootingGame/village_background.jpg");
// Sound files are stored in Android res/raw — play by name (no path)
const BACKGROUND_MUSIC_NAME = 'circus';
const POP_SOUND_NAME = 'balloon_burst';
const STREAK_SOUND_NAME = 'shabaash';
const FINAL_WIN_SOUND_NAME = 'cheer_high';
const LOSE_SOUND_NAME = 'cheer_low';
const winGif = require("../../GAMER/BalloonShootingGame/we-won-1-unscreen.gif");
const loseGif = require("../../GAMER/BalloonShootingGame/low_score.png");

// Sound.setCategory('Playback');

const BalloonShootingGame = () => {
    const [score, setScore] = useState(0);
    const [shotsLeft, setShotsLeft] = useState(TOTAL_SHOTS);
    const [gameState, setGameState] = useState("playing");
    const [projectilePos, setProjectilePos] = useState(null);
    const [gameId, setGameId] = useState(0);
    const [wheelPosition, setWheelPosition] = useState(null);
    const [slingshotPosition, setSlingshotPosition] = useState(null);
    const [streakCount, setStreakCount] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    // --- FIX: State to control projectile animation and reset the slingshot ---
    const [projectileInterval, setProjectileInterval] = useState(null);
    const [shotId, setShotId] = useState(0); // This will be our component key

    // We use SoundPlayer for all sounds. No per-sound objects are kept.
    const shotResult = useRef('miss');
    const appState = useRef(AppState.currentState);
    const navigation = useNavigation(); // Get the navigation object

    useEffect(() => {
        // --- AppState Handling ---
        const handleAppStateChange = (nextAppState) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                // App has come to the foreground
                if (backgroundMusic.current && !isMuted && gameState === 'playing') {
                    backgroundMusic.current.play();
                }
            } else {
                // App is going to the background
                if (backgroundMusic.current) {
                    backgroundMusic.current.pause();
                }
            }
            appState.current = nextAppState;
        };

        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        // --- BackHandler Handling ---
        const backAction = () => {
            navigation.goBack();
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            backAction
        );

        // --- Sound Initialization ---
        // Play background music from Android raw if not muted. We'll re-play when it finishes to emulate looping.
        const onFinished = () => {
            if (!isMuted && gameState === 'playing') {
                try { SoundPlayer.playSoundFile(BACKGROUND_MUSIC_NAME, 'mp3'); } catch (e) { console.log('bg replay failed', e); }
            }
        };

        try {
            if (!isMuted) SoundPlayer.playSoundFile(BACKGROUND_MUSIC_NAME, 'mp3');
        } catch (e) {
            console.log('Failed to start background music', e);
        }
        SoundPlayer.addEventListener('FinishedPlaying', onFinished);

        return () => {
            // Cleanup listeners
            appStateSubscription.remove();
            backHandler.remove();

            // Stop any playing sound and remove listener
            try { SoundPlayer.stop(); } catch (e) {}
            SoundPlayer.removeEventListener('FinishedPlaying');
        };
    }, []);

    useEffect(() => {
        if (gameState !== 'playing') return;

        if (score === TOTAL_BALLOONS) {
            setGameState("won");
        } else if (shotsLeft === 0) {
            setGameState("lost");
        }
    }, [score, shotsLeft, gameState]);

    useEffect(() => {
        if (gameState === 'won' || gameState === 'lost') {
            if (projectileInterval) clearInterval(projectileInterval);
            try { SoundPlayer.stop(); } catch (e) {}
            if (!isMuted) {
                try {
                    if (gameState === 'won') SoundPlayer.playSoundFile(FINAL_WIN_SOUND_NAME, 'mp3');
                    else SoundPlayer.playSoundFile(LOSE_SOUND_NAME, 'mp3');
                } catch (e) { console.log('end state sound failed', e); }
            }
        }
    }, [gameState, isMuted]);

    useEffect(() => {
        if (streakCount >= STREAK_THRESHOLD) {
            if (!isMuted) {
                try { SoundPlayer.playSoundFile(STREAK_SOUND_NAME, 'mp3'); } catch (e) { console.log('streak sound failed', e); }
            }
        }
    }, [streakCount]);

    const playPopSound = () => {
        if (!isMuted) {
            try { SoundPlayer.playSoundFile(POP_SOUND_NAME, 'mp3'); } catch (e) { console.log('pop sound failed', e); }
        }
    };

    // --- FIX: Centralized function to end a shot cycle ---
    const endShot = () => {
        if (gameState !== 'playing') return;

        setShotsLeft(prevShots => prevShots - 1);

        if (projectileInterval) {
            clearInterval(projectileInterval);
            setProjectileInterval(null);
        }

        setProjectilePos(null);
        // This is the key: incrementing shotId will force Slingshot to re-mount
        setShotId(id => id + 1);
    };

    // --- MODIFIED: A hit now immediately ends the shot ---
    const handlePop = () => {
        if (shotResult.current === 'hit') return; // Prevent multiple calls for one shot

        shotResult.current = 'hit';
        playPopSound();
        setScore(prevScore => prevScore + 1);
        setStreakCount(prevStreak => prevStreak + 1);
        endShot();
    };

    const toggleMute = () => {
        const newMuteState = !isMuted;
        setIsMuted(newMuteState);
        if (newMuteState) {
            try { SoundPlayer.stop(); } catch (e) {}
        } else {
            if (gameState === 'playing') {
                try { SoundPlayer.playSoundFile(BACKGROUND_MUSIC_NAME, 'mp3'); } catch (e) {}
            }
        }
    };

    // --- MODIFIED: This function is now ONLY for misses ---
    const handleShotEnd = () => {
        // Ensure this only runs if a balloon wasn't already popped
        if (shotResult.current === 'miss') {
            setStreakCount(0); // Reset streak on a miss
            endShot();
        }
    };

    const restartGame = () => {
        // --- FIX: Stop win/loss sounds when restarting ---
        try { SoundPlayer.stop(); } catch (e) {}

        if (projectileInterval) {
            clearInterval(projectileInterval);
        }
        setScore(0);
        setShotsLeft(TOTAL_SHOTS);
        setGameState("playing");
        setProjectilePos(null);
        setProjectileInterval(null);
        setGameId(id => id + 1);
        setShotId(id => id + 1); // Also reset the slingshot on a full game restart
        setStreakCount(0);

        if (!isMuted) {
            try { SoundPlayer.stop(); } catch (e) {}
            try { SoundPlayer.playSoundFile(BACKGROUND_MUSIC_NAME, 'mp3'); } catch (e) {}
        }
    };

    // --- MODIFIED: Primes the shot by setting its state to 'miss' ---
    const handleShoot = (relativePos, interval) => {
        if (gameState !== "playing") return;
        shotResult.current = 'miss'; // Prime the shot as a 'miss'
        if (slingshotPosition) {
            const absoluteX = slingshotPosition.x + relativePos.x;
            const absoluteY = slingshotPosition.y + relativePos.y;
            setProjectilePos({ x: absoluteX, y: absoluteY });
            setProjectileInterval(interval);
        }
    };

    return (
        <ImageBackground source={backgroundImage} resizeMode="cover" style={styles.container}>
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcon name="arrow-left" size={32} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>🎯 Balloon Shooting</Text>
                <TouchableOpacity onPress={toggleMute} style={styles.settingsButton}>
                    <Icon name={isMuted ? "volume-mute" : "volume-high"} size={32} color="#333" />
                </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
                <Text style={styles.statsText}>Balloons Popped: {score} / {TOTAL_BALLOONS}</Text>
                <Text style={styles.statsText}>Shots Left: {shotsLeft}</Text>
            </View>

            <View style={styles.wheelAndStandContainer}>
                <View style={styles.standContainer}>
                    <View style={[styles.tripodLeg, styles.backLeg]} />
                    <View style={[styles.tripodLeg, styles.frontLeftLeg]} />
                    <View style={[styles.tripodLeg, styles.frontRightLeg]} />
                </View>
                <View style={styles.backingPlate} />
                <View
                    onLayout={(e) => {
                        e.target.measure((x, y, width, height, pageX, pageY) => {
                            setWheelPosition({ x: pageX, y: pageY });
                        });
                    }}
                >
                    <BalloonWheel
                        key={gameId}
                        projectilePos={projectilePos}
                        onPop={handlePop}
                        wheelPosition={wheelPosition}
                    />
                </View>
            </View>
            {gameState === "won" && (
                <View style={styles.overlay}>
                    {/* <Image source={winGif} style={styles.gif} /> */}
                    <Text style={styles.overlayTitle}>You Win!</Text>
                    <Text style={styles.overlaySubText}>Great shooting!</Text>
                    <TouchableOpacity style={styles.button} onPress={restartGame}>
                        <Text style={styles.buttonText}>Play Again</Text>
                    </TouchableOpacity>
                </View>
            )}
            {gameState === "lost" && (
                <View style={styles.overlay}>
                    <Image source={loseGif} style={styles.gif} />
                    <Text style={styles.overlayTitle}>Game Over</Text>
                    <Text style={styles.overlaySubText}>You ran out of shots.</Text>
                    <TouchableOpacity style={styles.button} onPress={restartGame}>
                        <Text style={styles.buttonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            )}
            <View
                pointerEvents={gameState !== "playing" ? "none" : "auto"}
                onLayout={(e) => {
                    e.target.measure((x, y, width, height, pageX, pageY) => {
                        setSlingshotPosition({ x: pageX + width / 2, y: pageY + 80 });
                    });
                }}
            >
                {/* --- FIX: Added key to force re-mount on every shot --- */}
                <Slingshot
                    key={shotId}
                    onShoot={handleShoot}
                    onShotEnd={handleShotEnd}
                />
            </View>
        </ImageBackground>
    );
};

// ... (styles remain the same)
const styles = StyleSheet.create({
    container: { flex: 1, alignItems: "center", justifyContent: "space-between", paddingVertical: 50 },
    headerContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: -20,
    },
    title: { fontSize: 28, fontWeight: "bold", color: "#333" },
    settingsButton: {
        padding: 10,
    },
    statsContainer: {
        width: "100%",
        paddingHorizontal: 20,
        marginTop: 0,
    },
    statsText: {
        fontSize: 20,
        color: "#333",
        fontWeight: "500",
        textAlign: "center",
    },
    wheelAndStandContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    standContainer: {
        position: 'absolute',
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'flex-start',
        top: 95,
    },
    tripodLeg: {
        position: 'absolute',
        width: 15,
        height: 160,
        backgroundColor: '#663300',
        borderRadius: 5,
    },
    backLeg: {
    },
    frontLeftLeg: {
        transform: [{ rotate: '-10deg' }],
        left: 80,
    },
    frontRightLeg: {
        transform: [{ rotate: '10deg' }],
        right: 80,
    },
    backingPlate: {
        position: 'absolute',
        width: 220,
        height: 220,
        backgroundColor: '#D2B48C',
        borderRadius: 110,
        borderWidth: 5,
        borderColor: '#8B4513',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
    },
    gif: {
        width: 250,
        height: 250,
        marginBottom: 10,
        resizeMode: 'contain',
    },
    overlayTitle: {
        fontSize: 48,
        fontWeight: "bold",
        color: "white",
        marginBottom: 10,
    },
    overlaySubText: {
        fontSize: 18,
        color: "white",
        marginBottom: 30,
    },
    button: {
        backgroundColor: "#FF7043",
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 10,
    },
    buttonText: {
        fontSize: 20,
        color: "white",
        fontWeight: "bold",
    },
});
export default BalloonShootingGame;