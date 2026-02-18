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
    Vibration,
    Easing,
    BackHandler
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

const SOAP_COLOR = '#ff7675';
const SHAMPOO_COLOR = '#fdcb6e';
const SHOWER_COLOR = '#74b9ff';
const LOTION_COLOR = '#a29bfe';

const MiniGameIntro = ({ visible, type, onStart, onClose }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;

    const handMove = useRef(new Animated.Value(0)).current;
    const handScale = useRef(new Animated.Value(1)).current;
    const itemOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 5,
                tension: 40,
                useNativeDriver: true
            }).start();

            startTutorialLoop();
        } else {
            scaleAnim.setValue(0);
            handMove.setValue(0);
            handScale.setValue(1);
            itemOpacity.setValue(0);
        }
    }, [visible, type]);

    const startTutorialLoop = () => {
        if (type === 'BATHING') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(handMove, { toValue: 60, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(itemOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                    Animated.timing(handMove, { toValue: -60, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(itemOpacity, { toValue: 0.5, duration: 200, useNativeDriver: true }),
                ])
            ).start();
        } else {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(handScale, { toValue: 0.8, duration: 300, useNativeDriver: true }),
                    Animated.delay(800),
                    Animated.timing(handScale, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.delay(400),
                ])
            ).start();
        }
    };

    if (!visible) return null;

    const config = type === 'TOILET' ? {
        title: "Potty Training",
        color: ['#ff9f43', '#ee5253'],
        icon: "toilet",
        instruction: "Hold the button to go!"
    } : {
        title: "Bath Time",
        color: ['#4facfe', '#00f2fe'],
        icon: "duck",
        instruction: "Drag tools to scrub & clean!"
    };

    return (
        <View style={styles.introOverlay}>
            <Animated.View style={[styles.introCard, { transform: [{ scale: scaleAnim }] }]}>

                <LinearGradient colors={config.color} style={styles.introHeader}>
                    <Icon name={config.icon} size={40} color="#fff" />
                    <Text style={styles.introTitle}>{config.title}</Text>
                    <TouchableOpacity style={styles.introCloseBtn} onPress={onClose}>
                        <Icon name="close-circle" size={30} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                </LinearGradient>

                <View style={styles.demoContainer}>

                    <View style={[styles.demoCircle, { borderColor: config.color[0] }]}>

                        {type === 'BATHING' && (
                            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                <Icon name="emoticon-happy" size={60} color="#dfe6e9" />

                                <Animated.View style={{
                                    position: 'absolute',
                                    transform: [{ translateX: handMove }]
                                }}>
                                    <View style={styles.demoTool}>
                                        <Icon name="bottle-tonic" size={30} color="#fab1a0" />
                                    </View>

                                    <Icon name="hand-pointing-up" size={40} color="#2d3436" style={{ top: 10, left: 10 }} />

                                    <Animated.View style={{ opacity: itemOpacity, position: 'absolute', top: -10, left: -10 }}>
                                        <Icon name="star-four-points" size={20} color="#74b9ff" />
                                    </Animated.View>
                                </Animated.View>
                            </View>
                        )}

                        {type === 'TOILET' && (
                            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                <View style={styles.demoButtonBg}>
                                    <Icon name="chevron-triple-down" size={30} color="#fff" />
                                </View>

                                <Animated.View style={{
                                    position: 'absolute',
                                    top: 10,
                                    transform: [{ scale: handScale }]
                                }}>
                                    <Icon name="hand-pointing-up" size={50} color="#2d3436" />
                                    <Animated.View style={[
                                        styles.demoRipple,
                                        {
                                            opacity: handScale.interpolate({ inputRange: [0.8, 1], outputRange: [1, 0] }),
                                            transform: [{ scale: handScale.interpolate({ inputRange: [0.8, 1], outputRange: [0.8, 1.5] }) }]
                                        }
                                    ]} />
                                </Animated.View>
                            </View>
                        )}

                    </View>

                    <Text style={styles.demoInstruction}>{config.instruction}</Text>

                </View>

                <TouchableOpacity activeOpacity={0.8} onPress={onStart}>
                    <LinearGradient colors={['#2ecc71', '#27ae60']} style={styles.introStartBtn}>
                        <Text style={styles.introStartText}>PLAY</Text>
                        <Icon name="play" size={24} color="#fff" style={{ marginLeft: 10 }} />
                    </LinearGradient>
                </TouchableOpacity>

            </Animated.View>
        </View>
    );
};

