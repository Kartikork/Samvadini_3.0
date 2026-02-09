import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import BottomNavigation from '../../components/BottomNavigation';

const communityPosts = [
  {
    id: '1',
    category: 'Announcements',
    title: 'Organizer Announcement',
    description: 'Hello Attendees, We would love to hear w...',
    date: 'Sep 29, 2021',
    metrics: '8 Announcements (8 New)',
    pinned: true,
    icon: 'volume-high',
  },
  {
    id: '2',
    category: 'Ask Organizer Anything',
    title: 'Ask Organizer Anything',
    description: 'Awesome! Thanks for the prompt help, @...',
    date: 'Aug 20, 2017',
    metrics: '13 Replies',
    pinned: true,
    icon: 'chatbubble',
  },
  {
    id: '3',
    category: 'Meet-ups & Virtual Meets',
    title: 'Meet-ups & Virtual Meets',
    description: 'Virtual Meet & Greet. Get to k...',
    date: 'May 18, 2022',
    metrics: '7 Meet-ups (7 New, 10 New Replies)',
    pinned: true,
    icon: 'people',
  },
  {
    id: '4',
    category: 'Icebreaker Contest',
    title: 'Icebreaker Contest',
    description: 'Win a Prize',
    date: 'May 19, 2021',
    metrics: '7 participants (8 New Replies)',
    pinned: false,
    icon: 'trophy',
  },
  {
    id: '4',
    category: 'Icebreaker Contest',
    title: 'Icebreaker Contest',
    description: 'Win a Prize',
    date: 'May 19, 2021',
    metrics: '7 participants (8 New Replies)',
    pinned: false,
    icon: 'trophy',
  },
  {
    id: '4',
    category: 'Icebreaker Contest',
    title: 'Icebreaker Contest',
    description: 'Win a Prize',
    date: 'May 19, 2021',
    metrics: '7 participants (8 New Replies)',
    pinned: false,
    icon: 'trophy',
  },
];

export default function CommunityScreen() {
  const navigation = useNavigation();

  const renderPost = ({ item }) => (
    <TouchableOpacity
      style={styles.postCard}
      onPress={() => navigation.navigate('DetailsScreen', { issue: item })}
    >
      <View style={styles.postIconContainer}>
        <Icon name={item.icon} size={40} color="#757575" />
      </View>
      <View style={styles.postDetails}>
        <View style={styles.postHeader}>
          <CustomText style={styles.postDate}>Last {item.category.toLowerCase()} {item.date}</CustomText>
          {item.pinned && <Icon name="pin" size={16} color="#757575" />}
        </View>
        <CustomText style={styles.postTitle}>{item.title}</CustomText>
        <CustomText style={styles.postDescription}>{item.description}</CustomText>
        <CustomText style={styles.postMetrics}>{item.metrics}</CustomText>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <CustomText style={styles.header}>Community</CustomText>
      <FlatList
        data={communityPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
      <TouchableOpacity
        onPress={() => Alert.alert('Add topic or social group pressed')}
      >
        <LinearGradient
          colors={['#6462AC', '#028BD3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fab}
        >
          <CustomText style={styles.fabText}>Add topic or social group</CustomText>
        </LinearGradient>
      </TouchableOpacity>
      <BottomNavigation navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 1,
    marginTop: 15
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sortText: {
    fontSize: 14,
    color: '#757575',
  },
  suggestionIcon: {
    marginLeft: 10,
  },
  postCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
    boxShadow: "0 0 12px -4px #999",
    marginHorizontal: 8
  },
  postIconContainer: {
    marginRight: 10,
    justifyContent: 'center',
    width: 60
  },
  postDetails: {
    flex: 1,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postDate: {
    fontSize: 12,
    color: '#757575',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginVertical: 2,
  },
  postDescription: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 5,
  },
  postMetrics: {
    fontSize: 12,
    color: '#FF6F61',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  fabText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});