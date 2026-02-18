import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    TouchableOpacity,
    StatusBar,
    Image,
    Easing,
    BackHandler,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import Sound from 'react-native-sound';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FIREFLY_COUNT = 20;

const TreeSleepScreen = ({ onBack, onSleepFinished, selectedCharacter }) => {
    const [isSleeping, setIsSleeping] = useState(false);
    const [sleepProgress, setSleepProgress] = useState(0);
    const [flies, setFlies] = useState([]);
    const [isFullyRested, setIsFullyRested] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const zzzAnim = useRef(new Animated.Value(0)).current;

    const fireflyAnims = useRef([...Array(FIREFLY_COUNT)].map(() => ({
        x: new Animated.Value(Math.random() * SCREEN_WIDTH),
        y: new Animated.Value(Math.random() * SCREEN_HEIGHT),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(Math.random() * 0.5 + 0.5)
    }))).current;

    const bgSound = useRef(null);
    const flySound = useRef(null);
    const shooSound = useRef(null);

    // useEffect(() => {
    //     Animated.timing(fadeAnim, {
    //         toValue: 1,
    //         duration: 1000,
    //         useNativeDriver: true,
    //     }).start();

    //     bgSound.current = new Sound(require('../GAMER/Assets/birds.mp3'), (error) => {
    //         if (!error) {
    //             bgSound.current.setNumberOfLoops(-1);
    //             bgSound.current.setVolume(0.2);
    //         }
    //     });

    //     flySound.current = new Sound(require('../GAMER/Assets/bachao.mp3'), (error) => {
    //         if (error) console.warn('Failed to load fly sound', error);
    //     });

    //     shooSound.current = new Sound(require('../GAMER/Assets/click.mp3'), (error) => {
    //         if (error) console.warn('Failed to load shoo sound', error);
    //     });

    //     const animateFirefly = (anim) => {
    //         const duration = 4000 + Math.random() * 6000;
    //         Animated.parallel([
    //             Animated.timing(anim.x, {
    //                 toValue: Math.random() * SCREEN_WIDTH,
    //                 duration: duration,
    //                 easing: Easing.inOut(Easing.sin),
    //                 useNativeDriver: true,
    //             }),
    //             Animated.timing(anim.y, {
    //                 toValue: Math.random() * SCREEN_HEIGHT,
    //                 duration: duration,
    //                 easing: Easing.inOut(Easing.sin),
    //                 useNativeDriver: true,
    //             }),
    //             Animated.sequence([
    //                 Animated.timing(anim.opacity, {
    //                     toValue: Math.random() * 0.8 + 0.2,
    //                     duration: duration / 2,
    //                     useNativeDriver: true,
    //                 }),
    //                 Animated.timing(anim.opacity, {
    //                     toValue: 0,
    //                     duration: duration / 2,
    //                     useNativeDriver: true,
    //                 })
    //             ])
    //         ]).start(() => animateFirefly(anim));
    //     };

    //     fireflyAnims.forEach(anim => animateFirefly(anim));

    //     return () => {
    //         if (bgSound.current) {
    //             bgSound.current.stop();
    //             bgSound.current.release();
    //         }
    //         if (flySound.current) flySound.current.release();
    //         if (shooSound.current) shooSound.current.release();
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
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [onBack]);

    useEffect(() => {
        let interval;
        if (isSleeping && flies.length === 0) {
            bgSound.current && bgSound.current.play();

            const animateZzz = () => {
                zzzAnim.setValue(0);
                Animated.timing(zzzAnim, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }).start(() => {
                    if (isSleeping && flies.length === 0) animateZzz();
                });
            };
            animateZzz();

            interval = setInterval(() => {
                setSleepProgress(prev => {
                    const next = prev + 0.05;
                    if (next >= 1) {
                        clearInterval(interval);
                        setIsFullyRested(true);
                        setTimeout(() => onSleepFinished && onSleepFinished(), 1500);
                        return 1;
                    }
                    return next;
                });
            }, 1000);
        } else {
            bgSound.current && bgSound.current.pause();
        }
        return () => {
            clearInterval(interval);
            zzzAnim.stopAnimation();
        };
    }, [isSleeping, flies.length]);

    const spawnFlies = () => {
        const newFlies = [...Array(6)].map((_, i) => ({
            id: Date.now() + i,
            x: (Math.random() * (SCREEN_WIDTH * 0.6)) + (SCREEN_WIDTH * 0.2),
            y: (Math.random() * (SCREEN_HEIGHT * 0.3)) + (SCREEN_HEIGHT * 0.25),
            anim: new Animated.Value(0),
            hover: new Animated.Value(0),
        }));
        setFlies(newFlies);

        // Start hover animations
        newFlies.forEach(f => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(f.hover, { toValue: 1, duration: 200 + Math.random() * 300, useNativeDriver: true }),
                    Animated.timing(f.hover, { toValue: 0, duration: 200 + Math.random() * 300, useNativeDriver: true }),
                ])
            ).start();
        });

        if (flySound.current) flySound.current.play();
    };

    const shooFly = (id) => {
        const fly = flies.find(f => f.id === id);
        if (!fly) return;

        if (shooSound.current) {
            shooSound.current.stop();
            shooSound.current.play();
        }

        Animated.parallel([
            Animated.timing(fly.anim, {
                toValue: 1,
                duration: 600,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            })
        ]).start(() => {
            setFlies(prev => prev.filter(f => f.id !== id));
        });
    };

    const toggleSleep = () => {
        const newSleeping = !isSleeping;
        setIsSleeping(newSleeping);
        if (newSleeping) {
            spawnFlies();
        } else {
            setFlies([]);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <LinearGradient
                colors={isSleeping ? ['#050510', '#1a1a2e', '#16213e'] : ['#4facfe', '#00f2fe']}
                style={styles.background}
            >
                {/* Celestial Body */}
                <View style={[styles.celestial, {
                    backgroundColor: isSleeping ? '#fdfcf0' : '#FFD700',
                    shadowColor: isSleeping ? '#FFF' : '#FF0',
                    shadowRadius: 30,
                    shadowOpacity: 0.8,
                    top: 100,
                    right: 50,
                }]} />

                {/* Star Field Effect (Subtle) */}
                {isSleeping && [...Array(30)].map((_, i) => (
                    <View key={i} style={[styles.star, {
                        top: Math.random() * SCREEN_HEIGHT,
                        left: Math.random() * SCREEN_WIDTH,
                        opacity: Math.random() * 0.5 + 0.3
                    }]} />
                ))}

                {/* Fireflies - Only when flies are gone */}
                {isSleeping && flies.length === 0 && fireflyAnims.map((anim, i) => (
                    <Animated.View
                        key={i}
                        style={[
                            styles.firefly,
                            {
                                transform: [
                                    { translateX: anim.x },
                                    { translateY: anim.y },
                                    { scale: anim.scale }
                                ],
                                opacity: anim.opacity
                            }
                        ]}
                    />
                ))}

                {/* Annoying Houseflies */}
                {isSleeping && flies.map((fly) => (
                    <Animated.View
                        key={fly.id}
                        style={[
                            styles.houseflyContainer,
                            {
                                left: fly.x,
                                top: fly.y,
                                opacity: fly.anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                                transform: [
                                    { translateY: fly.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -300] }) },
                                    { translateX: fly.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.random() > 0.5 ? 200 : -200] }) },
                                    { translateY: fly.hover.interpolate({ inputRange: [0, 1], outputRange: [-5, 5] }) }
                                ]
                            }
                        ]}
                    >
                        <TouchableOpacity onPress={() => shooFly(fly.id)} activeOpacity={0.6}>
                            <View style={styles.housefly}>
                                <View style={styles.flyWingL} />
                                <View style={styles.flyWingR} />
                                <View style={styles.flyBody} />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                ))}

                <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                    <View style={styles.header}>

                        <View style={styles.glassScoreCard}>
                            <View style={styles.progressBarBg}>
                                <Animated.View style={[styles.progressBarFill, { width: `${sleepProgress * 100}%` }]} />
                            </View>
                            <Text style={styles.progressLabel}>
                                {flies.length > 0 ? `Bugs Bothering: ${flies.length}` : (isFullyRested ? "Fully Rested!" : `Resting... ${Math.floor(sleepProgress * 100)}%`)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.treeSection}>
                        <Animated.Image
                            source={(isSleeping && flies.length === 0) ? selectedCharacter.sleepImageClosed : selectedCharacter.sleepImageOpen}
                            style={[styles.treeImage, {
                                transform: [{ scale: (isSleeping && flies.length === 0) ? 1 : 1.05 }]
                            }]}
                            resizeMode="contain"
                        />
                        {isSleeping && flies.length === 0 && (
                            <Animated.View style={[styles.zzzContainer, {
                                transform: [
                                    { translateY: zzzAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -100] }) },
                                    { translateX: zzzAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) },
                                    { scale: zzzAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }
                                ],
                                opacity: zzzAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, 1, 0] })
                            }]}>
                                <Text style={styles.zzzText}>Zzz...</Text>
                            </Animated.View>
                        )}
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            onPress={toggleSleep}
                            style={[styles.sleepToggle, isSleeping && styles.sleepToggleActive]}
                        >
                            <LinearGradient
                                colors={isSleeping ? ['#536976', '#292E49'] : ['#f12711', '#f5af19']}
                                style={styles.toggleGradient}
                            >
                                <Icon
                                    name={isSleeping ? "lamp" : "lamp-outline"}
                                    size={40}
                                    color="#FFF"
                                />
                                <Text style={styles.toggleText}>
                                    {isSleeping ? "Turn On Light" : "Turn Off Light"}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        flex: 1,
    },
    celestial: {
        position: 'absolute',
        width: 70,
        height: 70,
        borderRadius: 35,
        elevation: 20,
    },
    star: {
        position: 'absolute',
        width: 2,
        height: 2,
        backgroundColor: '#FFF',
        borderRadius: 1,
    },
    firefly: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#f9f984',
        shadowColor: '#f9f984',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 5,
    },
    content: {
        flex: 1,
    },
    header: {
        paddingTop: 50,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        justifyContent: 'space-between',
    },
    glassScoreCard: {
        flex: 1,
        marginLeft: 15,
        backgroundColor: 'rgba(255,255,255,0.15)',
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4facfe',
    },
    progressLabel: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 5,
        textAlign: 'center',
    },
    treeSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    treeImage: {
        width: SCREEN_WIDTH * 0.85,
        height: SCREEN_HEIGHT * 0.5,
    },
    zzzContainer: {
        position: 'absolute',
        top: '30%',
        right: '20%',
    },
    zzzText: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
        opacity: 0.8,
    },
    footer: {
        paddingBottom: 60,
        alignItems: 'center',
    },
    sleepToggle: {
        width: '70%',
        height: 70,
        borderRadius: 35,
        overflow: 'hidden',
        elevation: 10,
    },
    toggleGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    toggleText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    houseflyContainer: {
        position: 'absolute',
        zIndex: 100,
    },
    housefly: {
        width: 30,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    flyBody: {
        width: 10,
        height: 12,
        backgroundColor: '#333',
        borderRadius: 5,
    },
    flyWingL: {
        position: 'absolute',
        left: 2,
        top: 2,
        width: 12,
        height: 8,
        backgroundColor: 'rgba(200,200,200,0.6)',
        borderRadius: 5,
        transform: [{ rotate: '-45deg' }],
    },
    flyWingR: {
        position: 'absolute',
        right: 2,
        top: 2,
        width: 12,
        height: 8,
        backgroundColor: 'rgba(200,200,200,0.6)',
        borderRadius: 5,
        transform: [{ rotate: '45deg' }],
    }
});

export default TreeSleepScreen;
