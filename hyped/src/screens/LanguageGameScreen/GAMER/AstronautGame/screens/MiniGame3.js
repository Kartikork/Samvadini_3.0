import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
  Alert,
  AppState,
} from "react-native";
// import Sound from "react-native-sound";

const PUZZLE_IMAGES = [
  {
    id: "rocket",
    source: require("../rocket_puzzle.png"),
    title: "Rocket Launch",
    description: "Assemble the rocket to prepare for launch!",
    fact: "Rockets can reach speeds of up to 28,000 km/h to escape Earth’s gravity!",
  },
  {
    id: "satellite",
    source: require("../PSLV.jpg"),
    title: "Satellite",
    description: "Piece together the satellite to continue your mission!",
    fact: "The International Space Station orbits Earth every 90 minutes!",
  },
  {
    id: "rover",
    source: require("../chandrayaan3.jpg"),
    title: "Mars Rover",
    description: "Reconstruct the Mars rover to explore the red planet!",
    fact: "Mars rovers can operate for years in harsh Martian conditions!",
  },
];

const { width } = Dimensions.get("window");
const GRID_SIZE = 3;
const CONTAINER_PADDING = 60;
const GRID_CONTAINER_SIZE = Math.min(width - CONTAINER_PADDING, 360);
const TILE_SIZE = Math.floor(GRID_CONTAINER_SIZE / GRID_SIZE);
const ACTUAL_GRID_SIZE = TILE_SIZE * GRID_SIZE;

