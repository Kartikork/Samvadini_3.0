export const PLANET_DATA = {
  sun: {
    id: 'sun',
    name: 'Sun-X',
    type: 'Star',
    image: require('../sun.png'),
    surfaceImage: 'sun.jpg',

    basicFacts: {
      diameter: '1,392,700 km',
      mass: '1.989 × 10³⁰ kg',
      temperature: '5,500°C (surface)',
      distanceFromEarth: '149.6 million km',
      age: '4.6 billion years'
    },

    composition: {
      primary: 'Hydrogen (73%) and Helium (25%)',
      state: 'Plasma',
      core: 'Nuclear fusion reactor',
      layers: 'Core, Radiative Zone, Convection Zone, Photosphere, Chromosphere, Corona'
    },

    interestingFacts: [
      {
        category: 'Size',
        fact: 'The Sun contains 99.86% of all the mass in our Solar System.',
        difficulty: 'easy'
      },
      {
        category: 'Energy',
        fact: 'Every second, the Sun converts 600 million tons of hydrogen into helium through nuclear fusion.',
        difficulty: 'medium'
      },
      {
        category: 'Light',
        fact: 'It takes about 8 minutes and 20 seconds for sunlight to reach Earth.',
        difficulty: 'easy'
      },
      {
        category: 'Temperature',
        fact: 'The Sun\'s core temperature is approximately 15 million degrees Celsius, hot enough to sustain nuclear fusion.',
        difficulty: 'medium'
      },
      {
        category: 'Magnetic Field',
        fact: 'Solar flares and coronal mass ejections from the Sun can disrupt satellites and power grids on Earth.',
        difficulty: 'hard'
      },
      {
        category: 'Lifespan',
        fact: 'The Sun is currently in its middle age and will continue shining for another 5 billion years before becoming a red giant.',
        difficulty: 'medium'
      },
      {
        category: 'Phenomena',
        fact: 'Sunspots are darker, cooler regions on the Sun\'s surface caused by magnetic field interactions, appearing in 11-year cycles.',
        difficulty: 'hard'
      }
    ],

    moons: 0,
    rings: false,

    funFact: 'If the Sun were hollow, over one million Earths could fit inside it!'
  },

  mercury: {
    id: 'mercury',
    name: 'Mercury-X',
    type: 'Terrestrial Planet',
    image: require('../mercury.png'),
    surfaceImage: 'mercury.jpg',

    basicFacts: {
      diameter: '4,879 km',
      mass: '3.285 × 10²³ kg',
      temperature: '-173°C to 427°C',
      distanceFromSun: '57.9 million km',
      orbitalPeriod: '88 Earth days',
      rotationPeriod: '59 Earth days'
    },

    composition: {
      primary: 'Iron core (75% of planet\'s radius)',
      surface: 'Rocky, cratered surface similar to Moon',
      atmosphere: 'Extremely thin exosphere (oxygen, sodium, hydrogen, helium)',
      core: 'Large metallic core, partially molten'
    },

    interestingFacts: [
      {
        category: 'Orbit',
        fact: 'Mercury is the fastest planet, orbiting the Sun at 47 km/s - that\'s 170,000 km/h!',
        difficulty: 'easy'
      },
      {
        category: 'Temperature',
        fact: 'Despite being closest to the Sun, Mercury isn\'t the hottest planet - Venus is. Mercury has no atmosphere to trap heat.',
        difficulty: 'medium'
      },
      {
        category: 'Surface',
        fact: 'Mercury has the most cratered surface in the Solar System, with the Caloris Basin spanning 1,550 km across.',
        difficulty: 'medium'
      },
      {
        category: 'Day Length',
        fact: 'One day on Mercury (sunrise to sunrise) lasts 176 Earth days - twice as long as its year!',
        difficulty: 'hard'
      },
      {
        category: 'Discovery',
        fact: 'Only two spacecraft have visited Mercury: Mariner 10 (1974-1975) and MESSENGER (2008-2015).',
        difficulty: 'medium'
      },
      {
        category: 'Ice',
        fact: 'Scientists have discovered water ice in permanently shadowed craters at Mercury\'s poles, despite extreme surface heat.',
        difficulty: 'hard'
      },
      {
        category: 'Size',
        fact: 'Mercury is only slightly larger than Earth\'s Moon, making it the smallest planet in our Solar System.',
        difficulty: 'easy'
      }
    ],

    moons: 0,
    rings: false,

    funFact: 'A year on Mercury is shorter than a day on Mercury!'
  },

  venus: {
    id: 'venus',
    name: 'Venus-X',
    type: 'Terrestrial Planet',
    image: require('../venus.png'),
    surfaceImage: 'venus.jpg',

    basicFacts: {
      diameter: '12,104 km',
      mass: '4.867 × 10²⁴ kg',
      temperature: '462°C (surface average)',
      distanceFromSun: '108.2 million km',
      orbitalPeriod: '225 Earth days',
      rotationPeriod: '243 Earth days (retrograde)'
    },

    composition: {
      primary: 'Rocky planet with iron core',
      surface: 'Volcanic plains, mountains, and deformed terrain',
      atmosphere: 'Dense CO₂ (96.5%), nitrogen, sulfuric acid clouds',
      pressure: '92 times Earth\'s atmospheric pressure'
    },

    interestingFacts: [
      {
        category: 'Temperature',
        fact: 'Venus is the hottest planet in the Solar System, hot enough to melt lead, due to extreme greenhouse effect.',
        difficulty: 'easy'
      },
      {
        category: 'Rotation',
        fact: 'Venus rotates backwards (retrograde) compared to most planets, and rotates so slowly that its day is longer than its year.',
        difficulty: 'medium'
      },
      {
        category: 'Atmosphere',
        fact: 'Venus\' atmosphere is so thick that the pressure at the surface is equivalent to being 900 meters underwater on Earth.',
        difficulty: 'hard'
      },
      {
        category: 'Appearance',
        fact: 'Venus is the brightest natural object in Earth\'s night sky after the Moon, often called the "Morning Star" or "Evening Star".',
        difficulty: 'easy'
      },
      {
        category: 'Surface',
        fact: 'Venus has over 1,600 volcanoes, more than any other planet, though most are believed to be dormant.',
        difficulty: 'medium'
      },
      {
        category: 'Clouds',
        fact: 'The thick clouds of Venus are made of sulfuric acid and move around the planet every 4 days, creating super-rotating winds.',
        difficulty: 'hard'
      },
      {
        category: 'Similarity',
        fact: 'Venus is often called Earth\'s "sister planet" because of their similar size, mass, and composition.',
        difficulty: 'easy'
      }
    ],

    moons: 0,
    rings: false,

    funFact: 'A day on Venus lasts longer than a year on Venus!'
  },

  earth: {
    id: 'earth',
    name: 'Earth-X',
    type: 'Terrestrial Planet',
    image: require('../earth.png'),
    surfaceImage: 'earth.jpg',

    basicFacts: {
      diameter: '12,742 km',
      mass: '5.972 × 10²⁴ kg',
      temperature: '-88°C to 58°C (average 15°C)',
      distanceFromSun: '149.6 million km (1 AU)',
      orbitalPeriod: '365.25 days',
      rotationPeriod: '23.93 hours'
    },

    composition: {
      primary: 'Iron and nickel core, rocky mantle and crust',
      surface: '71% water, 29% land',
      atmosphere: 'Nitrogen (78%), Oxygen (21%), other gases',
      core: 'Solid inner core, liquid outer core'
    },

    interestingFacts: [
      {
        category: 'Life',
        fact: 'Earth is the only known planet in the universe to harbor life, with over 8.7 million species.',
        difficulty: 'easy'
      },
      {
        category: 'Water',
        fact: 'Earth is the only planet with liquid water on its surface, covering 71% of the planet.',
        difficulty: 'easy'
      },
      {
        category: 'Magnetic Field',
        fact: 'Earth\'s magnetic field protects us from harmful solar radiation and cosmic rays, making life possible.',
        difficulty: 'medium'
      },
      {
        category: 'Plate Tectonics',
        fact: 'Earth is the only known planet with active plate tectonics, which recycles the crust and regulates climate.',
        difficulty: 'hard'
      },
      {
        category: 'Moon',
        fact: 'Earth\'s Moon is the fifth-largest moon in the Solar System and the largest relative to its host planet.',
        difficulty: 'medium'
      },
      {
        category: 'Atmosphere',
        fact: 'Earth\'s atmosphere contains the perfect amount of oxygen (21%) - any more and fires would burn uncontrollably.',
        difficulty: 'medium'
      },
      {
        category: 'Orbit',
        fact: 'Earth travels through space at 107,000 km/h as it orbits the Sun, while spinning at 1,670 km/h at the equator.',
        difficulty: 'hard'
      }
    ],

    moons: 1,
    rings: false,

    funFact: 'Earth is the only planet not named after a Greek or Roman god!'
  },

  mars: {
    id: 'mars',
    name: 'Mars-X',
    type: 'Terrestrial Planet',
    image: require('../mars.png'),
    surfaceImage: 'mars_surface.jpg',

    basicFacts: {
      diameter: '6,779 km',
      mass: '6.39 × 10²³ kg',
      temperature: '-140°C to 20°C (average -63°C)',
      distanceFromSun: '227.9 million km',
      orbitalPeriod: '687 Earth days',
      rotationPeriod: '24.6 hours'
    },

    composition: {
      primary: 'Iron core, rocky mantle and crust',
      surface: 'Iron oxide (rust) gives red color, volcanic rocks, canyons, polar ice',
      atmosphere: 'Thin CO₂ (95%), nitrogen, argon',
      core: 'Partially molten iron core'
    },

    interestingFacts: [
      {
        category: 'Appearance',
        fact: 'Mars is called the Red Planet because iron oxide (rust) on its surface gives it a reddish appearance.',
        difficulty: 'easy'
      },
      {
        category: 'Geology',
        fact: 'Olympus Mons on Mars is the largest volcano in the Solar System, standing 21 km high - nearly three times taller than Mount Everest.',
        difficulty: 'medium'
      },
      {
        category: 'Canyons',
        fact: 'Valles Marineris is a canyon system 4,000 km long and 7 km deep - it would stretch across the entire United States.',
        difficulty: 'hard'
      },
      {
        category: 'Water',
        fact: 'Mars has polar ice caps made of water ice and frozen CO₂, and scientists have found evidence of ancient river valleys.',
        difficulty: 'medium'
      },
      {
        category: 'Exploration',
        fact: 'Mars has been visited by more spacecraft than any other planet, with multiple rovers currently exploring its surface.',
        difficulty: 'easy'
      },
      {
        category: 'Moons',
        fact: 'Mars has two small moons, Phobos and Deimos, which are likely captured asteroids.',
        difficulty: 'medium'
      },
      {
        category: 'Atmosphere',
        fact: 'Mars\' atmosphere is only 1% as thick as Earth\'s, making it impossible to breathe and difficult to land spacecraft safely.',
        difficulty: 'hard'
      }
    ],

    moons: 2,
    rings: false,

    funFact: 'A day on Mars (called a "sol") is only 37 minutes longer than a day on Earth!'
  },

  jupiter: {
    id: 'jupiter',
    name: 'Jupiter-X',
    type: 'Gas Giant',
    image: require('../jupiter.png'),
    surfaceImage: 'jupiter.jpg',

    basicFacts: {
      diameter: '139,820 km',
      mass: '1.898 × 10²⁷ kg',
      temperature: '-145°C (cloud tops)',
      distanceFromSun: '778.5 million km',
      orbitalPeriod: '11.86 Earth years',
      rotationPeriod: '9.93 hours'
    },

    composition: {
      primary: 'Hydrogen (90%) and Helium (10%)',
      surface: 'No solid surface - gas giant',
      atmosphere: 'Hydrogen, helium, methane, ammonia',
      core: 'Possible rocky core under extreme pressure'
    },

    interestingFacts: [
      {
        category: 'Size',
        fact: 'Jupiter is the largest planet in our Solar System - over 1,300 Earths could fit inside it!',
        difficulty: 'easy'
      },
      {
        category: 'Great Red Spot',
        fact: 'Jupiter\'s Great Red Spot is a storm larger than Earth that has been raging for at least 350 years.',
        difficulty: 'medium'
      },
      {
        category: 'Magnetic Field',
        fact: 'Jupiter has the strongest magnetic field of any planet, 20,000 times stronger than Earth\'s.',
        difficulty: 'hard'
      },
      {
        category: 'Rotation',
        fact: 'Jupiter rotates faster than any other planet, completing one rotation in less than 10 hours despite its enormous size.',
        difficulty: 'medium'
      },
      {
        category: 'Moons',
        fact: 'Jupiter has 95 known moons, including the four large Galilean moons: Io, Europa, Ganymede, and Callisto.',
        difficulty: 'medium'
      },
      {
        category: 'Protection',
        fact: 'Jupiter acts as a "cosmic vacuum cleaner," using its powerful gravity to shield inner planets from asteroids and comets.',
        difficulty: 'hard'
      },
      {
        category: 'Atmosphere',
        fact: 'Jupiter\'s colorful bands are created by powerful winds blowing in opposite directions at different latitudes.',
        difficulty: 'easy'
      }
    ],

    moons: 95,
    rings: true,

    funFact: 'Jupiter is so massive that it doesn\'t actually orbit the Sun - they both orbit a point in space between them!'
  },

  saturn: {
    id: 'saturn',
    name: 'Saturn-X',
    type: 'Gas Giant',
    image: require('../saturn.png'),
    surfaceImage: 'saturn.jpg',

    basicFacts: {
      diameter: '116,460 km',
      mass: '5.683 × 10²⁶ kg',
      temperature: '-178°C (cloud tops)',
      distanceFromSun: '1.43 billion km',
      orbitalPeriod: '29.45 Earth years',
      rotationPeriod: '10.66 hours'
    },

    composition: {
      primary: 'Hydrogen (96%) and Helium (3%)',
      surface: 'No solid surface - gas giant',
      atmosphere: 'Hydrogen, helium, methane, ammonia',
      core: 'Dense core of rock and ice'
    },

    interestingFacts: [
      {
        category: 'Rings',
        fact: 'Saturn\'s iconic rings are made of billions of pieces of ice and rock, ranging from tiny grains to house-sized chunks.',
        difficulty: 'easy'
      },
      {
        category: 'Density',
        fact: 'Saturn is the least dense planet - if you could find an ocean big enough, Saturn would float in it!',
        difficulty: 'medium'
      },
      {
        category: 'Moons',
        fact: 'Saturn has 146 known moons, the most of any planet. Titan, its largest moon, has a thick atmosphere and liquid lakes.',
        difficulty: 'medium'
      },
      {
        category: 'Hexagon',
        fact: 'Saturn has a mysterious hexagonal storm at its north pole that is wider than two Earths.',
        difficulty: 'hard'
      },
      {
        category: 'Rings Formation',
        fact: 'Saturn\'s rings may be fragments of a destroyed moon or comet, and could be between 10-100 million years old.',
        difficulty: 'hard'
      },
      {
        category: 'Winds',
        fact: 'Saturn has winds of up to 1,800 km/h, the second-fastest in the Solar System after Neptune.',
        difficulty: 'medium'
      },
      {
        category: 'Visibility',
        fact: 'Saturn is the farthest planet visible to the naked eye from Earth, known to humans since ancient times.',
        difficulty: 'easy'
      }
    ],

    moons: 146,
    rings: true,

    funFact: 'Saturn\'s rings are 280,000 km wide but only 10 meters to 1 km thick - thinner than a sheet of paper at scale!'
  },

  uranus: {
    id: 'uranus',
    name: 'Uranus-X',
    type: 'Ice Giant',
    image: require('../uranus.png'),
    surfaceImage: 'uranus.jpg',

    basicFacts: {
      diameter: '50,724 km',
      mass: '8.681 × 10²⁵ kg',
      temperature: '-224°C',
      distanceFromSun: '2.87 billion km',
      orbitalPeriod: '84 Earth years',
      rotationPeriod: '17.24 hours (retrograde)'
    },

    composition: {
      primary: 'Water, methane, and ammonia ices',
      surface: 'No solid surface - ice giant',
      atmosphere: 'Hydrogen, helium, methane (gives blue color)',
      core: 'Rocky and icy core'
    },

    interestingFacts: [
      {
        category: 'Rotation',
        fact: 'Uranus rotates on its side with an axial tilt of 98 degrees, possibly due to a massive ancient collision.',
        difficulty: 'medium'
      },
      {
        category: 'Color',
        fact: 'Uranus appears blue-green because methane in its atmosphere absorbs red light.',
        difficulty: 'easy'
      },
      {
        category: 'Discovery',
        fact: 'Uranus was the first planet discovered with a telescope, found by William Herschel in 1781.',
        difficulty: 'medium'
      },
      {
        category: 'Temperature',
        fact: 'Despite not being the farthest planet, Uranus is the coldest in the Solar System with temperatures of -224°C.',
        difficulty: 'hard'
      },
      {
        category: 'Seasons',
        fact: 'Due to its extreme tilt, each pole of Uranus experiences 42 years of continuous sunlight followed by 42 years of darkness.',
        difficulty: 'hard'
      },
      {
        category: 'Rings',
        fact: 'Uranus has 13 known rings, but they\'re dark and difficult to see, made of dark particles the size of golf balls.',
        difficulty: 'medium'
      },
      {
        category: 'Moons',
        fact: 'Uranus has 27 known moons, all named after characters from works by Shakespeare and Alexander Pope.',
        difficulty: 'easy'
      }
    ],

    moons: 27,
    rings: true,

    funFact: 'Uranus spins on its side like a rolling ball - its poles are where most planets have their equator!'
  },

  neptune: {
    id: 'neptune',
    name: 'Neptune-X',
    type: 'Ice Giant',
    image: require('../neptune.png'),
    surfaceImage: 'neptune.jpg',

    basicFacts: {
      diameter: '49,244 km',
      mass: '1.024 × 10²⁶ kg',
      temperature: '-214°C',
      distanceFromSun: '4.5 billion km',
      orbitalPeriod: '164.8 Earth years',
      rotationPeriod: '16.11 hours'
    },

    composition: {
      primary: 'Water, methane, and ammonia ices',
      surface: 'No solid surface - ice giant',
      atmosphere: 'Hydrogen, helium, methane (gives blue color)',
      core: 'Dense rocky and icy core'
    },

    interestingFacts: [
      {
        category: 'Distance',
        fact: 'Neptune is the most distant planet from the Sun, about 30 times farther than Earth.',
        difficulty: 'easy'
      },
      {
        category: 'Discovery',
        fact: 'Neptune was the first planet located through mathematical predictions rather than observation, discovered in 1846.',
        difficulty: 'hard'
      },
      {
        category: 'Winds',
        fact: 'Neptune has the fastest winds in the Solar System, reaching speeds of 2,100 km/h - faster than the speed of sound!',
        difficulty: 'medium'
      },
      {
        category: 'Great Dark Spot',
        fact: 'Neptune had a Great Dark Spot similar to Jupiter\'s Red Spot, but it mysteriously disappeared between 1989 and 1994.',
        difficulty: 'hard'
      },
      {
        category: 'Color',
        fact: 'Neptune\'s vivid blue color comes from methane in its atmosphere, which absorbs red light.',
        difficulty: 'easy'
      },
      {
        category: 'Moon',
        fact: 'Neptune\'s largest moon, Triton, orbits backward and has nitrogen geysers that shoot material 8 km high.',
        difficulty: 'hard'
      },
      {
        category: 'Orbit',
        fact: 'Since its discovery in 1846, Neptune has completed only one full orbit around the Sun (in 2011).',
        difficulty: 'medium'
      }
    ],

    moons: 16,
    rings: true,

    funFact: 'Neptune radiates more heat than it receives from the Sun, meaning it has an internal heat source!'
  },

  moon: {
    id: 'moon',
    name: 'Moon-X',
    type: 'Natural Satellite',
    image: require('../moon.png'),
    surfaceImage: 'moon.jpg',

    basicFacts: {
      diameter: '3,474 km',
      mass: '7.342 × 10²² kg',
      temperature: '-173°C to 127°C',
      distanceFromEarth: '384,400 km',
      orbitalPeriod: '27.3 days',
      rotationPeriod: '27.3 days (tidally locked)'
    },

    composition: {
      primary: 'Rocky body with iron core',
      surface: 'Regolith (dust), craters, maria (dark plains)',
      atmosphere: 'Virtually none (thin exosphere)',
      core: 'Small iron core'
    },

    interestingFacts: [
      {
        category: 'Formation',
        fact: 'The Moon likely formed 4.5 billion years ago when a Mars-sized object collided with early Earth.',
        difficulty: 'medium'
      },
      {
        category: 'Tidal Locking',
        fact: 'The Moon is tidally locked to Earth, so the same side always faces us - we never see the "dark side" from Earth.',
        difficulty: 'medium'
      },
      {
        category: 'Footprints',
        fact: 'Astronaut footprints on the Moon will last for millions of years because there\'s no wind or water to erode them.',
        difficulty: 'easy'
      },
      {
        category: 'Gravity',
        fact: 'The Moon\'s gravity is only 1/6th of Earth\'s, so you would weigh much less and could jump six times higher!',
        difficulty: 'easy'
      },
      {
        category: 'Tides',
        fact: 'The Moon\'s gravity creates ocean tides on Earth, and the Moon is slowly moving away from Earth at 3.8 cm per year.',
        difficulty: 'hard'
      },
      {
        category: 'Exploration',
        fact: 'Twelve humans have walked on the Moon between 1969 and 1972 during NASA\'s Apollo program.',
        difficulty: 'medium'
      },
      {
        category: 'Size',
        fact: 'The Moon is the fifth-largest moon in the Solar System and the largest relative to the size of its planet.',
        difficulty: 'hard'
      }
    ],

    moons: 0,
    rings: false,

    funFact: 'The Moon appears to change size in the sky, but this is an optical illusion - it\'s always the same size!'
  }
};

