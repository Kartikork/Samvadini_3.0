/**
 * Centralized Game Configuration
 * All game settings, difficulty parameters, and magic numbers
 */

export const GAME_CONFIG = {
  // Mini-Game 1: Space Object Classification
  MINIGAME1: {
    STARTING_LIVES: 3,
    WIN_SCORE: 200,
    STARTING_SPEED: 2,
    SPEED_INCREMENT: 0.5,
    DIFFICULTY_INCREASE_INTERVAL: 50, // Increase difficulty every N points
    SPAWN_INTERVAL: 2000, // ms
    SPAWN_INTERVAL_MIN: 800, // Minimum spawn interval
    SPAWN_DECREASE_RATE: 100, // Decrease spawn interval by this amount

    OBJECT_TYPES: {
      ASTEROID: {
        points: 10,
        speedMultiplier: 1,
        color: 'gray',
        label: 'Asteroid'
      },
      COMET: {
        points: 20,
        speedMultiplier: 1.3,
        zigzag: true,
        color: 'blue',
        label: 'Comet'
      },
      METEOROID: {
        points: 15,
        speedMultiplier: 1.5,
        color: 'orange',
        label: 'Meteoroid'
      }
    }
  },

  // Mini-Game 2: Orbital Mechanics Puzzle
  MINIGAME2: {
    REQUIRED_SATELLITES: 5,
    ORBITAL_RINGS: {
      LEO: {
        label: 'Low Earth Orbit (LEO)',
        altitude: '160-2,000 km',
        purpose: 'ISS, Earth observation'
      },
      MEO: {
        label: 'Medium Earth Orbit (MEO)',
        altitude: '2,000-35,786 km',
        purpose: 'GPS, navigation satellites'
      },
      GEO: {
        label: 'Geostationary Orbit (GEO)',
        altitude: '35,786 km',
        purpose: 'Communication, weather satellites'
      }
    }
  },

  // Mini-Game 3: Planet Discovery Puzzle
  MINIGAME3: {
    GRID_SIZE: 3,
    SHUFFLE_MOVES: 100,
    HINT_DURATION: 3000, // ms
    SKIP_MOVES_THRESHOLD: 50,
    MAX_SOLVABILITY_CHECKS: 100
  },

  // Mini-Game 4: Space Debris Cleanup
  MINIGAME4: {
    STARTING_LIVES: 3,
    WIN_SCORE: 250,
    AMMO_CAPACITY: 20,
    RELOAD_TIME: 4000, // ms

    DEBRIS_TYPES: {
      SMALL: {
        points: 10,
        health: 1,
        speed: 1,
        size: 'small',
        spawnWeight: 60 // % chance in spawn pool
      },
      MEDIUM: {
        points: 30,
        health: 2,
        speed: 0.8,
        size: 'medium',
        spawnWeight: 30
      },
      LARGE: {
        points: 50,
        health: 3,
        speed: 0.5,
        size: 'large',
        spawnWeight: 10
      }
    },

    COMBO_MULTIPLIERS: {
      2: 1.2,
      3: 1.5,
      4: 2.0,
      5: 2.5
    },

    SPAWN_RATE: 2000, // ms initial
    SPAWN_RATE_MIN: 800,
    SPAWN_RATE_DECREASE: 50,

    MAX_PARTICLES: 50,
    PARTICLE_LIFETIME: 1000, // ms

    FORMATION_INTERVAL: 15000, // Show formation every N ms

    COLLISION: {
      PLAYER_RADIUS: 25,
      DEBRIS_SMALL_RADIUS: 15,
      DEBRIS_MEDIUM_RADIUS: 25,
      DEBRIS_LARGE_RADIUS: 35,
      LASER_RADIUS: 5
    }
  },

  // Main Game: Asteroid Dodging & Planet Landing
  MAINGAME: {
    DODGING_PHASE_DURATION: 5000, // ms
    ASTEROID_SPAWN_INTERVAL: 1000, // ms
    ASTEROID_POOL_SIZE: 15,

    MOVEMENT_SPEED: 5,
    SHIP_SIZE: 40,
    ASTEROID_SIZE_MIN: 20,
    ASTEROID_SIZE_MAX: 50,

    PLANET_ENTRANCE_DURATION: 2000, // ms
    LANDING_ZONE_RADIUS: 60,

    PHYSICS: {
      GRAVITY: { x: 0, y: 0 },
      ASTEROID_VELOCITY_MIN: 1,
      ASTEROID_VELOCITY_MAX: 3,
      FRICTION: 0.01,
      RESTITUTION: 0.3
    }
  },

  // Planet Surface Screen: 360° Photo Mission
  PLANET_SURFACE: {
    MAX_PHOTOS: 5,
    POINTS_PER_PHOTO: 100,
    FLASH_DURATION: 200, // ms
    PANORAMA_FOV: 90, // Field of view degrees
    PANORAMA_PITCH: 0,
    PANORAMA_YAW: 0
  },

  // General Game Settings
  GENERAL: {
    FPS_TARGET: 30, // Target FPS for mid-range devices
    FRAME_TIME: 1000 / 30, // ms per frame

    SCREEN_TRANSITION_DURATION: 300, // ms

    FACT_DISPLAY_DURATION: 5000, // ms
    FACT_COOLDOWN: 10000, // ms between auto-facts

    BACKGROUND_MUSIC_VOLUME: 0.3,
    SFX_VOLUME: 0.5,

    STAR_COUNT: 50, // Background stars
    STAR_SPEED_MIN: 0.5,
    STAR_SPEED_MAX: 2,

    DIFFICULTY_LEVELS: {
      EASY: 'easy',
      MEDIUM: 'medium',
      HARD: 'hard'
    }
  },

  // UI Constants
  UI: {
    HEART_SIZE: 30,
    BUTTON_HEIGHT: 50,
    MODAL_FADE_DURATION: 250,
    TOAST_DURATION: 3000,

    COLORS: {
      PRIMARY: '#4A90E2',
      SECONDARY: '#7B68EE',
      SUCCESS: '#4CAF50',
      WARNING: '#FFC107',
      DANGER: '#F44336',
      BACKGROUND: '#0A0E27',
      TEXT_PRIMARY: '#FFFFFF',
      TEXT_SECONDARY: '#B0B0B0',
      SPACE_DARK: '#000033',
      SPACE_LIGHT: '#1A1A4D',
      FACT_CARD_BG: 'rgba(42, 42, 84, 0.95)'
    },

    GRADIENTS: {
      SPACE: ['#000033', '#000066', '#1A1A4D'],
      PLANET: ['#4A00E0', '#8E2DE2'],
      SUCCESS: ['#56ab2f', '#a8e063'],
      DANGER: ['#ED213A', '#93291E']
    }
  },

  // Performance Settings
  PERFORMANCE: {
    ENABLE_PARTICLES: true,
    MAX_RENDER_OBJECTS: 100,
    COLLISION_GRID_SIZE: 5, // Spatial partitioning grid
    USE_OBJECT_POOLING: true,
    REDUCE_MOTION: false, // For accessibility

    // Mid-range device optimizations
    MID_RANGE: {
      MAX_PARTICLES: 30,
      STAR_COUNT: 30,
      REDUCE_SHADOWS: true,
      LOWER_QUALITY_TEXTURES: false
    }
  },

  // Educational Content Settings
  EDUCATION: {
    FACTS_PER_GAME: 1, // Show 1 fact after each mini-game
    PROGRESSIVE_DIFFICULTY: true, // Show easy facts first
    FACT_CATEGORIES: ['Size', 'Temperature', 'Discovery', 'Orbit', 'Composition', 'Moons', 'Phenomena'],
    UNLOCK_SYSTEM: true // Unlock advanced facts by completing games
  }
};

