// utils/gameEngine.js
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
// This calculation is crucial and must match the logic in your main index.js and Board.js files.
export const TILE_SIZE = width / 15;

// --- 4-PLAYER SETUP ---

// UPDATE 1: Player names are now generic. The UI will decide who is "You".
export const PLAYERS = {
  yellow: 'Yellow',
  green: 'Green',
  red: 'Red',
  blue: 'Blue',
};

export const PAWN_COLORS = {
  yellow: '#FFD700',
  green: '#00B300',
  red: '#D30000',
  blue: '#0048D3',
};

// This now serves as a template for all possible players.
const FULL_INITIAL_POSITIONS = {
  yellow: [-1, -1, -1, -1],
  green: [-1, -1, -1, -1],
  red: [-1, -1, -1, -1],
  blue: [-1, -1, -1, -1],
};


// --- YOUR CUSTOM COORDINATES (NOW FOR ALL 4 PLAYERS) ---

// UPDATE 2: Added Red and Blue home yard coordinates.
export const HOME_YARD_COORDINATES = {
   yellow: [{ row: 10.5, col: 10.5 }, { row: 10.5, col: 12.2 }, { row: 12.1, col: 10.5 }, { row: 12.1, col: 12.2 }],
   green:  [{ row: 1.9, col: 10.5 }, { row: 1.8, col: 12.2 }, { row: 3.4, col: 10.5 }, { row: 3.4, col: 12.2 }],
   red:    [{ row: 1.9, col: 1.9 }, { row: 1.8, col: 3.5 }, { row: 3.4, col: 1.9 }, { row: 3.4, col: 3.5 }],
   blue:   [{ row: 10.5, col: 1.9 }, { row: 10.5, col: 3.5 }, { row: 12.1, col: 1.9 }, { row: 12.1, col: 3.5 }],
};

// The main 52-step path (this was already correct).
export const PATH_COORDINATES = [
  /* Red Path (0-12) */
  { row: 6., col: 1.2}, { row: 6., col: 2.2 }, { row: 6., col: 3.2 }, { row: 6., col: 4.2 }, { row: 6., col: 5.1 }, { row: 5., col: 6. }, { row: 4.1, col: 6. }, { row: 3.1, col: 6.1 }, { row: 2.2, col: 6. }, { row: 1.2, col: 6. }, { row: 0.2, col: 6. }, { row: 0.3, col: 7. }, { row: 0.2, col: 8. },
  /* Green Path (13-25) */
  { row: 1.2, col: 8. }, { row: 2.2, col: 8. }, { row: 3.1, col: 7.9 }, { row: 4., col: 8. }, { row: 5., col: 8. }, { row: 6., col: 9. }, { row: 6., col: 9.9 }, { row: 6., col: 10.8 }, { row: 6.1, col: 11.8 }, { row: 6., col: 12.8}, { row: 6., col: 13.8 }, { row: 7., col: 13.8 }, { row: 8., col: 13.8 },
  /* Yellow Path (26-38)*/
  { row: 8., col: 12.8 }, { row: 8., col: 11.8 }, { row: 8., col: 10.8 }, { row: 8., col: 9.9 }, { row: 8., col: 9. }, { row: 9., col: 8. }, { row: 9.8, col: 8.}, { row: 10.8, col: 8. }, { row: 11.9, col: 7.9 }, { row: 12.8, col: 8. }, { row: 13.8, col: 8. }, { row: 13.8, col: 7.}, { row: 13.8, col: 6. },
  /* Blue Path (39-51)*/
  { row: 12.8, col: 6. }, { row: 11.8, col: 6. }, { row: 10.8, col: 6. }, { row: 9.8, col: 6. }, { row: 8.8, col: 6. }, { row: 8., col: 5.}, { row: 8., col: 4.1 }, { row: 8., col: 3.1 }, { row: 8., col: 2.2 }, { row: 8., col: 1.2 }, { row: 8., col: 0.2 }, { row: 7., col: 0.3}, { row: 6., col: 0.2 },
];

// UPDATE 3: Added Red and Blue home path coordinates.
export const HOME_PATH_COORDINATES = {
  red:    [{ row: 7., col: 1.2 }, { row: 7., col: 2.2 }, { row: 7., col: 3.2 }, { row: 7., col: 4.1 }, { row: 7., col: 5.1 }, { row: 7., col: 6.2 }],
  green:  [{ row: 1.2, col: 7. }, { row: 2.2, col: 7. }, { row: 3.2, col: 7. }, { row: 4.1, col: 7. }, { row: 5.1, col: 7. }, { row: 6., col: 7. }],
  yellow: [{ row: 7, col: 12.8 }, { row: 7., col: 11.8 }, { row: 7., col: 10.8 }, { row: 7., col: 9.9 }, { row: 7., col: 8.9 }, { row: 7., col: 8. }],
  blue:   [{ row: 12.8, col: 7. }, { row: 11.8, col: 7. }, { row: 10.9, col: 7. }, { row: 9.9, col: 7. }, { row: 8.9, col: 7.}, { row: 8., col: 7. }],
};

