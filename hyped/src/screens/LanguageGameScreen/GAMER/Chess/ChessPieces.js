import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  ScrollView,
  Alert,
  Modal,
} from "react-native";

const { width } = require("react-native").Dimensions.get("window");
const BOARD_SIZE = width - 40;
const CELL_SIZE = BOARD_SIZE / 8;

const PIECES = {
  white: {
    king: require("./10.png"),
    queen: require("./11.png"),
    rook: require("./9.png"),
    bishop: require("./12.png"),
    knight: require("./7.png"),
    pawn: require("./8.png"),
  },
  black: {
    king: require("./4.png"),
    queen: require("./5.png"),
    rook: require("./3.png"),
    bishop: require("./6.png"),
    knight: require("./1.png"),
    pawn: require("./2.png"),
  },
};

// Helpers
let nextId = 1;
const resetNextId = () => {
  nextId = 1;
};
const withIds = (positions = []) =>
  positions.map((p) => ({ ...p, id: p.id ?? nextId++ }));

const cloneBoard = (positions) => {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  positions.forEach((p) => (board[p.row][p.col] = p));
  return board;
};

const coordToAlgebraic = (row, col) =>
  `${String.fromCharCode(97 + col)}${8 - row}`;

// Move validation
const isValidMove = (piece, from, to, board, lastMove) => {
  if (!piece) return false;
  if (from.row === to.row && from.col === to.col) return false;

  const dx = to.col - from.col;
  const dy = to.row - from.row;

  const dest = board[to.row][to.col];
  if (dest && dest.color === piece.color) return false;

  switch (piece.type) {
    case "pawn":
      return validatePawn(piece, dx, dy, board, from, to, lastMove);
    case "rook":
      return validateRook(dx, dy, board, from, to);
    case "bishop":
      return validateBishop(dx, dy, board, from, to);
    case "queen":
      return (
        validateRook(dx, dy, board, from, to) ||
        validateBishop(dx, dy, board, from, to)
      );
    case "king":
      return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
    case "knight":
      return (
        (Math.abs(dx) === 2 && Math.abs(dy) === 1) ||
        (Math.abs(dx) === 1 && Math.abs(dy) === 2)
      );
    default:
      return false;
  }
};

// Pawn rules (🟩 ADDED proper en passant logic)
const validatePawn = (piece, dx, dy, board, from, to, lastMove) => {
  const dir = piece.color === "white" ? -1 : 1;

  // Normal move
  if (dx === 0 && dy === dir && !board[to.row][to.col]) return true;

  // Double move
  if (
    dx === 0 &&
    dy === 2 * dir &&
    ((piece.color === "white" && from.row === 6) ||
      (piece.color === "black" && from.row === 1)) &&
    !board[to.row][to.col] &&
    !board[from.row + dir][from.col]
  )
    return true;

  // Capture
  if (
    Math.abs(dx) === 1 &&
    dy === dir &&
    board[to.row][to.col] &&
    board[to.row][to.col].color !== piece.color
  )
    return true;

  // 🟩 En Passant Capture
  if (
    Math.abs(dx) === 1 &&
    dy === dir &&
    !board[to.row][to.col] && // target square empty
    lastMove &&
    lastMove.piece &&
    lastMove.piece.type === "pawn" &&
    lastMove.wasDouble &&
    lastMove.to.row === from.row && // enemy pawn beside
    lastMove.to.col === to.col // diagonal target column
  )
    return true;

  return false;
};

// Rook
const validateRook = (dx, dy, board, from, to) => {
  if (dx !== 0 && dy !== 0) return false;
  const stepRow = dy === 0 ? 0 : dy / Math.abs(dy);
  const stepCol = dx === 0 ? 0 : dx / Math.abs(dx);
  let r = from.row + stepRow;
  let c = from.col + stepCol;
  while (r !== to.row || c !== to.col) {
    if (board[r][c]) return false;
    r += stepRow;
    c += stepCol;
  }
  return true;
};

// Bishop
const validateBishop = (dx, dy, board, from, to) => {
  if (Math.abs(dx) !== Math.abs(dy)) return false;
  const stepRow = dy / Math.abs(dy);
  const stepCol = dx / Math.abs(dx);
  let r = from.row + stepRow;
  let c = from.col + stepCol;
  while (r !== to.row || c !== to.col) {
    if (board[r][c]) return false;
    r += stepRow;
    c += stepCol;
  }
  return true;
};

