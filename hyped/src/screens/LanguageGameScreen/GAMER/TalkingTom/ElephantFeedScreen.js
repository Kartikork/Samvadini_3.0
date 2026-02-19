import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Animated,
    PanResponder,
    Dimensions,
    ScrollView,
    FlatList,
    BackHandler, // <--- Added for hardware back button
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

// --- Food Item Data (Using Emojis instead of MaterialCommunityIcons for food display) ---
const FOOD_ITEMS = [
    {
        id: 'leaf',
        name: 'Jungle Leaf',
        reward: 10,
        feedPoints: 20,
        iconName: 'leaf', // Kept for reference, but 'particles' is used for display
        iconColor: '#6FCF97',
        particles: '🌿', // Emoji for leaf
    },
    {
        id: 'banana',
        name: 'Banana',
        reward: 25,
        feedPoints: 25,
        iconName: 'banana', // Kept for reference
        iconColor: '#F2C94C',
        particles: '🍌', // Emoji for banana
    },
    {
        id: 'apple',
        name: 'Apple',
        reward: 35,
        feedPoints: 30,
        iconName: 'apple', // Kept for reference
        iconColor: '#EB5757',
        particles: '🍎', // Emoji for apple
    },
    {
        id: 'mango',
        name: 'Mango',
        reward: 40,
        feedPoints: 40,
        iconName: 'fruit', // Kept for reference
        iconColor: '#FF9900',
        particles: '🥭', // Emoji for mango
    },
    {
        id: 'watermelon',
        name: 'Watermelon',
        reward: 50,
        feedPoints: 50,
        iconName: 'watermelon', // Kept for reference
        iconColor: '#27AE60',
        particles: '🍉', // Emoji for watermelon
    }
];

const MAX_FEED_POINTS = 100;

