import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    StyleSheet,
    Image,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    ActivityIndicator,
    Dimensions,
    TouchableWithoutFeedback,
    BackHandler, Text,
    useColorScheme
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useGetAndSyncCategoryData } from './useGetAndSyncCategoryData';
const windowWidth = Dimensions.get('window').width;
import { noImage } from '../../assets';
import BottomNavigation from '../../components/BottomNavigation';
import { SearchBar } from '../ChatListScreen/components/SearchBar';
import { formatChatDate } from '../../helper/DateFormate';

export function CategoryScreen({ route }) {
    const { id, name } = route.params;
    const lang = 'en';
    const navigation = useNavigation();
    const categoryId = name === 'hotTrends' ? 'hotTrends' : id;
    const { categoryData, loading, error, loadMoreCategoryData, searchCategoryData, searchResults } = useGetAndSyncCategoryData({ categoryId });
    const [searchQuery, setSearchQuery] = useState('');
    const filteredData = useMemo(() => {
        if (searchQuery.length > 3) {
            categoryData?.data?.forEach(item => {
                console.log('PIB item:', { subject: item.subject, title: item.title });
            });
            return categoryData?.data?.filter(
                item =>
                    (item?.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (item?.subject && item.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (item?.hashtags &&
                        item.hashtags.split(', ').some(tag => tag?.toLowerCase()?.includes(searchQuery.toLowerCase())))
            );
        }
        return categoryData?.data ?? [];
    }, [categoryData, searchQuery]);

    const [isCategorySpoken, setIsCategorySpoken] = useState(false);
    const textToVoiceRef = React.useRef();

    // Filter state for PIB
    const [selectedMinistry, setSelectedMinistry] = useState('All Ministry');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);

    // Extract unique ministries and years from PIB data
    const ministryOptions = useMemo(() => {
        if (categoryId !== 'Central Govt. Schemes, Policies') return [];
        const ministries = new Set();
        (categoryData?.data || []).forEach(item => {
            if (item.ministry) ministries.add(item.ministry);
        });
        return ['All Ministry', ...Array.from(ministries)];
    }, [categoryData, categoryId]);

    const onDateChange = (event, date) => {
        setShowDatePicker(false);
        if (date) setSelectedDate(date);
    };

    const resetFilters = () => {
        setSelectedMinistry('All Ministry');
        setSelectedDate(null);
    };

    // Filtering logic for PIB
    const filteredPIBData = useMemo(() => {
        if (categoryId !== 'Central Govt. Schemes, Policies') return filteredData;
        return filteredData.filter(item => {
            let pass = true;
            if (selectedMinistry !== 'All Ministry' && item.ministry !== selectedMinistry) pass = false;
            if (selectedDate) {
                const itemDate = new Date(item.date || item.publish_date);
                pass = pass && itemDate.toDateString() === selectedDate.toDateString();
            }
            return pass;
        });
    }, [filteredData, categoryId, selectedMinistry, selectedDate]);

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (navigation.canGoBack()) {
                    navigation.goBack();
                    return true;
                } else {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Dashboard' }],
                    });
                    return true;
                }
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => backHandler.remove();
        }, [navigation])
    );

    useEffect(() => {
        const hasCategoryName = name;
        if (!isCategorySpoken && hasCategoryName) {
            setIsCategorySpoken(true);
            setTimeout(() => {
                textToVoiceRef.current?.play && textToVoiceRef.current.play();
            }, 500); // slight delay to ensure ref is set
        }
    }, [lang, name, isCategorySpoken]);

    // Load more data when scrolling
    const handleLoadMore = () => {
        if (!loading && categoryData?.hasMore && !searchQuery.length) {
            loadMoreCategoryData();
        }
    };

    const handleSearch = text => {
        setSearchQuery(text);
        searchCategoryData(text);
    };

    const colorScheme = useColorScheme();
    const theme = {
        light: {
            backgroundColor: '#fff',
            borderColor: '#ccc',
            textColor: '#000',
        },
        dark: {
            borderColor: '#444',
            textColor: '#000',
        },
    };

    const currentTheme = theme[colorScheme] || theme.light;

    const renderGovtSchemeCard = ({ item }) => {
        return (
            <TouchableOpacity
                style={styles.newsItem}
                onPress={() =>
                    navigation.navigate('CategoryDetailsScreen', {
                        id: item.referenceID || item._id,
                        title: item.subject,
                    })
                }
            >
                {item.image_url && Array.isArray(item.image_url) && item.image_url.length > 0 ? (
                    <Image source={{ uri: item.image_url[0] }} style={styles.newsImage} />
                ) : item.image_url && typeof item.image_url === 'string' ? (
                    <Image source={{ uri: item.image_url }} style={styles.newsImage} />
                ) : (
                    <Image source={noImage} style={styles.newsImage} />
                )}
                <View style={styles.newsContent}>
                    <Text numberOfLines={3} ellipsizeMode="tail" style={styles.newsSource}>{item.subject}</Text>
                    <Text style={styles.newsTime}>{item.ministry}</Text>
                    <Text style={styles.newsTime}>{item.date}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    // Render news item
    const renderNewsItem = ({ item }) => {
        if (name === 'govtSchemes') {
            return renderGovtSchemeCard({ item });
        }
        // fallback to default
        return (
            <TouchableOpacity
                style={styles.newsItem}
                onPress={() =>
                    navigation.navigate('CategoryDetailsScreen', {
                        id: item.referenceID || item._id,
                        title: item.title,
                    })
                }>
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.newsImage} />
                ) : (
                    <Image source={noImage} style={styles.newsImage} />
                )}
                <View style={styles.newsContent}>
                    <Text style={styles.newsSource}>{item.title}</Text>
                    <Text style={styles.newsTime}>{formatChatDate(item?.publish_date)}</Text>
                    <View style={styles.tagContainer}>
                        {item.hashtags &&
                            item.hashtags.split(', ').map((tag, index) => (
                                <Text key={index} style={styles.tag}>{tag}</Text>
                            ))}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Render footer loading indicator
    const renderFooter = () => {
        if (!loading) return null;
        return <ActivityIndicator size="large" color="#00ffbfff" style={{ margin: 10 }} />;
    };

    // Filter bar UI for PIB
    const renderPIBFilterBar = () => (
        <View style={styles.filterCard}>

            <Text style={styles.filterLabel}>Ministry</Text>

            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={selectedMinistry}
                    onValueChange={setSelectedMinistry}
                    style={styles.picker}
                >
                    {ministryOptions.map((opt) => (
                        <Picker.Item key={opt} label={opt} value={opt} />
                    ))}
                </Picker>
            </View>

            <Text style={[styles.filterLabel, { marginTop: 12 }]}>Date</Text>

            <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.dateInput}
            >
                <Text>
                    {selectedDate ? selectedDate.toDateString() : 'Select Date'}
                </Text>
            </TouchableOpacity>

            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}

            {(selectedMinistry !== 'All Ministry' || selectedDate) && (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                    <TouchableOpacity
                        onPress={resetFilters}
                        style={{ backgroundColor: '#de2020ff', padding: 8, borderRadius: 4 }}
                    >
                        <Text style={{ color: "#fff" }}>Reset Filters</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    // Render UI
    return (
        <View style={{ flex: 1 }}>
            <TouchableWithoutFeedback>
                <KeyboardAvoidingView style={styles.container}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15, marginTop: 15, marginBottom: 0 }}>
                        <Text style={styles.title}>
                            {name}
                        </Text>
                        {/* <TextToVoiceIconWrapper
                            ref={textToVoiceRef}
                            text={(DashbordJson && DashbordJson[lang] && DashbordJson[lang][name]) ? DashbordJson[lang][name] : name}
                            lang={lang}
                        /> */}
                    </View>
                    <SearchBar
                        value={searchQuery}
                        onChangeText={handleSearch}
                        onClear={() => setSearchQuery('')}
                        placeholder="Search here..."
                    />
                    {categoryId === 'Central Govt. Schemes, Policies' && renderPIBFilterBar()}
                    {loading && (!categoryData?.data || categoryData?.data?.length === 0) ? (
                        <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />
                    ) : (
                        <View style={styles.content}>
                            <FlatList
                                data={categoryId === 'Central Govt. Schemes, Policies' ? filteredPIBData : filteredData}
                                renderItem={renderNewsItem}
                                keyExtractor={(item, index) => `${item._id}-${index}`}
                                showsVerticalScrollIndicator={false}
                                ListFooterComponent={renderFooter}
                                onEndReached={handleLoadMore}
                                onEndReachedThreshold={0.5}
                            />
                        </View>
                    )}
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
            <BottomNavigation />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: windowWidth * 0.06,
        color: '#212121',
        margin: 15,
        marginBottom: 0,
    },
    newsItem: {
        flexDirection: 'row',
        marginBottom: 16,
        boxShadow: "0 0 12px -4px #999",
        marginHorizontal: 5,
        borderRadius: 15,
        padding: 10
    },
    newsImage: {
        width: 80,
        height: 80,
        borderRadius: 5,
        marginRight: 16,
    },
    newsContent: {
        flex: 1,
    },
    newsSource: {
        marginBottom: 4,
        fontSize: 16,
    },
    newsTime: {
        color: '#888',
        fontSize: 12,
        marginBottom: 4,
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tag: {
        color: '#777',
        fontSize: 12,
        marginRight: 8,
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 4,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    dateInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        padding: 10,
        backgroundColor: '#fff'
    },
});