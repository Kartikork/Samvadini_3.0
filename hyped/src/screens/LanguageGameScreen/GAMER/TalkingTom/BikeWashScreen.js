import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Image,
    Animated,
    PanResponder,
    Alert,
    Easing,
    BackHandler // Import BackHandler
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

const BIKE_CLEAN_IMAGE = require('./only_bike.png'); // This is your clean bike image

// Define specific colors for dirt and foam for consistency
const DIRT_COLOR = 'rgba(100, 70, 30, 0.7)'; // Brown with 70% opacity
const FOAM_COLOR = 'rgba(255, 255, 255, 0.9)'; // White with 90% opacity (more solid for foam)
const FOAM_BORDER_COLOR = 'rgba(255, 255, 255, 0.6)'; // White border for foam

// --- MiniGameIntro Component (adapted from your BathroomScreen) ---
const MiniGameIntro = React.memo(({ visible, type, onStart, onClose }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;

    const handMove = useRef(new Animated.Value(0)).current;
    const itemOpacity = useRef(new Animated.Value(0)).current;
    const loopAnimation = useRef(null); // Ref for the loop animation

    useEffect(() => {
        if (visible) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 5,
                tension: 40,
                useNativeDriver: true
            }).start();

            // Start the tutorial loop and store the animation reference
            loopAnimation.current = startTutorialLoop();
        } else {
            scaleAnim.setValue(0);
            handMove.setValue(0);
            itemOpacity.setValue(0);
            // Stop the animation if it's running when the intro becomes invisible
            if (loopAnimation.current) {
                loopAnimation.current.stop();
                loopAnimation.current = null; // Clear the reference
            }
        }
        // Cleanup function for when the component unmounts or `visible` changes
        return () => {
            if (loopAnimation.current) {
                loopAnimation.current.stop();
                loopAnimation.current = null;
            }
        };
    }, [visible, type]); // Dependencies for useEffect

    const startTutorialLoop = () => {
        // Bike wash specific tutorial loop
        const anim = Animated.loop(
            Animated.sequence([
                // Simulate dragging foam tool
                Animated.timing(handMove, { toValue: 60, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(itemOpacity, { toValue: 1, duration: 200, useNativeDriver: true }), // Show foam/dirt changing
                Animated.timing(handMove, { toValue: -60, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(itemOpacity, { toValue: 0.5, duration: 200, useNativeDriver: true }), // Less intense
            ])
        );
        anim.start();
        return anim; // Return the animation instance
    };

    if (!visible) return null;

    // Configuration for the Bike Wash Intro
    const config = {
        title: "Bike Wash",
        color: ['#00b894', '#00cec9'], // Green/Cyan gradient for bike wash
        icon: "bike", // A bike icon
        instruction: "Drag tools to clean the bike!"
    };

    return (
        <View style={introStyles.introOverlay}>
            <Animated.View style={[introStyles.introCard, { transform: [{ scale: scaleAnim }] }]}>

                <LinearGradient colors={config.color} style={introStyles.introHeader}>
                    <Icon name={config.icon} size={40} color="#fff" />
                    <Text style={introStyles.introTitle}>{config.title}</Text>
                    <TouchableOpacity style={introStyles.introCloseBtn} onPress={onClose}>
                        <Icon name="close-circle" size={30} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                </LinearGradient>

                <View style={introStyles.demoContainer}>

                    <View style={[introStyles.demoCircle, { borderColor: config.color[0] }]}>

                        {/* Tutorial for dragging foam/water tool */}
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="motorbike" size={60} color="#dfe6e9" /> {/* A clean bike in the demo */}

                            <Animated.View style={{
                                position: 'absolute',
                                transform: [{ translateX: handMove }]
                            }}>
                                <View style={introStyles.demoTool}>
                                    <Icon name="bottle-tonic" size={30} color="#fab1a0" /> {/* Example tool icon */}
                                </View>

                                <Icon name="hand-pointing-up" size={40} color="#2d3436" style={{ top: 10, left: 10 }} />

                                <Animated.View style={{ opacity: itemOpacity, position: 'absolute', top: -10, left: -10 }}>
                                    <Icon name="spray-bottle" size={20} color="#74b9ff" /> {/* Water/foam splash effect */}
                                </Animated.View>
                            </Animated.View>
                        </View>
                    </View>

                    <Text style={introStyles.demoInstruction}>{config.instruction}</Text>

                </View>

                <TouchableOpacity activeOpacity={0.8} onPress={onStart}>
                    <LinearGradient colors={['#2ecc71', '#27ae60']} style={introStyles.introStartBtn}>
                        <Text style={introStyles.introStartText}>WASH!</Text>
                        <Icon name="play" size={24} color="#fff" style={{ marginLeft: 10 }} />
                    </LinearGradient>
                </TouchableOpacity>

            </Animated.View>
        </View>
    );
});

// --- Intro Component Styles ---
const introStyles = StyleSheet.create({
    introOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    introCard: {
        width: width * 0.85,
        backgroundColor: '#fff',
        borderRadius: 25,
        overflow: 'hidden',
        elevation: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    introHeader: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        height: 100
    },
    introTitle: {
        color: '#fff',
        fontSize: 26,
        fontWeight: 'bold',
        marginTop: 5,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2
    },
    introCloseBtn: {
        position: 'absolute',
        top: 15,
        right: 15,
    },

    demoContainer: {
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center'
    },
    demoCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#f5f6fa',
        overflow: 'visible'
    },
    demoTool: {
        backgroundColor: '#fff',
        padding: 8,
        borderRadius: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
    },
    demoInstruction: {
        fontSize: 18,
        color: '#2d3436',
        fontWeight: 'bold',
        textAlign: 'center'
    },

    introStartBtn: {
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    introStartText: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        letterSpacing: 1.5,
    },
});

// --- Memoized Component for individual patches to prevent full re-renders ---
const BikePatch = React.memo(({ patch }) => {
    // Interpolate color and border color based on patch.colorAnim
    const backgroundColor = patch.colorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [DIRT_COLOR, FOAM_COLOR],
    });
    const borderColor = patch.colorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['transparent', FOAM_BORDER_COLOR],
    });

    // Only apply border when foamy
    const patchBorderWidth = patch.isFoamy ? 1 : 0;

    return (
        <Animated.View
            style={[
                styles.bikePatch,
                {
                    left: patch.left,
                    top: patch.top,
                    width: patch.size,
                    height: patch.size,
                    borderRadius: patch.size / 2,
                    opacity: patch.opacity,
                    zIndex: patch.zIndex,
                    backgroundColor: backgroundColor, // Use animated color
                    borderColor: borderColor,         // Use animated border color
                    borderWidth: patchBorderWidth,
                },
            ]}
        />
    );
});