const ElephantFeedScreen = ({ onBack, onFeedLevelCompleted, onCoinEarned, coins, selectedCharacter, initialFeedProgress = 0 }) => {
    const [currentCoins, setCurrentCoins] = useState(coins);
    const [feedProgress, setFeedProgress] = useState(initialFeedProgress);
    const [particles, setParticles] = useState([]);
    const [selectedFoodItem, setSelectedFoodItem] = useState(null);
    const [draggableFoodVisible, setDraggableFoodVisible] = useState(false);

    const pan = useRef(new Animated.ValueXY()).current;
    const draggableFoodScale = useRef(new Animated.Value(1)).current;

    const elephantRef = useRef(null);
    const [elephantLayout, setElephantLayout] = useState(null);

    const scrollY = useRef(new Animated.Value(0)).current;

    const draggableFoodInitialLeft = width / 2 - 35;
    const draggableFoodInitialBottom = 150;

    // Refs for state values inside PanResponder
    const draggableFoodVisibleRef = useRef(draggableFoodVisible);
    const selectedFoodItemRef = useRef(selectedFoodItem);
    const elephantLayoutRef = useRef(elephantLayout);
    const currentCoinsRef = useRef(currentCoins);
    const selectedCharacterRef = useRef(selectedCharacter);
    const feedProgressRef = useRef(feedProgress);

    useEffect(() => {
        setCurrentCoins(coins);
    }, [coins]);

    useEffect(() => {
        setFeedProgress(initialFeedProgress);
    }, [initialFeedProgress]);

    useEffect(() => {
        draggableFoodVisibleRef.current = draggableFoodVisible;
        selectedFoodItemRef.current = selectedFoodItem;
        elephantLayoutRef.current = elephantLayout;
        currentCoinsRef.current = currentCoins;
        selectedCharacterRef.current = selectedCharacter;
        feedProgressRef.current = feedProgress;
    }, [draggableFoodVisible, selectedFoodItem, elephantLayout, currentCoins, selectedCharacter, feedProgress]);

    // --- Hardware Back Button Handler (Android) ---
    useEffect(() => {
        const backAction = () => {
            onBack(); // Call the onBack prop when the hardware back button is pressed
            return true; // Return true to prevent default behavior (exiting the app)
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove(); // Clean up the event listener on component unmount
    }, [onBack]); // Dependency array: re-run if onBack function reference changes

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => draggableFoodVisibleRef.current,
            onMoveShouldSetPanResponder: () => draggableFoodVisibleRef.current,
            onPanResponderGrant: () => {
                pan.stopAnimation();
                pan.setOffset({ x: pan.x._value, y: pan.y._value });
                pan.setValue({ x: 0, y: 0 });
                Animated.spring(draggableFoodScale, { toValue: 1.1, useNativeDriver: false }).start();
            },
            onPanResponderMove: Animated.event(
                [
                    null,
                    { dx: pan.x, dy: pan.y }
                ],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (e, gestureState) => {
                pan.flattenOffset();
                Animated.spring(draggableFoodScale, { toValue: 1, useNativeDriver: false }).start();

                const foodAbsoluteX = draggableFoodInitialLeft + pan.x._value;
                const foodAbsoluteY = (height - draggableFoodInitialBottom - 70) + pan.y._value;

                const currentElephantLayout = elephantLayoutRef.current;
                const currentSelectedFoodItem = selectedFoodItemRef.current;
                const currentCoinsValue = currentCoinsRef.current;
                const currentSelectedCharacter = selectedCharacterRef.current;
                const currentFeedProgress = feedProgressRef.current;

                const isOverElephant = currentElephantLayout &&
                    foodAbsoluteX > currentElephantLayout.x &&
                    foodAbsoluteX < currentElephantLayout.x + currentElephantLayout.width &&
                    foodAbsoluteY > currentElephantLayout.y &&
                    foodAbsoluteY < currentElephantLayout.y + currentElephantLayout.height;

                if (isOverElephant && currentSelectedFoodItem) {
                    // if (currentCoinsValue >= currentSelectedFoodItem.cost) { // Removed coin check
                    // const newCoins = currentCoinsValue - currentSelectedFoodItem.cost; // Do not deduct
                    // setCurrentCoins(newCoins); // Coins updated via parent prop usually, but here we might want to eagerly update or wait for prop

                    const potentialNewFeedProgress = currentFeedProgress + currentSelectedFoodItem.feedPoints;
                    const didCompleteLevel = potentialNewFeedProgress >= MAX_FEED_POINTS;

                    const finalFeedProgress = didCompleteLevel ? 0 : potentialNewFeedProgress;
                    setFeedProgress(finalFeedProgress);

                    createParticles(foodAbsoluteX + 35, foodAbsoluteY + 35, currentSelectedFoodItem.particles);
                    setDraggableFoodVisible(false);

                    if (onCoinEarned) {
                        onCoinEarned(currentSelectedFoodItem.reward);
                    }

                    if (didCompleteLevel && onFeedLevelCompleted) {
                        onFeedLevelCompleted({ coinsEarned: currentSelectedFoodItem.reward, newFeedProgress: finalFeedProgress, feedLevelCompleted: true });
                    }

                    pan.setValue({ x: 0, y: 0 });
                    setSelectedFoodItem(null);
                    /* } else {
                        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
                    } */ // Removed else block
                } else {
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: false,
                    }).start();
                }
            },
        })
    ).current;

    const createParticles = (x, y, icon) => {
        const newParticles = [];
        for (let i = 0; i < 8; i++) {
            newParticles.push({
                id: Date.now() + i,
                icon: icon || '✨', // This `icon` here is `item.particles` (emoji)
                x: x + (Math.random() - 0.5) * 80,
                y: y + (Math.random() - 0.5) * 80,
                opacity: new Animated.Value(1),
                translateY: new Animated.Value(0),
                scale: new Animated.Value(0.5 + Math.random()),
            });
        }
        setParticles(prev => [...prev, ...newParticles]);

        newParticles.forEach(p => {
            Animated.parallel([
                Animated.timing(p.opacity, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(p.translateY, {
                    toValue: -150,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(p.scale, {
                    toValue: 1.5,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setParticles(prev => prev.filter(particle => particle.id !== p.id));
            });
        });
    };

    const handleFoodSelection = (food) => {
        // if (currentCoins >= food.cost) {
        setSelectedFoodItem(food);
        setDraggableFoodVisible(true);
        pan.setValue({ x: 0, y: 0 });
        // } else {
        //     setSelectedFoodItem(null);
        //     setDraggableFoodVisible(false);
        // }
    };

    const renderFoodItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.foodItemButton, selectedFoodItem?.id === item.id && styles.selectedFoodItemHighlight]}
            onPress={() => handleFoodSelection(item)}
        // disabled={currentCoins < item.cost}
        >
            <LinearGradient
                colors={['#4CAF50', '#8BC34A']}
                style={styles.foodItemGradient}
            >
                {/* EMOJI: Use Text component for particles (emojis) */}
                <Text style={[styles.foodItemIcon, { fontSize: 40 }]}>{item.particles}</Text>
                <Text style={styles.foodItemName}>{item.name}</Text>
                <View style={[styles.foodItemCostContainer, { backgroundColor: '#2ecc71', borderRadius: 5, paddingHorizontal: 4 }]}>
                    {/* CASH ICON: Still using MaterialCommunityIcons for this */}
                    <Text style={styles.foodItemCost}>+{item.reward}</Text>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    const feedBarWidth = (feedProgress / MAX_FEED_POINTS) * (width - 60);

    return (
        <View style={styles.fullScreen}>
            <ScrollView
                contentContainerStyle={styles.parallaxContainer}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            >
                <Animated.View style={[styles.backgroundLayer, styles.backgroundLayer1, {
                    transform: [{ translateY: scrollY.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 0, 0], extrapolate: 'clamp' }) }]
                }]}>
                    <LinearGradient colors={['#80C752', '#3B8D45', '#1B6A2D']} style={StyleSheet.absoluteFillObject} />
                </Animated.View>

                <Animated.View style={[styles.backgroundLayer, styles.backgroundLayer2, {
                    transform: [{ translateY: scrollY.interpolate({ inputRange: [-height, 0, height], outputRange: [-height * 0.1, 0, height * 0.1], extrapolate: 'clamp' }) }]
                }]}>
                    {/* Ensure 'jungle.png' is in your Assets folder */}
                    <Image source={require('./jungle.png')} style={styles.layerImage} resizeMode="stretch" />
                </Animated.View>

                <Animated.View style={[styles.backgroundLayer, styles.backgroundLayer3, {
                    transform: [{ translateY: scrollY.interpolate({ inputRange: [-height, 0, height], outputRange: [-height * 0.2, 0, height * 0.2], extrapolate: 'clamp' }) }]
                }]}>
                    {/* Ensure 'jungle.png' is in your Assets folder */}
                    <Image source={require('./jungle.png')} style={styles.layerImage} resizeMode="stretch" />
                </Animated.View>

                <View style={styles.characterPlacement}>
                    <Image
                        ref={elephantRef}
                        onLayout={(event) => setElephantLayout(event.nativeEvent.layout)}
                        source={selectedCharacter.image} // Make sure selectedCharacter.image is a valid image source
                        style={styles.characterImage}
                        resizeMode="contain"
                    />
                </View>

                {particles.map((p) => (
                    <Animated.Text
                        key={p.id}
                        style={[
                            styles.interactiveParticle,
                            { left: p.x, top: p.y, opacity: p.opacity, transform: [{ translateY: p.translateY }, { scale: p.scale }] },
                        ]}
                    >
                        {p.icon}
                    </Animated.Text>
                ))}

            </ScrollView>

            <View style={styles.fixedOverlay}>


                <View style={styles.topInfoContainer}>
                    <Text style={styles.title}>Feed the {selectedCharacter.name}!</Text>
                    <Text style={styles.instructionText}>Select and drag food to {selectedCharacter.name}!</Text>

                    <View style={styles.coinContainer}>
                        <Icon name="cash" size={24} color="#FFD700" />
                        <Text style={styles.coinText}>{currentCoins.toLocaleString()}</Text>
                    </View>

                    <View style={styles.feedBarContainer}>
                        <View style={styles.feedBarBackground}>
                            <Animated.View style={[styles.feedBarFill, { width: feedBarWidth }]} />
                        </View>
                        <Text style={styles.feedProgressText}>{feedProgress}/{MAX_FEED_POINTS}</Text>
                    </View>
                </View>

                {draggableFoodVisible && selectedFoodItem && (
                    <Animated.View
                        style={[
                            styles.draggableFoodContainer,
                            {
                                transform: [
                                    { translateX: pan.x },
                                    { translateY: pan.y },
                                    { scale: draggableFoodScale }
                                ],
                                left: draggableFoodInitialLeft,
                                bottom: draggableFoodInitialBottom,
                                borderColor: selectedFoodItem.iconColor,
                            }
                        ]}
                        {...panResponder.panHandlers}
                    >
                        {/* EMOJI: Use Text component for the draggable food item */}
                        <Text style={{ fontSize: 40 }}>{selectedFoodItem.particles}</Text>
                    </Animated.View>
                )}

                <View style={styles.foodSelectionContainer}>
                    <FlatList
                        horizontal
                        data={FOOD_ITEMS}
                        renderItem={renderFoodItem}
                        keyExtractor={(item) => item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.foodListContent}
                    />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    fullScreen: {
        flex: 1,
    },
    parallaxContainer: {
        minHeight: height * 1.5,
        paddingTop: 100,
    },
    backgroundLayer: {
        position: 'absolute',
        width: width,
    },
    backgroundLayer1: {
        height: height * 1.5,
        top: 0,
        left: 0,
    },
    backgroundLayer2: {
        height: height,
        top: height * 0.2,
        left: 0,
        justifyContent: 'flex-end',
        alignItems: 'center',
        overflow: 'hidden',
    },
    backgroundLayer3: {
        height: height * 0.8,
        top: height * 0.7,
        left: 0,
        justifyContent: 'flex-end',
        alignItems: 'center',
        overflow: 'hidden',
    },
    layerImage: {
        width: '100%',
        height: '100%',
    },
    characterPlacement: {
        position: 'absolute',
        top: height * 0.25,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 5,
        height: 350,
    },
    characterImage: {
        width: 280,
        height: 350,
    },
    fixedOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        justifyContent: 'space-between',
    },
    backButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        padding: 8,
    },
    topInfoContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    instructionText: {
        fontSize: 18,
        color: '#eee',
        textAlign: 'center',
        marginBottom: 15,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    coinContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 30,
        paddingVertical: 8,
        paddingHorizontal: 18,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FFD700',
    },
    coinText: {
        color: '#FFD700',
        fontSize: 22,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    feedBarContainer: {
        width: width - 60,
        height: 25,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 15,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#ADD8E6',
        justifyContent: 'center',
        marginBottom: 10,
    },
    feedBarBackground: {
        backgroundColor: '#555',
        height: '100%',
        width: '100%',
    },
    feedBarFill: {
        height: '100%',
        backgroundColor: '#87CEEB',
        borderRadius: 15,
    },
    feedProgressText: {
        position: 'absolute',
        alignSelf: 'center',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
    },
    interactiveParticle: {
        position: 'absolute',
        fontSize: 25,
        zIndex: 101,
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0.5, height: 0.5 },
        textShadowRadius: 1,
    },
    draggableFoodContainer: {
        position: 'absolute',
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderWidth: 3,
        elevation: 8,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    foodSelectionContainer: {
        width: '100%',
        paddingVertical: 15,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        alignItems: 'center',
    },
    foodListContent: {
        paddingHorizontal: 10,
    },
    foodItemButton: {
        marginHorizontal: 8,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
        elevation: 5,
    },
    selectedFoodItemHighlight: {
        borderColor: '#FFD700',
        borderWidth: 3,
    },
    foodItemGradient: {
        padding: 10,
        alignItems: 'center',
        width: 100,
        height: 120,
        justifyContent: 'space-between',
    },
    foodItemIcon: { // This style will now apply to the emoji Text component
        marginBottom: 5,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    foodItemName: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    foodItemCostContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    foodItemCost: {
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 3,
    },
});

export default ElephantFeedScreen;