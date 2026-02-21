// Riderplayscreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Dimensions, StyleSheet,
  Image, StatusBar, Modal, Animated, BackHandler, AppState
} from 'react-native';
import { GameEngine } from 'react-native-game-engine';
// import Sound from 'react-native-sound';
import { accelerometer, setUpdateIntervalForType, SensorTypes } from "react-native-sensors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- CONFIGURATION ---
const TARGET_SPEED = 20; // 200 KM/H

// ASSETS
const BIKE_IMG = require('./Bike.png'); // Bike image, now the only player image
const ENEMY_CAR_IMG = require('./car2.png');
const TRUCK_IMG = require('./truck.png');
const AUTO_IMG = require('./auto1.png');
// const SOUND_ENGINE = require('./Assets/go.mp3');

// Sound.setCategory('Playback');

const PLAYER_TYPE_BIKE = {
    img: BIKE_IMG,
    width: 50,
    height: 100,
    hitboxW: 0.6,
    hitboxH: 0.7,
    name: 'Bike'
};

const RIVAL_TYPES = [
    { type: 'car', img: ENEMY_CAR_IMG, width: 70, height: 130, hitboxW: 0.8, hitboxH: 0.8 },
    { type: 'truck', img: TRUCK_IMG, width: 80, height: 300, hitboxW: 0.9, hitboxH: 0.7 },
    { type: 'auto', img: AUTO_IMG, width: 65, height: 100, hitboxW: 0.75, hitboxH: 0.75 }
];

// --- RENDERERS ---
const Road = ({ scrollY }) => {
    const movingY = (scrollY || 0) % 100;
    const dashPositions = [0, 100, 200, 300, 400, 500, 600, 700, 800];
    return (
        <View style={styles.roadContainer} pointerEvents="none">
            {[1, 2, 3].map((lane) => (
                <View key={lane} style={styles.laneMarker}>
                    {dashPositions.map((pos) => (
                        <View key={pos} style={[styles.dash, { top: pos + movingY - 100 }]} />
                    ))}
                </View>
            ))}
        </View>
    );
};

const PlayerVehicle = ({ x, y, angle, playerTypeData }) => (
    <Image
        source={playerTypeData.img}
        style={[
            styles.playerVehicle,
            {
                left: x,
                top: y,
                width: playerTypeData.width,
                height: playerTypeData.height,
                transform: [{ rotate: `${angle}deg` }]
            }
        ]}
    />
);

const EnemyVehicle = ({ x, y, typeData }) => (
    <Image
        source={typeData.img}
        style={{
            position: 'absolute',
            left: x,
            top: y,
            width: typeData.width,
            height: typeData.height,
            resizeMode: 'contain',
            zIndex: 5
        }}
    />
);

const EnemyManager = ({ list }) => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {list.map(e => <EnemyVehicle key={e.id} x={e.x} y={e.y} typeData={e.typeData} />)}
    </View>
);