const ToiletMinigame = ({ onFinish, onBack, initialBladder = 0, selectedCharacter }) => {
    const [phase, setPhase] = useState('URGENT');

    const [pressure, setPressure] = useState(initialBladder);
    const [isGoing, setIsGoing] = useState(false);

    const intervalRef = useRef(null);

    const urgencyShake = useRef(new Animated.Value(0)).current;
    const toiletPulse = useRef(new Animated.Value(1)).current;

    const charPosition = useRef(new Animated.ValueXY({ x: -80, y: 20 })).current;
    const charScale = useRef(new Animated.Value(1)).current;

    const sitShake = useRef(new Animated.Value(0)).current;

    const doorAnim = useRef(new Animated.Value(0)).current;

    const waterSpin = useRef(new Animated.Value(0)).current;
    const waterLevel = useRef(new Animated.Value(0)).current;
    const handleRotate = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    useEffect(() => {
        if (phase === 'URGENT' || phase === 'SELECTED') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(urgencyShake, { toValue: 5, duration: 80, useNativeDriver: true }),
                    Animated.timing(urgencyShake, { toValue: -5, duration: 80, useNativeDriver: true }),
                    Animated.timing(urgencyShake, { toValue: 0, duration: 80, useNativeDriver: true }),
                ])
            ).start();
        } else {
            urgencyShake.setValue(0);
        }

        if (phase === 'SELECTED') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(toiletPulse, { toValue: 1.1, duration: 500, useNativeDriver: true }),
                    Animated.timing(toiletPulse, { toValue: 1, duration: 500, useNativeDriver: true })
                ])
            ).start();
        } else {
            toiletPulse.setValue(1);
        }
    }, [phase]);

    const handleBabyTap = () => {
        if (phase === 'URGENT') {
            Vibration.vibrate(20);
            setPhase('SELECTED');
        }
    };

    const handleToiletTap = () => {
        if (phase === 'SELECTED') {
            Vibration.vibrate(20);
            setPhase('MOVING');

            Animated.parallel([
                Animated.spring(charPosition, {
                    toValue: { x: 0, y: 0 },
                    useNativeDriver: true,
                    speed: 12,
                    bounciness: 6
                }),
                Animated.timing(charScale, {
                    toValue: 0.95,
                    duration: 400,
                    useNativeDriver: true
                })
            ]).start(() => {
                setPhase('SITTING');
                closeDoor();
            });
        }
    };
    const closeDoor = () => {
        Animated.spring(doorAnim, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true
        }).start();
    };

    const openDoor = (callback) => {
        Animated.timing(doorAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true
        }).start(callback);
    };

    const handlePressIn = () => {
        if (pressure <= 0 || phase !== 'SITTING') return;
        setIsGoing(true);

        Animated.loop(
            Animated.sequence([
                Animated.timing(sitShake, { toValue: 3, duration: 50, useNativeDriver: true }),
                Animated.timing(sitShake, { toValue: -3, duration: 50, useNativeDriver: true })
            ])
        ).start();

        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            setPressure((prev) => {
                const newVal = prev - 2;
                if (newVal % 10 === 0) Vibration.vibrate(20);
                if (newVal <= 0) {
                    stopAction();
                    return 0;
                }
                return newVal;
            });
        }, 100);
    };

    const handlePressOut = () => {
        stopAction();
    };

    const stopAction = () => {
        setIsGoing(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        sitShake.setValue(0);
        sitShake.stopAnimation();
    };

    const handleFlush = () => {
        if (pressure > 0) return;

        openDoor(() => {
            setPhase('FLUSHING');
            Vibration.vibrate(50);

            Animated.sequence([
                Animated.timing(handleRotate, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(handleRotate, { toValue: 0, duration: 300, useNativeDriver: true })
            ]).start();

            Animated.parallel([
                Animated.timing(waterLevel, { toValue: 1, duration: 2000, useNativeDriver: false }),
                Animated.loop(
                    Animated.timing(waterSpin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
                )
            ]).start();

            setTimeout(() => {
                setPhase('DONE');
                onFinish();
            }, 2500);
        });
    };

    const rotateWiggle = urgencyShake.interpolate({
        inputRange: [-5, 5],
        outputRange: ['-10deg', '10deg']
    });

    const handleRotation = handleRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '45deg']
    });

    const spin = waterSpin.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    const doorScaleX = doorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.1, 1]
    });

    const doorTranslateX = doorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [150, 0]
    });

    const doorOpacity = doorAnim.interpolate({
        inputRange: [0, 0.1, 1],
        outputRange: [0, 1, 1]
    });

    return (
        <View style={styles.toiletContainer}>

            <View style={styles.stallWall} />
            <View style={styles.stallFloor} />

            <View style={styles.toiletWrapper}>

                {phase === 'SELECTED' && (
                    <Animated.View style={[styles.arrowBounce, { transform: [{ scale: toiletPulse }] }]}>
                        <Icon name="arrow-down-bold" size={40} color="#e74c3c" />
                    </Animated.View>
                )}

                {/* Visual toilet components (non-interactive) */}
                <View style={{ alignItems: 'center' }}>
                    <View style={styles.toiletTank}>
                        <View style={styles.flushTouchArea}>
                            <Animated.View style={[styles.flushHandleBase, { transform: [{ rotate: handleRotation }] }]}>
                                <View style={styles.flushKnob} />
                                <View style={styles.flushStick} />
                            </Animated.View>
                        </View>
                    </View>

                    <Animated.View
                        style={[
                            styles.toiletBowl,
                            phase === 'SELECTED' && {
                                borderColor: '#f1c40f',
                                borderWidth: 4,
                                transform: [{ scale: toiletPulse }]
                            }
                        ]}
                    >
                        {phase === 'FLUSHING' && (
                            <Animated.View style={[styles.waterSwirl, { transform: [{ rotate: spin }] }]}>
                                <LinearGradient colors={['#74b9ff', '#0984e3']} style={styles.swirlGradient} />
                            </Animated.View>
                        )}
                    </Animated.View>

                    <View style={styles.toiletSeat} />
                    <View style={styles.toiletLeg} />
                </View>

                {/* Touchable overlay positioned exactly over the toilet area */}
                {phase === 'SELECTED' && (
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={handleToiletTap}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 25,
                        }}
                    />
                )}

                <Animated.View
                    style={[
                        styles.sitterContainer,
                        {
                            transform: [
                                { translateX: charPosition.x },
                                { translateY: charPosition.y },
                                { scale: charScale },
                                { rotate: (phase === 'URGENT' || phase === 'SELECTED') ? rotateWiggle : '0deg' },
                                { translateX: sitShake }
                            ]
                        }
                    ]}
                >
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={handleBabyTap}
                        disabled={phase !== 'URGENT'}
                    >
                        <Image
                            source={selectedCharacter.image}
                            style={[
                                styles.sittingChar,
                                (isGoing) && { transform: [{ scaleX: -1 }] }
                            ]}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>

                    {phase === 'URGENT' && (
                        <View style={styles.urgentBubble}>
                            <Icon name="cursor-pointer" size={30} color="#e74c3c" />
                        </View>
                    )}
                </Animated.View>

                <Animated.View
                    style={[
                        styles.stallDoor,
                        {
                            opacity: doorOpacity,
                            transform: [
                                { translateX: doorTranslateX },
                                { scaleX: doorScaleX },
                                { translateX: sitShake }
                            ]
                        }
                    ]}
                >
                    <View style={styles.doorFrameInner}>
                        <View style={styles.doorSlat} />
                        <View style={styles.doorSlat} />
                        <View style={styles.doorHandle} />

                        {isGoing && (
                            <View style={styles.doorStatus}>
                                <Icon name="dots-horizontal" size={40} color="#e74c3c" />
                            </View>
                        )}
                        {phase === 'SITTING' && pressure > 0 && !isGoing && (
                            <View style={[styles.doorStatus, { borderColor: '#27ae60' }]}>
                                <Icon name="human-male" size={40} color="#27ae60" />
                            </View>
                        )}
                    </View>
                </Animated.View>

                <View style={styles.stallFrameRight} />

            </View>

            <View style={styles.toiletUI}>

                {phase === 'URGENT' && (
                    <View style={styles.guideMsg}>
                        <Text style={styles.guideText}>Tap the Baby!</Text>
                    </View>
                )}
                {phase === 'SELECTED' && (
                    <View style={styles.guideMsg}>
                        <Text style={styles.guideText}>Tap the Seat!</Text>
                    </View>
                )}

                {phase === 'SITTING' && pressure > 0 && (
                    <TouchableOpacity
                        style={styles.actionBtn}
                        activeOpacity={0.8}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                    >
                        <LinearGradient colors={['#ff9f43', '#ee5253']} style={styles.btnGradient}>
                            <Icon name="chevron-triple-down" size={40} color="#fff" />
                            <Text style={styles.btnText}>HOLD TO GO</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {phase === 'SITTING' && pressure <= 0 && (
                    <TouchableOpacity
                        style={styles.actionBtn}
                        activeOpacity={0.8}
                        onPress={handleFlush}
                    >
                        <LinearGradient colors={['#00cec9', '#0984e3']} style={styles.btnGradient}>
                            <Icon name="rotate-3d-variant" size={40} color="#fff" />
                            <Text style={styles.btnText}>FLUSH</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {(phase === 'FLUSHING' || phase === 'DONE') && (
                    <View style={styles.doneMessage}>
                        <Text style={styles.doneText}>Cleaning...</Text>
                    </View>
                )}
            </View>

            {phase === 'SITTING' && (
                <View style={styles.meterContainer}>
                    <Icon name="speedometer" size={24} color="#fff" />
                    <View style={styles.meterBarBg}>
                        <View style={[styles.meterFill, { width: `${pressure}%`, backgroundColor: pressure > 60 ? '#ff7675' : '#55efc4' }]} />
                    </View>
                </View>
            )}

        </View>
    );
};


const ToolItem = ({ icon, color, label, isActive, onPress, bounce }) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (bounce) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, { toValue: -15, duration: 400, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: true })
                ])
            ).start();
        } else {
            anim.setValue(0);
        }
    }, [bounce]);

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
            <Animated.View style={[styles.toolItem, { transform: [{ translateY: anim }] }]}>
                <View style={[
                    styles.toolIconBg,
                    { backgroundColor: color, borderWidth: isActive ? 3 : 0, borderColor: '#fff' }
                ]}>
                    <Icon name={icon} size={28} color={'#fff'} />
                </View>
                <Text style={styles.toolLabel}>{label}</Text>
                {isActive && <View style={styles.activeTriangle} />}
            </Animated.View>
        </TouchableOpacity>
    );
};

