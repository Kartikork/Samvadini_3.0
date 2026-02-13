import React from "react";
import { View, StyleSheet } from "react-native";

import ChessPieces from "./ChessPieces";

const initialPositions = [
  // --- White pieces ---
  { row: 7, col: 0, type: "rook", color: "white" },
  { row: 7, col: 1, type: "knight", color: "white" },
  { row: 7, col: 2, type: "bishop", color: "white" },
  { row: 7, col: 3, type: "queen", color: "white" },
  { row: 7, col: 4, type: "king", color: "white" },
  { row: 7, col: 5, type: "bishop", color: "white" },
  { row: 7, col: 6, type: "knight", color: "white" },
  { row: 7, col: 7, type: "rook", color: "white" },

  // White pawns
  ...Array.from({ length: 8 }, (_, i) => ({
    row: 6,
    col: i,
    type: "pawn",
    color: "white",
  })),

  // --- Black pieces ---
  { row: 0, col: 0, type: "rook", color: "black" },
  { row: 0, col: 1, type: "knight", color: "black" },
  { row: 0, col: 2, type: "bishop", color: "black" },
  { row: 0, col: 3, type: "queen", color: "black" },
  { row: 0, col: 4, type: "king", color: "black" },
  { row: 0, col: 5, type: "bishop", color: "black" },
  { row: 0, col: 6, type: "knight", color: "black" },
  { row: 0, col: 7, type: "rook", color: "black" },

  // Black pawns
  ...Array.from({ length: 8 }, (_, i) => ({
    row: 1,
    col: i,
    type: "pawn",
    color: "black",
  })),
];

export default function ChessGame() {
  return (
    <View style={styles.container}>
      <View style={styles.boardWrapper}>
        {/* Base board */}
      

        {/* Interactive pieces (layered on top) */}
        <ChessPieces positions={initialPositions} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#5766b8ff",
  },
  boardWrapper: {
    position: "relative",
  },
});
