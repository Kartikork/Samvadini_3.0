/**
 * Centralized Asset Management
 * Single source of truth for all image and audio assets
 */

// ==================== IMAGES ====================

// Planets
export const PLANET_IMAGES = {
  sun: require('../../Assets/sun.png'),
  mercury: require('../../Assets/mercury.png'),
  venus: require('../../Assets/venus.png'),
  earth: require('../../Assets/earth.png'),
  mars: require('../../Assets/mars.png'),
  jupiter: require('../../Assets/jupiter.png'),
  saturn: require('../../Assets/saturn.png'),
  uranus: require('../../Assets/uranus.png'),
  neptune: require('../../Assets/neptune.png'),
  moon: require('../../Assets/moon.png')
};

// Planet Surface Images (filenames for panorama viewer)
export const SURFACE_IMAGES = {
  sun: 'sun.png',
  mercury: 'mercury.png',
  venus: 'venus.png',
  earth: 'earth.png',
  mars: 'mars_surface.png',
  jupiter: 'jupiter.png',
  saturn: 'saturn.png',
  uranus: 'uranus.png',
  neptune: 'neptune.png',
  moon: 'moon.png'
};

// Game Objects - Main Game
export const GAME_OBJECTS = {
  spaceship: require('../../Assets/spaceship.png'),
  asteroid: require('../../Assets/asteroid.png')
};

// Mini-Game 1 Assets (Space Object Classification)
export const MINIGAME1_ASSETS = {
  asteroid: require('../../Assets/alien_green.png'), // Reusing as asteroid
  comet: require('../../Assets/alien_blue.png'), // Reusing as comet
  meteoroid: require('../../Assets/alien.png'), // Reusing as meteoroid (red)
  // dustbin: require('../../Assets/dustbin.png')
};

// Mini-Game 2 Assets (Orbital Mechanics)
export const MINIGAME2_ASSETS = {
  satellite: require('../../Assets/leaf.png'), // Reusing leaf as satellite
  orbitalRing: require('../../Assets/vent.png') // Reusing vent as orbital target
};

// Mini-Game 3 Assets (Sliding Puzzle)
export const MINIGAME3_ASSETS = {
  puzzleImage: require('../../Assets/rocket_puzzle.png')
};

// Mini-Game 4 Assets (Space Debris Cleanup)
export const MINIGAME4_ASSETS = {
  spaceship: require('../../Assets/spaceship.png'),
  debrisSmall: require('../../Assets/alien_green.png'), // Reusing
  debrisMedium: require('../../Assets/alien.png'), // Reusing
  debrisLarge: require('../../Assets/alien_blue.png') // Reusing
};

// Backgrounds
export const BACKGROUNDS = {
  space: require('../../Assets/space_background.png'),
  miniGame: require('../../Assets/minigame_background.jpg')
};

// UI Elements
export const UI_ELEMENTS = {
  heart: '❤️', // Using emoji, can be replaced with image
  star: '⭐',
  // dustbin: require('../../Assets/dustbin.png')
};

// ==================== AUDIO ====================

// Music
export const MUSIC = {
  alienGame: require('../../Assets/background_music_alien.mp3')
};

// Sound Effects
export const SOUND_EFFECTS = {
  lifeLost: require('../../Assets/life_lost.mp3')
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get planet image by ID
 * @param {string} planetId - Planet identifier
 * @returns {object} Image require object
 */
export const getPlanetImage = (planetId) => {
  return PLANET_IMAGES[planetId] || PLANET_IMAGES.earth;
};

/**
 * Get surface image filename by planet ID
 * @param {string} planetId - Planet identifier
 * @returns {string} Filename
 */
export const getSurfaceImage = (planetId) => {
  return SURFACE_IMAGES[planetId] || SURFACE_IMAGES.earth;
};

/**
 * Preload images for performance
 * @param {array} imageArray - Array of image requires
 * @returns {Promise} Resolves when all images loaded
 */
export const preloadImages = async (imageArray) => {
  const promises = imageArray.map(img => {
    return new Promise((resolve, reject) => {
      // React Native handles image loading differently
      // This is a placeholder for potential optimization
      resolve(img);
    });
  });
  return Promise.all(promises);
};

/**
 * Get all assets for a specific mini-game
 * @param {number} gameNumber - Mini-game number (1-4)
 * @returns {object} Asset object for that game
 */
export const getMinigameAssets = (gameNumber) => {
  const assetMap = {
    1: MINIGAME1_ASSETS,
    2: MINIGAME2_ASSETS,
    3: MINIGAME3_ASSETS,
    4: MINIGAME4_ASSETS
  };
  return assetMap[gameNumber] || {};
};

/**
 * Get all planet images as array
 * @returns {array} Array of planet image objects
 */
export const getAllPlanetImages = () => {
  return Object.values(PLANET_IMAGES);
};

/**
 * Check if asset exists
 * @param {string} assetType - Type of asset (planet, sound, etc.)
 * @param {string} assetId - Asset identifier
 * @returns {boolean} True if exists
 */
export const assetExists = (assetType, assetId) => {
  const assetMaps = {
    planet: PLANET_IMAGES,
    surface: SURFACE_IMAGES,
    music: MUSIC,
    sfx: SOUND_EFFECTS
  };

  const map = assetMaps[assetType];
  return map && map[assetId] !== undefined;
};

export default {
  PLANET_IMAGES,
  SURFACE_IMAGES,
  GAME_OBJECTS,
  MINIGAME1_ASSETS,
  MINIGAME2_ASSETS,
  MINIGAME3_ASSETS,
  MINIGAME4_ASSETS,
  BACKGROUNDS,
  UI_ELEMENTS,
  MUSIC,
  SOUND_EFFECTS
};