const BathingMinigame = ({ onFinish, onBack, initialHygiene = 0, selectedCharacter }) => {
    const isAlreadyClean = initialHygiene >= 100;

    const [step, setStep] = useState(isAlreadyClean ? 4 : 0);
    const [selectedTool, setSelectedTool] = useState(isAlreadyClean ? 'LOTION' : 'SHAMPOO');

    const [justWon, setJustWon] = useState(false);

    const stepRef = useRef(step);
    const toolRef = useRef(selectedTool);

    useEffect(() => { stepRef.current = step; }, [step]);
    useEffect(() => { toolRef.current = selectedTool; }, [selectedTool]);

    const mudOpacity = useRef(new Animated.Value(isAlreadyClean ? 0 : 1)).current;
    const foamOpacity = useRef(new Animated.Value(0)).current;
    const sparkleOpacity = useRef(new Animated.Value(isAlreadyClean ? 1 : 0)).current;

    const pan = useRef(new Animated.ValueXY()).current;
    const toolScale = useRef(new Animated.Value(1)).current;
    const waterStreamHeight = useRef(new Animated.Value(0)).current;

    const handleWashAgain = () => {
        mudOpacity.stopAnimation();
        foamOpacity.stopAnimation();
        sparkleOpacity.stopAnimation();

        mudOpacity.setValue(1);
        foamOpacity.setValue(0);
        sparkleOpacity.setValue(0);

        setStep(0);
        setSelectedTool('SHAMPOO');
        setJustWon(false);

        pan.setValue({ x: 0, y: 0 });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                Animated.spring(toolScale, { toValue: 1.2, useNativeDriver: false }).start();
                if (toolRef.current === 'SHOWER') {
                    Animated.timing(waterStreamHeight, { toValue: 180, duration: 200, useNativeDriver: false }).start();
                }
                pan.setOffset({ x: pan.x._value, y: pan.y._value });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: (e, gesture) => {
                pan.x.setValue(gesture.dx);
                pan.y.setValue(gesture.dy);
                handleToolAction(gesture.moveX, gesture.moveY);
            },
            onPanResponderRelease: () => {
                pan.flattenOffset();
                Animated.parallel([
                    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }),
                    Animated.spring(toolScale, { toValue: 1, useNativeDriver: false }),
                    Animated.timing(waterStreamHeight, { toValue: 0, duration: 150, useNativeDriver: false })
                ]).start();
            },
        })
    ).current;

    const handleToolAction = (x, y) => {
        const isOverChar = y > height * 0.25 && y < height * 0.65 && x > width * 0.15 && x < width * 0.85;

        if (!isOverChar) return;

        const currentStep = stepRef.current;
        const currentTool = toolRef.current;
        const scrubSpeed = 0.05;

        if (currentStep === 0) {
            if (currentTool === 'SHAMPOO') {
                let curMud = mudOpacity._value;
                let curFoam = foamOpacity._value;
                if (curMud > 0.5) mudOpacity.setValue(Math.max(0.5, curMud - scrubSpeed));
                if (curFoam < 0.5) foamOpacity.setValue(Math.min(0.5, curFoam + scrubSpeed));
                if (curFoam >= 0.48) setStep(1);
            }
        } else if (currentStep === 1) {
            if (currentTool === 'SOAP') {
                let curMud = mudOpacity._value;
                let curFoam = foamOpacity._value;
                if (curMud > 0) mudOpacity.setValue(Math.max(0, curMud - scrubSpeed));
                if (curFoam < 1) foamOpacity.setValue(Math.min(1, curFoam + scrubSpeed));
                if (curFoam >= 0.98) setStep(2);
            }
        } else if (currentStep === 2) {
            if (currentTool === 'SHOWER') {
                let curFoam = foamOpacity._value;
                if (curFoam > 0) foamOpacity.setValue(Math.max(0, curFoam - scrubSpeed));
                if (curFoam <= 0.02) setStep(3);
            }
        } else if (currentStep === 3) {
            if (currentTool === 'LOTION') {
                let curSpark = sparkleOpacity._value;
                if (curSpark < 1) sparkleOpacity.setValue(Math.min(1, curSpark + scrubSpeed));
                if (curSpark >= 0.98) {
                    setStep(4);
                    setJustWon(true);

                    setTimeout(() => {
                        setJustWon(false);
                        if (onFinish) onFinish();
                    }, 2500);
                }
            }
        }
    };

    const getToolIcon = () => {
        switch (selectedTool) {
            case 'SOAP': return 'hand-wash';
            case 'SHAMPOO': return 'bottle-tonic';
            case 'SHOWER': return 'shower-head';
            case 'LOTION': return 'creation';
            default: return 'hand-wash';
        }
    };

    const getToolColor = () => {
        switch (selectedTool) {
            case 'SOAP': return SOAP_COLOR;
            case 'SHAMPOO': return SHAMPOO_COLOR;
            case 'SHOWER': return SHOWER_COLOR;
            case 'LOTION': return LOTION_COLOR;
            default: return '#fff';
        }
    };

    const getInstruction = () => {
        switch (step) {
            case 0: return "Use Shampoo First!";
            case 1: return "Now Scrub with Soap!";
            case 2: return "Rinse Bubbles Away!";
            case 3: return "Apply Lotion!";
            case 4: return "Baby is Clean!";
            default: return "";
        }
    };

    return (
        <View style={styles.container}>

            <View style={styles.wall}>
                <View style={styles.tileGrid}>{[...Array(25)].map((_, i) => <View key={i} style={styles.tileLine} />)}</View>
            </View>
            <View style={styles.sceneContainer}>
                <View style={styles.tubBackContainer}>
                    <View style={styles.tubRimBack} />
                    <View style={styles.tubBodyBack} />
                </View>

                <Image
                    source={selectedCharacter.bathImage}
                    style={styles.character}
                    resizeMode="contain"
                />

                <Animated.View style={[styles.overlayLayer, { opacity: mudOpacity }]}>
                    <Icon name="checkbox-blank-circle" size={50} color="#5d4037" style={{ position: 'absolute', top: 100, left: 80, opacity: 0.6 }} />
                    <Icon name="checkbox-blank-circle" size={70} color="#5d4037" style={{ position: 'absolute', top: 160, right: 60, opacity: 0.7 }} />
                    <Icon name="blur" size={100} color="#3e2723" style={{ position: 'absolute', top: 120, left: 40, opacity: 0.5 }} />
                </Animated.View>

                <Animated.View style={[styles.overlayLayer, { opacity: foamOpacity }]}>
                    <Icon name="cloud" size={80} color="#fff" style={{ position: 'absolute', top: 40, left: 70, opacity: 0.95 }} />
                    <Icon name="cloud" size={100} color="#fff" style={{ position: 'absolute', top: 130, left: 30, opacity: 0.95 }} />
                    <Icon name="cloud" size={110} color="#fff" style={{ position: 'absolute', top: 180, left: 60, opacity: 0.95 }} />
                </Animated.View>

                <View style={styles.tubWater}>
                    <LinearGradient colors={['rgba(84, 160, 255, 0.6)', 'rgba(46, 134, 222, 0.9)']} style={{ flex: 1 }} />
                    <View style={{ height: 10, width: '100%', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 5 }} />
                </View>
                <View style={styles.tubFrontContainer}>
                    <View style={styles.tubRimFront} />
                    <LinearGradient colors={['#ffffff', '#dfe6e9']} style={styles.tubBodyFront}>
                        <View style={styles.tubShine} />
                    </LinearGradient>
                </View>
                <View style={styles.tubLegsContainer}>
                    <Image source={{ uri: 'https://img.icons8.com/ios-filled/50/DAA520/foot.png' }} style={styles.tubFoot} />
                    <Image source={{ uri: 'https://img.icons8.com/ios-filled/50/DAA520/foot.png' }} style={[styles.tubFoot, { transform: [{ scaleX: -1 }] }]} />
                </View>
            </View>

            {step === 4 && !justWon && (
                <TouchableOpacity style={styles.washAgainBtn} onPress={handleWashAgain}>
                    <Icon name="refresh" size={24} color="#fff" />
                    <Text style={styles.washAgainText}>Wash Again</Text>
                </TouchableOpacity>
            )}

            {step < 4 && (
                <View style={styles.instructionBubble}>
                    <Text style={styles.instructionText}>{getInstruction()}</Text>
                </View>
            )}

            <View style={styles.shelfContainer}>
                <LinearGradient colors={['#b2bec3', '#636e72']} style={styles.shelfBg} />
                <ToolItem icon="bottle-tonic" color={SHAMPOO_COLOR} label="Shampoo" isActive={selectedTool === 'SHAMPOO'} onPress={() => setSelectedTool('SHAMPOO')} bounce={step === 0} />
                <ToolItem icon="hand-wash" color={SOAP_COLOR} label="Soap" isActive={selectedTool === 'SOAP'} onPress={() => setSelectedTool('SOAP')} bounce={step === 1} />
                <ToolItem icon="shower-head" color={SHOWER_COLOR} label="Rinse" isActive={selectedTool === 'SHOWER'} onPress={() => setSelectedTool('SHOWER')} bounce={step === 2} />
                <ToolItem icon="creation" color={LOTION_COLOR} label="Lotion" isActive={selectedTool === 'LOTION'} onPress={() => setSelectedTool('LOTION')} bounce={step === 3} />
            </View>

            {step < 4 && (
                <Animated.View
                    style={[
                        styles.floatingTool,
                        {
                            backgroundColor: getToolColor(),
                            transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: toolScale }]
                        }
                    ]}
                    {...panResponder.panHandlers}
                >
                    <Icon name={getToolIcon()} size={35} color={selectedTool === 'LOTION' ? '#6c5ce7' : '#fff'} />
                    {selectedTool === 'SHOWER' && (
                        <Animated.View style={[styles.waterStreamContainer, { height: waterStreamHeight }]}>
                            <LinearGradient colors={['#74b9ff', 'rgba(116, 185, 255, 0.2)']} style={styles.streamGradient} />
                        </Animated.View>
                    )}
                </Animated.View>
            )}

            {step === 4 && justWon && (
                <View style={styles.celebrationOverlay}>
                    <Animated.View style={{ transform: [{ scale: 1.2 }] }}>
                        <Icon name="star-circle" size={120} color="#f1c40f" />
                    </Animated.View>
                    <Text style={styles.winText}>SQUEAKY CLEAN!</Text>
                </View>
            )}
        </View>
    );
};


