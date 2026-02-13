/**
 * Object Pool Utility
 * Reuses objects instead of creating/destroying them
 * Significantly improves performance by reducing memory allocations
 */

/**
 * Generic Object Pool class
 */
export class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this.createFn = createFn; // Function to create new objects
    this.resetFn = resetFn; // Function to reset object state
    this.available = [];
    this.inUse = new Set();

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.createFn());
    }
  }

  /**
   * Get an object from the pool
   * @param {object} initialState - Optional initial state
   * @returns {object} Pooled object
   */
  acquire(initialState = {}) {
    let obj;

    if (this.available.length > 0) {
      obj = this.available.pop();
    } else {
      obj = this.createFn();
    }

    this.resetFn(obj, initialState);
    this.inUse.add(obj);
    return obj;
  }

  /**
   * Return an object to the pool
   * @param {object} obj - Object to return
   */
  release(obj) {
    if (this.inUse.has(obj)) {
      this.inUse.delete(obj);
      this.available.push(obj);
    }
  }

  /**
   * Release all in-use objects
   */
  releaseAll() {
    this.inUse.forEach(obj => {
      this.available.push(obj);
    });
    this.inUse.clear();
  }

  /**
   * Get current pool statistics
   * @returns {object} Pool stats
   */
  getStats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size
    };
  }

  /**
   * Clear the entire pool
   */
  clear() {
    this.available = [];
    this.inUse.clear();
  }
}

/**
 * Create an Asteroid Pool
 * @param {number} size - Pool size
 * @returns {ObjectPool} Asteroid pool
 */
export const createAsteroidPool = (size = 15) => {
  const createAsteroid = () => ({
    id: Math.random().toString(36),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    size: 30,
    rotation: 0,
    rotationSpeed: 0,
    active: false,
    body: null
  });

  const resetAsteroid = (asteroid, state = {}) => {
    asteroid.x = state.x || 0;
    asteroid.y = state.y || 0;
    asteroid.vx = state.vx || 0;
    asteroid.vy = state.vy || 0;
    asteroid.size = state.size || 30;
    asteroid.rotation = state.rotation || 0;
    asteroid.rotationSpeed = state.rotationSpeed || Math.random() * 0.1 - 0.05;
    asteroid.active = true;
    asteroid.body = state.body || null;
  };

  return new ObjectPool(createAsteroid, resetAsteroid, size);
};

/**
 * Create a Particle Pool
 * @param {number} size - Pool size
 * @returns {ObjectPool} Particle pool
 */
export const createParticlePool = (size = 50) => {
  const createParticle = () => ({
    id: Math.random().toString(36),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 1.0,
    maxLife: 1.0,
    size: 3,
    color: '#FFF',
    active: false
  });

  const resetParticle = (particle, state = {}) => {
    particle.x = state.x || 0;
    particle.y = state.y || 0;
    particle.vx = state.vx || (Math.random() - 0.5) * 5;
    particle.vy = state.vy || (Math.random() - 0.5) * 5;
    particle.life = state.life || 1.0;
    particle.maxLife = state.maxLife || 1.0;
    particle.size = state.size || 3;
    particle.color = state.color || '#FFF';
    particle.active = true;
  };

  return new ObjectPool(createParticle, resetParticle, size);
};

/**
 * Create a Laser/Bullet Pool
 * @param {number} size - Pool size
 * @returns {ObjectPool} Laser pool
 */
export const createLaserPool = (size = 20) => {
  const createLaser = () => ({
    id: Math.random().toString(36),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 10,
    width: 4,
    height: 15,
    color: '#00FF00',
    active: false,
    damage: 1
  });

  const resetLaser = (laser, state = {}) => {
    laser.x = state.x || 0;
    laser.y = state.y || 0;
    laser.vx = state.vx || 0;
    laser.vy = state.vy || -10;
    laser.speed = state.speed || 10;
    laser.width = state.width || 4;
    laser.height = state.height || 15;
    laser.color = state.color || '#00FF00';
    laser.active = true;
    laser.damage = state.damage || 1;
  };

  return new ObjectPool(createLaser, resetLaser, size);
};

/**
 * Create a Space Debris Pool
 * @param {number} size - Pool size
 * @returns {ObjectPool} Debris pool
 */
export const createDebrisPool = (size = 20) => {
  const createDebris = () => ({
    id: Math.random().toString(36),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    type: 'SMALL',
    health: 1,
    maxHealth: 1,
    size: 'small',
    speed: 1,
    points: 10,
    active: false
  });

  const resetDebris = (debris, state = {}) => {
    debris.x = state.x || 0;
    debris.y = state.y || 0;
    debris.vx = state.vx || 0;
    debris.vy = state.vy || 1;
    debris.type = state.type || 'SMALL';
    debris.health = state.health || 1;
    debris.maxHealth = state.maxHealth || 1;
    debris.size = state.size || 'small';
    debris.speed = state.speed || 1;
    debris.points = state.points || 10;
    debris.active = true;
  };

  return new ObjectPool(createDebris, resetDebris, size);
};

