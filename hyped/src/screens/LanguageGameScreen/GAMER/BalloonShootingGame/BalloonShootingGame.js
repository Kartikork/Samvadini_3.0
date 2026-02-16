import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ImageBackground, Image, AppState, BackHandler, Alert } from "react-native";
import { useNavigation } from '@react-navigation/native'; // Import useNavigation
import BalloonWheel from "./BalloonWheel";
import Slingshot from "./Slingshot";
// import Sound from 'react-native-sound';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

// --- Game Rules ---
const TOTAL_BALLOONS = 7;
const TOTAL_SHOTS = 10;
const STREAK_THRESHOLD = 3;

// --- Asset Paths ---
const backgroundImage = require("../../GAMER/BalloonShootingGame/village_background.jpg");
const backgroundMusicFile = require("../../GAMER/BalloonShootingGame/circus.mp3");
const balloonPopSoundFile = require("../../GAMER/BalloonShootingGame/balloon-burst.mp3");
const streakSoundFile = require("../../GAMER/BalloonShootingGame/shabaash.mp3");
const finalWinSoundFile = require("../../GAMER/BalloonShootingGame/cheer_high.mp3");
const loseSoundFile = require("../../GAMER/BalloonShootingGame/cheer_low.mp3");
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

    const backgroundMusic = useRef(null);
    const popSound = useRef(null);
    const streakSound = useRef(null);
    const finalWinSound = useRef(null);
    const loseSound = useRef(null);
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
        /*
        backgroundMusic.current = new Sound(backgroundMusicFile, (error) => {
            if (error) return console.log('❌ FAILED to load background music', error);
            backgroundMusic.current.setNumberOfLoops(-1);
            if (!isMuted) {
                backgroundMusic.current.play();
            }
        });

        popSound.current = new Sound(balloonPopSoundFile, (e) => { if (e) console.log('FAIL load pop sound', e) });
        streakSound.current = new Sound(streakSoundFile, (e) => { if (e) console.log('FAIL load streak sound', e) });
        finalWinSound.current = new Sound(finalWinSoundFile, (e) => { if (e) console.log('FAIL load final win sound', e) });
        loseSound.current = new Sound(loseSoundFile, (e) => { if (e) console.log('FAIL load lose sound', e) });
        */

        return () => {
            // Cleanup listeners
            appStateSubscription.remove();
            backHandler.remove();

            // Release sounds
            // backgroundMusic.current?.release();
            // popSound.current?.release();
            // streakSound.current?.release();
            // finalWinSound.current?.release();
            // loseSound.current?.release();
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
            backgroundMusic.current?.stop();
            if (!isMuted) {
                if (gameState === 'won') finalWinSound.current?.play();
                else loseSound.current?.play();
            }
        }
    }, [gameState, isMuted]);

    useEffect(() => {
        if (streakCount >= STREAK_THRESHOLD) {
            streakSound.current?.play();
        }
    }, [streakCount]);

    const playPopSound = () => {
        if (popSound.current && !isMuted) {
            popSound.current.stop(() => popSound.current.play());
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
        if (backgroundMusic.current) {
            if (newMuteState) {
                backgroundMusic.current.setVolume(0);
            } else {
                backgroundMusic.current.setVolume(1);
                if (gameState === 'playing') backgroundMusic.current.play();
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
        finalWinSound.current?.stop();
        loseSound.current?.stop();

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

        if (backgroundMusic.current && !isMuted) {
            backgroundMusic.current.stop(() => backgroundMusic.current.play());
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