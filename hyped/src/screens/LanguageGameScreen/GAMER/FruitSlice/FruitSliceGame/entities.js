// FruitSliceGame/entities.js

import { Slice } from './renderers';

const createInitialEntities = () => ({
  physics: {
    engine: null,
    world: null,
  },
  slice: {
    points: [],
    lastPoint: null,
    renderer: <Slice />,
  },
});

export default createInitialEntities;