// --- Utility function for generating random positions/sizes for elements ---
const generateElements = (count, minSize, maxSize, containerWidth, containerHeight, zIndex) => {
    const elements = [];
    for (let i = 0; i < count; i++) {
        const size = minSize + Math.random() * (maxSize - minSize);
        elements.push({
            id: `element-${Date.now()}-${i}-${Math.random()}`, // Unique ID
            left: Math.random() * (containerWidth - size),
            top: Math.random() * (containerHeight - size),
            size: size,
            opacity: new Animated.Value(1),     // For fading out when washed
            colorAnim: new Animated.Value(0),   // 0 for dirt (DIRT_COLOR), 1 for foam (FOAM_COLOR)
            isRemoved: false,                   // True when completely washed
            isFoamy: false,                     // True when foam is applied
            zIndex: zIndex,                     // Z-index for layering
        });
    }
    return elements;
};

// Add navigation prop here, along with other props
const BikeWashScreen = ({ onBack, onCleanFinished, coins, selectedCharacter, navigation }) => {
    const [foamProgress, setFoamProgress] = useState(0);
    const [washProgress, setWashProgress] = useState(0);
    const [currentTool, setCurrentTool] = useState('foam'); // 'foam' or 'water'

    const [isToolActive, setIsToolActive] = useState(false);
    const brushScaleAnim = useRef(new Animated.Value(1)).current; // Animation for tool feedback

    const washToolPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current; // PanResponder animated value
    const prevWashProgress = useRef(0); // To track completion and prevent re-triggering alerts

    const sparkleAnim = useRef(new Animated.Value(0)).current; // Animation for sparkle effect

    const [bikePatches, setBikePatches] = useState([]); // Array of dirt/foam patches
    const [isInitialized, setIsInitialized] = useState(false); // Flag for initial setup
    const [totalPatches, setTotalPatches] = useState(40); // Total number of patches

    const bikeContainerRef = useRef(null); // Ref to measure bike image container layout
    const [bikeContainerLayout, setBikeContainerLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });

    // Refs for latest state values in PanResponder to avoid re-creating it
    const foamProgressRef = useRef(foamProgress);
    const washProgressRef = useRef(washProgress);
    const currentToolRef = useRef(currentTool);
    const bikeContainerLayoutRef = useRef(bikeContainerLayout);
    const bikePatchesRef = useRef(bikePatches);

    // Intro state
    const [introVisible, setIntroVisible] = useState(true);

    // Update refs whenever their corresponding state changes
    useEffect(() => { foamProgressRef.current = foamProgress; }, [foamProgress]);
    useEffect(() => { washProgressRef.current = washProgress; }, [washProgress]);
    useEffect(() => { currentToolRef.current = currentTool; }, [currentTool]);
    useEffect(() => { bikeContainerLayoutRef.current = bikeContainerLayout; }, [bikeContainerLayout]);
    useEffect(() => { bikePatchesRef.current = bikePatches; }, [bikePatches]);

    // Initialize dirt patches once bike container layout is known
    useEffect(() => {
        if (bikeContainerLayout.width > 0 && !isInitialized) {
            const patches = generateElements(
                40, // Number of patches
                25, 70, // Min/Max size of patches
                bikeContainerLayout.width, bikeContainerLayout.height, // Container dimensions
                11, // Z-index
            );
            setBikePatches(patches);
            setTotalPatches(patches.length);
            setIsInitialized(true);
        }
    }, [bikeContainerLayout, isInitialized]);

    // --- BackHandler Logic ---
    useEffect(() => {
        const handleBackPress = () => {
            // If intro is visible, close it first
            if (introVisible) {
                setIntroVisible(false);
                return true; // Event handled, do not propagate further
            }

            // Otherwise, navigate to TalkingTomScreen using the navigation prop
            // Ensure 'TalkingTomScreen' matches the name of your screen in your navigator setup
            if (navigation) {
                navigation.navigate('TalkingTomScreen');
            } else {
                // Fallback: If navigation prop isn't provided, call the onBack prop
                onBack();
            }
            return true; // Event handled
        };

        // Add the event listener when the component mounts
        BackHandler.addEventListener('hardwareBackPress', handleBackPress);

        // Remove the event listener when the component unmounts
        return () => {
            BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
        };
    }, [introVisible, navigation, onBack]); // Dependencies: Re-run if these values change

    // PanResponder for drag interaction with tools
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true, // Allows component to become the responder
            onMoveShouldSetPanResponder: () => true,  // Allows component to become the responder
            onPanResponderGrant: (evt, gestureState) => {
                // Prevent interaction if intro is visible
                if (introVisible) return false;

                setIsToolActive(true);
                // Animate tool to scale up slightly for feedback
                Animated.spring(brushScaleAnim, { toValue: 1.2, useNativeDriver: true }).start();
                // Set offset to current position to make gesture relative to touch point
                washToolPan.setOffset({
                    x: washToolPan.x._value,
                    y: washToolPan.y._value
                });
                washToolPan.setValue({ x: 0, y: 0 }); // Reset current value
            },
            onPanResponderMove: (evt, gestureState) => {
                // Prevent interaction if intro is visible
                if (introVisible) return;

                // Update tool's animated position based on gesture
                washToolPan.setValue({ x: gestureState.dx, y: gestureState.dy });

                const layout = bikeContainerLayoutRef.current;
                // Calculate tool's center coordinates relative to the bike container
                const toolCenterX = gestureState.moveX - layout.x;
                const toolCenterY = gestureState.moveY - layout.y;

                const SCRUB_RADIUS = 70; // Defines how close a patch needs to be to interact

                if (currentToolRef.current === 'foam') {
                    let updated = false;
                    const currentPatches = bikePatchesRef.current;
                    const updatedPatches = currentPatches.map(p => {
                        // Skip patches that are already removed or foamy
                        if (p.isRemoved || p.isFoamy) return p;

                        // Calculate distance from tool to patch center
                        const distance = Math.sqrt(
                            Math.pow(p.left + p.size / 2 - toolCenterX, 2) +
                            Math.pow(p.top + p.size / 2 - toolCenterY, 2)
                        );
                        if (distance < SCRUB_RADIUS) {
                            // Animate color to foam
                            Animated.timing(p.colorAnim, {
                                toValue: 1, // 1 represents foamy state
                                duration: 200,
                                useNativeDriver: false, // Color animation usually needs this set to false
                            }).start();
                            updated = true;
                            return { ...p, isFoamy: true }; // Mark as foamy
                        }
                        return p;
                    });

                    if (updated) {
                        setBikePatches(updatedPatches); // Update state to trigger re-render of affected patches
                        const foamyCount = updatedPatches.filter(p => p.isFoamy).length;
                        const progress = foamyCount / totalPatches;
                        // Use a threshold close to 1 to account for potential floating point inaccuracies
                        if (progress >= 0.98) setFoamProgress(1);
                        else setFoamProgress(progress);
                    }

                } else if (currentToolRef.current === 'water') {
                    let updated = false;
                    const currentPatches = bikePatchesRef.current;
                    const updatedPatches = currentPatches.map(p => {
                        // Only remove foamy patches that haven't been removed yet
                        if (p.isRemoved || !p.isFoamy) return p;

                        const distance = Math.sqrt(
                            Math.pow(p.left + p.size / 2 - toolCenterX, 2) +
                            Math.pow(p.top + p.size / 2 - toolCenterY, 2)
                        );
                        if (distance < SCRUB_RADIUS) {
                            // Animate opacity to 0 to make patch disappear
                            Animated.timing(p.opacity, {
                                toValue: 0,
                                duration: 300,
                                useNativeDriver: true,
                            }).start();
                            updated = true;
                            return { ...p, isRemoved: true }; // Mark as removed
                        }
                        return p;
                    });

                    if (updated) {
                        setBikePatches(updatedPatches); // Update state
                        const removedCount = updatedPatches.filter(p => p.isRemoved).length;
                        const progress = removedCount / totalPatches;
                        if (progress >= 0.98) setWashProgress(1);
                        else setWashProgress(progress);
                    }
                }
            },
            onPanResponderRelease: () => {
                // Prevent interaction if intro is visible
                if (introVisible) return;

                setIsToolActive(false);
                // Animate tool back to original scale
                Animated.spring(brushScaleAnim, { toValue: 1, useNativeDriver: true }).start();
                // Snap tool back to its original position
                Animated.spring(washToolPan, {
                    toValue: { x: 0, y: 0 },
                    useNativeDriver: true,
                    bounciness: 8, // Give it a slight bounce
                    speed: 12
                }).start();
            },
        })
    ).current;

    // Callback to trigger sparkle animation
    const triggerSparkleAnimation = useCallback(() => {
        sparkleAnim.setValue(0); // Reset animation
        Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.ease,
            useNativeDriver: true,
        }).start(() => sparkleAnim.setValue(0)); // Reset after completion
    }, [sparkleAnim]); // Dependency: sparkleAnim

    // Effect to check if washing is complete
    useEffect(() => {
        const allPatchesRemoved = bikePatches.length > 0 && bikePatches.every(p => p.isRemoved);

        // Check if both foam and wash are completed, and ensure alert only fires once
        if ((washProgress >= 1 || allPatchesRemoved) && foamProgress >= 1 && prevWashProgress.current < 1) {
            triggerSparkleAnimation();
            Alert.alert("Bike Clean!", "Your Rider's bike is sparkling!", [
                {
                    text: "Awesome!", onPress: () => {
                        onCleanFinished(1); // Call the callback for game completion
                        // You can choose to navigate away here or let the parent component handle it
                        // navigation.goBack() or navigation.navigate('SomeNextScreen')
                    }
                }
            ]);
            prevWashProgress.current = 1; // Mark as completed to prevent re-triggering
        }
    }, [foamProgress, washProgress, onCleanFinished, triggerSparkleAnimation, bikePatches]);


    // Animations for water/foam flow particles
    const waterFlowAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (isToolActive && currentTool === 'water') {
            waterFlowAnim.setValue(0);
            Animated.loop(
                Animated.timing(waterFlowAnim, {
                    toValue: 1,
                    duration: 700 + Math.random() * 300, // Slightly randomized duration for natural look
                    useNativeDriver: true,
                })
            ).start();
        } else {
            waterFlowAnim.stopAnimation(); // Stop animation when tool is inactive or not water
        }
        return () => waterFlowAnim.stopAnimation(); // Cleanup on unmount
    }, [isToolActive, currentTool, waterFlowAnim]);

    // Interpolations for water/foam particle movement and opacity
    const waterTranslateY = waterFlowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-70, 70], // Vertical movement
    });

    const waterOpacity = waterFlowAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.5, 1, 0.5], // Fades in and out
    });

    // Interpolations for sparkle effect
    const sparkleOpacity = sparkleAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 1, 0], // Fades in then out
    });
    const sparkleScale = sparkleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 1.5], // Scales up
    });

    // Handler for switching to water tool, with a check for foam
    const handleWaterToolPress = () => {
        if (introVisible) return; // Prevent interaction if intro is visible

        const hasFoamyPatches = bikePatches.some(p => p.isFoamy && !p.isRemoved);
        // Only allow switching to water if there's foam to wash off, or if foam progress is already significant
        if (hasFoamyPatches || foamProgressRef.current > 0.1) {
            setCurrentTool('water');
        } else {
            Alert.alert("Apply Foam First!", "You need to apply some foam before washing with water.");
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#A9A9A9', '#808080', '#696969']}
                style={styles.backgroundGradient}
            />

            {/* Floor and light strips for visual appeal */}
            <View style={styles.floor} />
            <View style={styles.lightStrip} />
            <View style={[styles.lightStrip, { top: 120, left: 50, width: 100, transform: [{ rotate: '45deg' }] }]} />
            <View style={[styles.lightStrip, { top: 150, right: 30, width: 80, transform: [{ rotate: '-30deg' }] }]} />

            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Icon name="arrow-left" size={30} color="#fff" />
            </TouchableOpacity>

            {/* Header with Title and Currency */}
            <View style={styles.header}>
                <Text style={styles.title}>Wash the Bike!</Text>
                <LinearGradient colors={['#ffd89b', '#19547b']} style={styles.currencyPill}>
                    <Icon name="cash" size={20} color="#FFD700" />
                    <Text style={styles.currencyText}>{coins.toLocaleString()}</Text>
                </LinearGradient>
            </View>

            {/* Bike Container for placing dirt patches */}
            <View
                ref={bikeContainerRef}
                onLayout={(event) => setBikeContainerLayout(event.nativeEvent.layout)}
                style={styles.bikeContainer}
            >
                <Image
                    source={BIKE_CLEAN_IMAGE}
                    style={styles.bikeImage}
                    resizeMode="contain"
                />

                {/* Render the dirt/foam patches */}
                {bikePatches.map((patch) => (
                    <BikePatch key={patch.id} patch={patch} />
                ))}

                {/* Sparkle effect when clean */}
                {washProgress >= 1 && foamProgress >= 1 && bikePatches.every(p => p.isRemoved) && (
                    <Animated.View style={[styles.sparkleContainer, { opacity: sparkleOpacity, transform: [{ scale: sparkleScale }] }]}>
                        <Icon name="sparkles" size={150} color="#FFD700" />
                    </Animated.View>
                )}

                {/* Water/Foam particles when tool is active */}
                {isToolActive && currentTool === 'water' && (
                    <>
                        <Animated.View style={[styles.waterParticle, { transform: [{ translateY: waterTranslateY }], opacity: waterOpacity, left: width * 0.2 }]} />
                        <Animated.View style={[styles.waterParticle, { transform: [{ translateY: waterTranslateY }], opacity: waterOpacity, left: width * 0.4 }]} />
                        <Animated.View style={[styles.waterParticle, { transform: [{ translateY: waterTranslateY }], opacity: waterOpacity, left: width * 0.6 }]} />
                        <Animated.View style={[styles.waterParticle, { transform: [{ translateY: waterTranslateY }], opacity: waterOpacity, left: width * 0.8 }]} />
                        <Animated.View style={[styles.waterParticle, { transform: [{ translateY: waterTranslateY }], opacity: waterOpacity, left: width * 0.3 }]} />
                        <Animated.View style={[styles.waterParticle, { transform: [{ translateY: waterTranslateY }], opacity: waterOpacity, left: width * 0.7 }]} />
                    </>
                )}
                {isToolActive && currentTool === 'foam' && (
                    <>
                        {/* Foam particles have a slightly different appearance */}
                        <Animated.View style={[styles.foamFlowParticle, { transform: [{ translateY: waterTranslateY }], opacity: waterOpacity, left: width * 0.25 }]} />
                        <Animated.View style={[styles.foamFlowParticle, { transform: [{ translateY: waterTranslateY }], opacity: waterOpacity, left: width * 0.55 }]} />
                        <Animated.View style={[styles.foamFlowParticle, { transform: [{ translateY: waterTranslateY }], opacity: waterOpacity, left: width * 0.45 }]} />
                    </>
                )}

                {/* The draggable wash tool */}
                <Animated.View
                    style={[
                        styles.washTool,
                        {
                            transform: [
                                { translateX: washToolPan.x },
                                { translateY: washToolPan.y },
                                { scale: brushScaleAnim },
                            ],
                        },
                    ]}
                    {...panResponder.panHandlers}
                >
                    <Icon name={currentTool === 'foam' ? 'spray-bottle' : 'water-outline'} size={60} color="#fff" />
                </Animated.View>

            </View>

            {/* Progress Bars */}
            <View style={styles.progressBarsContainer}>
                <View style={styles.progressBarWrapper}>
                    <LinearGradient
                        colors={['#f0e130', '#f4e98a']} // Yellowish gradient for foam
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressBarFill, { width: `${foamProgress * 100}%` }]}
                    />
                    <Text style={styles.progressText}>Foam: {Math.round(foamProgress * 100)}%</Text>
                </View>

                <View style={styles.progressBarWrapper}>
                    <LinearGradient
                        colors={['#aaffaa', '#00cc00']} // Greenish gradient for wash
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressBarFill, { width: `${washProgress * 100}%` }]}
                    />
                    <Text style={styles.progressText}>Wash: {Math.round(washProgress * 100)}%</Text>
                </View>
            </View>

            {/* Tool Selection Buttons */}
            <View style={styles.toolSelectionContainer}>
                <TouchableOpacity
                    style={[styles.toolButton, currentTool === 'foam' && styles.toolButtonActive]}
                    onPress={() => setCurrentTool('foam')}
                    disabled={introVisible} // Disable if intro is visible
                >
                    <Icon name="spray-bottle" size={30} color={currentTool === 'foam' ? '#fff' : '#333'} />
                    <Text style={currentTool === 'foam' ? styles.toolButtonTextActive : styles.toolButtonText}>Foam</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.toolButton, currentTool === 'water' && styles.toolButtonActive]}
                    onPress={handleWaterToolPress}
                    disabled={introVisible} // Disable if intro is visible
                >
                    <Icon name="water" size={30} color={currentTool === 'water' ? '#fff' : '#333'} />
                    <Text style={currentTool === 'water' ? styles.toolButtonTextActive : styles.toolButtonText}>Water</Text>
                </TouchableOpacity>
            </View>

            {/* Intro component */}
            <MiniGameIntro
                visible={introVisible}
                type="BIKE_WASH" // Specific type for the intro content
                onStart={() => setIntroVisible(false)} // Closes intro and starts game
                onClose={() => setIntroVisible(false)} // Allows closing intro without starting
            />

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end', // Position content at the bottom
        alignItems: 'center',
        backgroundColor: '#333', // Dark background for contrast
    },
    backgroundGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: height * 0.7, // Top portion of background
    },
    floor: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.3, // Bottom portion for the floor
        backgroundColor: '#222',
        borderTopWidth: 5,
        borderTopColor: '#444',
    },
    lightStrip: {
        position: 'absolute',
        width: 150,
        height: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 5,
        top: 80,
        alignSelf: 'center',
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 5,
        zIndex: 1,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 100, // Ensure button is on top
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        padding: 5,
    },
    header: {
        position: 'absolute',
        top: 50,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        zIndex: 100,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 5,
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
        fontSize: 16,
    },
    bikeContainer: {
        width: width * 0.8,
        height: height * 0.6,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: height * 0.05,
        position: 'relative',
        zIndex: 10,
    },
    bikeImage: {
        width: '100%',
        height: '100%',
    },
    bikePatch: {
        position: 'absolute',
        // Background color is animated via interpolation in BikePatch component
    },
    washTool: {
        position: 'absolute',
        bottom: -50, // Initial position, will be moved by pan responder
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 50,
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 15,
    },
    progressBarsContainer: {
        width: width * 0.8,
        marginBottom: 20,
    },
    progressBarWrapper: {
        height: 25,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 15,
        overflow: 'hidden',
        justifyContent: 'center',
        marginVertical: 5,
    },
    progressBarFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        height: '100%',
        borderRadius: 15,
    },
    progressText: {
        position: 'absolute',
        alignSelf: 'center',
        color: '#333',
        fontWeight: 'bold',
        fontSize: 12,
    },
    waterParticle: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#ADD8E6', // Light blue for water
        opacity: 0.7,
        zIndex: 12,
    },
    foamFlowParticle: {
        position: 'absolute',
        width: 15,
        height: 15,
        borderRadius: 7.5,
        backgroundColor: FOAM_COLOR,
        opacity: 0.8,
        zIndex: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    toolSelectionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: width * 0.8,
        marginBottom: 30,
    },
    toolButton: {
        backgroundColor: 'rgba(255,255,255,0.7)',
        padding: 10,
        borderRadius: 15,
        alignItems: 'center',
        width: width * 0.35,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    toolButtonActive: {
        backgroundColor: '#4facfe', // Blue for active tool
        borderColor: '#fff',
    },
    toolButtonText: {
        color: '#333',
        fontWeight: 'bold',
        marginTop: 5,
    },
    toolButtonTextActive: {
        color: '#fff',
        fontWeight: 'bold',
        marginTop: 5,
    },
    sparkleContainer: {
        position: 'absolute',
        zIndex: 20,
        // Center the sparkle effect over the bike
        left: (width * 0.8 - 150) / 2,
        top: (height * 0.6 - 150) / 2,
    }
});

export default BikeWashScreen;