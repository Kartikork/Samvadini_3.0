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

const BUBBLE_COUNT = 15;
const PEOPLE_COUNT = 5;

const TreeCleanScreen = ({ onBack, onCleanFinished, selectedCharacter }) => {
    const [airQuality, setAirQuality] = useState(0);
    const [clouds, setClouds] = useState([]);
    const [activeBubbles, setActiveBubbles] = useState([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showIntro, setShowIntro] = useState(true);

    const characterImageSource = selectedCharacter?.image || require('./tree.png');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const treeScale = useRef(new Animated.Value(1)).current;
    const smogAnim = useRef(new Animated.Value(1)).current;
    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const promptPulseAnim = useRef(new Animated.Value(1)).current;
    const launcherShakeAnim = useRef(new Animated.Value(0)).current;
    const o2FloatingAnims = useRef([...Array(5)].map(() => new Animated.Value(0))).current;

    const impactParticles = useRef([...Array(BUBBLE_COUNT)].map(() => ({
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
    }))).current;

    const peopleAnims = useRef([...Array(PEOPLE_COUNT)].map(() => new Animated.Value(0))).current;

    const bgSound = useRef(null);
    const popSound = useRef(null);
    const shootSound = useRef(null);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();

        bgSound.current = new Sound(require('./birds.mp3'), (error) => {
            if (!error) {
                bgSound.current.setNumberOfLoops(-1);
                bgSound.current.setVolume(0.3);
                bgSound.current.play();
            }
        });

        popSound.current = new Sound(require('./click.mp3'), (error) => {
            if (error) console.warn('Failed to load pop sound', error);
        });

        shootSound.current = new Sound(require('./click.mp3'), (error) => {
            if (error) console.warn('Failed to load shoot sound', error);
        });

        // Initial Fade In
        Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }).start();

        // Initialize Prompt Pulse for Magic
        Animated.loop(
            Animated.sequence([
                Animated.timing(promptPulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
                Animated.timing(promptPulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
            ])
        ).start();

        // Initialize Smog Clouds...
        const initialClouds = [...Array(12)].map((_, i) => {
            const driftX = new Animated.Value(0);
            Animated.loop(
                Animated.sequence([
                    Animated.timing(driftX, { toValue: 20, duration: 3000 + Math.random() * 2000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
                    Animated.timing(driftX, { toValue: -20, duration: 3000 + Math.random() * 2000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
                ])
            ).start();

            // Rows: 0, 1, 2, 3 (4 rows) | Cols: 0, 1, 2 (3 columns)
            const row = Math.floor(i / 3);
            const col = i % 3;

            return {
                id: i,
                // Spread clouds across the top, keeping the center-bottom tree area clear
                x: col * (SCREEN_WIDTH / 3) + 20 + (Math.random() * 30),
                y: row * 70 + 80 + (Math.random() * 15), // Higher starting point (80) and tighter rows (70)
                opacity: new Animated.Value(1),
                scale: new Animated.Value(1),
                driftX,
                isVanishing: false,
            };
        });
        setClouds(initialClouds);

        const backAction = () => {
            if (onBack) {
                onBack();
                return true;
            }
            return false;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

        return () => {
            backHandler.remove();
            if (bgSound.current) { bgSound.current.stop(); bgSound.current.release(); }
            if (popSound.current) popSound.current.release();
            if (shootSound.current) shootSound.current.release();
        };
    }, []);

    useEffect(() => {
        Animated.timing(smogAnim, { toValue: 1 - airQuality, duration: 500, useNativeDriver: true }).start();
        peopleAnims.forEach((anim, index) => {
            if (airQuality >= (index + 1) / (PEOPLE_COUNT + 1)) {
                Animated.spring(anim, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }).start();
            }
        });
    }, [airQuality]);

    const shootBubble = (targetX, targetY, cloudId) => {
        if (showSuccess) return;

        shootSound.current && shootSound.current.stop().play();

        // Spawn bubble at the tree (launcher)
        const bubbleId = Date.now();
        const bubbleX = new Animated.Value(SCREEN_WIDTH / 2 - 20);
        const bubbleY = new Animated.Value(SCREEN_HEIGHT - 250);
        const bubbleScale = new Animated.Value(0.5);

        const newBubble = { id: bubbleId, x: bubbleX, y: bubbleY, scale: bubbleScale };
        setActiveBubbles(prev => [...prev, newBubble]);

        // Launch animation
        Animated.parallel([
            Animated.timing(bubbleX, { toValue: targetX, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
            Animated.timing(bubbleY, { toValue: targetY, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
            Animated.timing(bubbleScale, { toValue: 1.5, duration: 600, useNativeDriver: true }),
        ]).start(() => {
            handleImpact(cloudId, targetX, targetY, bubbleId);
        });

        // Launcher recoil
        Animated.sequence([
            Animated.timing(treeScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
            Animated.timing(treeScale, { toValue: 1.1, duration: 150, useNativeDriver: true }),
            Animated.timing(treeScale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
    };

    const handleImpact = (cloudId, x, y, bubbleId) => {
        const cloud = clouds.find(c => c.id === cloudId);
        if (!cloud || cloud.isVanishing) {
            setActiveBubbles(prev => prev.filter(b => b.id !== bubbleId));
            return;
        }

        cloud.isVanishing = true;
        popSound.current && popSound.current.stop().play();

        // Trigger impact particles
        impactParticles.slice(0, 8).forEach((p, i) => {
            p.x.setValue(x);
            p.y.setValue(y);
            p.opacity.setValue(1);
            p.scale.setValue(0.5);

            const tx = x + (Math.random() - 0.5) * 200;
            const ty = y + (Math.random() - 0.5) * 200;

            Animated.parallel([
                Animated.timing(p.x, { toValue: tx, duration: 800, useNativeDriver: true }),
                Animated.timing(p.y, { toValue: ty, duration: 800, useNativeDriver: true }),
                Animated.timing(p.scale, { toValue: 2, duration: 800, useNativeDriver: true }),
                Animated.timing(p.opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
            ]).start();
        });

        Animated.parallel([
            Animated.timing(cloud.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(cloud.scale, { toValue: 2.5, duration: 300, useNativeDriver: true }),
        ]).start(() => {
            setClouds(prev => {
                const rem = prev.filter(c => c.id !== cloudId);
                if (rem.length === 0) handleSuccess();
                return rem;
            });
            setActiveBubbles(prev => prev.filter(b => b.id !== bubbleId));
            setAirQuality(prev => Math.min(1, prev + (1 / 12)));
        });
    };

    const handleSuccess = () => {
        setShowSuccess(true);
        setTimeout(() => onCleanFinished && onCleanFinished(), 2500);
    };

    const startMission = () => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
            setShowIntro(false);
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            <View style={styles.backgroundLayer}>
                <LinearGradient colors={['#2c3e50', '#000000']} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={['#4facfe', '#43e97b']} style={[StyleSheet.absoluteFill, { opacity: airQuality }]} />
            </View>

            {/* Smog Overlay */}
            <Animated.View style={[styles.smogOverlay, { opacity: smogAnim }]} pointerEvents="none" />

            {/* Target Clouds */}
            {clouds.map(cloud => (
                <Animated.View
                    key={cloud.id}
                    style={[
                        styles.targetCloud,
                        {
                            left: cloud.x,
                            top: cloud.y,
                            opacity: cloud.opacity,
                            transform: [{ scale: cloud.scale }, { translateX: cloud.driftX }]
                        }
                    ]}
                >
                    <TouchableOpacity onPress={() => shootBubble(cloud.x + 40, cloud.y + 30, cloud.id)} activeOpacity={0.7}>
                        <View style={styles.cloudContent}>
                            <Icon name="cloud" size={100} color="rgba(40,20,50,0.9)" />
                            <Icon name="skull-outline" size={25} color="rgba(255,255,255,0.3)" style={styles.skull} />
                        </View>
                        <View style={styles.toxicGlow} />
                    </TouchableOpacity>
                </Animated.View>
            ))}

            {/* Magic Particles Background */}
            <View style={styles.gridOverlay} pointerEvents="none">
                <Icon name="sparkles" size={SCREEN_WIDTH} color="rgba(255,255,255,0.05)" />
            </View>

            {/* Active Purifiers (In Flight) */}
            {activeBubbles.map(bubble => (
                <Animated.View
                    key={bubble.id}
                    style={[
                        styles.oxygenBubble,
                        {
                            transform: [
                                { translateX: bubble.x },
                                { translateY: bubble.y },
                                { scale: bubble.scale }
                            ]
                        }
                    ]}
                >
                    <View style={styles.bubbleCore}>
                        <Icon name="lightning-bolt" size={24} color="#F1C40F" />
                    </View>
                </Animated.View>
            ))}

            {/* Impact Particles */}
            {impactParticles.map((p, i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.particle,
                        {
                            transform: [
                                { translateX: p.x },
                                { translateY: p.y },
                                { scale: p.scale }
                            ],
                            opacity: p.opacity
                        }
                    ]}
                />
            ))}

            {showIntro ? (
                <Animated.View style={[styles.introContainer, { opacity: fadeAnim }]}>
                    <LinearGradient colors={['#2c3e50', '#000000']} style={StyleSheet.absoluteFill} />
                    <View style={styles.introContent}>
                        <Icon name="shield-sun" size={100} color="#F1C40F" />
                        <Text style={styles.introTitle}>NATURE SUPERHERO MISSION 🛡️⚡</Text>
                        <View style={styles.instructionCard}>
                            <Text style={styles.instrText}>⚠️ Toxic Smog is attacking the Garden!</Text>
                            <Text style={styles.instrText}>🚀 Blast the clouds to restore clean air!</Text>
                            <Text style={styles.instrText}>🛡️ Protect the Tree at all costs!</Text>
                        </View>
                        <TouchableOpacity style={styles.startButton} onPress={startMission}>
                            <LinearGradient colors={['#F1C40F', '#F39C12']} style={styles.startBtnBg}>
                                <Text style={styles.startBtnText}>START MISSION</Text>
                                <Icon name="play" size={24} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            ) : (
                <Animated.View style={[styles.content, { opacity: fadeAnim }]} pointerEvents="box-none">
                    {/* Simple HUD */}
                    <View style={styles.header}>
                        <View style={styles.labStats}>
                            <Text style={styles.labValue}>{airQuality < 1 ? 'RESTORE THE GARDEN! 🛡️' : 'GARDEN DEPLOYED! 🌟'}</Text>
                            <View style={styles.progressBg}>
                                <Animated.View style={[styles.progressFill, { width: `${airQuality * 100}%` }]} />
                            </View>
                            <View style={styles.microStats}>
                                <Text style={styles.microText}>{airQuality > 0.5 ? 'BEAUTIFULLY CLEAN! 😍' : 'TAP CLOUDS TO CLEAN! ⚡'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Launcher Section */}
                    <View style={styles.launcherSection}>
                        <Animated.View style={[styles.treeContainer, { transform: [{ scale: treeScale }] }]}>
                            {/* Base Trunk */}
                            <Image source={characterImageSource} style={styles.treeLauncher} resizeMode="contain" />

                            {/* Green Foliage */}
                            <Image
                                source={require('./tree_foliage_green_overlay2.png')}
                                style={styles.foliageLayer1}
                                resizeMode="contain"
                            />

                            {/* Energy Glow */}
                            <View style={[styles.treeAura, { opacity: airQuality * 0.4 + 0.2 }]} />

                            <Animated.View style={[styles.launcherMuzzle, { transform: [{ translateX: launcherShakeAnim }] }]}>
                                <Icon name="flash" size={50} color="#F1C40F" />
                            </Animated.View>
                        </Animated.View>
                    </View>

                    {/* Happy Citizens */}
                    <View style={styles.citizenRow}>
                        {peopleAnims.map((anim, i) => (
                            <Animated.View key={i} style={[styles.citizen, { opacity: anim, transform: [{ scale: anim }] }]}>
                                <Icon name="star-face" size={35} color="#FFF" />
                            </Animated.View>
                        ))}
                    </View>

                    <View style={styles.footer}>
                        {showSuccess ? (
                            <View style={styles.successMessage}>
                                <Icon name="shield-check" size={80} color="#27AE60" />
                                <Text style={styles.successText}>NATURE RESTORED! 🛡️</Text>
                            </View>
                        ) : (
                            <View style={styles.hintBox}>
                                <Icon name="flash" size={30} color="#FFF" />
                                <Text style={styles.hintText}>TAP CLOUDS TO BLAST THEM! ⚡</Text>
                            </View>
                        )}
                    </View>
                </Animated.View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    backgroundLayer: { ...StyleSheet.absoluteFillObject },
    smogOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    content: { flex: 1 },
    header: { paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
    labStats: { flex: 1, marginHorizontal: 15 },
    labLabel: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    labValue: { color: '#FFF', fontSize: 16, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
    microStats: { marginTop: 2 },
    microText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    o2Storage: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 20, borderWidth: 2, borderColor: '#FFD700' },
    o2Text: { color: '#fff', fontSize: 24, fontWeight: '900' },
    o2Label: { color: '#FFD700', fontSize: 10, fontWeight: 'bold' },
    progressBg: { height: 12, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 6, marginVertical: 8, overflow: 'hidden', borderWidth: 2, borderColor: '#FFF' },
    progressFill: { height: '100%', backgroundColor: '#27AE60', shadowColor: '#27AE60', shadowRadius: 10, shadowOpacity: 1 },
    gridOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 0, justifyContent: 'center', alignItems: 'center' },
    targetCloud: { position: 'absolute', zIndex: 10 },
    cloudContent: { justifyContent: 'center', alignItems: 'center' },
    skull: { position: 'absolute' },
    toxicGlow: { position: 'absolute', width: 80, height: 40, backgroundColor: 'rgba(52,152,219,0.2)', borderRadius: 20, zIndex: -1, shadowColor: '#3498DB', shadowRadius: 20, shadowOpacity: 0.6, elevation: 10 },
    oxygenBubble: { position: 'absolute', width: 50, height: 50, zIndex: 50 },
    bubbleCore: { width: 44, height: 44, backgroundColor: '#F1C40F', borderRadius: 22, borderWidth: 3, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#F1C40F', shadowRadius: 15, shadowOpacity: 1 },
    particle: { position: 'absolute', width: 6, height: 6, backgroundColor: '#FFF', borderRadius: 3, zIndex: 60 },
    launcherSection: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 130 },
    treeTouchArea: { alignItems: 'center', justifyContent: 'center' },
    treeContainer: { alignItems: 'center', justifyContent: 'center' },
    treeLauncher: { width: 220, height: 260, zIndex: 1 },
    tapPrompt: { position: 'absolute', top: '35%', alignItems: 'center', zIndex: 10, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, elevation: 10 },
    tapText: { color: '#F39C12', fontSize: 12, fontWeight: '900', marginTop: 5 },
    treeAura: {
        position: 'absolute',
        top: 20,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: '#F1C40F',
        zIndex: 0,
        shadowColor: '#F1C40F',
        shadowRadius: 50,
        shadowOpacity: 0.8,
        elevation: 20,
    },
    foliageLayer1: {
        position: 'absolute',
        top: 0,
        width: '100%',
        height: '100%',
        zIndex: 2,
    },
    launcherMuzzle: { position: 'absolute', top: 30, zIndex: 10, shadowColor: '#FFF', shadowRadius: 20, shadowOpacity: 1, elevation: 15 },
    citizenRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginBottom: 20 },
    citizen: { width: 45, height: 45, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    footer: { paddingBottom: 60, alignItems: 'center' },
    hintBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(52,152,219,0.8)', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25, borderWidth: 3, borderColor: '#FFF' },
    hintText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
    successMessage: { alignItems: 'center' },
    successText: { color: '#27AE60', fontSize: 24, fontWeight: '900', marginTop: 15, letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
    introContainer: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
    introContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
    introTitle: { color: '#F1C40F', fontSize: 28, fontWeight: '900', textAlign: 'center', marginTop: 20, letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 10 },
    instructionCard: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 25, borderRadius: 25, marginVertical: 40, width: '100%', borderWidth: 2, borderColor: 'rgba(241,196,15,0.3)' },
    instrText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginVertical: 8, textAlign: 'center' },
    startButton: { width: '80%', height: 65, borderRadius: 32, overflow: 'hidden', elevation: 15, shadowColor: '#F1C40F', shadowRadius: 20, shadowOpacity: 0.5 },
    startBtnBg: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    startBtnText: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
});

export default TreeCleanScreen;