// --- GAME LOGIC ---
const GameLoop = (entities, { dispatch }) => {
    const { controls, physics, enemies, road, playerConfig } = entities;

    const currentPlayerWidth = playerConfig.playerTypeData.width;
    const currentPlayerHeight = playerConfig.playerTypeData.height;
    const currentPlayerHitboxW = playerConfig.playerTypeData.hitboxW;
    const currentPlayerHitboxH = playerConfig.playerTypeData.hitboxH;

    if (controls.gas) {
        if (physics.speed < TARGET_SPEED) physics.speed += 0.08;
        else physics.speed = TARGET_SPEED;
    } else if (controls.brake) {
        physics.speed = Math.max(physics.speed - 0.5, 0);
    }

    road.scrollY += physics.speed;

    if (physics.speed > 0.1) {
        const sensitivity = 18;
        physics.x -= (controls.tiltX * sensitivity);
        physics.angle = Math.max(Math.min(controls.tiltX * 12, 25), -25);
        if (physics.x < 5) physics.x = 5;
        if (physics.x > SCREEN_WIDTH - currentPlayerWidth - 5) physics.x = SCREEN_WIDTH - currentPlayerWidth - 5;
    }

    const currentDistance = physics.score || 0;
    const level = Math.floor(currentDistance / 3000) + 1;
    const difficultyMultiplier = 1 + (level - 1) * 0.25;
    const spawnChance = (0.015 + (physics.speed * 0.002)) * difficultyMultiplier;

    let maxConcurrentEnemies = 1;
    if (currentDistance >= 12000) {
        maxConcurrentEnemies = 2;
    }

    if (physics.speed > 5 && Math.random() < spawnChance && enemies.list.length < maxConcurrentEnemies) {
        const randomType = RIVAL_TYPES[Math.floor(Math.random() * RIVAL_TYPES.length)];
        const lane = Math.floor(Math.random() * 3);
        const laneWidth = SCREEN_WIDTH / 3;
        const enemyX = (lane * laneWidth) + (laneWidth - randomType.width) / 2;

        const baseSpacing = randomType.type === 'truck' ? 500 : 400;
        const minSpacing = Math.max(baseSpacing - (level * 30), 280);

        const canSpawn = enemies.list.every(e =>
            e.y > minSpacing ||
            Math.abs(e.x - enemyX) > currentPlayerWidth * 1.5
        );

        if (canSpawn) {
            enemies.list.push({ id: Date.now(), x: enemyX, y: -randomType.height - 50, typeData: randomType });
        }
    }

    enemies.list.forEach(enemy => { enemy.y += (physics.speed * 0.75); });
    enemies.list = enemies.list.filter(e => e.y < SCREEN_HEIGHT + 300);

    for (let e of enemies.list) {
        const playerLeft = physics.x;
        const playerRight = physics.x + currentPlayerWidth;
        const playerTop = physics.y;
        const playerBottom = physics.y + currentPlayerHeight;

        const enemyLeft = e.x;
        const enemyRight = e.x + e.typeData.width;
        const enemyTop = e.y;
        const enemyBottom = e.y + e.typeData.height;

        const playerEffectiveWidth = currentPlayerWidth * currentPlayerHitboxW;
        const playerEffectiveHeight = currentPlayerHeight * currentPlayerHitboxH;
        const enemyEffectiveWidth = e.typeData.width * e.typeData.hitboxW;
        const enemyEffectiveHeight = e.typeData.height * e.typeData.hitboxH;

        const playerCenterX = playerLeft + currentPlayerWidth / 2;
        const playerCenterY = playerTop + currentPlayerHeight / 2;
        const enemyCenterX = enemyLeft + e.typeData.width / 2;
        const enemyCenterY = enemyTop + e.typeData.height / 2;

        const halfPlayerEffectiveWidth = playerEffectiveWidth / 2;
        const halfPlayerEffectiveHeight = playerEffectiveHeight / 2;
        const halfEnemyEffectiveWidth = enemyEffectiveWidth / 2;
        const halfEnemyEffectiveHeight = enemyEffectiveHeight / 2;

        const overlapX = Math.abs(playerCenterX - enemyCenterX) < (halfPlayerEffectiveWidth + halfEnemyEffectiveWidth);
        const overlapY = Math.abs(playerCenterY - enemyCenterY) < (halfPlayerEffectiveHeight + halfEnemyEffectiveHeight);

        if (overlapX && overlapY) {
            physics.speed = physics.speed * 0.1;
            dispatch({ type: 'game-over' });
            return entities;
        }
    }

    if (physics.speed > 0) {
        physics.score = (physics.score || 0) + (physics.speed / 4);
        dispatch({ type: 'score-update', score: physics.score, speed: physics.speed, level: level });
    }
    return entities;
};

