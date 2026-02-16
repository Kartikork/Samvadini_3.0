// game/screens/GameScreen.js
import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Dimensions, Text, TouchableOpacity } from 'react-native';
import { GameEngine } from 'react-native-game-engine';
import Matter from 'matter-js';

import Physics from '../systems/physics';
import Spaceship from '../components/spaceship';
import Planet from '../components/planet';
import Controls from '../components/controls';
import Asteroid from '../components/Asteroid';
// --- CHANGE 1: Import PlanetSurfaceScreen to be used directly ---
import PlanetSurfaceScreen from './PlanetSurfaceScreen';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');


const createEntities = (selectedPlanet) => {
  console.log("GameScreen: createEntities received selectedPlanet:", selectedPlanet);
  console.log("GameScreen: Image property of selectedPlanet:", selectedPlanet?.image);

  const engine = Matter.Engine.create({ enableSleeping: false });
  const world = engine.world;
  world.gravity.y = 0;
  const spaceshipSize = 75;
  const planetSize = 100;

  const spaceshipBody = Matter.Bodies.rectangle(screenWidth / 2, screenHeight / 4, spaceshipSize, spaceshipSize, {
    label: 'Spaceship', frictionAir: 0.05
  });

  const planetBody = Matter.Bodies.circle(screenWidth / 2, -planetSize, planetSize / 2, {
    label: 'Planet',
    isStatic: true,
    isSensor: true,
    frictionAir: 0,
  });

  Matter.World.add(world, [spaceshipBody, planetBody]);

  // Define the 'planet' entity structure with the image data
  const planetEntity = {
    body: planetBody,
    planetImage: selectedPlanet.image, // Still store image data here
  };

  return {
    physics: { engine, world },
    gameContext: {
      phase: 'dodging',
      planetState: 'hidden',
      elapsedTime: 0,
      moveDirection: 'none',
      gameState: 'playing',
    },
    spaceship: { body: spaceshipBody, renderer: <Spaceship /> },
    planet: {
      ...planetEntity, // Spread the entity data
      // --- IMPORTANT CHANGE HERE: Directly pass planetImage to Planet component ---
      renderer: (props) => <Planet {...props} planetImage={planetEntity.planetImage} /> // Pass directly
    },
  };
};

// ... (rest of GameScreen remains the same)

const GameScreen = ({ route, navigation }) => {
  const { selectedPlanet } = route.params;
  const gameEngine = useRef(null);
  const [gameState, setGameState] = useState('playing'); // Can be 'playing', 'win', or 'lose'
  const [totalScore, setTotalScore] = useState(0);
  const [entities, setEntities] = useState(() => createEntities(selectedPlanet));
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    if (entities.gameContext.gameState !== gameState) {
        setEntities(prevEntities => ({
            ...prevEntities,
            gameContext: {
                ...prevEntities.gameContext,
                gameState: gameState
            }
        }));
    }
  }, [gameState, entities]);

  // --- CHANGE 2: The event handler now simply sets the game state ---
  const handleGameEvent = (event) => {
    if (event.type === 'win') {
      setGameState('win');
    } else if (event.type === 'lose') {
      setGameState('lose');
    }
  };

  const resetGame = () => {
    setGameState('playing');
    setEntities(createEntities(selectedPlanet));
    setGameKey(prev => prev + 1);
  };

  const handleMissionComplete = (pointsEarned) => {
    setTotalScore(prevScore => prevScore + pointsEarned); // Use functional update
    resetGame(); // This will automatically switch the view back to the game
  };

  // --- CHANGE 3: Conditionally render PlanetSurfaceScreen when you win ---
  if (gameState === 'win') {
    return (
      <PlanetSurfaceScreen
        selectedPlanet={selectedPlanet}
        navigation={navigation}
        onMissionComplete={handleMissionComplete}
      />
    );
  }

  // This is the original view for 'playing' and 'lose' states
  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      {/* <Text style={styles.scoreText}> {totalScore}</Text> */}
      {/* {entities.gameContext.phase === 'landing' && (
        <Text style={styles.phaseText}>Clear! Proceed to landing.</Text>
      )} */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        {/* <Text style={styles.backButtonText}>{'< Select Planet'}</Text> */}
      </TouchableOpacity>

      <GameEngine
        key={gameKey}
        ref={gameEngine}
        style={styles.gameContainer}
        systems={[Physics]}
        entities={entities}
        running={gameState === 'playing'}
        onEvent={handleGameEvent}
      />

      {gameState === 'lose' && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>You Crashed!</Text>
          <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
            <Text style={styles.resetButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {gameState === 'playing' && (
        <Controls onEvent={(e) => gameEngine.current?.dispatch(e)} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000020' },
    scoreText: {
        position: 'absolute', top: 30, left: 30, fontSize: 24,
        color: 'white', fontWeight: 'bold', zIndex: 1,
    },
    phaseText: {
        position: 'absolute', top: 70, alignSelf: 'center', fontSize: 22,
        color: '#4CAF50', fontWeight: 'bold', zIndex: 1,
    },
    backButton: {
        position: 'absolute', top: 35, right: 20, zIndex: 1,
    },
    backButtonText: { fontSize: 18, color: 'white', fontWeight: 'bold' },
    gameContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
    overlay: {
        ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center', alignItems: 'center',
    },
    overlayText: { fontSize: 48, fontWeight: 'bold', color: 'white', textAlign: 'center' },
    resetButton: {
        marginTop: 20, paddingHorizontal: 30, paddingVertical: 15,
        backgroundColor: '#4CAF50', borderRadius: 10,
    },
    resetButtonText: { fontSize: 20, color: 'white', fontWeight: 'bold' },
});


export default GameScreen;