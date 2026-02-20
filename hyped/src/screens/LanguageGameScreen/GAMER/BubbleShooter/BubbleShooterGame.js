import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, StatusBar, TouchableOpacity, Image, ImageBackground, AppState, BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GameEngine } from 'react-native-game-engine';
import Matter from 'matter-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import Sound from 'react-native-sound';
import LottieView from 'lottie-react-native';
import SoundPlayer from 'react-native-sound-player';

import Bubble from './Bubble';
import AimingLine from './AimingLine';

const { width, height } = Dimensions.get('window');
const BUBBLE_RADIUS = width / 16;
const COLORS = ['#e63946', '#f1faee', '#a8dadc', '#457b9d', '#1d3557'];
const SHOOTER_Y = height * 0.80;

// Sound files are expected to be in Android res/raw — play by resource name only
const BACKGROUND_MUSIC_NAME = 'background_music';
const POP_SOUND_NAME = 'yay';

const findMatches = (entities, bubble) => {
    const allBubbles = Object.values(entities).filter(e => e.body && e.body.label === 'bubble');
    const matches = new Set([bubble.body.id]);
    const queue = [bubble];

    while (queue.length > 0) {
        const current = queue.shift();
        for (const other of allBubbles) {
            if (!matches.has(other.body.id) && other.color === current.color) {
                const dist = Math.sqrt(Math.pow(current.body.position.x - other.body.position.x, 2) + Math.pow(current.body.position.y - other.body.position.y, 2));
                if (dist < BUBBLE_RADIUS * 2.1) {
                    matches.add(other.body.id);
                    queue.push(other);
                }
            }
        }
    }
    return Array.from(matches);
};

const GameSystem = (entities, { touches, time, dispatch }) => {
    const shooter = entities.shooter;
    const aimingLine = entities.aimingLine;

    if (!shooter || !aimingLine) {
        return entities;
    }

    const engine = entities.physics.engine;

    const start = touches.find(t => t.type === 'start');
    if (start) {
        if (shooter.canShoot) {
            aimingLine.visible = true;
            aimingLine.start = shooter.body.position;
            aimingLine.end = { x: start.event.pageX, y: start.event.pageY };
        }
    }

    const move = touches.find(t => t.type === 'move');
    if (move && aimingLine.visible) {
        aimingLine.end = { x: move.event.pageX, y: move.event.pageY };
    }

    const end = touches.find(t => t.type === 'end');
    if (end && aimingLine.visible) {
        aimingLine.visible = false;
        shooter.canShoot = false;

        const angle = Math.atan2((aimingLine.end.y - aimingLine.start.y), (aimingLine.end.x - aimingLine.start.x));

        if (aimingLine.end.y > SHOOTER_Y - BUBBLE_RADIUS) {
            shooter.canShoot = true;
        } else {
            const projectile = Matter.Bodies.circle(shooter.body.position.x, shooter.body.position.y, BUBBLE_RADIUS, {
                label: 'projectile',
                frictionAir: 0,
                friction: 0,
                restitution: 0.8,
            });

            entities[`projectile_${projectile.id}`] = {
                body: projectile,
                radius: BUBBLE_RADIUS,
                color: shooter.color,
                renderer: <Bubble />,
            };
            Matter.World.add(engine.world, projectile);
            Matter.Body.setVelocity(projectile, { x: Math.cos(angle) * 20, y: Math.sin(angle) * 20 });
        }
    }

    Matter.Events.on(engine, 'collisionStart', (event) => {
        event.pairs.forEach(pair => {
            const { bodyA, bodyB } = pair;
            const projectileBody = bodyA.label === 'projectile' ? bodyA : (bodyB.label === 'projectile' ? bodyB : null);
            if (!projectileBody) return;
            if (projectileBody.label !== 'projectile') return;

            projectileBody.label = 'bubble';
            Matter.Body.setStatic(projectileBody, true);

            const projectileEntity = entities[`projectile_${projectileBody.id}`];
            if (!projectileEntity) return;

            setTimeout(() => {
                const matches = findMatches(entities, projectileEntity);
                if (matches.length >= 3) {
                    try { SoundPlayer.playSoundFile(POP_SOUND_NAME, 'mp3'); } catch (e) { console.log('pop sound failed', e); }

                    matches.forEach(id => {
                        const entityKey = Object.keys(entities).find(key => entities[key].body && entities[key].body.id == id);
                        if (entityKey && entities[entityKey]) {
                            Matter.World.remove(engine.world, entities[entityKey].body);
                            delete entities[entityKey];
                        }
                    });

                    dispatch({ type: 'bubbles_popped' });
                    dispatch({ type: 'score_update', points: matches.length * 10 });
                }

                const remainingBubbles = Object.values(entities).filter(e => e.body && e.body.label === 'bubble');
                if (remainingBubbles.length === 0) {
                    dispatch({ type: 'game_over', status: 'win' });
                } else {
                    dispatch({ type: 'next_shot' });
                }
            }, 50);
        });
    });

    Matter.Engine.update(engine, time.delta);
    return entities;
};