/**
 * Create a Space Object Pool (for MiniGame1)
 * @param {number} size - Pool size
 * @returns {ObjectPool} Space object pool
 */
export const createSpaceObjectPool = (size = 15) => {
  const createSpaceObject = () => ({
    id: Math.random().toString(36),
    x: 0,
    y: 0,
    type: 'ASTEROID',
    speed: 2,
    points: 10,
    zigzag: false,
    zigzagOffset: 0,
    zigzagAmplitude: 30,
    zigzagFrequency: 0.05,
    active: false,
    caught: false
  });

  const resetSpaceObject = (obj, state = {}) => {
    obj.x = state.x || Math.random() * (state.screenWidth || 300);
    obj.y = state.y || -50;
    obj.type = state.type || 'ASTEROID';
    obj.speed = state.speed || 2;
    obj.points = state.points || 10;
    obj.zigzag = state.zigzag || false;
    obj.zigzagOffset = state.zigzagOffset || 0;
    obj.zigzagAmplitude = state.zigzagAmplitude || 30;
    obj.zigzagFrequency = state.zigzagFrequency || 0.05;
    obj.active = true;
    obj.caught = false;
  };

  return new ObjectPool(createSpaceObject, resetSpaceObject, size);
};

/**
 * Create a Star field pool (for backgrounds)
 * @param {number} size - Pool size
 * @returns {ObjectPool} Star pool
 */
export const createStarPool = (size = 50) => {
  const createStar = () => ({
    id: Math.random().toString(36),
    x: 0,
    y: 0,
    size: 1,
    speed: 1,
    opacity: 1,
    active: false
  });

  const resetStar = (star, state = {}) => {
    star.x = state.x || Math.random() * (state.screenWidth || 400);
    star.y = state.y || Math.random() * (state.screenHeight || 800);
    star.size = state.size || Math.random() * 2 + 1;
    star.speed = state.speed || Math.random() * 1.5 + 0.5;
    star.opacity = state.opacity || Math.random() * 0.5 + 0.5;
    star.active = true;
  };

  return new ObjectPool(createStar, resetStar, size);
};

/**
 * Spatial Grid for optimized collision detection
 * Divides space into grid cells for faster lookups
 */
export class SpatialGrid {
  constructor(width, height, cellSize = 100) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.clear();
  }

  /**
   * Clear the grid
   */
  clear() {
    this.cells = new Map();
  }

  /**
   * Get cell key from coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {string} Cell key
   */
  getCellKey(x, y) {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    return `${col},${row}`;
  }

  /**
   * Insert object into grid
   * @param {object} obj - Object with x, y, and size properties
   */
  insert(obj) {
    const cellKey = this.getCellKey(obj.x, obj.y);

    if (!this.cells.has(cellKey)) {
      this.cells.set(cellKey, []);
    }

    this.cells.get(cellKey).push(obj);
  }

  /**
   * Get nearby objects for collision checking
   * @param {object} obj - Object with x, y, and radius properties
   * @returns {array} Nearby objects
   */
  getNearby(obj) {
    const nearby = [];
    const radius = obj.radius || obj.size || 20;

    // Check adjacent cells
    const minCol = Math.floor((obj.x - radius) / this.cellSize);
    const maxCol = Math.floor((obj.x + radius) / this.cellSize);
    const minRow = Math.floor((obj.y - radius) / this.cellSize);
    const maxRow = Math.floor((obj.y + radius) / this.cellSize);

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const key = `${col},${row}`;
        const cellObjects = this.cells.get(key);

        if (cellObjects) {
          nearby.push(...cellObjects);
        }
      }
    }

    return nearby;
  }

  /**
   * Get all objects in grid
   * @returns {array} All objects
   */
  getAllObjects() {
    const all = [];
    this.cells.forEach(cellObjects => {
      all.push(...cellObjects);
    });
    return all;
  }
}

/**
 * Simple collision detection helper
 * @param {object} obj1 - First object {x, y, radius}
 * @param {object} obj2 - Second object {x, y, radius}
 * @returns {boolean} Are colliding
 */
export const checkCollision = (obj1, obj2) => {
  const dx = obj1.x - obj2.x;
  const dy = obj1.y - obj2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const minDistance = (obj1.radius || obj1.size || 20) + (obj2.radius || obj2.size || 20);
  return distance < minDistance;
};

/**
 * Rectangle collision detection
 * @param {object} rect1 - {x, y, width, height}
 * @param {object} rect2 - {x, y, width, height}
 * @returns {boolean} Are colliding
 */
export const checkRectCollision = (rect1, rect2) => {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
};

export default {
  ObjectPool,
  createAsteroidPool,
  createParticlePool,
  createLaserPool,
  createDebrisPool,
  createSpaceObjectPool,
  createStarPool,
  SpatialGrid,
  checkCollision,
  checkRectCollision
};
