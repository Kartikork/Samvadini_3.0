import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    Dimensions,
    Animated,
    Pressable,
    Easing,
    StatusBar,
    TouchableOpacity,
    BackHandler,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import Sound from 'react-native-sound';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MAX_PLAY_ACTIONS = 20;
const COINS_PER_FRUIT_CATCH = 15;
const FRUITS_FOR_SPECIAL_EVENT = 5;

const FRUIT_FALL_SPEED = 6;
const FALL_INTERVAL_MS = 30;
const FRUIT_LAUNCH_INTERVAL_MS = 2500;

const FRUIT_FONT_SIZE = 40;
const FRUIT_TAP_PADDING = 20;
const FRUIT_HIT_AREA_SIZE = FRUIT_FONT_SIZE + (FRUIT_TAP_PADDING * 2);

const TREE_WIDTH = SCREEN_WIDTH * 0.7;
const TREE_HEIGHT = SCREEN_HEIGHT * 0.5;
const BUCKET_SIZE = 110;
const BUCKET_SIZE_H = BUCKET_SIZE * 0.8;
const BUCKET_MARGIN_BOTTOM = 140; // Moved significantly higher up
const BUCKET_X = (SCREEN_WIDTH - BUCKET_SIZE) / 2;
const BUCKET_YCenter = SCREEN_HEIGHT - BUCKET_MARGIN_BOTTOM - BUCKET_SIZE_H / 2;

