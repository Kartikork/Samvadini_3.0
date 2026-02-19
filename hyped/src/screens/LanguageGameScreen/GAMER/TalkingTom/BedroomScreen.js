import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    Animated,
    PanResponder,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

const BedroomScreen = ({ onBack, onSleepFinished, selectedCharacter }) => {
   
    const [sleepiness, setSleepiness] = useState(0);
    const [showZzz, setShowZzz] = useState(false);
    const [isLampOn, setIsLampOn] = useState(true);
    const [warningMessage, setWarningMessage] = useState('');

    const isLampOnRef = useRef(isLampOn);
    const charWidth = selectedCharacter.bedWidth || 200; 
    const charHeight = selectedCharacter.bedHeight || 180;

    useEffect(() => {
        isLampOnRef.current = isLampOn;
        if (!isLampOn) setWarningMessage('');
    }, [isLampOn]);

    const pan = useRef(new Animated.ValueXY()).current;
    const handScale = useRef(new Animated.Value(1)).current;
    const zzz1 = useRef(new Animated.Value(0)).current;
    const zzz2 = useRef(new Animated.Value(0)).current;
    const zzz3 = useRef(new Animated.Value(0)).current;
    const moonGlow = useRef(new Animated.Value(0)).current;
    const musicNote1 = useRef(new Animated.Value(0)).current;
    const musicNote2 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(moonGlow, { toValue: 1, duration: 2000, useNativeDriver: true }),
                Animated.timing(moonGlow, { toValue: 0, duration: 2000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const runZzzAnimation = () => {
        const createZzzAnim = (anim) => {
            anim.setValue(0);
            return Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true })
            ]);
        };
        Animated.stagger(300, [createZzzAnim(zzz1), createZzzAnim(zzz2), createZzzAnim(zzz3)]).start();
    };

    const runMusicNoteAnimation = () => {
        const createNoteAnim = (anim) => {
            anim.setValue(0);
            return Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true })
            ]);
        };
        Animated.stagger(200, [createNoteAnim(musicNote1), createNoteAnim(musicNote2)]).start();
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                Animated.spring(handScale, { toValue: 1.3, useNativeDriver: false }).start();
                pan.setOffset({ x: pan.x._value, y: pan.y._value });
                pan.setValue({ x: 0, y: 0 });
                setShowZzz(true);
            },
            onPanResponderMove: (e, gesture) => {
                pan.x.setValue(gesture.dx);
                pan.y.setValue(gesture.dy);

                const isOverBaby =
                    gesture.moveY > height * 0.4 &&
                    gesture.moveY < height * 0.8 &&
                    gesture.moveX > width * 0.2 &&
                    gesture.moveX < width * 0.8;

                if (isOverBaby) {
                    if (!isLampOnRef.current) {
                        setSleepiness((prev) => {
                            const newVal = prev + 1.2;
                            if (newVal >= 100) return 100;
                            if (Math.floor(newVal) % 15 === 0) runZzzAnimation();
                            if (Math.floor(newVal) % 20 === 0) runMusicNoteAnimation();
                            return newVal;
                        });
                    } else {
                        setWarningMessage("It's too bright to sleep!");
                    }
                }
            },
            onPanResponderRelease: () => {
                pan.flattenOffset();
                Animated.spring(handScale, { toValue: 1, useNativeDriver: false }).start();
                setShowZzz(false);
                setWarningMessage('');
                Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();

                setSleepiness(currentSleepiness => {
                    if (currentSleepiness >= 95 && !isLampOnRef.current) {
                        onSleepFinished();
                    }
                    return currentSleepiness;
                });
            },
        })
    ).current;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0f2027', '#203a43', '#2c5364']}
                style={styles.skyGradient}
            >
                {[...Array(30)].map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.star,
                            {
                                top: Math.random() * height * 0.5,
                                left: Math.random() * width,
                                width: Math.random() * 3 + 1,
                                height: Math.random() * 3 + 1,
                            }
                        ]}
                    />
                ))}
                <Animated.View style={[styles.moonGlow, { opacity: moonGlow }]} />
                <View style={styles.moon}>
                    <Icon name="weather-night" size={60} color="#ffeaa7" />
                </View>
                <View style={[styles.cloud, { top: 80, left: 50 }]}>
                    <Icon name="cloud" size={60} color="rgba(255,255,255,0.2)" />
                </View>
                <View style={[styles.cloud, { top: 120, right: 70 }]}>
                    <Icon name="cloud" size={80} color="rgba(255,255,255,0.15)" />
                </View>
            </LinearGradient>

            <View style={styles.floor}>
                {[...Array(8)].map((_, i) => (
                    <View key={i} style={styles.floorPlank} />
                ))}
            </View>

            {/* <View style={styles.window}>
                <LinearGradient colors={['#0f2027', '#2c5364']} style={styles.windowGlass}>
                    <View style={styles.windowFrame} />
                </LinearGradient>
            </View> */}

            {/* BED IMAGE */}
            <View style={styles.bedContainer}>
                <Image
                    source={require('./bed.png')} 
                    style={styles.bedImage}
                    resizeMode="contain"
                />
            </View>

            <TouchableOpacity
                style={styles.lampContainer}
                onPress={() => setIsLampOn(!isLampOn)}
                activeOpacity={0.8}
            >
                {isLampOn && (
                    <>
                        <View style={styles.lampGlowOuter} />
                        <View style={styles.lampGlowMiddle} />
                        <View style={styles.lampGlowInner} />
                    </>
                )}
                <Image
                    source={isLampOn
                        ? require('./lamp_lit.png')
                        : require('./lamp_unlit.png')
                    }
                    style={styles.lampImage}
                    resizeMode="contain"
                />
            </TouchableOpacity>

            {isLampOn && (
                <View style={styles.instructionBox}>
                    <Icon name="lightbulb-on-outline" size={24} color="#555" />
                    <Text style={styles.instructionText}>Turn off the light first!</Text>
                </View>
            )}

            {!isLampOn && (
                <View style={[styles.instructionBox, { top: undefined, bottom: height * 0.42 }]}> 
                    <Icon name="hand-back-right" size={24} color="#555" />
                    <Text style={styles.instructionText}>Drag the hand and pat the baby</Text>
                </View>
            )}

            {warningMessage !== '' && (
                <View style={styles.warningBox}>
                    <Text style={styles.warningText}>{warningMessage}</Text>
                </View>
            )}

            {/* --- CHARACTER IMAGE --- */}
            <View style={styles.characterContainer} pointerEvents="box-none">
                <Image
                    source={sleepiness >= 95
                       ? selectedCharacter.sleepImageClosed 
                       : selectedCharacter.sleepImageOpen
                    }
                    style={[
                        styles.characterBase, 
                        { width: charWidth, height: charHeight }
                    ]}
                    resizeMode="contain"
                />

                <Animated.View style={[styles.zzzParticle, { opacity: zzz1, left: 30, top: -20, transform: [{ translateY: zzz1.interpolate({ inputRange: [0, 1], outputRange: [0, -50] }) }] }]}>
                    <Text style={styles.zzzText}>Z</Text>
                </Animated.View>
                <Animated.View style={[styles.zzzParticle, { opacity: zzz2, right: 40, top: -10, transform: [{ translateY: zzz2.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) }] }]}>
                    <Text style={styles.zzzText}>z</Text>
                </Animated.View>
                <Animated.View style={[styles.zzzParticle, { opacity: zzz3, left: 80, top: 0, transform: [{ translateY: zzz3.interpolate({ inputRange: [0, 1], outputRange: [0, -70] }) }] }]}>
                    <Text style={styles.zzzText}>Z</Text>
                </Animated.View>

                <Animated.View style={[styles.musicNote, { opacity: musicNote1, left: 0, top: 50, transform: [{ translateY: musicNote1.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }] }]}>
                    <Icon name="music-note" size={25} color="#a8edea" />
                </Animated.View>
                <Animated.View style={[styles.musicNote, { opacity: musicNote2, right: 10, top: 60, transform: [{ translateY: musicNote2.interpolate({ inputRange: [0, 1], outputRange: [0, -50] }) }] }]}>
                    <Icon name="music-note" size={20} color="#fed6e3" />
                </Animated.View>
            </View>

            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Icon name="arrow-left" size={30} color="#fff" />
            </TouchableOpacity>

            <View style={styles.progressWrapper} pointerEvents="none">
                <Text style={styles.progressLabel}>Putting to sleep...</Text>
                <View style={styles.progressBarBg}>
                    <LinearGradient
                        colors={['#a8edea', '#fed6e3']}
                        style={[styles.progressBarFill, { width: `${sleepiness}%` }]}
                    />
                </View>
                <Text style={styles.progressPercent}>{Math.round(sleepiness)}%</Text>
            </View>

            <Animated.View
                style={[
                    styles.handContainer,
                    { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: handScale }] }
                ]}
                {...panResponder.panHandlers}
            >
                <Icon name="hand-back-right" size={80} color="#ffeaa7" />
                <Text style={styles.dragText}>Pat me!</Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f2027' },
    skyGradient: { flex: 2.5, overflow: 'hidden' },
    floor: { flex: 1, backgroundColor: '#8b4513', flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 5, borderTopColor: '#654321' },
    star: { position: 'absolute', backgroundColor: '#fff', borderRadius: 2, opacity: 0.8 },
    moon: { position: 'absolute', top: 60, right: 50, width: 80, height: 80, borderRadius: 40, backgroundColor: '#ffeaa7', justifyContent: 'center', alignItems: 'center', shadowColor: '#ffeaa7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20, elevation: 10 },
    moonGlow: { position: 'absolute', top: 40, right: 30, width: 120, height: 120, borderRadius: 60, backgroundColor: '#ffeaa7', shadowColor: '#ffeaa7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 30 },
    cloud: { position: 'absolute' },
    floorPlank: { width: width / 4, height: height / 8, borderRightWidth: 2, borderBottomWidth: 1, borderColor: '#654321', backgroundColor: '#a0522d' },
    window: { position: 'absolute', top: 80, right: 40, width: 100, height: 120, backgroundColor: '#2c5364', borderWidth: 5, borderColor: '#654321', borderRadius: 10, overflow: 'hidden' },
    windowGlass: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    windowFrame: { position: 'absolute', width: '100%', height: 2, backgroundColor: '#654321', top: '50%' },
    bedContainer: { position: 'absolute', bottom: height * 0.1, alignSelf: 'center', alignItems: 'center', zIndex: 5 },
    bedImage: { width: 380, height: 240 },
    characterContainer: { position: 'absolute', bottom: height * 0.15, alignSelf: 'center', alignItems: 'center', zIndex: 10 },
    // characterBase: { 
       
    // },

    lampContainer: { position: 'absolute', bottom: height * 0.20, right: 150, zIndex: 6 },
    lampImage: { width: 300, height: 150, zIndex: 2 },
    lampGlowOuter: { position: 'absolute', top: -80, left: 50, width: 200, height: 200, borderRadius: 100, backgroundColor: '#ffeaa7', opacity: 0.15, zIndex: 0 },
    lampGlowMiddle: { position: 'absolute', top: -60, left: 70, width: 160, height: 160, borderRadius: 80, backgroundColor: '#ffd93d', opacity: 0.25, zIndex: 0 },
    lampGlowInner: { position: 'absolute', top: -40, left: 90, width: 120, height: 120, borderRadius: 60, backgroundColor: '#ffeb3b', opacity: 0.35, zIndex: 0 },
    zzzParticle: { position: 'absolute', zIndex: 12 },
    zzzText: { fontSize: 40, fontWeight: 'bold', color: '#a8edea', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
    musicNote: { position: 'absolute', zIndex: 12 },
    backButton: { position: 'absolute', top: 40, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20, zIndex: 20 },
    progressWrapper: { position: 'absolute', top: 50, alignSelf: 'center', width: 220, alignItems: 'center', zIndex: 20 },
    progressLabel: { color: '#fff', fontWeight: 'bold', marginBottom: 5, fontSize: 14, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    progressBarBg: { width: '100%', height: 18, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, borderWidth: 2, borderColor: '#fff', overflow: 'hidden' },
    progressBarFill: { height: '100%' },
    progressPercent: { color: '#fff', fontWeight: 'bold', fontSize: 12, marginTop: 3, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
    handContainer: { position: 'absolute', bottom: 80, right: 30, zIndex: 100, alignItems: 'center' },
    dragText: { color: '#fff', fontWeight: 'bold', fontSize: 12, marginTop: 5, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
    instructionBox: { position: 'absolute', top: 150, right: 20, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, zIndex: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 },
    instructionText: { color: '#2c3e50', fontWeight: 'bold', fontSize: 14 },
    warningBox: { position: 'absolute', top: height * 0.4, alignSelf: 'center', backgroundColor: 'rgba(255, 99, 71, 0.9)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, zIndex: 50 },
    warningText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default BedroomScreen;