// --- GAME RULE CONSTANTS (NOW FOR ALL 4 PLAYERS) ---
export const TOTAL_PATH_LENGTH = 52;

// UPDATE 4: Added start indices for Red and Blue.
export const START_INDICES = { red: 0, green: 13, yellow: 26, blue: 39 };

// UPDATE 5: Added pre-home indices for Red and Blue.
export const PRE_HOME_INDICES = { red: 50, green: 11, yellow: 24, blue: 37 };

// --- CHANGE: Added each player's start index to the list of safe spots ---
export const SAFE_SPOTS = [
    START_INDICES.red, 8,
    START_INDICES.green, 21,
    START_INDICES.yellow, 34,
    START_INDICES.blue, 47
];


// --- CORE GAME FUNCTIONS ---

// UPDATE 6: This function now builds a board for ANY two players.
export const getInitialState = (playerColors) => {
  const pawnPositions = {};
  playerColors.forEach(color => {
    pawnPositions[color] = FULL_INITIAL_POSITIONS[color];
  });

  return {
    diceValue: 1,
    // The first player in the selected list always starts
    currentPlayer: playerColors[0],
    pawnPositions: pawnPositions,
    winner: null,
    isRolling: false,
    // Add the list of active players to the game state
    activePlayers: playerColors,
  };
};
export const rollDice = () => Math.floor(Math.random() * 6) + 1;

// UPDATE 7: This function is now dynamic and can control any color.
export const getComputerMove = (pawnPositions, diceValue, computerColor) => {
  // It no longer assumes the computer is 'green'.
  const computerPawns = pawnPositions[computerColor];
  const possibleMoves = [];

  if (diceValue === 6) {
    const pawnInYardIndex = computerPawns.findIndex(p => p === -1);
    if (pawnInYardIndex !== -1) {
      return { pawnIndex: pawnInYardIndex };
    }
  }

  computerPawns.forEach((pos, index) => {
    if (pos === -1) {
      return;
    }
    if (pos >= 101 && (pos + diceValue) > 106) {
      return;
    }
    // Logic for checking overshoot when entering home path
    const preHomeIndex = PRE_HOME_INDICES[computerColor];
    const potentialNewPos = pos + diceValue;
    if (pos <= preHomeIndex && potentialNewPos > preHomeIndex) {
        const stepsIntoHome = potentialNewPos - preHomeIndex;
        if (stepsIntoHome > 6) {
            return; // This move would overshoot, so it's invalid.
        }
    }
    
    possibleMoves.push({ pawnIndex: index });
  });

  if (possibleMoves.length > 0) {
    return possibleMoves[0];
  }

  return null;
};

// This function was already written correctly to handle any player. No changes needed.
export const hasPossibleMoves = (player, diceValue, pawnPositions) => {
  const playerPawns = pawnPositions[player];
  const preHomeIndex = PRE_HOME_INDICES[player];

  if (diceValue === 6) {
    const hasPawnInYard = playerPawns.some(p => p === -1);
    if (hasPawnInYard) return true;
  }

  for (const pos of playerPawns) {
    if (pos === -1) {
      continue;
    }
    if (pos >= 101 && (pos + diceValue) > 106) {
      continue;
    }
    const potentialNewPos = pos + diceValue;
    if (pos <= preHomeIndex && potentialNewPos > preHomeIndex) {
      const stepsIntoHome = potentialNewPos - preHomeIndex;
      if (stepsIntoHome > 6) {
        continue;
      }
    }
    return true;
  }

  return false;
};


/**
 * Calculates the backward path for a pawn that has been cut.
 * @param {string} player - The color of the pawn ('red', 'green', etc.).
 * @param {number} startPos - The board position index where the pawn was cut.
 * @returns {number[]} An array of position indices representing the path back to the home yard.
 */
export const getReturnPath = (player, startPos) => {
  const path = [];
  let currentPos = startPos;
  const playerStart = START_INDICES[player];

  // We loop backward one step at a time until we reach the player's starting tile.
  // The loop is capped at TOTAL_PATH_LENGTH to prevent any infinite loops.
  for (let i = 0; i < TOTAL_PATH_LENGTH; i++) {
    path.push(currentPos);
    
    if (currentPos === playerStart) {
      break; // We've reached the start, exit the loop.
    }

    // This formula moves the position one step backward on the circular path.
    currentPos = (currentPos - 1 + TOTAL_PATH_LENGTH) % TOTAL_PATH_LENGTH;
  }

  // Finally, add the home yard position (-1) as the last step of the journey.
  path.push(-1);
  return path;
};