const BubbleShooterGame = () => {
    const navigation = useNavigation();
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState('playing');
    const [highScore, setHighScore] = useState(0);
    const [achievementMessage, setAchievementMessage] = useState('');
    const [entities, setEntities] = useState(null);
    const [showWinImage, setShowWinImage] = useState(false);

    const gameEngine = useRef(null);
    const leftCornerAnimation = useRef(null);
    const rightCornerAnimation = useRef(null);

    useEffect(() => {
        // --- Setup AppState and BackHandler Listeners ---
        const handleAppStateChange = (nextAppState) => {
            if (nextAppState === 'active') {
                try { SoundPlayer.playSoundFile(BACKGROUND_MUSIC_NAME, 'mp3'); } catch (e) {}
            } else {
                try { SoundPlayer.stop(); } catch (e) {}
            }
        };

        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        const backAction = () => {
            // if (backgroundSound) backgroundSound.pause();
            navigation.goBack();
            return true; // Allows default back button behavior
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

        // --- Sound and Game Setup ---
        /*
        Sound.setCategory('Playback');
        backgroundSound = new Sound(require('../../GAMER/Assets/audio/background_music.mp3'), (error) => {
            if (error) {
                console.log('failed to load the background sound', error);
                return;
            }
            backgroundSound.setNumberOfLoops(-1);
            backgroundSound.play();
        });
        */
        // Start background music and loop by replaying on FinishedPlaying
        const onFinished = () => {
            try { SoundPlayer.playSoundFile(BACKGROUND_MUSIC_NAME, 'mp3'); } catch (e) { console.log('bg replay failed', e); }
        };
        try { SoundPlayer.playSoundFile(BACKGROUND_MUSIC_NAME, 'mp3'); } catch (e) { console.log('bg start failed', e); }
        SoundPlayer.addEventListener('FinishedPlaying', onFinished);

        loadHighScore();
        // loadPopSound();
        setupWorld();

        // --- Cleanup Function ---
        return () => {
            /*
            if (backgroundSound) {
                backgroundSound.stop(() => {
                    backgroundSound.release();
                });
            }
            if (popSound) {
                popSound.release();
            }
            */
            try { SoundPlayer.stop(); } catch (e) {}
            SoundPlayer.removeEventListener('FinishedPlaying');
            appStateSubscription.remove();
            backHandler.remove();
        };
    }, []);

    useEffect(() => {
        if (showWinImage) {
            const timer = setTimeout(() => {
                setShowWinImage(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showWinImage]);

    const loadHighScore = async () => {
        try {
            const storedHighScore = await AsyncStorage.getItem('highScore');
            if (storedHighScore !== null) {
                setHighScore(parseInt(storedHighScore, 10));
            }
        } catch (e) {
            console.error("Failed to load high score.", e);
        }
    };

    const checkHighScore = async (currentScore) => {
        let message = "You Win!";
        if (currentScore > highScore) {
            message = "New High Score!";
            setHighScore(currentScore);
            try {
                await AsyncStorage.setItem('highScore', currentScore.toString());
            } catch (e) {
                console.error("Failed to save high score.", e);
            }
        } else if (highScore > 0 && currentScore >= highScore * 0.8) {
            message = `So close to the high score of ${highScore}!`;
        }
        setAchievementMessage(message);
    };

    const setupWorld = () => {
        const engine = Matter.Engine.create({ enableSleeping: false });
        const world = engine.world;
        world.gravity.y = 0;
        const entities = {
            physics: { engine, world },
        };
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 8; col++) {
                const x = col * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS * (row % 2 === 0 ? 1 : 2);
                const y = row * BUBBLE_RADIUS * 1.75 + BUBBLE_RADIUS * 7;
                if (x + BUBBLE_RADIUS > width) continue;
                const body = Matter.Bodies.circle(x, y, BUBBLE_RADIUS, { isStatic: true, label: 'bubble' });
                entities[`bubble_${row}_${col}`] = { body, radius: BUBBLE_RADIUS, color: COLORS[Math.floor(Math.random() * COLORS.length)], renderer: <Bubble />, };
                Matter.World.add(world, body);
            }
        }
        const wallOptions = { isStatic: true, label: 'wall' };
        Matter.World.add(world, [
            Matter.Bodies.rectangle(width / 2, -10, width, 20, wallOptions),
            Matter.Bodies.rectangle(-10, height / 2, 20, height, wallOptions),
            Matter.Bodies.rectangle(width + 10, height / 2, 20, height, wallOptions),
        ]);
        const initialBubbles = Object.values(entities).filter(e => e.body && e.body.label === 'bubble');
        const initialAvailableColors = [...new Set(initialBubbles.map(b => b.color))];
        let initialShooterColor = COLORS[0];
        if (initialAvailableColors.length > 0) {
            initialShooterColor = initialAvailableColors[Math.floor(Math.random() * initialAvailableColors.length)];
        }
        entities.shooter = {
            body: { position: { x: width / 2, y: SHOOTER_Y } },
            radius: BUBBLE_RADIUS,
            color: initialShooterColor,
            canShoot: true,
            renderer: <Bubble />,
        };
        entities.aimingLine = {
            start: { x: width / 2, y: SHOOTER_Y },
            end: { x: width / 2, y: SHOOTER_Y },
            visible: false,
            renderer: <AimingLine />
        };
        setEntities(entities);
    };

    const restartGame = () => {
        setScore(0);
        setAchievementMessage('');
        setGameState('playing');
        setupWorld();
    };

    const onEvent = (e) => {
        if (gameState !== 'playing') return;

        if (e.type === 'score_update') {
            setScore(prev => prev + e.points);
        }
        if (e.type === 'next_shot') {
            gameEngine.current.dispatch({ type: 'new_shooter' });
        }
        if (e.type === 'game_over') {
            if (e.status === 'win') {
                setGameState('won');
                setShowWinImage(true);
                checkHighScore(score);
            }
        }
        if (e.type === 'bubbles_popped') {
            leftCornerAnimation.current?.play(0);
            rightCornerAnimation.current?.play(0);
        }
    };

    const EventSystem = (entities, { dispatch, events }) => {
        if (events.length) {
            events.forEach(e => {
                if (e.type === 'new_shooter') {
                    entities.shooter.canShoot = true;
                    const allBubbles = Object.values(entities).filter(entity => entity.body && entity.body.label === 'bubble');
                    const availableColors = [...new Set(allBubbles.map(bubble => bubble.color))];
                    let nextColor;
                    if (availableColors.length > 0) {
                        nextColor = availableColors[Math.floor(Math.random() * availableColors.length)];
                    } else {
                        nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
                    }
                    entities.shooter.color = nextColor;
                }
            });
        }
        return entities;
    };

    if (!entities) return <Text>Loading...</Text>;

    return (
        <ImageBackground source={require('../BubbleShooter/bubbleshooter.jpg')} style={{ flex: 1 }}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-left" size={30} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.scoreText}>Score: {score}</Text>
                    <Text style={styles.highScoreText}>High Score: {highScore}</Text>
                </View>

                {gameState === 'playing' ? (
                    <GameEngine
                        ref={gameEngine}
                        style={styles.gameContainer}
                        systems={[GameSystem, EventSystem]}
                        entities={entities}
                        onEvent={onEvent}
                    >
                        <StatusBar hidden={true} />
                    </GameEngine>
                ) : (
                    <View style={styles.gameOverContainer}>
                        <Text style={styles.gameOverText}>{achievementMessage}</Text>
                        <Text style={styles.finalScoreText}>Your Score: {score}</Text>
                        <TouchableOpacity style={styles.button} onPress={restartGame}>
                            <Text style={styles.buttonText}>Play Again</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {/* {showWinImage && (
                    <View style={styles.winImageContainer}>
                        <Image source={require('../../GAMER/Assets/we-won-1-unscreen.gif')} style={styles.winImage} />
                    </View>
                )} */}

                <LottieView
                    ref={leftCornerAnimation}
                    source={require('../BubbleShooter/hand_animation.json')}
                    autoPlay={false}
                    loop={false}
                    style={styles.cornerLottieLeft}
                />
                <LottieView
                    ref={rightCornerAnimation}
                    source={require('../BubbleShooter/hand_animation.json')}
                    autoPlay={false}
                    loop={false}
                    style={styles.cornerLottieRight}
                />
            </View>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, },
    header: { position: 'absolute', top: 50, left: 0, right: 0, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 1, },
    backButton: { marginRight: 10 },
    scoreText: { color: '#ffffffff', fontSize: 20, fontWeight: 'bold', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10, flex: 1 },
    highScoreText: { color: 'white', fontSize: 20, fontWeight: 'bold', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10, },
    gameContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, },
    gameOverContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', },
    gameOverText: { fontSize: 36, textAlign: 'center', color: 'white', fontWeight: 'bold', marginBottom: 20, paddingHorizontal: 20, },
    finalScoreText: { fontSize: 28, color: '#f1faee', marginBottom: 40, },
    button: { backgroundColor: '#1d3557', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 10, borderWidth: 2, borderColor: '#a8dadc', },
    buttonText: { color: 'white', fontSize: 20, fontWeight: 'bold', },
    winImageContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    winImage: {
        width: '80%',
        height: '50%',
        resizeMode: 'contain',
    },
    lottie: {
        position: 'absolute',
        width: 150,
        height: 230,
        zIndex: 10,
    },
    cornerLottieLeft: {
        position: 'absolute',
        width: 150,
        height: 150,
        bottom: 0,
        left: 0,
        zIndex: 10,
    },
    cornerLottieRight: {
        position: 'absolute',
        width: 150,
        height: 150,
        bottom: 0,
        right: 0,
        zIndex: 10,
    },
});

export default BubbleShooterGame;