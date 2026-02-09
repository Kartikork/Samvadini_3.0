import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, ScrollView } from 'react-native';
import { SearchBar } from '../ChatListScreen/components/SearchBar';
import MyEvents from './MyEvents';
import LinearGradient from 'react-native-linear-gradient';
import CompletedEvents from './CompletedEvents';
import ExploreEvents from './ExploreEvents';
import BottomNavigation from '../../components/BottomNavigation';
import useHardwareBackHandler from '../../helper/UseHardwareBackHandler';

export default function EventListScreen({ navigation }) {
    const [selectedTab, setSelectedTab] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const translations = {};
    const tabs = [translations.myEvents || "My Events", translations.exploreEvents || "Explore Events", translations.completedEvents || "Completed Events"];
    useHardwareBackHandler('Dashboard');

    const renderEventComponent = () => {
        switch (selectedTab) {
            case 0:
                return <MyEvents searchQuery={searchQuery} />;
            case 1:
                return <ExploreEvents searchQuery={searchQuery} />;
            case 2:
                return <CompletedEvents searchQuery={searchQuery} />;
            default:
                return null;
        }
    };

    return (
        <>
            <View style={{ paddingVertical: 15, backgroundColor: '#fff' }}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onClear={() => setSearchQuery('')}
                    placeholder="Search here..."
                />
            </View>
            <View style={styles.container}>
                <View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                        {tabs.map((tab, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => setSelectedTab(index)}
                                style={[
                                    styles.tabButton,
                                    selectedTab === index ? styles.activeTab : styles.inactiveTab,
                                    index === 0 && { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
                                    index === tabs.length - 1 && { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
                                ]}
                            >
                                <Text style={selectedTab === index ? styles.activeText : styles.inactiveText}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                <View style={styles.eventsContainer}>
                    {renderEventComponent()}
                </View>
            </View>
            {selectedTab === 0 && (
                <View style={styles.buttonContainer}>
                    <TouchableOpacity onPress={() => navigation.navigate('CreateEvents')}>
                        <LinearGradient
                            colors={['#6462AC', '#028BD3']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.createButton}
                        >
                            <Text style={styles.createButtonText}>{translations.createEventsButton || "Create Event"}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
            <BottomNavigation navigation={navigation} />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 10,
        paddingTop: 0,

    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    tabButton: {
        padding: 13,
        height: 48,
    },
    activeTab: {
        backgroundColor: '#0B88D3',
    },
    inactiveTab: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#f2f1f1ff',
    },
    activeText: {
        color: '#fff',
        textAlign: 'center',
    },
    inactiveText: {
        color: '#212121',
        textAlign: 'center',
    },
    eventsContainer: {
        flex: 1,

    },
    buttonContainer: {
        backgroundColor: '#fff',
        paddingBottom: 20,
        alignItems: 'center',
    },
    createButton: {
        padding: 10,
        borderRadius: 30,
        width: '67%',
        paddingHorizontal: 25,
    },
    createButtonText: {
        color: '#fff',
        textAlign: 'center',
    },
});