/**
 * Get difficulty multiplier based on level
 * @param {string} difficulty - 'easy', 'medium', 'hard'
 * @returns {number} Multiplier
 */
export const getDifficultyMultiplier = (difficulty) => {
  const multipliers = {
    easy: 0.8,
    medium: 1.0,
    hard: 1.3
  };
  return multipliers[difficulty] || 1.0;
};

/**
 * Calculate score with combo multiplier
 * @param {number} baseScore - Base score
 * @param {number} comboCount - Current combo count
 * @returns {number} Final score
 */
export const calculateComboScore = (baseScore, comboCount) => {
  const multiplier = GAME_CONFIG.MINIGAME4.COMBO_MULTIPLIERS[comboCount] || 1.0;
  return Math.floor(baseScore * multiplier);
};

/**
 * Check if score reached next difficulty tier
 * @param {number} score - Current score
 * @param {number} interval - Difficulty increase interval
 * @returns {boolean} Should increase difficulty
 */
export const shouldIncreaseDifficulty = (score, interval) => {
  return score > 0 && score % interval === 0;
};

/**
 * Get spawn rate based on current score
 * @param {number} score - Current score
 * @param {number} baseRate - Base spawn rate
 * @param {number} minRate - Minimum spawn rate
 * @param {number} decreaseRate - Amount to decrease per tier
 * @returns {number} Current spawn rate
 */
export const getSpawnRate = (score, baseRate, minRate, decreaseRate) => {
  const tiers = Math.floor(score / 50);
  const newRate = baseRate - (tiers * decreaseRate);
  return Math.max(newRate, minRate);
};

/**
 * Get random debris type based on spawn weights
 * @returns {string} Debris type key
 */
export const getRandomDebrisType = () => {
  const types = GAME_CONFIG.MINIGAME4.DEBRIS_TYPES;
  const totalWeight = Object.values(types).reduce((sum, type) => sum + type.spawnWeight, 0);
  let random = Math.random() * totalWeight;

  for (const [key, type] of Object.entries(types)) {
    random -= type.spawnWeight;
    if (random <= 0) return key;
  }

  return 'SMALL'; // Fallback
};

/**
 * Check if puzzle is solvable (for sliding puzzles)
 * @param {array} tiles - Array of tile positions
 * @returns {boolean} Is solvable
 */
export const isPuzzleSolvable = (tiles) => {
  let inversions = 0;
  const size = Math.sqrt(tiles.length);

  for (let i = 0; i < tiles.length - 1; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      if (tiles[i] > tiles[j] && tiles[i] !== size * size && tiles[j] !== size * size) {
        inversions++;
      }
    }
  }

  // For odd grid size, puzzle is solvable if inversions is even
  if (size % 2 === 1) {
    return inversions % 2 === 0;
  }

  // For even grid size, also need to check blank tile row
  const blankIndex = tiles.indexOf(size * size);
  const blankRow = Math.floor(blankIndex / size);
  return (inversions + blankRow) % 2 === 1;
};

export default GAME_CONFIG;
