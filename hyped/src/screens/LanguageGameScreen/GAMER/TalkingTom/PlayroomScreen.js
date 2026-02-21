import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    Animated,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

const TOY_TYPES = ['ball', 'car', 'teddy', 'blocks'];

const PlayroomScreen = ({ onBack, onPlayFinished, selectedCharacter }) => {
    
    const [happiness, setHappiness] = useState(20); 
    const [score, setScore] = useState(0);
    
    
    const [wantedToy, setWantedToy] = useState(TOY_TYPES[0]);
    
    const [balloons, setBalloons] = useState([]);
    const [stars, setStars] = useState([]);
    const [feedbackText, setFeedbackText] = useState(''); 

    
    const babyBounce = useRef(new Animated.Value(0)).current;
    const babyRotate = useRef(new Animated.Value(0)).current;
    const thoughtBubbleScale = useRef(new Animated.Value(0)).current;

    const toyBallAnim = useRef(new Animated.Value(0)).current;
    const toyCarAnim = useRef(new Animated.Value(0)).current;
    const toyTeddyAnim = useRef(new Animated.Value(1)).current;
    const confettiOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(thoughtBubbleScale, { toValue: 1, useNativeDriver: true }).start();

        const decayInterval = setInterval(() => {
            setHappiness(prev => {
                
                const decayAmount = prev > 80 ? 1.5 : 0.8; 
                const newVal = prev - decayAmount;
                return newVal < 0 ? 0 : newVal;
            });
        }, 1000);

        const switchToyInterval = setInterval(() => {
            const randomToy = TOY_TYPES[Math.floor(Math.random() * TOY_TYPES.length)];
            setWantedToy(randomToy);
            
            thoughtBubbleScale.setValue(0.5);
            Animated.spring(thoughtBubbleScale, { toValue: 1, useNativeDriver: true }).start();
        }, 4000);

        return () => {
            clearInterval(decayInterval);
            clearInterval(switchToyInterval);
        };
    }, []);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(babyBounce, { toValue: -15, duration: 1000, useNativeDriver: true }),
                Animated.timing(babyBounce, { toValue: 0, duration: 1000, useNativeDriver: true }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(toyCarAnim, { toValue: 50, duration: 2000, useNativeDriver: true }),
                Animated.timing(toyCarAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(toyTeddyAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
                Animated.timing(toyTeddyAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const createBalloon = (x, y) => {
        const id = Date.now() + Math.random();
        const newBalloon = { id, x, y, anim: new Animated.Value(0), color: ['#ff6b6b', '#4ecdc4'][Math.floor(Math.random() * 2)] };
        setBalloons(prev => [...prev, newBalloon]);
        Animated.timing(newBalloon.anim, { toValue: 1, duration: 2000, useNativeDriver: true }).start(() => {
            setBalloons(prev => prev.filter(b => b.id !== id));
        });
    };

    const handleToyPress = (toyType, x, y) => {
        if (toyType === wantedToy) {
            
            setHappiness(prev => Math.min(prev + 10, 100)); 
            setScore(prev => prev + 50);
            setFeedbackText("Yay!");
            createBalloon(x, y);

            const newOptions = TOY_TYPES.filter(t => t !== toyType); 
            const nextToy = newOptions[Math.floor(Math.random() * newOptions.length)];
            setWantedToy(nextToy);
            
            thoughtBubbleScale.setValue(0.8);
            Animated.spring(thoughtBubbleScale, { toValue: 1, useNativeDriver: true }).start();

            Animated.sequence([
                Animated.timing(babyRotate, { toValue: 1, duration: 150, useNativeDriver: true }),
                Animated.timing(babyRotate, { toValue: -1, duration: 150, useNativeDriver: true }),
                Animated.timing(babyRotate, { toValue: 0, duration: 150, useNativeDriver: true }),
            ]).start();

            if (happiness >= 90) { // Check against previous state approx
                setTimeout(() => onPlayFinished(), 500);
            }

        } else {
            setHappiness(prev => Math.max(prev - 10, 0)); 
            setFeedbackText("No!");
            
            Animated.sequence([
                Animated.timing(babyRotate, { toValue: 0.5, duration: 50, useNativeDriver: true }),
                Animated.timing(babyRotate, { toValue: -0.5, duration: 50, useNativeDriver: true }),
                Animated.timing(babyRotate, { toValue: 0.5, duration: 50, useNativeDriver: true }),
                Animated.timing(babyRotate, { toValue: 0, duration: 50, useNativeDriver: true }),
            ]).start();
        }

        setTimeout(() => setFeedbackText(''), 800);
    };

    const babyRotation = babyRotate.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['-15deg', '0deg', '15deg']
    });

    const getWantedIcon = () => {
        switch(wantedToy) {
            case 'ball': return { name: 'basketball', color: '#ff6b6b' };
            case 'car': return { name: 'car-side', color: '#3498db' };
            case 'teddy': return { name: 'teddy-bear', color: '#8b4513' };
            case 'blocks': return { name: 'cube', color: '#e74c3c' };
            default: return { name: 'help', color: '#000' };
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#ffeaa7', '#fdcb6e', '#fab1a0']} style={styles.backgroundGradient}>
                <View style={styles.wallPaper}>{[...Array(20)].map((_, i) => (<View key={i} style={styles.wallPattern} />))}</View>
                
                {/* Window */}
                <View style={styles.window}>
                    <LinearGradient colors={['#74b9ff', '#a29bfe']} style={styles.windowGlass}>
                        <Icon name="white-balance-sunny" size={50} color="#ffeaa7" />
                    </LinearGradient>
                    <View style={styles.windowFrameH} />
                    <View style={styles.windowFrameV} />
                </View>
            </LinearGradient>

            <View style={styles.floor}>
                {[...Array(6)].map((_, i) => (<View key={i} style={styles.floorPlank} />))}
            </View>

            {/* --- THOUGHT BUBBLE (The Challenge) --- */}
            <Animated.View style={[styles.thoughtBubbleContainer, { transform: [{ scale: thoughtBubbleScale }] }]}>
                <View style={styles.thoughtBubbleCloud}>
                    <Text style={styles.thoughtText}>I want...</Text>
                    <Icon name={getWantedIcon().name} size={40} color={getWantedIcon().color} />
                </View>
                <View style={styles.thoughtDot1} />
                <View style={styles.thoughtDot2} />
            </Animated.View>

            {/* --- BABY CHARACTER --- */}
            <Animated.View
                style={[
                    styles.characterContainer,
                    { transform: [{ translateY: babyBounce }, { rotate: babyRotation }] }
                ]}
            >
                <Image source={selectedCharacter.image} style={styles.character} resizeMode="contain" />
                
                {/* Instant Feedback Bubble (Yay/No) */}
                {feedbackText !== '' && (
                    <View style={[styles.feedbackBubble, { borderColor: feedbackText === 'Yay!' ? '#2ecc71' : '#e74c3c' }]}>
                        <Text style={[styles.feedbackText, { color: feedbackText === 'Yay!' ? '#2ecc71' : '#e74c3c' }]}>
                            {feedbackText}
                        </Text>
                    </View>
                )}
            </Animated.View>

            {/* --- INTERACTIVE TOYS --- */}
            
            {/* Ball */}
            <TouchableOpacity
                style={styles.toyBallContainer}
                onPress={(e) => handleToyPress('ball', 80, height * 0.6)}
                activeOpacity={0.7}
            >
                <Animated.View style={{ transform: [{ translateY: toyBallAnim }] }}>
                    <LinearGradient colors={['#ff6b6b', '#ee5a6f']} style={styles.toyBall}>
                        <Icon name="basketball" size={40} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.toyLabel}>Ball</Text>
                </Animated.View>
            </TouchableOpacity>

            {/* Car */}
            <TouchableOpacity
                style={styles.toyCarContainer}
                onPress={(e) => handleToyPress('car', width / 2, height * 0.65)}
                activeOpacity={0.7}
            >
                <Animated.View style={{ transform: [{ translateX: toyCarAnim }] }}>
                    <View style={styles.toyCar}>
                        <Icon name="car-side" size={50} color="#3498db" />
                    </View>
                    <Text style={styles.toyLabel}>Car</Text>
                </Animated.View>
            </TouchableOpacity>

            {/* Teddy */}
            <TouchableOpacity
                style={styles.toyTeddyContainer}
                onPress={(e) => handleToyPress('teddy', width - 80, height * 0.6)}
                activeOpacity={0.7}
            >
                <Animated.View style={{ transform: [{ scale: toyTeddyAnim }] }}>
                    <View style={styles.toyTeddy}>
                        <Icon name="teddy-bear" size={50} color="#8b4513" />
                    </View>
                    <Text style={styles.toyLabel}>Teddy</Text>
                </Animated.View>
            </TouchableOpacity>

            {/* Blocks */}
            <TouchableOpacity
                style={styles.toyBlocksContainer}
                onPress={(e) => handleToyPress('blocks', width - 100, height * 0.4)}
                activeOpacity={0.7}
            >
                <View style={styles.toyBlocks}>
                    <Icon name="cube" size={45} color="#e74c3c" />
                </View>
                <Text style={styles.toyLabel}>Blocks</Text>
            </TouchableOpacity>

            {/* Balloons Visuals */}
            {balloons.map(balloon => (
                <Animated.View
                    key={balloon.id}
                    style={[
                        styles.balloon,
                        {
                            left: balloon.x,
                            top: balloon.y,
                            opacity: balloon.anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                            transform: [{ translateY: balloon.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -200] }) }]
                        }
                    ]}
                >
                    <Icon name="balloon" size={40} color={balloon.color} />
                </Animated.View>
            ))}

            {/* UI CONTROLS */}
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Icon name="arrow-left" size={30} color="#fff" />
            </TouchableOpacity>

            {/* HUD */}
            <View style={styles.progressWrapper}>
                <Text style={styles.progressLabel}>Give him what he wants! 🧠</Text>
                <View style={styles.progressBarBg}>
                    <LinearGradient
                        colors={happiness < 30 ? ['#e74c3c', '#ff6b6b'] : ['#11998e', '#38ef7d']}
                        style={[styles.progressBarFill, { width: `${happiness}%` }]}
                    />
                </View>
                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreText}>Score: {score}</Text>
                    <Text style={styles.progressPercent}>{Math.round(happiness)}% Happy</Text>
                </View>
            </View>

            {/* Instruction Footer */}
            <View style={styles.instructionBox}>
                <Text style={styles.instructionText}>Watch the thought bubble! 💭</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffeaa7' },
    backgroundGradient: { flex: 2.5, overflow: 'hidden' },
    floor: { flex: 1, backgroundColor: '#d4a574', flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 5, borderTopColor: '#8b6f47' },
    
    wallPaper: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', flexWrap: 'wrap', opacity: 0.1 },
    wallPattern: { width: width / 10, height: height / 15, borderWidth: 1, borderColor: '#dfe6e9' },
    window: { position: 'absolute', top: 60, right: 40, width: 120, height: 140, backgroundColor: '#74b9ff', borderWidth: 6, borderColor: '#fff', borderRadius: 10, overflow: 'hidden', elevation: 8 },
    windowGlass: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    windowFrameH: { position: 'absolute', width: '100%', height: 4, backgroundColor: '#fff', top: '50%' },
    windowFrameV: { position: 'absolute', width: 4, height: '100%', backgroundColor: '#fff', left: '50%' },
    floorPlank: { width: width / 3, height: height / 6, borderRightWidth: 2, borderBottomWidth: 1, borderColor: '#8b6f47', backgroundColor: '#c9a86a' },

    
    characterContainer: { position: 'absolute', bottom: height * 0.2, alignSelf: 'center', alignItems: 'center', zIndex: 10 },
    character: { width: 220, height: 280 },

    thoughtBubbleContainer: {
        position: 'absolute',
        top: height * 0.25, 
        left: width * 0.15,
        zIndex: 20,
        alignItems: 'center',
    },
    thoughtBubbleCloud: {
        width: 110,
        height: 80,
        backgroundColor: '#fff',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#3498db',
        elevation: 10,
    },
    thoughtText: { fontSize: 10, fontWeight: 'bold', color: '#555', marginBottom: 2 },
    thoughtDot1: { width: 15, height: 15, borderRadius: 8, backgroundColor: '#fff', position: 'absolute', bottom: -15, right: 30, borderWidth: 3, borderColor: '#3498db' },
    thoughtDot2: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff', position: 'absolute', bottom: -28, right: 15, borderWidth: 3, borderColor: '#3498db' },
    feedbackBubble: {
        position: 'absolute',
        top: 20,
        right: -20,
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 20,
        borderWidth: 3,
        elevation: 10,
    },
    feedbackText: { fontWeight: 'bold', fontSize: 20 },
    toyBallContainer: { position: 'absolute', bottom: height * 0.25, left: 50, zIndex: 15, alignItems: 'center' },
    toyBall: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', elevation: 8 },
    toyCarContainer: { position: 'absolute', bottom: height * 0.18, left: width / 2 - 40, zIndex: 15, alignItems: 'center' },
    toyCar: { width: 80, height: 60, backgroundColor: '#fff', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#3498db', elevation: 8 },
    toyTeddyContainer: { position: 'absolute', bottom: height * 0.25, right: 50, zIndex: 15, alignItems: 'center' },
    toyTeddy: { width: 70, height: 70, backgroundColor: '#fff', borderRadius: 35, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#d4a574', elevation: 8 },
    toyBlocksContainer: { position: 'absolute', bottom: height * 0.45, right: 60, zIndex: 15, alignItems: 'center' },
    toyBlocks: { width: 70, height: 70, backgroundColor: '#fff', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#e74c3c', elevation: 8 },
    toyLabel: { marginTop: 5, fontSize: 12, fontWeight: 'bold', color: '#2c3e50', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    balloon: { position: 'absolute', zIndex: 20 },
    backButton: { position: 'absolute', top: 40, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20, zIndex: 30 },
    progressWrapper: { position: 'absolute', top: 50, alignSelf: 'center', width: 240, alignItems: 'center', zIndex: 30 },
    progressLabel: { color: '#2c3e50', fontWeight: 'bold', marginBottom: 5, fontSize: 15, textShadowColor: '#fff', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
    progressBarBg: { width: '100%', height: 20, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 10, borderWidth: 2, borderColor: '#2c3e50', overflow: 'hidden' },
    progressBarFill: { height: '100%' },
    scoreContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 5 },
    scoreText: { color: '#2c3e50', fontWeight: 'bold', fontSize: 13, backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    progressPercent: { color: '#2c3e50', fontWeight: 'bold', fontSize: 13, backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    instructionBox: { position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 2, borderColor: '#f093fb', zIndex: 30, elevation: 8 },
    instructionText: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50' }
});

export default PlayroomScreen;