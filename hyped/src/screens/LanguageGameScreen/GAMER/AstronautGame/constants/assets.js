// Planets
export const PLANET_IMAGES = {
  sun: require('../sun.png'),
  mercury: require('../mercury.png'),
  venus: require('../venus.png'),
  earth: require('../earth.png'),
  mars: require('../mars.png'),
  jupiter: require('../jupiter.png'),
  saturn: require('../saturn.png'),
  uranus: require('../uranus.png'),
  neptune: require('../neptune.png'),
  moon: require('../moon.png')
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
  spaceship: require('../spaceship.png'),
  asteroid: require('../asteroid.png')
};

// Mini-Game 1 Assets (Space Object Classification)
export const MINIGAME1_ASSETS = {
  asteroid: require('../alien_green.png'),
  comet: require('../alien_blue.png'),
  meteoroid: require('../alien.png'),
};

// Mini-Game 2 Assets (Orbital Mechanics)
export const MINIGAME2_ASSETS = {
  // satellite: require('../leaf.png'),
  orbitalRing: require('../vent.png')
};

// Mini-Game 3 Assets (Sliding Puzzle)
export const MINIGAME3_ASSETS = {
  puzzleImage: require('../rocket_puzzle.png')
};

// Mini-Game 4 Assets (Space Debris Cleanup)
export const MINIGAME4_ASSETS = {
  spaceship: require('../spaceship.png'),
  debrisSmall: require('../alien_green.png'),
  debrisMedium: require('../alien.png'),
  debrisLarge: require('../alien_blue.png')
};

// Backgrounds
export const BACKGROUNDS = {
  space: require('../space_background.png'),
  miniGame: require('../minigame_background.jpg')
};

// UI Elements
export const UI_ELEMENTS = {
  heart: '❤️',
  star: '⭐',
};


// Music
export const MUSIC = {
  alienGame: require('../background_music_alien.mp3')
};

// Sound Effects
export const SOUND_EFFECTS = {
  lifeLost: require('../life_lost.mp3')
};


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
