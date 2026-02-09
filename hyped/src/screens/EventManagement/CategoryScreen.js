import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import BottomNavigation from '../../components/BottomNavigation';

const campaigns = [
  {
    id: '1',
    title: 'Lorem ipsum dolor sit amet',
    amountRaised: 'US $1,300',
    goal: 'US $1,500',
    progress: 75,
    daysLeft: 3,
    location: 'Malaga, Spain',
    image: require('../../assets/user-icon.png'),
  },
  // Add more campaigns as needed
];

export default function CategoryScreen({ navigation, route }) {
  const { category } = route.params;

  const renderCampaign = ({ item }) => (
    <TouchableOpacity
      style={styles.campaignCard}
      onPress={() => navigation.navigate('DetailsScreen', { issue: item })}
    >
      <Image source={item.image} style={styles.campaignImage} />
      <View style={styles.campaignDetails}>
        <Text style={styles.campaignTitle}>{item.title}</Text>
        <Text style={styles.campaignAmount}>{item.amountRaised} of {item.goal}</Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
        </View>
        <View style={styles.campaignMeta}>
          <Text style={styles.campaignMetaText}>🕒 {item.daysLeft} days left</Text>
          <Text style={styles.campaignMetaText}>📍 {item.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>Short by</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>Delivered</Text>
        </TouchableOpacity>
      </View>

      {/* Campaigns List */}
      <FlatList
        data={campaigns}
        renderItem={renderCampaign}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F1F1',
    padding: 15,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  filterButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  filterText: {
    fontSize: 14,
    color: '#757575',
  },
  campaignCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  campaignImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 15,
  },
  campaignDetails: {
    flex: 1,
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 5,
  },
  campaignAmount: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 5,
  },
  progressBarContainer: {
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF6F61',
  },
  campaignMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  campaignMetaText: {
    fontSize: 12,
    color: '#757575',
  },
});