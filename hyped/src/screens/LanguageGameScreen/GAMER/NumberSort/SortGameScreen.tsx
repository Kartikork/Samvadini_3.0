
import React, { useState, useCallback, useEffect } from 'react';
import {
    StyleSheet, View, ImageBackground, StatusBar,
    ScrollView, Alert, UIManager, Platform, Text, Vibration,
    TouchableOpacity,
    AppState
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import Video from 'react-native-video';
// import LottieView from 'lottie-react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';

import GameRow from './GameRow';
import { NumberItem, rowLayouts, MAX_ITEMS_PER_ROW } from './GameContext';
// import SoundPlayer from './SoundPlayer';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Types
interface Level {
    id: string;
    solved: number[];
    current: NumberItem[];
    isSolved: boolean;
}

const shuffleArray = <T,>(array: T[]): T[] => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const LEVEL_CONFIG_V2 = [
    { id: 'row1', solved: [1, 1, 1, 1, 1, 1, 1, 1] },
    { id: 'row2', solved: [2, 2, 2, 2, 2, 2, 2, 2] },
    { id: 'row3', solved: [3, 3, 3, 3, 3, 3, 3, 3] },
    { id: 'row4', solved: [4, 4, 4, 4, 4, 4, 4, 4] },
    { id: 'row5', solved: [5, 5, 5, 5, 5, 5, 5, 5] },
    { id: 'row6', solved: [6, 6, 6, 6, 6, 6, 6, 6] },
    { id: 'row7', solved: [7, 7, 7, 7, 7, 7, 7, 7] },
    { id: 'row8', solved: [8, 8, 8, 8, 8, 8, 8, 8] },
];

const getInitialLevels = (): Level[] => {
    let blockId = 0;
    const allBlocks = LEVEL_CONFIG_V2.flatMap(level =>
        level.solved.map(num => ({ id: blockId++, number: num }))
    );
    const shuffledBlocks = shuffleArray(allBlocks);

    const levels: Level[] = LEVEL_CONFIG_V2.map((level, index) => ({
        ...level,
        current: shuffledBlocks.slice(index * 8, (index + 1) * 8),
        isSolved: false,
    }));

    return levels;
};

const isRowSolved = (row: Level): boolean => {
    if (!row || !row.current || !row.solved) return false;

    // Empty rows are solved if they have no solved targets (buffer rows)
    // Logic from JS: if row.solved.length === 0 return true
    if (row.solved.length === 0) return true;

    if (row.current.length !== row.solved.length) return false;

    const targetNumber = row.solved[0];
    return row.current.every(item => item.number === targetNumber);
};


const SortGameScreen: React.FC = () => {
    const [levels, setLevels] = useState<Level[]>(getInitialLevels());
    const [time, setTime] = useState<number>(0);
    const [isGameWon, setIsGameWon] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);

    // Force trim state if it has extra rows (handling hot reload/stale state)
    useEffect(() => {
        if (levels.length > 8) {
            console.log('Trimming extra rows from stale state');
            setLevels(prev => prev.slice(0, 8));
        } else if (levels.length === 0) {
            setLevels(getInitialLevels());
        }
    }, [levels.length]);

    const [isGameStarting, setIsGameStarting] = useState<boolean>(true);
    const [showKeepGoing, setShowKeepGoing] = useState<boolean>(false);
    const [keepGoingPlayed, setKeepGoingPlayed] = useState<boolean>(false);
    const [isBackgroundMusicPaused, setBackgroundMusicPaused] = useState<boolean>(true);

    const isFocused = useIsFocused();

    // Selected Row for tap-move logic
    const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

    // Focus Handlers
    useEffect(() => {
        if (isFocused) {
            if (!isGameStarting && !isGameWon && !isPaused) {
                setBackgroundMusicPaused(false);
            }
        } else {
            setBackgroundMusicPaused(true);
        }
    }, [isFocused, isGameStarting, isGameWon, isPaused]);

    // Start Timer logic
    useEffect(() => {
        if (isGameStarting || isGameWon || isPaused) return;
        const timerInterval = setInterval(() => {
            setTime(prevTime => prevTime + 1);
        }, 1000);
        return () => clearInterval(timerInterval);
    }, [isGameStarting, isGameWon, isPaused]);

    // Win Condition Check
    useEffect(() => {
        if (isGameWon) return;

        const solvedCount = levels.filter(level => level.isSolved).length;

        // Encouragement logic
        if (solvedCount >= 3 && !keepGoingPlayed) {
            setShowKeepGoing(true);
            setKeepGoingPlayed(true);
        }

        if (solvedCount === levels.length) {
            setIsGameWon(true);
        }
    }, [levels, isGameWon, keepGoingPlayed]);

    // Keep Going Modal Timer
    useEffect(() => {
        if (showKeepGoing) {
            setBackgroundMusicPaused(true);
            const timer = setTimeout(() => {
                setShowKeepGoing(false);
                if (isFocused && !isPaused) {
                    setBackgroundMusicPaused(false);
                }
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [showKeepGoing, isFocused, isPaused]);

    // Initial Game Start Timer
    useEffect(() => {
        setBackgroundMusicPaused(true);
        const timer = setTimeout(() => {
            setIsGameStarting(false);
            if (isFocused) {
                setBackgroundMusicPaused(false);
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [isFocused]);


    const handleMoveNumber = useCallback((draggedItem: NumberItem, startRowIndex: number, endRowIndex: number) => {
        if (startRowIndex === endRowIndex) {
            return;
        }

        const newLevels = [...levels]; // Shallow copy of array
        const sourceRow = { ...newLevels[startRowIndex], current: [...newLevels[startRowIndex].current] };
        const destinationRow = { ...newLevels[endRowIndex], current: [...newLevels[endRowIndex].current] };

        // Enforce max capacity using shared constant
        if (destinationRow.current.length >= MAX_ITEMS_PER_ROW) {
            Vibration.vibrate(50);
            return;
        }

        const itemIndex = sourceRow.current.findIndex((item: NumberItem) => item.id === draggedItem.id);
        if (itemIndex > -1) {
            sourceRow.current.splice(itemIndex, 1);
        } else {
            return;
        }

        // Always add to the end as per user feedback
        destinationRow.current.push(draggedItem);

        sourceRow.isSolved = isRowSolved(sourceRow);
        destinationRow.isSolved = isRowSolved(destinationRow);

        newLevels[startRowIndex] = sourceRow;
        newLevels[endRowIndex] = destinationRow;

        setLevels(newLevels);
    }, [levels]);

    const handleRowPress = (rowIndex: number) => {
        if (selectedRowIndex === null) {
            if (levels[rowIndex].current.length > 0) {
                setSelectedRowIndex(rowIndex);
            }
        } else {
            if (selectedRowIndex === rowIndex) {
                setSelectedRowIndex(null);
            } else {
                const sourceRow = levels[selectedRowIndex];
                if (sourceRow.current.length > 0) {
                    const itemToMove = sourceRow.current[sourceRow.current.length - 1]; // Move the top item
                    handleMoveNumber(itemToMove, selectedRowIndex, rowIndex);
                }
                setSelectedRowIndex(null);
            }
        }
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const togglePause = () => {
        if (isGameStarting || isGameWon) return;
        const nextPausedState = !isPaused;
        setIsPaused(nextPausedState);
        setBackgroundMusicPaused(nextPausedState);
    };


    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ImageBackground source={require('../NumberSort/background33.jpg')} style={styles.backgroundImage}>
                <StatusBar barStyle="light-content" />

                <View style={styles.headerContainer}>
                    <TouchableOpacity style={styles.pauseButton} onPress={togglePause}>
                        <Icon name={isPaused ? 'play' : 'pause'} size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.timerContainer}>
                        <Text style={styles.timerText}>{formatTime(time)}</Text>
                    </View>
                </View>

                <View style={styles.abacusFrame}>
                    <View style={styles.verticalPost} />
                    <ScrollView
                        contentContainerStyle={styles.rowsContainer}
                        onScroll={(e) => {
                            rowLayouts.scrollOffset = e.nativeEvent.contentOffset.y;
                        }}
                        onLayout={(e) => {
                            // Measure the ScrollView's position on screen
                            e.currentTarget.measureInWindow((x, y) => {
                                rowLayouts.absoluteY = y;
                            });
                        }}
                        scrollEventThrottle={16}
                    >
                        {levels.map((level, index) => (
                            <GameRow
                                key={level.id}
                                rowIndex={index}
                                items={level.current}
                                onMoveNumber={handleMoveNumber}
                                isSelected={selectedRowIndex === index}
                                onPress={() => handleRowPress(index)}
                            />
                        ))}
                    </ScrollView>
                </View>

                {isPaused && (
                    <View style={styles.overlayContainer}>
                        <Text style={styles.overlayText}>PAUSED</Text>
                    </View>
                )}

                {isGameStarting && (
                    <View style={styles.overlayContainer}>
                        <Text style={styles.overlayText}>Let's Go!</Text>
                    </View>
                )}

                {showKeepGoing && (
                    <View style={styles.overlayContainer}>
                        <Text style={styles.overlayText}>Keep Going!</Text>
                    </View>
                )}

                {isGameWon && (
                    <View style={styles.overlayContainer}>
                        <Text style={styles.overlayText1}>You Win!</Text>
                        <Text style={[styles.overlayText, { fontSize: 20, marginTop: 40 }]}>{`Time: ${formatTime(time)}`}</Text>
                    </View>
                )}
            </ImageBackground>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    backgroundImage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    headerContainer: {
        position: 'absolute',
        top: 10,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1001,
    },
    pauseButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 10,
        borderRadius: 30,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timerContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 10,
    },
    timerText: { color: 'white', fontSize: 22, },
    abacusFrame: { position: 'absolute', top: '10%', width: '95%', height: '80%', flexDirection: 'row' },
    verticalPost: { width: 15, backgroundColor: '#000000', borderRadius: 10, zIndex: 10, transform: [{ translateY: -30 }] },
    rowsContainer: { flexGrow: 1, paddingVertical: 20, marginLeft: -15, paddingLeft: 15, transform: [{ translateY: -20 }] },
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
    },
    overlayText: {
        fontSize: 22,
        color: 'white',
        position: 'absolute',
        bottom: '25%',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
    },
    overlayText1: {
        fontSize: 22,
        color: 'white',
        position: 'absolute',
        bottom: '30%',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
    }
});

export default SortGameScreen;
