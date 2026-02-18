// TreeFeedScreen.js (No changes from previous step's final version)
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    Animated,
    Alert,
    PanResponder
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const WATER_REWARD_PER_UNIT = 10;
const MAX_FEED_PROGRESS = 5; // Max watering stages for the tree
const LEAF_TRANSITION_DURATION = 800;

const KEY_CHARACTER_FEED_PROGRESS_PREFIX = 'pet_char_feed_progress_';

const TreeFeedScreen = ({
    onBack,
    onFeedLevelCompleted,
    onCoinEarned, // Renamed from onCoinDeduction
    coins,
    selectedCharacter,
    initialFeedProgress = 0,
}) => {
    const [currentFeedProgress, setCurrentFeedProgress] = useState(initialFeedProgress);
    const foliageOpacity = useRef(new Animated.Value(0)).current;
    const [particles, setParticles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);

    // Ref to hold the latest handleWaterTree function for PanResponder
    const handleWaterTreeRef = useRef(() => { });

    // Watering can position and animation
    const canPosition = useRef(new Animated.ValueXY({ x: width * 0.1, y: height * 0.75 })).current;
    const canRotation = useRef(new Animated.Value(0)).current;
    const canScale = useRef(new Animated.Value(1)).current;

    // Ref for continuous watering
    const wateringInterval = useRef(null);
    const isWateringRef = useRef(false);

    const characterImageSource = selectedCharacter?.image || require('./tree.png');

    // Tree position for collision detection - MAXIMIZED for ease of use
    // Releasing ANYWHERE in the top 70% of screen triggers sprinkling
    // "Lift to sprinkle" metaphor
    const treeZone = {
        x: 0,
        y: 0,
        width: width, // Full width
        height: height * 0.7, // Top 70%
    };

    // Add a listener to log changes in foliageOpacity (for debugging, can remove later)
    useEffect(() => {
        const listenerId = foliageOpacity.addListener(({ value }) => {
            console.log('TreeFeedScreen Opacity - Green:', value.toFixed(2), 'Dry:', (1 - value).toFixed(2));
        });
        return () => foliageOpacity.removeListener(listenerId);
    }, [foliageOpacity]);


    useEffect(() => {
        console.log('TreeFeedScreen: initialFeedProgress received:', initialFeedProgress);
        setCurrentFeedProgress(initialFeedProgress);
        const targetOpacity = initialFeedProgress / MAX_FEED_PROGRESS;
        foliageOpacity.setValue(targetOpacity);
        console.log('TreeFeedScreen: Setting foliageOpacity to:', targetOpacity, 'from progress:', initialFeedProgress, '/', MAX_FEED_PROGRESS);
    }, [initialFeedProgress, foliageOpacity]);

    // PanResponder for dragging the watering can
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                setIsDragging(true);
                // Scale up the can when picked up
                Animated.spring(canScale, {
                    toValue: 1.2,
                    useNativeDriver: true,
                }).start();
            },
            onPanResponderMove: (evt, gestureState) => {
                canPosition.setValue({
                    x: gestureState.moveX - 70, // Shifted LEFT to center it better on finger (was -40)
                    y: gestureState.moveY - 90, // Keep Y offset for visibility
                });

                // Check if over tree - "Lift to sprinkle" logic
                const y = evt.nativeEvent.pageY || gestureState.moveY;
                const isOverTree = y <= treeZone.height;

                if (isOverTree) {
                    Animated.spring(canRotation, {
                        toValue: -30,
                        useNativeDriver: true,
                    }).start();

                    // CONTINUOUS WATERING
                    if (!isWateringRef.current) {
                        isWateringRef.current = true;
                        // Water immediately (suppress alerts)
                        handleWaterTreeRef.current(true).then(success => {
                            if (!success) {
                                isWateringRef.current = false;
                            }
                        });

                        // Then water every 800ms
                        wateringInterval.current = setInterval(async () => {
                            // Check if still dragging? Yes because interval cleared on stop
                            const success = await handleWaterTreeRef.current(true);
                            if (!success) {
                                clearInterval(wateringInterval.current);
                                isWateringRef.current = false;
                            }
                        }, 800);
                    }

                } else {
                    Animated.spring(canRotation, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();

                    // STOP WATERING
                    if (isWateringRef.current) {
                        isWateringRef.current = false;
                        if (wateringInterval.current) clearInterval(wateringInterval.current);
                    }
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                setIsDragging(false);

                // Stop watering on release
                if (isWateringRef.current) {
                    isWateringRef.current = false;
                    if (wateringInterval.current) clearInterval(wateringInterval.current);
                }

                // Reset can position and rotation
                Animated.parallel([
                    Animated.spring(canPosition, {
                        toValue: { x: width * 0.1, y: height * 0.75 },
                        useNativeDriver: true,
                    }),
                    Animated.spring(canRotation, {
                        toValue: 0,
                        useNativeDriver: true,
                    }),
                    Animated.spring(canScale, {
                        toValue: 1,
                        useNativeDriver: true,
                    }),
                ]).start();
            },
        })
    ).current;


    const handleWaterTree = async (suppressAlerts = false) => {
        // if (coins < WATER_COST_PER_UNIT) { ... } // Removed

        if (currentFeedProgress >= MAX_FEED_PROGRESS) {
            if (!suppressAlerts) Alert.alert("Tree is Full!", "The tree is already fully watered.");
            return false;
        }

        if (onCoinEarned) {
            onCoinEarned(WATER_REWARD_PER_UNIT);
        }

        createParticles();

        const newProgress = currentFeedProgress + 1;
        setCurrentFeedProgress(newProgress);

        const targetOpacity = newProgress / MAX_FEED_PROGRESS;
        Animated.timing(foliageOpacity, {
            toValue: targetOpacity,
            duration: LEAF_TRANSITION_DURATION,
            useNativeDriver: true,
        }).start();


        if (newProgress === MAX_FEED_PROGRESS) {
            onFeedLevelCompleted({
                newFeedProgress: newProgress,
                feedLevelCompleted: true,
            });
        } else {
            onFeedLevelCompleted({
                newFeedProgress: newProgress,
                feedLevelCompleted: false,
            });
        }
        return true;
    };



    // Update the ref with the latest function on every render
    useEffect(() => {
        handleWaterTreeRef.current = handleWaterTree;
        // console.log('handleWaterTreeRef updated');
    });

    const createParticles = () => {
        const newParticles = [];
        for (let i = 0; i < 12; i++) {
            newParticles.push({
                id: Date.now() + i,
                x: width * 0.5 + (Math.random() - 0.5) * 100,
                y: height * 0.25 + (Math.random() - 0.5) * 80, // Particles start higher now (around tree top)
                opacity: new Animated.Value(1),
                translateY: new Animated.Value(0),
            });
        }
        setParticles(newParticles);

        newParticles.forEach(p => {
            Animated.parallel([
                Animated.timing(p.opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
                Animated.timing(p.translateY, { toValue: -50, duration: 1000, useNativeDriver: true }),
            ]).start(() => {
                setParticles(prev => prev.filter(particle => particle.id !== p.id));
            });
        });
    };




    return (
        <LinearGradient colors={['#a18cd1', '#fbc2eb']} style={styles.container}>

            <View style={styles.header}>
                <Text style={styles.screenTitle}>{selectedCharacter?.name}'s Garden</Text>
                <View style={styles.currencyPill}>
                    <Icon name="cash" size={24} color="#FFD700" />
                    <Text style={styles.currencyText}>{coins.toLocaleString()}</Text>
                </View>
            </View>

            {/* DEBUG: Reset Button - Remove this in production */}
            <TouchableOpacity
                style={styles.debugResetButton}
                onPress={async () => {
                    setCurrentFeedProgress(0);
                    foliageOpacity.setValue(0);
                    await AsyncStorage.setItem(`${KEY_CHARACTER_FEED_PROGRESS_PREFIX}${selectedCharacter.id}`, '0');
                    console.log('DEBUG: Reset tree progress to 0');
                    Alert.alert("Reset", "Tree progress reset to 0 (dry state)");
                }}
            >
                <Text style={styles.debugResetText}>🔄 Reset (Debug)</Text>
            </TouchableOpacity>

            <View style={styles.gameArea}>
                {/* Base tree trunk - always visible */}
                <Image
                    source={characterImageSource}
                    style={styles.characterImage}
                    resizeMode="contain"
                />

                {/* Dry foliage overlay - fades out as tree gets watered */}
                <Animated.Image
                    source={require('./tree_foliage_dry_overlay1.png')}
                    style={[styles.foliageOverlay, {
                        opacity: foliageOpacity.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0]  // When foliageOpacity is 0, dry is 1 (visible). When foliageOpacity is 1, dry is 0 (invisible)
                        })
                    }]}
                    resizeMode="contain"
                />

                {/* Green foliage overlay - fades in as tree gets watered */}
                <Animated.Image
                    source={require('./tree_foliage_green_overlay2.png')}
                    style={[styles.foliageOverlay, { opacity: foliageOpacity }]}
                    resizeMode="contain"
                />

                {/* Water particles */}
                {particles.map((p) => (
                    <Animated.Text
                        key={p.id}
                        style={[
                            styles.particle,
                            { left: p.x, top: p.y, opacity: p.opacity, transform: [{ translateY: p.translateY }] }
                        ]}
                    >
                        💧
                    </Animated.Text>
                ))}
            </View>

            {/* Draggable Watering Can */}
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.wateringCan,
                    {
                        transform: [
                            { translateX: canPosition.x },
                            { translateY: canPosition.y },
                            {
                                rotate: canRotation.interpolate({
                                    inputRange: [-30, 0],
                                    outputRange: ['-30deg', '0deg']
                                })
                            },
                            { scale: canScale }
                        ]
                    }
                ]}
            >
                <LinearGradient
                    colors={['#3498db', '#2980b9']}
                    style={styles.wateringCanGradient}
                >
                    <Icon name="watering-can" size={50} color="#fff" />
                </LinearGradient>
            </Animated.View>

            {/* Instructions */}
            <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsText}>
                    🚿 Drag can over the tree to sprinkle!
                </Text>
                <Text style={styles.costText}>
                    Earn: {WATER_REWARD_PER_UNIT} <Icon name="cash" size={14} color="#FFD700" /> per water
                </Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBarContainer}>
                    <Text style={styles.progressLabel}>Tree Health</Text>
                    <View style={styles.progressBarBackground}>
                        <View style={[styles.progressBarFill, { width: `${(currentFeedProgress / MAX_FEED_PROGRESS) * 100}%` }]} />
                    </View>
                    <Text style={styles.progressValue}>{currentFeedProgress}/{MAX_FEED_PROGRESS}</Text>
                </View>
            </View>
        </LinearGradient >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '90%',
        marginTop: 20,
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    currencyPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
    },
    currencyText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 5,
        fontSize: 18,
    },
    gameArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    characterImage: {
        width: width * 0.7,
        height: height * 0.5,
        position: 'absolute',
        bottom: height * 0.3, // Moved UP significantly (from 0.05 to 0.30)
        zIndex: 1, // Base image, lower zIndex
    },
    foliageOverlay: {
        width: width * 0.7, // Match character image width
        height: height * 0.5, // Match character image height
        position: 'absolute',
        bottom: height * 0.3, // Match character image bottom (Moved UP)
        zIndex: 2,
    }, // Added missing closing brace and comma
    wateringCan: {
        position: 'absolute',
        width: 80,
        height: 80,
        zIndex: 1000,
    },
    wateringCanGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        borderWidth: 3,
        borderColor: '#fff',
    },
    instructionsContainer: {
        position: 'absolute',
        bottom: 120,
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        elevation: 5,
        alignItems: 'center',
    },
    instructionsText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 5,
        textAlign: 'center',
    },
    costText: {
        fontSize: 14,
        color: '#7f8c8d',
        fontWeight: '600',
    },
    progressContainer: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 25,
        paddingVertical: 15,
        borderRadius: 20,
        elevation: 5,
    },
    progressBarContainer: {
        alignItems: 'center',
    },
    progressLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#34495e',
        marginBottom: 8,
    },
    progressBarBackground: {
        width: 150,
        height: 12,
        backgroundColor: '#ecf0f1',
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#bdc3c7',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#27ae60',
        borderRadius: 4,
    },
    progressValue: {
        fontSize: 13,
        color: '#34495e',
        marginTop: 5,
        fontWeight: 'bold',
    },
    particle: {
        position: 'absolute',
        fontSize: 20,
        zIndex: 1000,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    debugResetButton: {
        position: 'absolute',
        top: 100,
        right: 20,
        backgroundColor: '#e74c3c',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
        zIndex: 100,
        elevation: 5,
    },
    debugResetText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    }
});

export default TreeFeedScreen;