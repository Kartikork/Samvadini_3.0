// components/Board.js
import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { TILE_SIZE, PATH_COORDINATES, HOME_YARD_COORDINATES, HOME_PATH_COORDINATES,} from '../../utils/gameEngine';
import Pawn from '../../utils/components/pawn';

// This function calculates the pixel position for a pawn based on its grid coordinate
const getPawnPosition = (row, col) => {
  return {
    top: row * TILE_SIZE,
    left: col * TILE_SIZE,
  };
};

// --- NEW: Pre-defined offsets for clustered pawns ---
// These values represent a fraction of TILE_SIZE to shift the pawn by.
const PAWN_OFFSETS = {
  2: [ // Offsets for 2 pawns
    { dx: -0.25, dy: -0.25 },
    { dx: 0.25, dy: 0.25 },
  ],
  3: [ // Offsets for 3 pawns
    { dx: -0.25, dy: -0.25 },
    { dx: 0.25, dy: -0.25 },
    { dx: 0, dy: 0.25 },
  ],
  4: [ // Offsets for 4 pawns
    { dx: -0.25, dy: -0.25 },
    { dx: 0.25, dy: -0.25 },
    { dx: -0.25, dy: 0.25 },
    { dx: 0.25, dy: 0.25 },
  ],
};


const Board = ({ pawnPositions, onPawnPress }) => {

  // --- REWRITTEN: The renderPawns function now handles clustering ---
  const renderPawns = () => {
    const pawns = [];
    const tileGroups = {}; // This will store pawns grouped by their board position

    // 1. Group all pawns by their current position on the board
    for (const player in pawnPositions) {
      pawnPositions[player].forEach((position, pawnIndex) => {
        if (position === -1) {
          // Pawns in the home yard are handled separately and are never grouped
          return;
        }
        if (!tileGroups[position]) {
          tileGroups[position] = [];
        }
        tileGroups[position].push({ player, pawnIndex });
      });
    }

    // 2. Render the grouped pawns on the main path and home path
    for (const position in tileGroups) {
      const group = tileGroups[position];
      const numPawnsInGroup = group.length;

      group.forEach((pawn, indexInGroup) => {
        const { player, pawnIndex } = pawn;
        const pos = parseInt(position);

        let coords;
        if (pos > 100) { // Pawn is on the home path
          const homeStep = pos - 101;
          coords = HOME_PATH_COORDINATES[player][homeStep];
        } else { // Pawn is on the main path
          coords = PATH_COORDINATES[pos];
        }

        if (coords) {
          let style = getPawnPosition(coords.row, coords.col);
          
          // 3. If more than one pawn is in the group, apply an offset
          if (numPawnsInGroup > 1) {
            const offset = PAWN_OFFSETS[numPawnsInGroup][indexInGroup];
            style.top += offset.dy * TILE_SIZE;
            style.left += offset.dx * TILE_SIZE;
          }

          pawns.push(
            <View key={`${player}-${pawnIndex}`} style={[styles.pawnContainer, style]}>
              <Pawn
                color={player}
                onPress={() => onPawnPress(player, pawnIndex)}
              />
            </View>
          );
        }
      });
    }

    // 4. Render the pawns that are still in their home yards (no grouping needed)
    for (const player in pawnPositions) {
        pawnPositions[player].forEach((position, pawnIndex) => {
            if (position === -1) {
                const coords = HOME_YARD_COORDINATES[player][pawnIndex];
                const style = getPawnPosition(coords.row, coords.col);
                 pawns.push(
                    <View key={`${player}-${pawnIndex}`} style={[styles.pawnContainer, style]}>
                        <Pawn color={player} onPress={() => onPawnPress(player, pawnIndex)} />
                    </View>
                );
            }
        });
    }


    return pawns;
  };

  return (
    <View style={styles.boardContainer}>
      <ImageBackground
        source={require('../../ludo_board_new.png')} // <-- IMPORTANT: Make sure this path is correct
        style={styles.boardBackground}
        resizeMode="contain"
      >
        {renderPawns()}
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
 boardContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
  },
  boardBackground: {
    width: '100%',
    height: '100%',
  },
  pawnContainer: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: 'center', // Center the pawn within its container
    justifyContent: 'center',
  },
});

export default Board;