const BathroomScreen = ({ onBack, onCleanFinished, selectedCharacter }) => {
    const navigation = useNavigation();

    const [viewMode, setViewMode] = useState('ROOM');
    const [hygiene, setHygiene] = useState(20);
    const [bladder, setBladder] = useState(100);

    const [introVisible, setIntroVisible] = useState(false);
    const [pendingMode, setPendingMode] = useState(null);

    useEffect(() => {
        const handleBackPress = () => {
            if (introVisible) {
                setIntroVisible(false);
                setPendingMode(null);
                return true;
            }

            if (viewMode === 'BATHING' || viewMode === 'TOILET') {
                setViewMode('ROOM');
                return true;
            }

            if (viewMode === 'ROOM') {
                if (onBack) {
                    onBack();
                    return true;
                }
            }

            return false;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

        return () => {
            backHandler.remove();
        };
    }, [viewMode, onBack, introVisible]);

    const pulse = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true })
            ])
        ).start();
    }, []);

    const handleFinishBath = () => {
        setHygiene(100);
        if (onCleanFinished) {
            onCleanFinished(0.5);
        }
        setViewMode('ROOM');
    };

    const handleFinishToilet = () => {
        setBladder(0);
        if (onCleanFinished) {
            onCleanFinished(0.5);
        }
        setViewMode('ROOM');
    };

    const handlePressBathtub = () => {
        setPendingMode('BATHING');
        setIntroVisible(true);
    };

    const handlePressToilet = () => {
        setPendingMode('TOILET');
        setIntroVisible(true);
    };

    const handleStartGame = () => {
        setIntroVisible(false);
        if (pendingMode === 'TOILET') {
            setBladder(100);
            setViewMode('TOILET');
        } else if (pendingMode === 'BATHING') {
            setViewMode('BATHING');
        }
        setPendingMode(null);
    };

    return (
        <View style={styles.container}>

            {viewMode === 'ROOM' && (
                <View style={{ flex: 1 }}>
                    <View style={styles.wall} />
                    <View style={styles.floor} />

                    <TouchableOpacity style={styles.tubObj} onPress={handlePressBathtub}>
                        <Animated.View style={{ transform: [{ scale: hygiene < 50 ? pulse : 1 }] }}>
                            <Icon name="bathtub" size={90} color="#fff" style={styles.shadow} />
                            {hygiene < 50 && <View style={styles.alertBadge} />}
                        </Animated.View>
                        <Text style={styles.objLabel}>Take Bath</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.toiletObj} onPress={handlePressToilet}>
                        <Animated.View style={{ transform: [{ scale: bladder > 70 ? pulse : 1 }] }}>
                            <Icon name="toilet" size={90} color="#fff" style={styles.shadow} />
                            {bladder > 70 && <View style={styles.alertBadge} />}
                        </Animated.View>
                        <Text style={styles.objLabel}>Toilet</Text>
                    </TouchableOpacity>

                    <View style={styles.charPos}>
                        <Image source={selectedCharacter.image} style={styles.charImg} resizeMode="contain" />
                    </View>

                    <TouchableOpacity
                        style={styles.backBtn}
                        activeOpacity={0.7}
                        onPress={onBack}
                    >
                        <Icon name="arrow-left-circle" size={40} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}

            {viewMode === 'BATHING' && (
                <BathingMinigame
                    onFinish={handleFinishBath}
                    onBack={() => setViewMode('ROOM')}
                    initialHygiene={hygiene}
                    selectedCharacter={selectedCharacter}
                />
            )}

            {viewMode === 'TOILET' && (
                <ToiletMinigame
                    onFinish={handleFinishToilet}
                    onBack={() => setViewMode('ROOM')}
                    initialBladder={bladder}
                    selectedCharacter={selectedCharacter}
                />
            )}

            {viewMode === 'ROOM' && (
                <MiniGameIntro
                    visible={introVisible}
                    type={pendingMode}
                    onStart={handleStartGame}
                    onClose={() => {
                        setIntroVisible(false);
                        setPendingMode(null);
                    }}
                />
            )}

        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#81ecec' },
    wall: { flex: 3, backgroundColor: '#74b9ff' },
    floor: { flex: 1, backgroundColor: '#54a0ff', borderTopWidth: 10, borderColor: '#2e86de' },
    tileGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
    tileLine: { height: height / 25, width: '100%', borderBottomWidth: 1, borderColor: '#fff' },
    shadow: { textShadowColor: 'rgba(0,0,0,0.2)', textShadowRadius: 5 },

    sceneContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 100, alignItems: 'center', justifyContent: 'flex-end' },
    tubBackContainer: { width: 320, height: 220, position: 'absolute', bottom: 90, alignItems: 'center' },
    tubRimBack: { width: 320, height: 40, backgroundColor: '#dfe6e9', borderRadius: 20, zIndex: 1, top: 10 },
    tubBodyBack: { width: 300, height: 200, backgroundColor: '#b2bec3', borderBottomLeftRadius: 100, borderBottomRightRadius: 100, position: 'absolute', top: 20 },
    character: { width: 220, height: 260, position: 'absolute', bottom: 110, zIndex: 2 },
    overlayLayer: { width: 240, height: 280, position: 'absolute', bottom: 110, zIndex: 3 },
    tubWater: { width: 290, height: 70, position: 'absolute', bottom: 110, zIndex: 4, borderBottomLeftRadius: 100, borderBottomRightRadius: 100, overflow: 'hidden', opacity: 0.8 },
    tubFrontContainer: { width: 330, height: 130, position: 'absolute', bottom: 20, zIndex: 10, alignItems: 'center' },
    tubRimFront: { width: 330, height: 30, backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: '#ecf0f1', shadowColor: '#000', shadowOpacity: 0.1, elevation: 3 },
    tubBodyFront: { width: 310, height: 110, borderBottomLeftRadius: 120, borderBottomRightRadius: 120, position: 'absolute', top: 15, borderWidth: 1, borderColor: '#dfe6e9' },
    tubShine: { width: 60, height: 80, backgroundColor: 'rgba(255,255,255,0.6)', position: 'absolute', top: 20, right: 60, borderRadius: 30, transform: [{ rotate: '20deg' }] },
    tubLegsContainer: { width: 280, flexDirection: 'row', justifyContent: 'space-between', position: 'absolute', bottom: 5, zIndex: 20 },
    tubFoot: { width: 50, height: 50, tintColor: '#e1b12c' },

    toiletContainer: { flex: 1, backgroundColor: '#a3d4f5ff' },
    stallWall: { ...StyleSheet.absoluteFillObject, backgroundColor: '#e2e2e2', borderLeftWidth: 20, borderRightWidth: 20, borderColor: '#d1ccc0' },
    stallFloor: { position: 'absolute', bottom: 0, width: '100%', height: 100, backgroundColor: '#b2bec3', borderTopWidth: 5, borderColor: '#636e72' },

    toiletWrapper: { position: 'absolute', bottom: 100, alignSelf: 'center', alignItems: 'center', width: 300, zIndex: 10 },
    toiletTank: { width: 140, height: 100, backgroundColor: '#ecf0f1', borderRadius: 15, zIndex: 1, borderWidth: 1, borderColor: '#bdc3c7' },
    toiletBowl: { width: 160, height: 120, backgroundColor: '#fff', borderBottomLeftRadius: 80, borderBottomRightRadius: 80, zIndex: 20, top: -10, borderWidth: 1, borderColor: '#bdc3c7', overflow: 'hidden' },
    toiletSeat: { width: 160, height: 30, backgroundColor: '#fff', borderRadius: 15, zIndex: 21, top: -140, borderWidth: 1, borderColor: '#bdc3c7' },
    toiletLeg: { width: 100, height: 50, backgroundColor: '#ecf0f1', zIndex: 19, top: -20, borderRadius: 10 },

    sitterContainer: { position: 'absolute', bottom: 80, zIndex: 30 },
    sittingChar: { width: 200, height: 240, marginBottom: -40 },
    urgentBubble: { position: 'absolute', top: 10, left: 20, backgroundColor: '#fff', borderRadius: 20, padding: 5, elevation: 5 },

    flushTouchArea: { position: 'absolute', top: 10, right: -40, width: 60, height: 60, justifyContent: 'center' },
    flushHandleBase: { width: 10, height: 10, backgroundColor: '#95a5a6', borderRadius: 5, zIndex: 2 },
    flushKnob: { width: 15, height: 15, backgroundColor: '#bdc3c7', borderRadius: 7.5, position: 'absolute', top: -2, right: -2 },
    flushStick: { width: 40, height: 6, backgroundColor: '#bdc3c7', borderRadius: 3, position: 'absolute', right: -30, top: 2 },
    arrowBounce: { position: 'absolute', top: -40, left: 60, zIndex: 30 },

    waterSwirl: { width: 200, height: 200, position: 'absolute', top: -40, left: -20 },
    swirlGradient: { flex: 1, borderRadius: 100 },

    toiletUI: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center', zIndex: 100 },
    actionBtn: { width: 200, height: 80, borderRadius: 40, elevation: 5 },
    btnGradient: { flex: 1, borderRadius: 40, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 20, marginLeft: 10 },
    doneMessage: { padding: 20, backgroundColor: '#2ecc71', borderRadius: 20 },
    doneText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },

    meterContainer: { position: 'absolute', top: 50, left: 20, width: 150, height: 40, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
    meterBarBg: { flex: 1, height: 10, backgroundColor: '#fff', borderRadius: 5, marginLeft: 10, overflow: 'hidden' },
    meterFill: { height: '100%' },
    guideMsg: { marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 15 },
    guideText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    stallDoor: {
        position: 'absolute',
        bottom: -10,
        right: -20,
        width: 240,
        height: 380,
        backgroundColor: '#7bed9f',
        borderWidth: 4,
        borderColor: '#2ecc71',
        borderRadius: 10,
        zIndex: 50,
        elevation: 10,
        transform: [{ translateX: 0 }],
    },
    doorFrameInner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#a3e9a4',
        margin: 10,
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.05)'
    },
    doorSlat: {
        width: '80%',
        height: 2,
        backgroundColor: 'rgba(0,0,0,0.1)',
        marginVertical: 20
    },
    doorHandle: {
        position: 'absolute',
        left: 15,
        top: '50%',
        width: 15,
        height: 50,
        backgroundColor: '#bdc3c7',
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#95a5a6',
        elevation: 2
    },
    stallFrameRight: {
        position: 'absolute',
        right: -40,
        bottom: -10,
        width: 30,
        height: 400,
        backgroundColor: '#dfe6e9',
        borderLeftWidth: 5,
        borderColor: '#b2bec3',
        zIndex: 60
    },
    doorStatus: {
        position: 'absolute',
        top: 40,
        backgroundColor: '#fff',
        padding: 5,
        borderRadius: 30,
        elevation: 2,
        borderWidth: 3,
        borderColor: '#e74c3c'
    },

    shelfContainer: { position: 'absolute', bottom: 0, width: '100%', height: 90, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 15, zIndex: 50 },
    shelfBg: { ...StyleSheet.absoluteFillObject, borderTopLeftRadius: 15, borderTopRightRadius: 15, borderTopWidth: 4, borderColor: '#636e72' },
    toolItem: { alignItems: 'center', width: 70 },
    toolIconBg: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3 },
    toolLabel: { color: '#fff', fontSize: 11, fontWeight: 'bold', marginTop: 5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2 },
    activeTriangle: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#fff', position: 'absolute', top: -10 },
    floatingTool: { position: 'absolute', bottom: 120, alignSelf: 'center', width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', elevation: 20, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, borderWidth: 2, borderColor: '#fff' },
    waterStreamContainer: { position: 'absolute', top: 50, width: 20, alignItems: 'center', overflow: 'hidden' },
    streamGradient: { flex: 1, width: 12, borderRadius: 6 },
    toolBubbles: { position: 'absolute', top: -15, right: -15 },
    instructionBubble: { position: 'absolute', top: 50, alignSelf: 'center', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 30, elevation: 5, borderWidth: 2, borderColor: '#dfe6e9' },
    instructionText: { fontSize: 20, fontWeight: 'bold', color: '#2d3436' },
    washAgainBtn: { position: 'absolute', top: 50, alignSelf: 'center', backgroundColor: '#00b894', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 30, elevation: 5, flexDirection: 'row', alignItems: 'center' },
    washAgainText: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 8 },
    celebrationOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 200 },
    winText: { fontSize: 36, fontWeight: '900', color: '#00b894', marginTop: 20, letterSpacing: 2 },

    tubObj: { position: 'absolute', bottom: 120, left: 30, alignItems: 'center' },
    toiletObj: { position: 'absolute', bottom: 120, right: 30, alignItems: 'center' },
    charPos: { position: 'absolute', bottom: 150, alignSelf: 'center' },
    charImg: { width: 140, height: 190 },
    alertBadge: { position: 'absolute', top: 0, right: 0, width: 24, height: 24, backgroundColor: '#ff7675', borderRadius: 12, borderWidth: 2, borderColor: '#fff' },
    objLabel: { fontWeight: 'bold', color: '#fff', marginTop: 8, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },

    backBtn: {
        position: 'absolute',
        top: 40,
        left: 20,
        padding: 10,
        zIndex: 100,
        elevation: 10,
    },

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
    demoButtonBg: {
        width: 60,
        height: 60,
        backgroundColor: '#ff7675',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 5,
        borderBottomColor: '#d63031'
    },
    demoRipple: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0,0,0,0.1)',
        top: -15,
        left: -15,
        zIndex: -1
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

export default BathroomScreen;