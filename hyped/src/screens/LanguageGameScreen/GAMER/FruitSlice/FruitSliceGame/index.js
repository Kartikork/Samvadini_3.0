import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, Modal, Image, BackHandler, AppState } from 'react-native';
import { GameEngine } from 'react-native-game-engine';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SpawnSystem, MoveSystem, SliceSystem, CleanupSystem } from './systems';
import createInitialEntities from './entities';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const backgroundImage = require('../fruit_background.jpg');

const CONTINUE_COST = 10;

const FruitSliceGame = ({ onExit }) => {
    const [running, setRunning] = useState(true);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const [totalCoins, setTotalCoins] = useState(0);
    const [earnedCoins, setEarnedCoins] = useState(0);

    const gameEngineRef = useRef(null);
    const appState = useRef(AppState.currentState);

    const loadCoins = async () => {
        try {
            const saved = await AsyncStorage.getItem("snakeGameTotalCoins");
            if (saved !== null) setTotalCoins(JSON.parse(saved));
        } catch (e) {
            console.log("Failed to load coins", e);
        }
    };

    const saveCoins = async (coins) => {
        try {
            await AsyncStorage.setItem("snakeGameTotalCoins", JSON.stringify(coins));
        } catch (e) {
            console.log("Failed to save coins", e);
        }
    };

    useEffect(() => {
        loadCoins();
    }, []);

    useEffect(() => {
        const backAction = () => {
            onExit();
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            backAction
        );

        const subscription = AppState.addEventListener("change", next => {
            if (next === "background" || next === "inactive") {
                setRunning(false);
            }
            appState.current = next;
        });

        return () => {
            backHandler.remove();
            subscription.remove();
        };
    }, [onExit]);

    useEffect(() => {
        if (lives <= 0 && running) {
            setRunning(false);
            setGameOver(true);

            const coinsEarned = Math.floor(score / 10);
            const newTotal = totalCoins + coinsEarned;

            setEarnedCoins(coinsEarned);
            setTotalCoins(newTotal);
            saveCoins(newTotal);
        }
    }, [lives, running]);

    const onEvent = (e) => {
        switch (e.type) {
            case 'score-point': setScore(s => s + 1); break;
            case 'lose-life': setLives(l => l - 1); break;
        }
    };

    const handleContinue = () => {
        if (totalCoins < CONTINUE_COST) return;

        const newTotal = totalCoins - CONTINUE_COST;
        setTotalCoins(newTotal);
        saveCoins(newTotal);

        setGameOver(false);
        setLives(1);
        setRunning(true);
        gameEngineRef.current.swap(createInitialEntities());
    };

    const restartGame = () => {
        setScore(0);
        setLives(3);
        setGameOver(false);
        gameEngineRef.current.swap(createInitialEntities());
        setRunning(true);
    };

    const panGesture = Gesture.Pan()
        .onBegin((e) => {
            gameEngineRef.current?.dispatch({ type: 'start', event: e });
        })
        .onUpdate((e) => {
            gameEngineRef.current?.dispatch({ type: 'move', event: e });
        })
        .onEnd((e) => {
            gameEngineRef.current?.dispatch({ type: 'end', event: e });
        });

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ImageBackground source={backgroundImage} style={styles.container}>
                
                {/* Score & Lives */}
                <Text style={styles.score}>Score: {score}</Text>
                <Text style={styles.lives}>Lives: {'❤️'.repeat(lives)}</Text>

                <GestureDetector gesture={panGesture}>
                    <View collapsable={false} style={styles.gameContainer}>
                        <GameEngine
                            ref={gameEngineRef}
                            style={{ flex: 1 }}
                            systems={[SpawnSystem, MoveSystem, SliceSystem, CleanupSystem]}
                            entities={createInitialEntities()}
                            running={running}
                            onEvent={onEvent}
                        />
                    </View>
                </GestureDetector>

                {/* GAME OVER MODAL */}
                <Modal visible={gameOver} transparent animationType="fade">
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.gameOverText}>Game Over</Text>
                            <Text style={styles.finalScoreText}>Your Score: {score}</Text>
                            <Text style={styles.finalScoreText}>+ {earnedCoins} Coins</Text>

                            {/* Continue Button */}
                            {totalCoins >= CONTINUE_COST ? (
                                <TouchableOpacity onPress={handleContinue}>
                                    <LinearGradient
                                        colors={['#fbd786', '#f7797d']}
                                        style={styles.button}
                                    >
                                        <Text style={styles.buttonText}>Continue (-10)</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ) : (
                                <Text style={{ marginBottom: 10, color: "#ffcccc" }}>
                                    Not enough coins to continue!
                                </Text>
                            )}

                            {/* Restart */}
                            <TouchableOpacity onPress={restartGame}>
                                <LinearGradient
                                    colors={['#6462AC', '#028BD3']}
                                    style={styles.button}
                                >
                                    <Text style={styles.buttonText}>Restart</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Exit */}
                            <TouchableOpacity
                                style={[styles.button, styles.exitButton]}
                                onPress={onExit}
                            >
                                <Text style={styles.buttonText}>Exit Game</Text>
                            </TouchableOpacity>
                        </View>

                        {/* <Image
                            source={require('../cheer-cheers.gif')}
                            style={styles.winImage}
                            resizeMode="contain"
                        /> */}
                    </View>
                </Modal>
            </ImageBackground>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    score: {
        zIndex: 1, fontSize: 20, color: '#52df84', backgroundColor: "#fff",
        paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8,
        position: 'absolute', top: 40, left: 20
    },
    lives: {
        zIndex: 1, fontSize: 20, backgroundColor: "#fff",
        paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8,
        position: 'absolute', top: 40, right: 20
    },
    gameContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    modalContainer: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)'
    },
    modalContent: {
        backgroundColor: 'white', padding: 30, borderRadius: 15,
        alignItems: 'center', width: '80%'
    },
    gameOverText: { fontSize: 32, fontWeight: 'bold', color: '#dc3545', marginBottom: 10 },
    finalScoreText: { fontSize: 22, color: '#333', marginBottom: 10 },
    button: {
        paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10,
        marginBottom: 10
    },
    exitButton: { backgroundColor: '#d74b0fff' },
    buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    winImage: {
        width: '100%', height: 200, alignSelf: 'center'
    }
});

export default FruitSliceGame;