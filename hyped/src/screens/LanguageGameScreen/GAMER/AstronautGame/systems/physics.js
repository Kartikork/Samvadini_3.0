// game/systems/physics.js
import Matter from 'matter-js';
import { Dimensions } from 'react-native';
import Asteroid from '../components/Asteroid';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
let asteroidCounter = 0;

const DODGING_DURATION = 5000;

const Physics = (entities, { time, dispatch, events }) => {
  const engine = entities.physics.engine;
  const world = entities.physics.world;
  const spaceship = entities.spaceship.body;
  const planet = entities.planet.body;
  const gameContext = entities.gameContext;

  // IMPORTANT: If the game state is already 'win' or 'lose', stop processing most physics
  if (gameContext.gameState !== 'playing') {
      Matter.Body.setVelocity(spaceship, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(spaceship, 0);
      gameContext.moveDirection = 'none';
      return entities; // Crucial: Exit early if game is not playing
  }

  // --- 1. Handle Controls ---
  if (events.length) {
    events.forEach(e => {
      switch (e.type) {
        case 'move-up':
        case 'move-down':
        case 'move-left':
        case 'move-right':
          gameContext.moveDirection = e.type;
          break;
        case 'stop':
          gameContext.moveDirection = 'none';
          break;
      }
    });
  }

  // --- 2. Apply Spaceship Velocity ---
  const moveSpeed = 4;
  if (gameContext.moveDirection !== 'none') {
    let velocity = { x: 0, y: 0 };
    switch (gameContext.moveDirection) {
      case 'move-up':
        velocity.y = -moveSpeed;
        break;
      case 'move-down':
        velocity.y = moveSpeed;
        break;
      case 'move-left':
        velocity.x = -moveSpeed;
        break;
      case 'move-right':
        velocity.x = moveSpeed;
        break;
    }
    Matter.Body.setVelocity(spaceship, velocity);
  } else {
    // Dampen spaceship velocity if no input
    Matter.Body.setVelocity(spaceship, { x: spaceship.velocity.x * 0.9, y: spaceship.velocity.y * 0.9 });
  }

  // --- NEW: Spaceship Boundary Constraints ---
  const { min, max } = spaceship.bounds;
  const spaceshipWidth = max.x - min.x;
  const spaceshipHeight = max.y - min.y;

  // Check horizontal boundaries
  if (min.x < 0) {
    Matter.Body.setPosition(spaceship, { x: spaceshipWidth / 2, y: spaceship.position.y });
    Matter.Body.setVelocity(spaceship, { x: 0, y: spaceship.velocity.y });
  } else if (max.x > screenWidth) {
    Matter.Body.setPosition(spaceship, { x: screenWidth - spaceshipWidth / 2, y: spaceship.position.y });
    Matter.Body.setVelocity(spaceship, { x: 0, y: spaceship.velocity.y });
  }

  // Check vertical boundaries
  if (min.y < 0) {
    Matter.Body.setPosition(spaceship, { x: spaceship.position.x, y: spaceshipHeight / 2 });
    Matter.Body.setVelocity(spaceship, { x: spaceship.velocity.x, y: 0 });
  } else if (max.y > screenHeight) {
    Matter.Body.setPosition(spaceship, { x: spaceship.position.x, y: screenHeight - spaceshipHeight / 2 });
    Matter.Body.setVelocity(spaceship, { x: spaceship.velocity.x, y: 0 });
  }
  // --- END OF NEW SECTION ---


  // --- 3. Game Phase and Planet Entrance Logic ---
  gameContext.elapsedTime += time.delta;

  // Only handle planet entrance if we are in dodging phase and duration is passed
  if (gameContext.phase === 'dodging' && gameContext.elapsedTime > DODGING_DURATION) {
    gameContext.phase = 'landing';
    gameContext.planetState = 'entering';
    console.log("🚀 Planet entering phase started!");
    dispatch({ type: 'phase-changed', phase: 'landing' });
  }

  // Handle planet's visual movement. Its physics body remains static/sensor.
  if (gameContext.planetState === 'entering') {
    const planetFinalY = screenHeight - 150;
    if (planet.position.y < planetFinalY) {
      // We manually translate the *body* to control its visual position.
      // Since it's isStatic: true, this won't be overridden by physics.
      Matter.Body.translate(planet, { x: 0, y: 2 });
    } else {
      Matter.Body.setPosition(planet, { x: planet.position.x, y: planetFinalY });
      gameContext.planetState = 'landable';
      console.log("🪐 Planet is now landable!");
      // No need to set isStatic/isSensor here again if it's already set in createEntities
    }
  }


  // --- 4. Asteroid Spawning ---
  if (gameContext.phase === 'dodging') {
    const asteroidSpawnRate = 1000;
    if (time.current - (gameContext.lastAsteroidSpawn || 0) > asteroidSpawnRate) {
      const asteroidSize = Math.random() * 40 + 50;
      const randomX = Math.random() * screenWidth;
      const asteroidBody = Matter.Bodies.rectangle(randomX, -50, asteroidSize, asteroidSize, {
        label: 'Asteroid',
        frictionAir: 0,
        restitution: 0.8,
      });
      Matter.Body.setVelocity(asteroidBody, { x: (Math.random() - 0.5) * 2, y: 2 });
      Matter.Body.setAngularVelocity(asteroidBody, (Math.random() - 0.5) * 0.1);
      const asteroidId = `asteroid_${asteroidCounter++}`;
      entities[asteroidId] = { body: asteroidBody, renderer: <Asteroid /> };
      Matter.World.add(world, asteroidBody);
      gameContext.lastAsteroidSpawn = time.current;
    }
  }

  // --- 5. Collision Detection ---

  // Win condition: Spaceship touches the planet, regardless of planetState
  const collisionsWithPlanet = Matter.Query.collides(spaceship, [planet]);
  if (collisionsWithPlanet.length > 0) {
    console.log("✅ Spaceship touched planet! Triggering win.");
    gameContext.gameState = 'win'; // Set game state to 'win' immediately
    dispatch({ type: 'win' });
    Matter.Body.setVelocity(spaceship, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(spaceship, 0);
    gameContext.moveDirection = 'none';
    return entities; // IMPORTANT: Immediately return to prevent further processing
  }


  // Lose condition: Spaceship collides with an asteroid
  const asteroidBodies = Object.keys(entities)
    .filter(key => key.startsWith('asteroid_'))
    .map(key => entities[key].body);

  if (asteroidBodies.length > 0) {
    const collisionsWithAsteroids = Matter.Query.collides(spaceship, asteroidBodies);
    if (collisionsWithAsteroids.length > 0) {
      console.log("💥 Collision with asteroid — lose!");
      gameContext.gameState = 'lose'; // Set game state to 'lose' immediately
      dispatch({ type: 'lose' });
      Matter.Body.setVelocity(spaceship, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(spaceship, 0);
      gameContext.moveDirection = 'none';
      return entities; // IMPORTANT: Immediately return to prevent further processing
    }
  }

  // --- 6. Engine Update and Cleanup ---
  Matter.Engine.update(engine, time.delta);

  Object.keys(entities).forEach(key => {
    if (key.startsWith('asteroid_') && entities[key].body?.position.y > screenHeight + 100) {
      Matter.World.remove(world, entities[key].body);
      delete entities[key];
    }
  });

  return entities;
};

export default Physics;