// --- MAIN COMPONENT ---
export default function RacingGame({ onBack }) { // Accept onBack prop
    const [running, setRunning] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [introStep, setIntroStep] = useState(1);
    const [stats, setStats] = useState({ score: 0, speed: 0, level: 1 });

    const appState = useRef(AppState.currentState);
    const tiltAnim = useRef(new Animated.Value(0)).current;
    const engineRef = useRef(null);
    const controlsRef = useRef({ tiltX: 0, gas: false, brake: false });
    const soundEngine = useRef(null);

    const currentPlayerTypeData = PLAYER_TYPE_BIKE;

    useEffect(() => {
        // This BackHandler is now simpler:
        // - If in intro, it lets the RootNavigator handle it (false).
        // - If game is running, it pauses the game and consumes the event (true).
        // - If game is not running and not in intro, it lets RootNavigator handle it (false).
        const backAction = () => {
            if (introStep > 0) {
                return false; // Let RootNavigator handle the back button from intro screens
            }
            if (running) {
                setRunning(false);
                soundEngine.current?.stop();
                return true; // Game paused, consume back press
            }
            return false; // Let RootNavigator handle if game is not running and not in intro
        };
        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

        const handleAppStateChange = (nextAppState) => {
            if (appState.current.match(/active/) && nextAppState !== 'active') soundEngine.current?.pause();
            else if (appState.current.match(/inactive|background/) && nextAppState === 'active' && running) soundEngine.current?.play();
            appState.current = nextAppState;
        };
        const appStateListener = AppState.addEventListener("change", handleAppStateChange);

        return () => { backHandler.remove(); appStateListener.remove(); };
    }, [running, introStep]);

    useEffect(() => {
        setUpdateIntervalForType(SensorTypes.accelerometer, 30);
        const subscription = accelerometer.subscribe(({ x }) => {
            const alpha = 0.2;
            controlsRef.current.tiltX = (alpha * x) + (1 - alpha) * controlsRef.current.tiltX;
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (introStep === 1) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(tiltAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                    Animated.timing(tiltAnim, { toValue: -1, duration: 800, useNativeDriver: true }),
                ])
            ).start();
        }
    }, [introStep]);

    // useEffect(() => {
    //     soundEngine.current = new Sound(SOUND_ENGINE, (err) => { if (!err) soundEngine.current.setNumberOfLoops(-1); });
    //     return () => soundEngine.current?.release();
    // }, []);

    const onEvent = (e) => {
        if (e.type === 'game-over') {
            setTimeout(() => { setRunning(false); setIsGameOver(true); }, 150);
            soundEngine.current?.stop();
        }
        if (e.type === 'score-update') setStats({ score: e.score, speed: e.speed, level: e.level });
    };

    const resetGame = () => {
        setStats({ score: 0, speed: 0, level: 1 });
        setIsGameOver(false);
        controlsRef.current.gas = false;
        controlsRef.current.brake = false;
        engineRef.current?.swap(getInitialEntities());
        setRunning(true);
        soundEngine.current?.play();
    };

    const getInitialEntities = () => ({
        road: { scrollY: 0, renderer: Road },
        physics: {
            x: SCREEN_WIDTH/2 - currentPlayerTypeData.width/2,
            y: SCREEN_HEIGHT - 320,
            speed: 0,
            angle: 0,
            score: 0,
            renderer: PlayerVehicle,
            playerTypeData: currentPlayerTypeData
        },
        enemies: { list: [], renderer: EnemyManager },
        controls: controlsRef.current,
        playerConfig: { playerTypeData: currentPlayerTypeData }
    });

    const tiltRotation = tiltAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-25deg', '25deg'] });

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <GameEngine
                ref={engineRef}
                systems={[GameLoop]}
                entities={getInitialEntities()}
                running={running}
                onEvent={onEvent}
                style={styles.game}
            />

            <Modal visible={introStep > 0} transparent animationType="fade">
                <View style={styles.instructionOverlay}>
                    {introStep === 1 && (
                        <View style={styles.instructionBox}>
                            <Text style={styles.instructionTitle}>STEERING SETUP</Text>
                            <Animated.Text style={[styles.bigIcon, { transform: [{ rotate: tiltRotation }] }]}>📱</Animated.Text>
                            <Text style={styles.mainInstructionText}>Tilt your phone left or right to steer.</Text>
                            <TouchableOpacity style={styles.gotItBtn} onPress={() => setIntroStep(2)}><Text style={styles.gotItText}>OK, NEXT</Text></TouchableOpacity>
                        </View>
                    )}
                    {introStep === 2 && (
                         <View style={styles.instructionBox}>
                            <Text style={styles.instructionTitle}>HOW TO PLAY</Text>
                            <View style={styles.instructionRow}><Text style={styles.instructionIcon}>🚀</Text><Text style={styles.instructionText}>Reach 200 KM/H. Levels inc. every 3KM.</Text></View>
                            <View style={styles.instructionRow}><Text style={styles.instructionIcon}>🚛</Text><Text style={styles.instructionText}>Watch out for <Text style={{color: '#3498db'}}>TRUCKS</Text> and traffic!</Text></View>
                            <TouchableOpacity style={styles.gotItBtn} onPress={() => { setIntroStep(0); resetGame(); }}><Text style={styles.gotItText}>START ENGINE</Text></TouchableOpacity>
                        </View>
                    )}
                </View>
            </Modal>

            <View style={styles.hud}>
                <View style={styles.hudGroup}><Text style={styles.hudLabel}>SPEED</Text><Text style={styles.hudText}>{Math.floor(stats.speed * 10)}</Text></View>
                <View style={styles.hudGroup}><Text style={styles.hudLabel}>LEVEL</Text><Text style={[styles.hudText, {color: '#f1c40f'}]}>{stats.level}</Text></View>
                <View style={styles.hudGroup}><Text style={styles.hudLabel}>DISTANCE</Text><Text style={styles.hudText}>{Math.floor(stats.score)}m</Text></View>
            </View>

            {running && (
                <View style={styles.controlsContainer}>
                    <TouchableOpacity style={[styles.pedal, styles.brakePedal]} onPressIn={() => { controlsRef.current.gas = false; controlsRef.current.brake = true; }} onPressOut={() => controlsRef.current.brake = false}><Text style={styles.pedalText}>STOP</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.pedal, styles.gasPedal]} onPress={() => { controlsRef.current.gas = true; controlsRef.current.brake = false; }}><Text style={styles.pedalText}>GO</Text></TouchableOpacity>
                </View>
            )}

            {!running && !introStep && (
                <View style={styles.overlay}>
                    <Text style={styles.title}>{isGameOver ? "CRASHED" : "HIGHWAY 200"}</Text>
                    <TouchableOpacity style={styles.btn} onPress={resetGame}><Text style={styles.btnText}>{isGameOver ? "RETRY" : "START"}</Text></TouchableOpacity>
                    {isGameOver && (
                        <View style={{marginTop: 20}}>
                            <Text style={styles.finalScoreLabel}>FINAL DISTANCE:</Text>
                            <Text style={styles.finalScoreValue}>{Math.floor(stats.score)}m</Text>
                            <Text style={styles.finalScoreLabel}>LEVEL REACHED:</Text>
                            <Text style={styles.finalScoreValue}>{stats.level}</Text>
                        </View>
                    )}
                    {/* Button to go to Talking Tom Screen */}
                    <TouchableOpacity style={[styles.btn, { marginTop: 20, backgroundColor: '#6c5ce7' }]} onPress={onBack}>
                        <Text style={styles.btnText}>Exit</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a1a' },
    game: { flex: 1 },
    roadContainer: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', justifyContent: 'space-evenly', backgroundColor: '#1c2833' },
    laneMarker: { height: '100%', width: 2 },
    dash: { position: 'absolute', width: 6, height: 60, backgroundColor: 'rgba(255,255,255,0.2)', left: -3 },
    playerVehicle: { position: 'absolute', resizeMode: 'contain', zIndex: 10 },
    instructionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
    instructionBox: { width: '85%', backgroundColor: 'rgba(44, 62, 80, 0.95)', borderRadius: 20, padding: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
    instructionTitle: { fontSize: 22, color: '#f1c40f', fontWeight: 'bold', marginBottom: 25 },
    bigIcon: { fontSize: 80, marginVertical: 20 },
    mainInstructionText: { color: 'white', textAlign: 'center', fontSize: 18, marginBottom: 20 },
    instructionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, width: '100%' },
    instructionIcon: { fontSize: 28, marginRight: 15 },
    instructionText: { color: 'white', fontSize: 15, flex: 1 },
    gotItBtn: { marginTop: 10, backgroundColor: '#e67e22', paddingVertical: 12, paddingHorizontal: 50, borderRadius: 10 },
    gotItText: { color: 'white', fontWeight: 'bold' },

    hud: { position: 'absolute', top: 50, width: '100%', flexDirection: 'row', justifyContent: 'space-around', opacity: 0.8 },
    hudGroup: { alignItems: 'center' },
    hudLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 'bold' },
    hudText: { color: 'white', fontSize: 24, fontWeight: '900', fontStyle: 'italic', textShadowColor: '#000', textShadowRadius: 10 },
    controlsContainer: { position: 'absolute', bottom: 20, width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 40 },
    pedal: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
    gasPedal: { backgroundColor: 'rgba(46, 204, 113, 0.6)' },
    brakePedal: { backgroundColor: 'rgba(231, 76, 60, 0.6)' },
    pedalText: { color: 'rgba(255,255,255,0.8)', fontWeight: 'bold', fontSize: 16 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingBottom: 50 },
    title: { fontSize: 50, color: '#f1c40f', fontWeight: 'bold', marginBottom: 10 },
    btn: { backgroundColor: 'rgba(230, 126, 34, 0.7)', paddingVertical: 12, paddingHorizontal: 45, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
    btnText: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    finalScoreLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 16, marginTop: 10 },
    finalScoreValue: { color: '#f1c40f', fontSize: 30, fontWeight: 'bold' }
});