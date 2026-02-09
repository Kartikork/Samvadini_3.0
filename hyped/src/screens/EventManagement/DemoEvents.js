import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import BottomNavigation from '../../components/BottomNavigation';

// Sample demo events data
const demoEvents = [
  {
    id: '1',
    title: 'Demo Charity Run',
    date: 'May 15, 2025',
    location: 'Central Park, NY',
    image: require('../../assets/user-icon.png'),
    category: 'Health',
    amountRaised: 'US $2,000',
    goal: 'US $3,000',
    progress: 66,
    daysLeft: 10,
  },
  {
    id: '2',
    title: 'Demo Education Workshop',
    date: 'May 20, 2025',
    location: 'Community Center, LA',
    image: require('../../assets/user-icon.png'),
    category: 'Education',
    amountRaised: 'US $1,500',
    goal: 'US $2,500',
    progress: 60,
    daysLeft: 5,
  },
];

export default function DemoEvents() {
  const navigation = useNavigation();

  const renderDemoEvent = ({ item }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => navigation.navigate('DetailsScreen', { issue: item })}
    >
      <Image source={item.image} style={styles.eventImage} />
      <View style={styles.eventDetails}>
        <CustomText style={styles.eventCategory}>{item.category}</CustomText>
        <CustomText style={styles.eventTitle}>{item.title}</CustomText>
        <CustomText style={styles.eventDate}>📅 {item.date}</CustomText>
        <CustomText style={styles.eventLocation}>📍 {item.location}</CustomText>
        <TouchableOpacity>
          <CustomText style={styles.learnMore}>Learn more ➔</CustomText>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <CustomText style={styles.header}>Demo Events</CustomText>
      <FlatList
        data={demoEvents}
        renderItem={renderDemoEvent}
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
    backgroundColor: '#fff',
    padding: 15,
  },
  header: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 15,
    textAlign: 'center',
  },
  eventCard: {
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
  eventImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 15,
  },
  eventDetails: {
    flex: 1,
  },
  eventCategory: {
    fontSize: 12,
    color: '#FF6F61',
    marginBottom: 5,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 5,
  },
  eventDate: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 5,
  },
  eventLocation: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 5,
  },
  learnMore: {
    fontSize: 12,
    color: '#FF6F61',
  },
});