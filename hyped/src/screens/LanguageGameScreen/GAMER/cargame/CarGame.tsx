import React, { useState, useRef, useEffect, ReactElement } from 'react';
import {
    View, Text, TouchableOpacity, Dimensions, StyleSheet,
    Image, StatusBar, Modal, Animated, BackHandler, AppState, AppStateStatus
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GameEngine } from 'react-native-game-engine';
// import Sound from 'react-native-sound'; 
import SoundPlayer from 'react-native-sound-player';
import { accelerometer, setUpdateIntervalForType, SensorTypes } from "react-native-sensors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- TYPES ---
interface RivalType {
    type: 'car' | 'truck' | 'auto';
    img: any;
    width: number;
    height: number;
    hitboxW: number;
    hitboxH: number;
}

interface Enemy {
    id: number;
    x: number;
    y: number;
    typeData: RivalType;
}

interface Controls {
    tiltX: number;
    gas: boolean;
    brake: boolean;
}

interface Physics {
    x: number;
    y: number;
    speed: number;
    angle: number;
    score: number;
    renderer: React.ComponentType<any>;
}

interface RoadState {
    scrollY: number;
    renderer: React.ComponentType<any>;
}

interface EnemiesState {
    list: Enemy[];
    renderer: React.ComponentType<any>;
}

interface GameEntities {
    road: RoadState;
    physics: Physics;
    enemies: EnemiesState;
    controls: Controls;
}

// --- CONFIGURATION ---
const PLAYER_WIDTH = 70;
const PLAYER_HEIGHT = 130;
const TARGET_SPEED = 20; // 200 KM/H

// ASSETS
const PLAYER_IMG = require('../cargame/car1.png');
const ENEMY_CAR_IMG = require('../cargame/car2.png');
const TRUCK_IMG = require('../cargame/truck.png');
const AUTO_IMG = require('../cargame/auto1.png');
// Engine sound placed in android/app/src/main/res/raw as go.mp3 — play by name
const ENGINE_SOUND_NAME = 'go';

// Sound.setCategory('Playback');

const RIVAL_TYPES: RivalType[] = [
    { type: 'car', img: ENEMY_CAR_IMG, width: 70, height: 130, hitboxW: 0.30, hitboxH: 0.50 },
    // Truck height is 300, we use a much smaller hitboxH (0.45) to ignore the transparent whitespace
    { type: 'truck', img: TRUCK_IMG, width: 80, height: 300, hitboxW: 0.35, hitboxH: 0.45 },
    { type: 'auto', img: AUTO_IMG, width: 65, height: 100, hitboxW: 0.30, hitboxH: 0.45 }
];

