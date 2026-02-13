
import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import NumberBlock from './NumberBlock';
import { NumberItem, rowLayouts, MAX_ITEMS_PER_ROW } from './GameContext';

interface GameRowProps {
    rowIndex: number;
    items: NumberItem[];
    onMoveNumber: (item: NumberItem, startRowIndex: number, endRowIndex: number) => void;
    // isSelected and onPress removed as per previous JS code logic if they were unused or integrated differently
    isSelected?: boolean;
    onPress?: () => void;
}

const GameRow: React.FC<GameRowProps> = ({ rowIndex, items, onMoveNumber }) => {
    const railRef = useRef<View>(null);
    const [railWidth, setRailWidth] = useState<number>(0);

    const handleLayout = useCallback((event: any) => {
        const { y, width, height } = event.nativeEvent.layout;
        if (width > 0) {
            setRailWidth(width);

            // This Y is relative to the content of the ScrollView
            // translateYOffset corrects for the container's visual shift 
            const translateYOffset = -20; // from styles.rowsContainer transform translateY

            rowLayouts.current[rowIndex] = {
                x: 0,
                y: y + translateYOffset,
                width: width,
                height: height,
                itemCount: items.length
            };
        }
    }, [rowIndex, items.length]);

    let itemWidth = 0;
    let blockSize = 0;
    if (railWidth > 0) {
        itemWidth = railWidth / MAX_ITEMS_PER_ROW;
        blockSize = itemWidth * 0.8;
    }

    return (
        <View ref={railRef} style={styles.railContainer} onLayout={handleLayout}>
            <View style={styles.rail}>
                {Array.from({ length: MAX_ITEMS_PER_ROW }).map((_, index) => (
                    <View key={`slot-${index}`} style={{ width: itemWidth }} />
                ))}
                {railWidth > 0 && items.map((item, index) => (
                    <View key={item.id} style={[styles.blockContainer, { left: index * itemWidth, width: itemWidth }]}>
                        <NumberBlock
                            item={item}
                            rowIndex={rowIndex}
                            itemWidth={itemWidth}
                            blockSize={blockSize}
                            onMoveNumber={onMoveNumber}
                        />
                    </View>
                ))}
            </View>
        </View>
    );
};

interface Styles {
    railContainer: ViewStyle;
    rail: ViewStyle;
    blockContainer: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
    railContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 4
    },
    rail: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#000000',
        borderRadius: 8,
        height: 40,
        width: '100%'
    },
    blockContainer: {
        position: 'absolute',
        top: 0,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center'
    },
});

export default GameRow;
