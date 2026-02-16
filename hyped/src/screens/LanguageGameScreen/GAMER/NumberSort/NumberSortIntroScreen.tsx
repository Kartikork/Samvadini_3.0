import React, { useEffect, FC } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, BackHandler, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';

// Define the root stack param list if not already available globally
type RootStackParamList = {
    SortGameScreen: undefined;
    // Add other routes as needed
};

// Component props interface
interface MiniBlockProps {
    number: number;
}

const MiniBlock: FC<MiniBlockProps> = ({ number }) => (
    <View style={styles.miniBlock}>
        <Text style={styles.miniBlockText}>{number}</Text>
    </View>
);

const NumberSortIntroScreen: FC = () => {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();

    useEffect(() => {
        const backAction = () => {
            navigation.goBack();
            return true;
        };
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );
        return () => backHandler.remove();
    }, [navigation]);

    return (
        <ImageBackground
            source={require('../NumberSort/background33.jpg')}
            style={styles.backgroundImage}
        >
            <View style={styles.overlay}>
                <View style={styles.header}>
                    <Text style={styles.title}>Number Sort Puzzle</Text>
                </View>

                <View style={styles.previewContainer}>
                    <View style={styles.miniRow}>
                        <MiniBlock number={1} />
                        <MiniBlock number={3} />
                        <MiniBlock number={1} />
                        <MiniBlock number={2} />
                    </View>
                    <View style={styles.miniRow}>
                        <MiniBlock number={2} />
                        <MiniBlock number={1} />
                        <MiniBlock number={3} />
                        <MiniBlock number={3} />
                    </View>
                </View>

                <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsTitle}>How to Play</Text>
                    <View style={styles.rule}>
                        <Icon name="hand-pointer" size={20} color="#333" style={styles.icon} />
                        <Text style={styles.ruleText}>Tap a row to select, then tap another to move numbers.</Text>
                    </View>
                    <View style={styles.rule}>
                        <Icon name="check-circle" size={20} color="#28a745" style={styles.icon} />
                        <Text style={styles.ruleText}>A row is solved when all its numbers are the same.</Text>
                    </View>
                    <View style={styles.rule}>
                        <Icon name="trophy" size={20} color="#ffc107" style={styles.icon} />
                        <Text style={styles.ruleText}>Solve all the rows to win the game!</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => navigation.navigate('SortGameScreen')}
                >
                    <Text style={styles.startButtonText}>Start Sorting</Text>
                </TouchableOpacity>
            </View>
        </ImageBackground>
    );
};

interface Styles {
    backgroundImage: ViewStyle;
    overlay: ViewStyle;
    header: ViewStyle;
    title: TextStyle;
    previewContainer: ViewStyle;
    miniRow: ViewStyle;
    miniBlock: ViewStyle;
    miniBlockText: TextStyle;
    instructionsContainer: ViewStyle;
    instructionsTitle: TextStyle;
    rule: ViewStyle;
    icon: ViewStyle;
    ruleText: TextStyle;
    startButton: ViewStyle;
    startButtonText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
    backgroundImage: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: 20,
    },
    header: {
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
        fontWeight: 'bold',
    },
    previewContainer: {
        padding: 15,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 15,
    },
    miniRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 5,
    },
    miniBlock: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 5,
        borderWidth: 2,
        borderColor: '#ccc',
    },
    miniBlockText: {
        fontSize: 18,
        color: '#333',
        fontWeight: 'bold',
    },
    instructionsContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 15,
        padding: 20,
        width: '95%',
    },
    instructionsTitle: {
        fontSize: 22,
        color: '#333',
        textAlign: 'center',
        marginBottom: 15,
        fontWeight: 'bold',
    },
    rule: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    icon: {
        marginRight: 15,
    },
    ruleText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    startButton: {
        backgroundColor: '#007bff',
        paddingVertical: 15,
        paddingHorizontal: 60,
        borderRadius: 30,
        elevation: 5,
        borderWidth: 2,
        borderColor: '#fff',
    },
    startButtonText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
});

export default NumberSortIntroScreen;