const TreePlayScreen = ({ onBack, onPlayFinished, coins, onCoinUpdate, selectedCharacter }) => {
    const [currentCoins, setCurrentCoins] = useState(coins);
    const [playActionsCount, setPlayActionsCount] = useState(0);
    const [particles, setParticles] = useState([]);
    const [fruits, setFruits] = useState([]);
    const [caughtFruitsCount, setCaughtFruitsCount] = useState(0);
    const [showSpecialEvent, setShowSpecialEvent] = useState(false);
    const [showIntro, setShowIntro] = useState(true);

    const fruitFallIntervals = useRef(new Map()).current;
    const fruitLaunchIntervalRef = useRef(null);
    const eatSound = useRef(null);
    const specialEventSound = useRef(null);
    const bgSound = useRef(null);
    const treeShakeAnim = useRef(new Animated.Value(0)).current;

    // useEffect(() => {
    //     Sound.setCategory('Playback');

    //     eatSound.current = new Sound(require('../GAMER/Assets/click.mp3'), (error) => {
    //         if (error) console.warn('Failed to load sound', error);
    //     });

    //     specialEventSound.current = new Sound(require('../GAMER/Assets/crowd.mp3'), (error) => {
    //         if (error) console.warn('Failed to load special event sound', error);
    //     });

    //     bgSound.current = new Sound(require('../GAMER/Assets/birds.mp3'), (error) => {
    //         if (error) {
    //             console.warn('Failed to load background sound', error);
    //         } else {
    //             bgSound.current.setNumberOfLoops(-1); // Infinite loop
    //             bgSound.current.setVolume(0.5);
    //             bgSound.current.play();
    //         }
    //     });

    //     return () => {
    //         if (eatSound.current) {
    //             eatSound.current.stop();
    //             eatSound.current.release();
    //         }
    //         if (specialEventSound.current) {
    //             specialEventSound.current.stop();
    //             specialEventSound.current.release();
    //         }
    //         if (bgSound.current) {
    //             bgSound.current.stop();
    //             bgSound.current.release();
    //         }
    //     };
    // }, []);

    useEffect(() => {
        const backAction = () => {
            if (onBack) {
                onBack();
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction,
        );

        return () => backHandler.remove();
    }, [onBack]);

    useEffect(() => {
        setCurrentCoins(coins);
    }, [coins]);

    useEffect(() => {
        if (!showSpecialEvent && !showIntro) {
            if (fruitLaunchIntervalRef.current) clearInterval(fruitLaunchIntervalRef.current);
            fruitLaunchIntervalRef.current = setInterval(launchFruit, FRUIT_LAUNCH_INTERVAL_MS);
        } else {
            if (fruitLaunchIntervalRef.current) {
                clearInterval(fruitLaunchIntervalRef.current);
                fruitLaunchIntervalRef.current = null;
            }
            fruitFallIntervals.forEach(intervalId => clearInterval(intervalId));
            fruitFallIntervals.clear();
            setFruits([]);
        }

        return () => {
            if (fruitLaunchIntervalRef.current) clearInterval(fruitLaunchIntervalRef.current);
            fruitFallIntervals.forEach(intervalId => clearInterval(intervalId));
        };
    }, [showSpecialEvent, showIntro, launchFruit]);

    const launchFruit = useCallback(() => {
        if (showSpecialEvent || showIntro) return;

        const newFruitId = Date.now() + Math.random();
        // Fruits spawn from the tree's foliage area
        const initialX = (Math.random() * (TREE_WIDTH * 0.6)) + (SCREEN_WIDTH - TREE_WIDTH) / 2 + (TREE_WIDTH * 0.2);
        const initialY = SCREEN_HEIGHT * 0.3 + (Math.random() * 50);

        const fruitTypes = ['🍎', '🥭', '🍐', '🍑', '🍒', '🍊'];
        const newFruit = {
            id: newFruitId,
            initialX: initialX,
            yPosition: initialY,
            type: fruitTypes[Math.floor(Math.random() * fruitTypes.length)],
            isCaught: false,
            catchAnimation: new Animated.Value(0),
            catchX: new Animated.Value(0),
            catchY: new Animated.Value(0),
            initialActualX: initialX,
            initialActualY: initialY,
        };

        setFruits(prev => [...prev, newFruit]);
        startFruitFalling(newFruitId, initialY);
    }, [showSpecialEvent, showIntro, startFruitFalling]);

    const startFruitFalling = useCallback((newFruitId, initialY) => {
        let currentY = initialY;
        const dynamicFallSpeed = FRUIT_FALL_SPEED * (1 + playActionsCount * 0.03);

        const interval = setInterval(() => {
            setFruits(prevFruits => {
                const fruitIndex = prevFruits.findIndex(f => f.id === newFruitId);
                if (fruitIndex === -1 || prevFruits[fruitIndex].isCaught) {
                    clearInterval(interval);
                    return prevFruits;
                }

                currentY += dynamicFallSpeed;

                if (currentY > SCREEN_HEIGHT + 50) {
                    clearInterval(interval);
                    fruitFallIntervals.delete(newFruitId);
                    return prevFruits.filter(f => f.id !== newFruitId);
                }

                const updatedFruits = [...prevFruits];
                updatedFruits[fruitIndex] = {
                    ...updatedFruits[fruitIndex],
                    yPosition: currentY,
                    initialActualY: currentY
                };
                return updatedFruits;
            });
        }, FALL_INTERVAL_MS);

        fruitFallIntervals.set(newFruitId, interval);
    }, [playActionsCount]);

    const createParticles = useCallback((x, y) => {
        const newParticles = [];
        for (let i = 0; i < 6; i++) {
            const pId = Date.now() + i + Math.random();
            const anim = new Animated.Value(0);
            newParticles.push({ id: pId, x, y, anim });

            Animated.timing(anim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }).start(() => {
                setParticles(prev => prev.filter(p => p.id !== pId));
            });
        }
        setParticles(prev => [...prev, ...newParticles]);
    }, []);

    const catchFruit = useCallback((fruitId, x, y) => {
        if (showSpecialEvent) return;

        const intervalId = fruitFallIntervals.get(fruitId);
        if (intervalId) {
            clearInterval(intervalId);
            fruitFallIntervals.delete(fruitId);
        }

        setFruits(prev => prev.map(f => {
            if (f.id === fruitId) {
                // Animate to bucket
                Animated.parallel([
                    Animated.timing(f.catchAnimation, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                        easing: Easing.out(Easing.back(1)),
                    }),
                    Animated.timing(f.catchX, {
                        toValue: BUCKET_X + BUCKET_SIZE / 2 - f.initialActualX,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(f.catchY, {
                        toValue: BUCKET_YCenter - f.initialActualY,
                        duration: 600,
                        useNativeDriver: true,
                    })
                ]).start(() => {
                    setFruits(current => current.filter(item => item.id !== fruitId));
                });
                return { ...f, isCaught: true };
            }
            return f;
        }));

        if (eatSound.current) {
            eatSound.current.stop(() => eatSound.current.play());
        }

        createParticles(x, y);

        setPlayActionsCount(prev => {
            const newVal = prev + 1;
            if (onCoinUpdate) onCoinUpdate(COINS_PER_FRUIT_CATCH);
            setCurrentCoins(c => c + COINS_PER_FRUIT_CATCH);

            if (newVal >= MAX_PLAY_ACTIONS) {
                onPlayFinished();
            }
            return newVal;
        });

        setCaughtFruitsCount(prev => {
            const newVal = prev + 1;
            if (newVal % FRUITS_FOR_SPECIAL_EVENT === 0) {
                triggerSpecialEvent();
            }
            return newVal;
        });

        // Shake the tree a bit when fruit is picked
        Animated.sequence([
            Animated.timing(treeShakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
            Animated.timing(treeShakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
            Animated.timing(treeShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();

    }, [showSpecialEvent, onCoinUpdate, onPlayFinished, createParticles]);

    const triggerSpecialEvent = () => {
        setShowSpecialEvent(true);
        if (specialEventSound.current) {
            specialEventSound.current.play();
        }
        setTimeout(() => {
            setShowSpecialEvent(false);
            if (specialEventSound.current) specialEventSound.current.stop();
        }, 3000);
    };

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <Image
                source={require('./jungle.png')}
                style={styles.background}
                resizeMode="cover"
            />

            <View style={styles.gameArea}>
                <View style={styles.header}>
                    <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.currencyPill}>
                        <Icon name="cash" size={24} color="#FFF" />
                        <Text style={styles.currencyText}>{currentCoins.toLocaleString()}</Text>
                    </LinearGradient>
                </View>

                {/* <View style={styles.treeContainer}>
                    {/* Base tree trunk */}
                {/* <Image
                        source={selectedCharacter?.image || require('../GAMER/Assets/tree.png')}
                        style={styles.treeImage}
                        resizeMode="contain"
                    /> */}
                {/* Foliage overlays from TreeFeedScreen */}
                {/* <Image
                        source={require('../GAMER/Assets/tree_foliage_green_overlay2.png')}
                        style={styles.foliageOverlay}
                        resizeMode="contain"
                    />
                </View> */}

                {fruits.map(fruit => (
                    <Animated.View
                        key={fruit.id}
                        style={[
                            styles.fruitAnimatedWrapper,
                            {
                                left: fruit.initialX - FRUIT_TAP_PADDING,
                                top: fruit.yPosition - FRUIT_TAP_PADDING,
                                opacity: fruit.isCaught ? fruit.catchAnimation.interpolate({
                                    inputRange: [0, 0.8, 1],
                                    outputRange: [1, 1, 0]
                                }) : 1,
                                transform: [
                                    { translateX: fruit.catchX },
                                    { translateY: fruit.catchY },
                                    {
                                        scale: fruit.isCaught ? fruit.catchAnimation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [1, 0.5]
                                        }) : 1
                                    }
                                ]
                            }
                        ]}
                    >
                        <TouchableOpacity
                            onPress={() => catchFruit(fruit.id, fruit.initialX, fruit.yPosition)}
                            activeOpacity={0.7}
                            style={styles.fruitTouchable}
                            disabled={fruit.isCaught}
                        >
                            <Text style={styles.fruitText}>{fruit.type}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                ))}

                {particles.map(p => (
                    <Animated.Text
                        key={p.id}
                        style={[
                            styles.particle,
                            {
                                left: p.x,
                                top: p.y,
                                opacity: p.anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                                transform: [
                                    { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -100] }) },
                                    { scale: p.anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) }
                                ]
                            }
                        ]}
                    >
                        ⭐
                    </Animated.Text>
                ))}

                {/* Fruit Collection Tokri - Traditional Woven Basket */}
                <View style={styles.bucketContainer}>
                    <LinearGradient
                        colors={['#D7B172', '#A67C52']}
                        style={styles.tokriBody}
                    >
                        {/* Woven Pattern Grid */}
                        <View style={styles.wovenGrid}>
                            {[...Array(6)].map((_, i) => (
                                <View key={`h-${i}`} style={[styles.wovenLineH, { top: `${i * 20}%` }]} />
                            ))}
                            {[...Array(8)].map((_, i) => (
                                <View key={`v-${i}`} style={[styles.wovenLineV, { left: `${i * 14}%` }]} />
                            ))}
                        </View>
                        <View style={styles.tokriRim} />
                        <Icon name="basket-outline" size={30} color="rgba(0,0,0,0.15)" />
                    </LinearGradient>
                    <Text style={styles.bucketLabel}>GATHER FRUITS</Text>
                </View>

                {showIntro && (
                    <View style={styles.introOverlay}>
                        <LinearGradient
                            colors={['rgba(0,0,0,0.8)', 'rgba(27, 94, 32, 0.9)']}
                            style={styles.introContent}
                        >
                            <View style={styles.introIconContainer}>
                                <Icon name="gesture-tap" size={60} color="#FFD700" />
                                <Icon name="basket-fill" size={80} color="#D7B172" style={styles.introBasketIcon} />
                            </View>

                            <Text style={styles.introTitle}>Harvest Time!</Text>
                            <Text style={styles.introSubtitle}>Tap the falling fruits to gather them in your tokri.</Text>

                            <TouchableOpacity
                                style={styles.startButton}
                                onPress={() => setShowIntro(false)}
                            >
                                <LinearGradient
                                    colors={['#4CAF50', '#2E7D32']}
                                    style={styles.startButtonGradient}
                                >
                                    <Text style={styles.startButtonText}>START HARVEST</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                )}

                {showSpecialEvent && (
                    <View style={styles.specialEventContainer}>
                        <Image source={require('./we-won-1-unscreen.gif')} style={styles.winGif} resizeMode="contain" />
                        <Text style={styles.specialEventText}>Bumper Harvest!</Text>
                    </View>
                )}

                <View style={styles.footer}>
                    <Text style={styles.progressText}>Fruits Collected: {playActionsCount}/{MAX_PLAY_ACTIONS}</Text>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${(playActionsCount / MAX_PLAY_ACTIONS) * 100}%` }]} />
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1B5E20',
    },
    background: {
        ...StyleSheet.absoluteFillObject,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    gameArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 40,
    },
    currencyPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 5,
        borderWidth: 1,
        borderColor: '#fff',
    },
    currencyText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    treeContainer: {
        position: 'absolute',
        bottom: 0,
        alignSelf: 'center',
        width: TREE_WIDTH,
        height: TREE_HEIGHT,
        justifyContent: 'flex-end',
    },
    treeImage: {
        width: '100%',
        height: '100%',
    },
    fruitAnimatedWrapper: {
        position: 'absolute',
        zIndex: 100,
    },
    fruitTouchable: {
        width: FRUIT_HIT_AREA_SIZE,
        height: FRUIT_HIT_AREA_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fruitText: {
        fontSize: FRUIT_FONT_SIZE,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    particle: {
        position: 'absolute',
        fontSize: 20,
        zIndex: 100,
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        width: '100%',
        alignItems: 'center',
    },
    progressText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    progressBarBg: {
        width: '80%',
        height: 15,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#fff',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
    },
    bucketContainer: {
        position: 'absolute',
        bottom: BUCKET_MARGIN_BOTTOM,
        alignSelf: 'center',
        alignItems: 'center',
        zIndex: 50,
    },
    tokriBody: {
        width: BUCKET_SIZE,
        height: BUCKET_SIZE_H,
        backgroundColor: '#D7B172',
        borderBottomLeftRadius: 50,
        borderBottomRightRadius: 50,
        borderTopLeftRadius: 5,
        borderTopRightRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#8D6E63',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        overflow: 'hidden',
        // Creating the "tokri" tapered look
        transform: [{ scaleX: 1.1 }],
    },
    tokriRim: {
        position: 'absolute',
        top: 0,
        width: '120%',
        height: 12,
        backgroundColor: '#A67C52',
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#8D6E63',
        zIndex: 10,
    },
    wovenGrid: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.3,
    },
    wovenLineH: {
        position: 'absolute',
        width: '100%',
        height: 1,
        backgroundColor: '#5D4037',
    },
    wovenLineV: {
        position: 'absolute',
        height: '100%',
        width: 1,
        backgroundColor: '#5D4037',
    },
    bucketLabel: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '900',
        marginTop: 10,
        letterSpacing: 2,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        backgroundColor: '#5D4037',
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#D7B172',
    },
    foliageOverlay: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        zIndex: 2,
    },
    specialEventContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200,
    },
    winGif: {
        width: 250,
        height: 250,
    },
    specialEventText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FFD700',
        marginTop: 20,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 10,
    },
    introOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    introContent: {
        width: '85%',
        padding: 30,
        borderRadius: 30,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFD700',
    },
    introIconContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 20,
    },
    introBasketIcon: {
        marginLeft: -10,
    },
    introTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 10,
        textAlign: 'center',
    },
    introSubtitle: {
        fontSize: 18,
        color: '#E0E0E0',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24,
    },
    startButton: {
        width: '100%',
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        elevation: 5,
    },
    startButtonGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    startButtonText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        letterSpacing: 1,
    }
});

export default TreePlayScreen;