// Main component
export default function ChessPieces({ positions: initialPositions }) {
  const [positions, setPositions] = useState(() => withIds(initialPositions));
  const [selectedId, setSelectedId] = useState(null);
  const [turn, setTurn] = useState("white");
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [timer, setTimer] = useState(30);
  const [capturedWhite, setCapturedWhite] = useState([]);
  const [capturedBlack, setCapturedBlack] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);

  // 🟩 NEW STATE FOR PLAYER COLOR SELECTION
  const [playerColor, setPlayerColor] = useState(null);

  const board = useMemo(() => cloneBoard(positions), [positions]);
  const getPieceById = (id) => positions.find((p) => p.id === id);
  const getPieceAt = (r, c) => board[r]?.[c];
  const isInMoves = (r, c) =>
    possibleMoves.some((m) => m.row === r && m.col === c);

  // Auto-reset game after win
  useEffect(() => {
    if (!gameOver) return;
    
    // Show alert with winner
    Alert.alert(
      "Game Over!",
      `${winner?.toUpperCase()} wins by capturing the King!`,
      [{ text: "OK" }]
    );
    
    const timer = setTimeout(() => {
      // Reset the piece ID counter
      resetNextId();
      
      // Reset all game state to initial values
      setPositions(withIds(initialPositions));
      setSelectedId(null);
      setTurn("white");
      setPossibleMoves([]);
      setTimer(30);
      setCapturedWhite([]);
      setCapturedBlack([]);
      setMoveHistory([]);
      setLastMove(null);
      setGameOver(false);
      setWinner(null);
      setPlayerColor(null); // This will show color selection modal
    }, 1500); // Auto reset after 1.5 seconds
    return () => clearTimeout(timer);
  }, [gameOver, initialPositions, winner]);

  // Timer
  useEffect(() => {
    if (gameOver || playerColor === null) return;
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setTurn((t) => (t === "white" ? "black" : "white"));
          setSelectedId(null);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver, playerColor]);

  // Compute possible moves
  useEffect(() => {
    if (!selectedId) {
      setPossibleMoves([]);
      return;
    }
    const piece = getPieceById(selectedId);
    if (!piece) return;

    const moves = [];
    const liveBoard = cloneBoard(positions);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (
          isValidMove(
            piece,
            { row: piece.row, col: piece.col },
            { row: r, col: c },
            liveBoard,
            lastMove
          )
        ) {
          moves.push({ row: r, col: c });
        }
      }
    }
    setPossibleMoves(moves);
  }, [selectedId, positions, lastMove]);

  const handlePiecePress = (piece) => {
    if (gameOver) return;
    if (!piece) return;

    if (!selectedId) {
      if (piece.color === turn) setSelectedId(piece.id);
      return;
    }

    const selectedPiece = getPieceById(selectedId);
    if (!selectedPiece) return;

    if (piece.id === selectedId) {
      setSelectedId(null);
      return;
    }

    if (
      piece.color !== selectedPiece.color &&
      possibleMoves.some((m) => m.row === piece.row && m.col === piece.col)
    ) {
      handleCellPress(piece.row, piece.col);
      return;
    }

    if (piece.color === selectedPiece.color) {
      setSelectedId(piece.id);
      return;
    }
  };

  const handleCellPress = (row, col) => {
    if (gameOver) return;
    const liveBoard = cloneBoard(positions);
    const selectedPiece = getPieceById(selectedId);
    if (!selectedPiece) return;

    const from = { row: selectedPiece.row, col: selectedPiece.col };
    const to = { row, col };

    let captured = positions.find(
      (p) => p.row === row && p.col === col && p.color !== selectedPiece.color
    );

    // 🟩 En Passant capture execution
    let isEnPassant = false;
    if (
      !captured &&
      selectedPiece.type === "pawn" &&
      lastMove &&
      lastMove.piece.type === "pawn" &&
      lastMove.wasDouble
    ) {
      const dir = selectedPiece.color === "white" ? -1 : 1;
      if (
        to.row === from.row + dir &&
        to.col === lastMove.to.col &&
        lastMove.to.row === from.row
      ) {
        captured = positions.find((p) => p.id === lastMove.piece.id);
        isEnPassant = true;
      }
    }

    if (!isValidMove(selectedPiece, from, to, liveBoard, lastMove)) return;

    let updated = positions.slice();
    if (captured) {
      if (captured.type === "king") {
        setGameOver(true);
        setWinner(selectedPiece.color);
      }

      const capturedInfo = {
        id: captured.id,
        type: captured.type,
        color: captured.color,
      };
      if (captured.color === "white")
        setCapturedWhite((prev) => [...prev, capturedInfo]);
      else setCapturedBlack((prev) => [...prev, capturedInfo]);

      updated = updated.filter((p) => p.id !== captured.id);
    }

    let movedPiece = { ...selectedPiece, row: to.row, col: to.col };
    if (
      selectedPiece.type === "pawn" &&
      ((selectedPiece.color === "white" && to.row === 0) ||
        (selectedPiece.color === "black" && to.row === 7))
    ) {
      movedPiece.type = "queen";
    }

    updated = updated.map((p) => (p.id === selectedPiece.id ? movedPiece : p));

    setPositions(updated);
    setSelectedId(null);

    const wasDouble =
      selectedPiece.type === "pawn" && Math.abs(to.row - from.row) === 2;

    setLastMove({
      piece: {
        id: selectedPiece.id,
        type: selectedPiece.type,
        color: selectedPiece.color,
      },
      id: selectedPiece.id,
      from,
      to,
      wasDouble,
    });

    setMoveHistory((prev) => [
      ...prev,
      {
        piece: selectedPiece.type,
        color: selectedPiece.color,
        from: coordToAlgebraic(from.row, from.col),
        to: coordToAlgebraic(to.row, to.col),
        capture: captured ? captured.type : null,
        enPassant: isEnPassant,
      },
    ]);

    setTurn((t) => (t === "white" ? "black" : "white"));
    setTimer(30);
  };

  // 🟩 Determine row order based on chosen color
  const rowOrder =
    playerColor === "white"
      ? Array.from({ length: 8 }, (_, i) => i) // white bottom
      : Array.from({ length: 8 }, (_, i) => 7 - i); // black bottom

  if (!playerColor) {
    return (
      <Modal visible={true} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Choose Your Color</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#f0d9b5" }]}
                onPress={() => setPlayerColor("white")}
              >
                <Text style={styles.modalText}>White</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#b58863" }]}
                onPress={() => setPlayerColor("black")}
              >
                <Text style={styles.modalText}>Black</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // 🟩 Main board render
  return (
    <View style={{ width: BOARD_SIZE, height: BOARD_SIZE + 300 }}>
      {/* Captured Black Pieces */}
      <View style={styles.capturedRow}>
        <Text style={{ color: "white", marginRight: 8 }}>Captured (Black):</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: "row", alignItems: "center" }}
        >
          {capturedBlack.map((p, i) => (
            <Image key={i} source={PIECES[p.color][p.type]} style={styles.capturedIcon} />
          ))}
        </ScrollView>
      </View>

      {/* Turn + Timer */}
      <View style={styles.turnRow}>
        <Text style={styles.turnText}>Turn: {turn}</Text>
        <Text style={styles.timerText}>⏱ {timer}s</Text>
      </View>

      {/* Chessboard */}
      <View style={styles.board}>
        {rowOrder.map((r) => (
          <View key={r} style={{ flexDirection: playerColor === "black" ? "row" : "row-reverse" }}>
            {Array.from({ length: 8 }).map((_, c) => {
              const isDark = (r + c) % 2 === 1;
              const bg = isDark ? "#769656" : "#eeeed2";
              const piece = getPieceAt(r, c);
              return (
                <TouchableOpacity
                  key={`${r}-${c}`}
                  onPress={() => handleCellPress(r, c)}
                  style={[styles.cell, { backgroundColor: bg, width: CELL_SIZE, height: CELL_SIZE }]}
                >
                  {isInMoves(r, c) && (
                    <View
                      style={[
                        styles.moveHighlight,
                        { width: CELL_SIZE * 0.5, height: CELL_SIZE * 0.5 },
                      ]}
                    />
                  )}
                  {piece && (
                    <TouchableOpacity onPress={() => handlePiecePress(piece)} style={styles.pieceWrapper}>
                      <Image source={PIECES[piece.color][piece.type]} style={styles.pieceImage} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Captured White Pieces */}
      <View style={styles.capturedRow}>
        <Text style={{ color: "white", marginRight: 8 }}>Captured (White):</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: "row", alignItems: "center" }}
        >
          {capturedWhite.map((p, i) => (
            <Image key={i} source={PIECES[p.color][p.type]} style={styles.capturedIcon} />
          ))}
        </ScrollView>
      </View>

      {/* Move History */}
      <View style={{ marginTop: 8, maxHeight: 120 }}>
        <Text style={{ color: "white", fontWeight: "bold" }}>Move History</Text>
        <ScrollView contentContainerStyle={{ paddingVertical: 4 }}>
          {moveHistory.slice().reverse().map((m, i) => (
            <Text key={i} style={{ color: "lightgray" }}>
              {moveHistory.length - i}. {m.color} {m.piece} {m.from} → {m.to}
              {m.enPassant ? " (ep)" : m.capture ? ` x${m.capture}` : ""}
            </Text>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: { width: BOARD_SIZE, height: BOARD_SIZE },
  cell: { justifyContent: "center", alignItems: "center" },
  pieceWrapper: { position: "absolute", justifyContent: "center", alignItems: "center" },
  pieceImage: { width: CELL_SIZE * 0.8, height: CELL_SIZE * 0.8, resizeMode: "contain" },
  moveHighlight: { borderRadius: 999, opacity: 0.9, backgroundColor: "rgba(255,255,0,0.6)" },
  capturedRow: { flexDirection: "row", alignItems: "center", marginVertical: 19, paddingHorizontal: 8 },
  capturedIcon: { width: 20, height: 40, margin: 1 },
  turnRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 6, paddingHorizontal: 8 },
  turnText: { color: "white", fontSize: 16 },
  timerText: { color: "orange", fontSize: 16 },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 12,
    width: "75%",
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  modalButtons: { flexDirection: "row", justifyContent: "space-around", width: "100%" },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  modalText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
});
