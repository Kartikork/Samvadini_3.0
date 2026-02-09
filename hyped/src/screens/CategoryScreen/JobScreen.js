import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  ActivityIndicator,
  BackHandler,
  ScrollView, Text,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { noImage } from '../../assets';
import { SearchBar } from '../ChatListScreen/components/SearchBar';
import { env } from '../../config/env';
import { useAppSelector } from '../../state/hooks';
import { getAppTranslations } from '../../translations';

export function JobScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const lang = useAppSelector(state => state.language.lang);
  const translations = useMemo(() => getAppTranslations(lang), [lang]);
  const [activeTab, setActiveTab] = useState('Jobs');
  const [jobItems, setJobItems] = useState();
  const [internshipItems, setInternshipItems] = useState();
  const [apprenticeshipItems, setApprenticeshipItems] = useState();

  const navigateToJobDetail = item => {
    navigation.navigate('JobsDetailsScreen', { item });
  };

  useFocusEffect(
    useCallback(() => {
      const loadTranslations = async () => {
        const storedLang = await AsyncStorage.getItem('userLang');
        const language = storedLang || 'en';
        setLang(language);

        if (language !== lang) {
          fetchData(activeTab);
        }
      };

      loadTranslations();

      const onBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        } else {
          navigation.reset({
            index: 0,
            routes: [
              {
                name: 'Dashboard',
                params: { screen: 'Dashboard' },
              },
            ],
          });
          return true;
        }
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => backHandler.remove();
    }, [navigation, lang]),
  );

  const fetchData = async category => {
    try {
      setLoading(true);

      const storedLang = await AsyncStorage.getItem('userLang');
      const language = storedLang || 'en';

      const postData = {
        lang: language,
      };

      let endpoint = '';
      switch (category) {
        case 'Jobs':
          endpoint = '/category/get-linkdin-data';
          break;
        case 'Internships':
          endpoint = '/category/get-internships';
          break;
        case 'Apprenticeship':
          endpoint = '/category/get-nats-data';
          break;
        default:
          break;
      }

      const response = await axios.post(`${env.API_BASE_URL}${endpoint}`, postData);

      if (response.status == '200') {
        switch (category) {
          case 'Jobs':
            setJobItems(response.data.data);
            break;
          case 'Internships':
            setInternshipItems(response.data.data);
            break;
          case 'Apprenticeship':
            setApprenticeshipItems(response.data.data);
            break;
          default:
            break;
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeTab, searchQuery);
  }, [activeTab, searchQuery]);

  const getFilteredData = () => {
    const currentData = tabData[activeTab] || [];
    if (!searchQuery) return currentData;

    return currentData?.filter(item => {
      switch (activeTab) {
        case 'Jobs':
          return (
            item.job_profile
              ?.toLowerCase()
              ?.includes(searchQuery.toLowerCase()) ||
            item.job_location
              ?.toLowerCase()
              ?.includes(searchQuery.toLowerCase()) ||
            item.job_type?.toLowerCase()?.includes(searchQuery.toLowerCase())
          );
        case 'Internships':
          return (
            item.title?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
            item.internship_type
              ?.toLowerCase()
              ?.includes(searchQuery.toLowerCase())
          );
        case 'Apprenticeship':
          return (
            item.title?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
            item.vacancy
              ?.toString()
              .toLowerCase()
              ?.includes(searchQuery.toLowerCase())
          );
        default:
          return false;
      }
    });
  };

  const renderApprenticeshipItem = ({ item }) => (
    <TouchableOpacity
      style={styles.newsItem}
      onPress={() => navigateToJobDetail(item)}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.newsImage} />
      ) : (
        <Image
          source={noImage}
          style={styles.newsImage}
        />
      )}
      <View style={styles.newsContent}>
        <Text style={styles.newsSource}>{item.title}</Text>
        <View style={styles.newsTime}>
          <Text>Vacancy: {item?.vacancy}</Text>
          <Text>Last Date: {item?.last_date}</Text>
        </View>
        <View style={styles.tagContainer}>
          {item.hastags &&
            item.hastags.map((tag, index) => (
              <Text key={index} style={styles.tag}>
                {tag}
              </Text>
            ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderJobItem = ({ item }) => (
    <TouchableOpacity
      style={styles.newsItem}
      onPress={() => navigateToJobDetail(item)}
    >
      <Image
        source={noImage}
        style={styles.newsImage}
      />
      <View style={styles.newsContent}>
        <Text style={styles.newsSource}>
          {item?.job_title?.toUpperCase()}
        </Text>
        <Text style={styles.jobLocation}>{item?.location}</Text>
        <Text style={styles.jobPostedTime}>
          {item?.time_posted}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderInternshipItem = ({ item }) => (
    <TouchableOpacity
      style={styles.newsItem}
      onPress={() => navigateToJobDetail(item)}
    >
      {item.logo_url ? (
        <Image source={{ uri: item.logo_url }} style={styles.newsImage} />
      ) : (
        <Image
          source={noImage}
          style={styles.newsImage}
        />
      )}
      <View style={styles.newsContent}>
        <Text style={styles.newsSource}>{item.title}</Text>
        <Text style={styles.infoText}>
          Internship Type: {item.internship_type}
        </Text>
        <Text style={styles.infoText}>
          Interns Required: {item.interns}
        </Text>
        <Text style={styles.infoText}>
          Last Date: {item?.last_date}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <ActivityIndicator size="large" color="#0000ff" style={{ margin: 10 }} />
    );
  };

  const handleTabPress = tabName => {
    setActiveTab(tabName);
    setSearchQuery('');
  };

  const handleSearch = query => {
    setSearchQuery(query);
  };

  const tabNames = ['Jobs', 'Internships', 'Apprenticeship'];
  const tabData = {
    Jobs: jobItems,
    Internships: internshipItems,
    Apprenticeship: apprenticeshipItems,
  };

  const renderContent = () => {
    let renderFunction;
    switch (activeTab) {
      case 'Jobs':
        renderFunction = renderJobItem;
        break;
      case 'Internships':
        renderFunction = renderInternshipItem;
        break;
      case 'Apprenticeship':
        renderFunction = renderApprenticeshipItem;
        break;
      default:
        renderFunction = renderJobItem;
    }

    return (
      <FlatList
        data={getFilteredData()}
        renderItem={renderFunction}
        keyExtractor={item => item._id}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No results found' : 'No data available'}
            </Text>
          </View>
        )}
      />
    );
  };

  const getFormattedTitle = tab => {
    return translations?.[tab] ?? tab;
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={styles.innerContainer}>
        <Text style={styles.title}>
          {getFormattedTitle(activeTab)}
        </Text>
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          onClear={() => setSearchQuery('')}
          placeholder={translations['search'] || "Search here..."}
        />
        <View style={styles.tabHeade}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.tabContainer}
            contentContainerStyle={styles.tabContentContainer}
          >
            {tabNames.map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => handleTabPress(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                >
                  {translations?.[tab] ?? tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.content}>{renderContent()}</View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  innerContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    color: '#212121',
    margin: 15,
    marginBottom: 0,
  },
  tabContainer: {
    paddingHorizontal: 15,
    marginBottom: 8,
  },
  tabContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0,
  },
  tab: {
    paddingVertical: 8,
    marginRight: 20,
    paddingBottom: 2,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#fea247',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#fea247',
    fontWeight: '500',
  },
  newsItem: {
    flexDirection: 'row',
    marginBottom: 16,
    boxShadow: '0 0 12px -4px #999',
    marginHorizontal: 5,
    borderRadius: 15,
    padding: 10,
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
    textTransform: 'capitalize',
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
  companyName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontWeight: '500',
  },
  jobLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  jobInfo: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  jobSkills: {
    fontSize: 12,
    color: '#444',
    marginBottom: 4,
  },
  jobPostedTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  tabHeade: {
    // height: hp('7.5%'),
  },
});
