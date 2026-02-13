
import React, { useRef } from 'react';
import { StyleSheet, Text, Animated, ViewStyle, TextStyle } from 'react-native';
import { PanGestureHandler, State, PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import { rowLayouts, RowLayout, NumberItem } from './GameContext';

const NUMBER_COLORS: { [key: number]: string; DEFAULT: string } = {
    1: '#2ecc71', 2: '#3498db', 3: '#e67e22', 4: '#f1c40f',
    5: '#e74c3c', 6: '#1abc9c', 7: '#9b59b6', 8: '#d35400',
    DEFAULT: '#7f8c8d'
};

interface NumberBlockProps {
    item: NumberItem;
    rowIndex: number;
    itemWidth: number;
    blockSize: number;
    onMoveNumber: (item: NumberItem, startRowIndex: number, endRowIndex: number) => void;
}

const NumberBlock: React.FC<NumberBlockProps> = ({ item, rowIndex, blockSize, onMoveNumber }) => {
    const pan = useRef(new Animated.ValueXY()).current;
    const scale = useRef(new Animated.Value(1)).current;
    const initialPosition = useRef<{ y: number }>({ y: 0 });

    const onGestureEvent = Animated.event(
        [{ nativeEvent: { translationX: pan.x, translationY: pan.y } }],
        { useNativeDriver: false }
    );

    const onHandlerStateChange = (event: PanGestureHandlerStateChangeEvent) => {
        const { state, oldState, absoluteY } = event.nativeEvent;

        if (state === State.ACTIVE && oldState !== State.ACTIVE) {
            // Gesture Started
            Animated.spring(scale, { toValue: 1.2, useNativeDriver: false, tension: 50 }).start();
        }

        if (oldState === State.ACTIVE && (state === State.END || state === State.CANCELLED || state === State.FAILED)) {
            // Gesture Ended

            // Calculate current finger position relative to the SCROLL CONTENT
            const dropYInContent = absoluteY - rowLayouts.absoluteY + rowLayouts.scrollOffset;

            // Find target row
            const targetRowIndex = rowLayouts.current.findIndex((layout: RowLayout | null) =>
                layout && dropYInContent >= layout.y && dropYInContent <= (layout.y + layout.height)
            );

            if (targetRowIndex > -1) {
                onMoveNumber(item, rowIndex, targetRowIndex);
            }

            // Animate back/reset regardless of success (if success, parent re-renders and moves it)
            // If failure, it snaps back.
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, tension: 50 }).start();
            Animated.spring(scale, { toValue: 1, useNativeDriver: false }).start();
        }
    };

    const animatedStyle: any = {
        transform: [...pan.getTranslateTransform(), { scale: scale }],
        zIndex: 100,
    };

    const dynamicBlockStyle: ViewStyle = { width: blockSize, height: blockSize };
    const dynamicTextStyle: TextStyle = { fontSize: blockSize * 0.5 };
    const color = NUMBER_COLORS[item.number] || NUMBER_COLORS.DEFAULT;

    return (
        <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
            // Ensure gesture handler doesn't get confused
            activeOffsetX={[-10, 10]}
            activeOffsetY={[-10, 10]}
        >
            <Animated.View style={[styles.block, { backgroundColor: color }, dynamicBlockStyle, animatedStyle]}>
                <Text style={[styles.numberText, dynamicTextStyle]}>{item.number}</Text>
            </Animated.View>
        </PanGestureHandler>
    );
};

const styles = StyleSheet.create({
    block: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        elevation: 8,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.35,
        shadowRadius: 6
    },
    numberText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default NumberBlock;
