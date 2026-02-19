import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Animated,
    SafeAreaView,
    BackHandler,
    AppState,
    Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const MathTugOfWar = ({ navigation }) => {
    const [gameState, setGameState] = useState('menu'); // menu, playing, gameOver
    const [gameMode, setGameMode] = useState(null); // 'ai' or 'friends'
    const [score1, setScore1] = useState(0);
    const [score2, setScore2] = useState(0);
    const [timer, setTimer] = useState(60);
    const [ropePos] = useState(new Animated.Value(0)); // 0 is center
    const [winner, setWinner] = useState(null);

    // Player 1 (Left) State
    const [p1Problem, setP1Problem] = useState({ q: '', a: 0 });
    const [p1Input, setP1Input] = useState('');
    const [p1Status, setP1Status] = useState('neutral'); // neutral, correct, wrong

    // Player 2 (Right) State
    const [p2Problem, setP2Problem] = useState({ q: '', a: 0 });
    const [p2Input, setP2Input] = useState('');
    const [p2Status, setP2Status] = useState('neutral'); // neutral, correct, wrong

    const generateProblem = () => {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const op = Math.random() > 0.5 ? '+' : '-';
        // Ensure no negative results for subtraction
        const q = op === '+' ? `${num1} + ${num2}` : `${Math.max(num1, num2)} - ${Math.min(num1, num2)}`;
        const a = op === '+' ? num1 + num2 : Math.max(num1, num2) - Math.min(num1, num2);
        return { q, a };
    };

    const startNewGame = (mode) => {
        setGameMode(mode);
        setGameState('playing');
        setScore1(0);
        setScore2(0);
        setTimer(60);
        ropePos.setValue(0);
        setP1Problem(generateProblem());
        setP2Problem(generateProblem());
        setP1Input('');
        setP2Input('');
        setP1Status('neutral');
        setP2Status('neutral');
        setWinner(null);
    };

    const handleExit = useCallback(() => {
        setGameState('none'); // Hide all modals
        setScore1(0);
        setScore2(0);
        setTimer(0);
        navigation.navigate('LanguageGameScreen');
    }, [navigation]);

    useFocusEffect(
        useCallback(() => {
            setGameState('menu'); // Always show menu when focusing
            return () => {
                setGameState('none'); // Always hide modals when blurring
            };
        }, [])
    );

    // AI Logic - Simulates typing
    useEffect(() => {
        let aiTimeout;
        let typeInterval;

        if (gameState === 'playing' && gameMode === 'ai') {
            const delay = Math.floor(Math.random() * 2000) + 1500; // Time before starting to "type"

            aiTimeout = setTimeout(() => {
                const answerStr = p2Problem.a.toString();
                let currentIdx = 0;

                typeInterval = setInterval(() => {
                    if (gameState !== 'playing') {
                        clearInterval(typeInterval);
                        return;
                    }

                    if (currentIdx < answerStr.length) {
                        const nextDigit = answerStr[currentIdx];
                        if (nextDigit !== undefined) {
                            setP2Input(prev => prev + nextDigit);
                        }
                        currentIdx++;
                    } else {
                        clearInterval(typeInterval);
                        // Finished typing - show green
                        setP2Status('correct');
                        setTimeout(() => {
                            if (gameState === 'playing') {
                                setScore2(s => s + 1);
                                pullRope(25);
                                setP2Input('');
                                setP2Status('neutral');
                                setP2Problem(generateProblem());
                            }
                        }, 400);
                    }
                }, 400);
            }, delay);
        }

        return () => {
            clearTimeout(aiTimeout);
            clearInterval(typeInterval);
        };
    }, [gameState, gameMode, p2Problem]);

    useEffect(() => {
        const onBackPress = () => {
            handleExit();
            return true;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState.match(/inactive|background/)) {
                console.log('App in background');
            }
        });

        return () => {
            backHandler.remove();
            subscription.remove();
        };
    }, [navigation]);

    useEffect(() => {
        let interval;
        if (gameState === 'playing' && timer > 0) {
            interval = setInterval(() => {
                setTimer(t => {
                    if (t <= 1) {
                        setGameState('gameOver');
                        determineWinner();
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameState, timer]);

    const determineWinner = () => {
        const finalPos = ropePos.__getValue();
        const p2Name = gameMode === 'ai' ? 'Computer' : 'Player 2';

        if (finalPos < -50) setWinner('Player 1');
        else if (finalPos > 50) setWinner(p2Name);
        else {
            if (score1 > score2) setWinner('Player 1');
            else if (score2 > score1) setWinner(p2Name);
            else setWinner('Draw');
        }
    };

    const handleInput = (player, val) => {
        if (gameState !== 'playing') return;

        if (player === 1) {
            const newInput = p1Input + val;
            setP1Input(newInput);
            if (parseInt(newInput) === p1Problem.a) {
                setP1Status('correct');
                setTimeout(() => {
                    setScore1(s => s + 1);
                    pullRope(-25); // Pull left
                    setP1Input('');
                    setP1Status('neutral');
                    setP1Problem(generateProblem());
                }, 300);
            } else if (newInput.length >= p1Problem.a.toString().length) {
                // Wrong answer once the length is reached
                setP1Status('wrong');
                setTimeout(() => {
                    setP1Input('');
                    setP1Status('neutral');
                    setP1Problem(generateProblem()); // Skip to next question
                }, 400);
            }
        } else if (player === 2 && gameMode === 'friends') {
            const newInput = p2Input + val;
            setP2Input(newInput);
            if (parseInt(newInput) === p2Problem.a) {
                setP2Status('correct');
                setTimeout(() => {
                    setScore2(s => s + 1);
                    pullRope(25); // Pull right
                    setP2Input('');
                    setP2Status('neutral');
                    setP2Problem(generateProblem());
                }, 300);
            } else if (newInput.length >= p2Problem.a.toString().length) {
                setP2Status('wrong');
                setTimeout(() => {
                    setP2Input('');
                    setP2Status('neutral');
                    setP2Problem(generateProblem()); // Skip to next question
                }, 400);
            }
        }
    };

    const pullRope = (val) => {
        Animated.spring(ropePos, {
            toValue: ropePos.__getValue() + val,
            useNativeDriver: false,
            friction: 5,
        }).start(() => {
            const currentPos = ropePos.__getValue();
            const p2Name = gameMode === 'ai' ? 'Computer' : 'Player 2';

            if (currentPos <= -(width / 2.5)) {
                setWinner('Player 1');
                setGameState('gameOver');
            } else if (currentPos >= (width / 2.5)) {
                setWinner(p2Name);
                setGameState('gameOver');
            }
        });
    };

    const Keypad = ({ onKeyPress, color, disabled }) => (
        <View style={[styles.keypad, disabled && { opacity: 0.8 }]}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                <TouchableOpacity
                    key={num}
                    disabled={disabled}
                    style={[styles.key, { backgroundColor: color }]}
                    onPress={() => onKeyPress && onKeyPress(num)}
                >
                    <Text style={styles.keyText}>{num}</Text>
                </TouchableOpacity>
            ))}
            <TouchableOpacity
                disabled={disabled}
                style={[styles.key, styles.clearKey]}
                onPress={() => onKeyPress && onKeyPress('clear')}
            >
                <Text style={styles.keyText}>C</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Game Header - Reduced Height */}
            <View style={styles.header}>
                <View style={styles.scoreBoard}>
                    <Text style={[styles.scoreText, { color: '#4dabf7' }]}>{score1}</Text>
                    <View style={styles.timerContainer}>
                        <Text style={styles.timerText}>{timer}s</Text>
                    </View>
                    <Text style={[styles.scoreText, { color: '#ff6b6b' }]}>{score2}</Text>
                </View>
            </View>

            {/* Tug of War Visual Area - Shifted slightly higher to compress space */}
            <View style={styles.visualArea}>
                <View style={styles.centerLine} />
                <Animated.View style={[styles.ropeContainer, { transform: [{ translateX: ropePos }] }]}>
                    <View style={styles.rope} />
                    <Text style={styles.teamEmojiLeft}>🏃🏃</Text>
                    <View style={styles.flag} />
                    <Text style={styles.teamEmojiRight}>{gameMode === 'ai' ? "💻" : "🏃🏃"}</Text>
                </Animated.View>
            </View>

            {/* Solving Areas */}
            <View style={styles.playingField}>
                {/* Player 1 Area */}
                <View style={[styles.playerArea, styles.p1Border]}>
                    <View style={styles.problemBox}>
                        <Text style={[
                            styles.problemText,
                            p1Status === 'wrong' && { color: '#f56565', textDecorationLine: 'line-through' }
                        ]}>
                            {p1Problem.q} = ?
                        </Text>
                        <View style={[
                            styles.inputBox,
                            p1Status === 'correct' && styles.inputCorrect,
                            p1Status === 'wrong' && styles.inputWrong
                        ]}>
                            <Text style={styles.inputText}>{p1Input}</Text>
                        </View>
                    </View>
                    <Keypad color="#4dabf7" onKeyPress={(v) => v === 'clear' ? setP1Input('') : handleInput(1, v)} />
                </View>

                {/* Player 2 Area - AI UI matches User UI now */}
                <View style={[styles.playerArea, styles.p2Border]}>
                    <View style={styles.problemBox}>
                        <Text style={[
                            styles.problemText,
                            p2Status === 'wrong' && { color: '#f56565', textDecorationLine: 'line-through' }
                        ]}>
                            {p2Problem.q} = ?
                        </Text>
                        <View style={[
                            styles.inputBox,
                            gameMode === 'ai' && { borderColor: '#ff6b6b', borderWidth: 1 },
                            p2Status === 'correct' && styles.inputCorrect,
                            p2Status === 'wrong' && styles.inputWrong
                        ]}>
                            <Text style={styles.inputText}>{p2Input}</Text>
                        </View>
                    </View>
                    <Keypad
                        color="#ff6b6b"
                        disabled={gameMode === 'ai'}
                        onKeyPress={(v) => v === 'clear' ? setP2Input('') : handleInput(2, v)}
                    />
                    {gameMode === 'ai' && (
                        <View style={styles.aiOverlay}>
                            <Text style={styles.aiThinkingSmall}>AI Solving...</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Modals */}
            <Modal visible={gameState === 'menu'} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Math Tug of War</Text>
                        <Text style={styles.modalSubtitle}>Pull the rope by solving math!</Text>

                        <TouchableOpacity style={[styles.startBtn, { backgroundColor: '#4dabf7', marginBottom: 15 }]} onPress={() => startNewGame('ai')}>
                            <Text style={styles.startBtnText}>PLAY WITH AI</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.startBtn, { backgroundColor: '#ff6b6b' }]} onPress={() => startNewGame('friends')}>
                            <Text style={styles.startBtnText}>PLAY WITH FRIENDS</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={gameState === 'gameOver'} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.winnerTitle}>{winner === 'Draw' ? "It's a Draw!" : `${winner} Wins!`}</Text>
                        <Text style={styles.finalScore}>Final Score: {score1} - {score2}</Text>

                        <TouchableOpacity style={styles.startBtn} onPress={() => startNewGame(gameMode)}>
                            <Text style={styles.startBtnText}>PLAY AGAIN</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.startBtn, { backgroundColor: '#555', marginTop: 10 }]} onPress={() => setGameState('menu')}>
                            <Text style={styles.startBtnText}>BACK TO MENU</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.startBtn, { backgroundColor: '#d32f2f', marginTop: 10 }]}
                            onPress={handleExit}
                        >
                            <Text style={styles.startBtnText}>EXIT GAME</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f8' },
    header: { height: 80, alignItems: 'center', justifyContent: 'center', marginTop: 60 }, // Balanced margin to be neither too high nor too low
    scoreBoard: { flexDirection: 'row', alignItems: 'center', width: '80%', justifyContent: 'space-between' },
    scoreText: { fontSize: 32, fontWeight: 'bold' },
    timerContainer: { backgroundColor: '#333', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 15 },
    timerText: { color: 'white', fontSize: 20, fontWeight: 'bold' },

    visualArea: { height: 120, backgroundColor: '#e2e8f0', justifyContent: 'center', overflow: 'hidden', borderTopWidth: 2, borderBottomWidth: 2, borderColor: '#cbd5e0', marginTop: 10 }, // Increased height and added margin
    centerLine: { position: 'absolute', left: width / 2, width: 2, height: '100%', backgroundColor: '#a0aec0', zIndex: 0 },
    ropeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: width * 2, marginLeft: -width / 2 },
    rope: { height: 6, backgroundColor: '#744210', width: '100%', position: 'absolute' },
    teamEmojiLeft: { fontSize: 40, marginRight: 20, zIndex: 1 },
    teamEmojiRight: { fontSize: 40, marginLeft: 20, zIndex: 1 },
    flag: { width: 4, height: 40, backgroundColor: 'red', zIndex: 2 },

    playingField: { flex: 1, flexDirection: 'row' },
    playerArea: { flex: 1, padding: 5, justifyContent: 'flex-start' }, // Changed to flex-start to compress space
    p1Border: { borderRightWidth: 1, borderColor: '#cbd5e0' },
    p2Border: { borderLeftWidth: 1, borderColor: '#cbd5e0' },

    problemBox: { alignItems: 'center', marginTop: 10, marginBottom: 5 },
    problemText: { fontSize: 24, fontWeight: 'bold', color: '#2d3748' },
    inputBox: { width: '85%', height: 45, backgroundColor: 'white', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 5, borderWidth: 2, borderColor: '#edf2f7' },
    inputCorrect: { backgroundColor: '#c6f6d5', borderColor: '#48bb78' },
    inputWrong: { backgroundColor: '#fed7d7', borderColor: '#f56565' },
    inputText: { fontSize: 26, fontWeight: 'bold' },

    keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 5 },
    key: { width: '28%', aspectRatio: 1.1, margin: '2%', borderRadius: 10, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    keyText: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    clearKey: { backgroundColor: '#4a5568' },

    aiOverlay: { position: 'absolute', bottom: 20, alignSelf: 'center' },
    aiThinkingSmall: { fontSize: 14, fontStyle: 'italic', color: '#ff6b6b', fontWeight: 'bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 30, alignItems: 'center', width: '85%', elevation: 10 },
    modalTitle: { fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
    modalSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
    startBtn: { paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30, width: '100%', alignItems: 'center' },
    startBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    winnerTitle: { fontSize: 38, fontWeight: 'bold', color: '#2d3748', marginBottom: 10 },
    finalScore: { fontSize: 22, color: '#666', marginBottom: 30 },
});

export default MathTugOfWar;