const MiniGame3 = ({ route }) => {
  const { onComplete } = route.params;
  const SOLVED = [...Array(GRID_SIZE * GRID_SIZE).keys()];
  const EMPTY_TILE_VALUE = GRID_SIZE * GRID_SIZE - 1;

  const soundRef = useRef(null);
  const appState = useRef(AppState.currentState);

  const [tiles, setTiles] = useState(SOLVED);
  const [emptyIndex, setEmptyIndex] = useState(EMPTY_TILE_VALUE);
  const [showHint, setShowHint] = useState(false);
  const [moves, setMoves] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [currentPuzzle, setCurrentPuzzle] = useState(null);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * PUZZLE_IMAGES.length);
    setCurrentPuzzle(PUZZLE_IMAGES[randomIndex]);
  }, []);

  // useEffect(() => {
  //   Sound.setCategory("Playback");

  //   const sound = new Sound(
  //     require("../background_music_alien.mp3"),
  //     (error) => {
  //       if (error) {
  //         console.log("Error loading sound:", error);
  //         return;
  //       }
  //       soundRef.current = sound;
  //       sound.setVolume(isMuted ? 0 : 0.5);
  //       sound.setNumberOfLoops(-1);
  //       if (appState.current === "active" && !isMuted) sound.play();
  //     }
  //   );

  //   const subscription = AppState.addEventListener(
  //     "change",
  //     handleAppStateChange
  //   );

  //   return () => {
  //     if (soundRef.current) {
  //       soundRef.current.stop();
  //       soundRef.current.release();
  //     }
  //     subscription.remove();
  //   };
  // }, []);

  useEffect(() => {
    if (currentPuzzle) resetPuzzle();
  }, [currentPuzzle]);

  const handleAppStateChange = (nextAppState) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === "active"
    ) {
      if (soundRef.current && !isMuted) soundRef.current.play();
    } else if (soundRef.current) soundRef.current.pause();
    appState.current = nextAppState;
  };

  const toggleMute = () => {
    if (soundRef.current) {
      const nextMuted = !isMuted;
      soundRef.current.setVolume(nextMuted ? 0 : 0.5);
      if (!nextMuted) soundRef.current.play();
      else soundRef.current.pause();
      setIsMuted(nextMuted);
    }
  };

  const resetPuzzle = () => {
    setMoves(0);
    let shuffled = shuffleArray(SOLVED);
    while (isSolvedArray(shuffled)) shuffled = shuffleArray(SOLVED);
    setTiles(shuffled);
    setEmptyIndex(shuffled.indexOf(EMPTY_TILE_VALUE));
  };

  const shuffleArray = (array) => {
    const shuffled = array.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const isSolvedArray = (arr) => arr.every((v, i) => v === i);

  const getTilePosition = (index) => ({
    row: Math.floor(index / GRID_SIZE),
    col: index % GRID_SIZE,
  });

  const canMove = (index) => {
    const { row, col } = getTilePosition(index);
    const { row: emptyRow, col: emptyCol } = getTilePosition(emptyIndex);
    return (
      (row === emptyRow && Math.abs(col - emptyCol) === 1) ||
      (col === emptyCol && Math.abs(row - emptyRow) === 1)
    );
  };

  const moveTile = (index) => {
    if (!canMove(index)) return;

    const newTiles = [...tiles];
    [newTiles[index], newTiles[emptyIndex]] = [
      newTiles[emptyIndex],
      newTiles[index],
    ];
    setTiles(newTiles);
    setEmptyIndex(index);
    setMoves((m) => m + 1);

    if (isSolvedArray(newTiles)) {
      setTimeout(() => {
        Alert.alert("🎉 Puzzle Solved!", "Rocket ready for launch!", [
          { text: "Launch 🚀", onPress: onComplete },
        ]);
      }, 200);
    }
  };

  if (!currentPuzzle) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: "white" }}>Loading puzzle...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>🧩 {currentPuzzle.title}</Text>
        <TouchableOpacity onPress={toggleMute} style={styles.muteButton}>
          <Text style={styles.muteButtonText}>{isMuted ? "🔇" : "🔊"}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>{currentPuzzle.description}</Text>
      <Text style={styles.movesCounter}>Moves: {moves}</Text>

      {/* GRID */}
      <View style={styles.puzzleContainer}>
        <View
          style={[
            styles.grid,
            { width: ACTUAL_GRID_SIZE + 6, height: ACTUAL_GRID_SIZE },
          ]}
        >
          {tiles.map((tileValue, index) => {
            const isEmpty = tileValue === EMPTY_TILE_VALUE;
            const tileRow = Math.floor(tileValue / GRID_SIZE);
            const tileCol = tileValue % GRID_SIZE;

            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.9}
                onPress={() => moveTile(index)}
                style={[
                  styles.tile,
                  {
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                  },
                  isEmpty && styles.emptyTileStyle,
                ]}
              >
                {!isEmpty && (
                  <>
                    <Image
                      source={currentPuzzle.source}
                      style={{
                        width: ACTUAL_GRID_SIZE,
                        height: ACTUAL_GRID_SIZE,
                        position: "absolute",
                        top: -tileRow * TILE_SIZE,
                        left: -tileCol * TILE_SIZE,
                      }}
                      resizeMode="cover"
                    />
                    <Text style={styles.tileNumber}>{tileValue + 1}</Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Hint Overlay */}
          {showHint && (
            <Image
              source={currentPuzzle.source}
              style={styles.hintOverlayImage}
              resizeMode="cover"
            />
          )}
        </View>
      </View>

      {/* FACT */}
      <View style={styles.factContainer}>
        <Text style={styles.factText}>
          <Text style={{ fontWeight: "bold" }}>Fun Fact:</Text>{" "}
          {currentPuzzle.fact}
        </Text>
      </View>

      {/* BOTTOM BUTTONS */}
      <View style={styles.bottomRow}>
        {/* Left Side Buttons */}
        <View style={styles.leftButtons}>
          <TouchableOpacity style={styles.resetButton} onPress={resetPuzzle}>
            <Text style={styles.resetText}>🔄 Shuffle</Text>
          </TouchableOpacity>

          {moves >= 50 && (
            <TouchableOpacity style={styles.exitButton} onPress={onComplete}>
              <Text style={styles.exitText}>Skip ⏭️</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Right Side Hint */}
        <TouchableOpacity
          onPressIn={() => setShowHint(true)}
          onPressOut={() => setShowHint(false)}
          style={[styles.hintButton, showHint && styles.hintButtonActive]}
        >
          <Text style={styles.hintButtonText}>💡 Hint</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#001020",
    alignItems: "center",
    paddingTop: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#001020",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "90%",
    marginBottom: 10,
  },
  title: {
    color: "white",
    fontSize: 26,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 194, 255, 0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  muteButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  muteButtonText: {
    fontSize: 22,
    color: "white",
  },
  subtitle: {
    color: "#ccc",
    fontSize: 16,
    textAlign: "center",
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 10,
  },
  movesCounter: {
    color: "#00c2ff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  puzzleContainer: {
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 3,
    borderColor: "#00c2ff40",
    backgroundColor: "#29292940",
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  tile: {
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#001020",
  },
  emptyTileStyle: {
    backgroundColor: "rgba(0, 194, 255, 0.05)",
  },
  tileNumber: {
    position: "absolute",
    top: 5,
    left: 5,
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  hintOverlayImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: ACTUAL_GRID_SIZE,
    height: ACTUAL_GRID_SIZE,
    opacity: 0.85,
    borderRadius: 8,
  },
  factContainer: {
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  factText: {
    color: "#a0e0ff",
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "90%",
  },
  leftButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  resetButton: {
    backgroundColor: "#00c2ff",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 20,
    shadowColor: "#00c2ff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  resetText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  exitButton: {
    backgroundColor: "#ff6b35",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 20,
    shadowColor: "#ff6b35",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  exitText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  hintButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  hintButtonActive: {
    backgroundColor: "rgba(100,200,255,0.3)",
    borderColor: "rgba(100,200,255,0.6)",
  },
  hintButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default MiniGame3;