/**
 * Get random fact from a planet
 * @param {string} planetId - Planet identifier
 * @param {string} difficulty - 'easy', 'medium', 'hard', or 'any'
 * @returns {object} Random fact object
 */
export const getRandomFact = (planetId, difficulty = 'any') => {
  const planet = PLANET_DATA[planetId];
  if (!planet || !planet.interestingFacts) return null;

  let facts = planet.interestingFacts;
  if (difficulty !== 'any') {
    facts = facts.filter(f => f.difficulty === difficulty);
  }

  return facts[Math.floor(Math.random() * facts.length)];
};

/**
 * Get all facts for a specific category
 * @param {string} planetId - Planet identifier
 * @param {string} category - Fact category
 * @returns {array} Array of matching facts
 */
export const getFactsByCategory = (planetId, category) => {
  const planet = PLANET_DATA[planetId];
  if (!planet || !planet.interestingFacts) return [];

  return planet.interestingFacts.filter(f => f.category === category);
};

/**
 * Get basic overview of planet
 * @param {string} planetId - Planet identifier
 * @returns {string} Formatted overview
 */
export const getPlanetOverview = (planetId) => {
  const planet = PLANET_DATA[planetId];
  if (!planet) return '';

  const { name, type, basicFacts, moons, rings } = planet;
  const moonText = moons === 0 ? 'no moons' : moons === 1 ? '1 moon' : `${moons} moons`;
  const ringText = rings ? 'and has rings' : '';

  return `${name} is a ${type} located ${basicFacts.distanceFromSun || basicFacts.distanceFromEarth} away. It has ${moonText} ${ringText}.`;
};

/**
 * Get list of all planet IDs
 * @returns {array} Array of planet IDs
 */
export const getAllPlanetIds = () => Object.keys(PLANET_DATA);

/**
 * Get planet data by ID
 * @param {string} planetId - Planet identifier
 * @returns {object} Planet data object
 */
export const getPlanetData = (planetId) => PLANET_DATA[planetId] || null;