// --- RENDERERS ---
const Road = ({ scrollY }: { scrollY: number }): ReactElement => {
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

const PlayerCar = ({ x, y, angle }: { x: number; y: number; angle: number }): ReactElement => (
    <Image source={PLAYER_IMG} style={[styles.playerCar, { left: x, top: y, transform: [{ rotate: `${angle}deg` }] }]} />
);

const EnemyVehicle = ({ x, y, typeData }: { x: number; y: number; typeData: RivalType }): ReactElement => (
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

const EnemyManager = ({ list }: { list: Enemy[] }): ReactElement => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {list.map(e => <EnemyVehicle key={e.id} x={e.x} y={e.y} typeData={e.typeData} />)}
    </View>
);

// --- GAME LOGIC ---
const GameLoop = (entities: GameEntities, { dispatch }: { dispatch: (event: any) => void }): GameEntities => {
    const { controls, physics, enemies, road } = entities;

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
        if (physics.x > SCREEN_WIDTH - PLAYER_WIDTH - 5) physics.x = SCREEN_WIDTH - PLAYER_WIDTH - 5;
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
        const lane = Math.floor(Math.random() * 4);
        const enemyX = (lane * (SCREEN_WIDTH / 4)) + ((SCREEN_WIDTH / 4) - randomType.width) / 2;

        const baseSpacing = randomType.type === 'truck' ? 500 : 400;
        const minSpacing = Math.max(baseSpacing - (level * 30), 280);

        const canSpawn = enemies.list.every(e =>
            e.y > minSpacing ||
            Math.abs(e.x - enemyX) > PLAYER_WIDTH * 1.5
        );

        if (canSpawn) {
            enemies.list.push({ id: Date.now(), x: enemyX, y: -randomType.height - 50, typeData: randomType });
        }
    }

    enemies.list.forEach(enemy => { enemy.y += (physics.speed * 0.75); });
    enemies.list = enemies.list.filter(e => e.y < SCREEN_HEIGHT + 300);

    for (let e of enemies.list) {
        // Center-based collision detection
        const playerCenterX = physics.x + PLAYER_WIDTH / 2;
        const playerCenterY = physics.y + PLAYER_HEIGHT / 2;
        const enemyCenterX = e.x + e.typeData.width / 2;
        const enemyCenterY = e.y + e.typeData.height / 2;

        const dx = Math.abs(playerCenterX - enemyCenterX);
        const dy = Math.abs(playerCenterY - enemyCenterY);

        // Specialized collision thresholds using each vehicle's tuned hitboxes
        // We use the specific hitboxW/H from RIVAL_TYPES to account for image padding
        const combinedWidthThreshold = (PLAYER_WIDTH * 0.35 + e.typeData.width * e.typeData.hitboxW) / 2;
        const combinedHeightThreshold = (PLAYER_HEIGHT * 0.6 + e.typeData.height * e.typeData.hitboxH) / 2;

        if (dx < combinedWidthThreshold && dy < combinedHeightThreshold) {
            physics.speed = 0;
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
export default function RacingGame(): ReactElement {
    const navigation = useNavigation<any>();
    const [running, setRunning] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [introStep, setIntroStep] = useState(1);
    const [stats, setStats] = useState({ score: 0, speed: 0, level: 1 });

    const appState = useRef(AppState.currentState);
    const tiltAnim = useRef(new Animated.Value(0)).current;
    const engineRef = useRef<any>(null);
    const controlsRef = useRef<Controls>({ tiltX: 0, gas: false, brake: false });
    const soundEngine = useRef<any>(null);

    useEffect(() => {
        const backAction = (): boolean => {
            if (introStep > 0) {
                navigation.goBack();
                return true;
            }
            if (running) {
                setRunning(false);
                return true;
            }
            navigation.goBack();
            return true;
        };
        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

        const handleAppStateChange = (nextAppState: AppStateStatus): void => {
            appState.current = nextAppState;
        };
        const appStateListener = AppState.addEventListener("change", handleAppStateChange);

        return () => { backHandler.remove(); appStateListener.remove(); try { SoundPlayer.stop(); } catch (e) {} };
    }, [running, introStep, navigation]);

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
    }, [introStep, tiltAnim]);

    useEffect(() => {
        const onFinished = () => {
            if (running && !isGameOver) {
                try { SoundPlayer.playSoundFile(ENGINE_SOUND_NAME, 'mp3'); } catch (e) { console.log('engine replay failed', e); }
            }
        };
        SoundPlayer.addEventListener('FinishedPlaying', onFinished);

        if (running && !isGameOver) {
            try { SoundPlayer.playSoundFile(ENGINE_SOUND_NAME, 'mp3'); } catch (e) { console.log('engine start failed', e); }
        } else {
            try { SoundPlayer.stop(); } catch (e) {}
        }

        return () => {
            try { SoundPlayer.stop(); } catch (e) {}
            // SoundPlayer.removeEventListener('FinishedPlaying');
        };
    }, [running, isGameOver]);

    const onEvent = (e: any): void => {
        if (e.type === 'game-over') {
            setTimeout(() => { setRunning(false); setIsGameOver(true); }, 150);
            try { SoundPlayer.stop(); } catch (e) {}
        }
        if (e.type === 'score-update') setStats({ score: e.score, speed: e.speed, level: e.level });
    };

    const resetGame = (): void => {
        setStats({ score: 0, speed: 0, level: 1 });
        setIsGameOver(false);
        controlsRef.current.gas = false;
        controlsRef.current.brake = false;
        engineRef.current?.swap(getInitialEntities());
        setRunning(true);
    };

    const getInitialEntities = (): GameEntities => ({
        road: { scrollY: 0, renderer: Road as any },
        physics: { x: SCREEN_WIDTH / 2 - PLAYER_WIDTH / 2, y: SCREEN_HEIGHT - 320, speed: 0, angle: 0, score: 0, renderer: PlayerCar as any },
        enemies: { list: [], renderer: EnemyManager as any },
        controls: controlsRef.current,
    });

    const tiltRotation = tiltAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-25deg', '25deg'] });

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <GameEngine ref={engineRef} systems={[GameLoop]} entities={getInitialEntities()} running={running} onEvent={onEvent} style={styles.game} />

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
                            <View style={styles.instructionRow}><Text style={styles.instructionIcon}>🚛</Text><Text style={styles.instructionText}>Watch out for <Text style={{ color: '#3498db' }}>TRUCKS</Text> and traffic!</Text></View>
                            <TouchableOpacity style={styles.gotItBtn} onPress={() => setIntroStep(0)}><Text style={styles.gotItText}>START ENGINE</Text></TouchableOpacity>
                        </View>
                    )}
                </View>
            </Modal>

            <View style={styles.hud}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={30} color="#fff" />
                </TouchableOpacity>
                <View style={[styles.hudGroup, { marginLeft: 10 }]}><Text style={styles.hudLabel}>SPEED</Text><Text style={styles.hudText}>{Math.floor(stats.speed * 10)}</Text></View>
                <View style={styles.hudGroup}><Text style={styles.hudLabel}>LEVEL</Text><Text style={[styles.hudText, { color: '#f1c40f' }]}>{stats.level}</Text></View>
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
    playerCar: { position: 'absolute', width: PLAYER_WIDTH, height: PLAYER_HEIGHT, resizeMode: 'contain', zIndex: 10 },
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
    hud: { position: 'absolute', top: 50, width: '100%', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', opacity: 0.8 },
    backButton: { position: 'absolute', left: 20 },
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
    btnText: { color: 'white', fontSize: 22, fontWeight: 'bold' }
});
