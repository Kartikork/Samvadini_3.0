import React from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import BottomNavigation from '../../components/BottomNavigation';

// Sample agenda data
const agendaItems = [
  {
    id: '1',
    title: 'Opening Ceremony',
    date: 'May 15, 2025',
    time: '9:00 AM - 10:00 AM',
    location: 'Main Hall',
    category: 'Ceremony',
    icon: 'flag',
  },
  {
    id: '2',
    title: 'Workshop: React Native Basics',
    date: 'May 15, 2025',
    time: '10:30 AM - 12:00 PM',
    location: 'Room 101',
    category: 'Workshop',
    icon: 'school',
  },
  {
    id: '3',
    title: 'Networking Lunch',
    date: 'May 15, 2025',
    time: '12:30 PM - 1:30 PM',
    location: 'Cafeteria',
    category: 'Networking',
    icon: 'restaurant',
  },
  {
    id: '4',
    title: 'Panel Discussion',
    date: 'May 16, 2025',
    time: '2:00 PM - 3:30 PM',
    location: 'Auditorium',
    category: 'Discussion',
    icon: 'people',
  },
];

export default function AgendaScreen() {
  const navigation = useNavigation();

  const renderAgendaItem = ({ item }) => (
    <TouchableOpacity
      style={styles.agendaCard}
      onPress={() => navigation.navigate('DetailsScreen', { issue: item })}
    >
      <View style={styles.agendaIconContainer}>
        <Icon name={item.icon} size={40} color="#757575" />
      </View>
      <View style={styles.agendaDetails}>
        <Text style={styles.agendaDate}>{item.date}</Text>
        <Text style={styles.agendaTime}>{item.time}</Text>
        <Text style={styles.agendaTitle}>{item.title}</Text>
        <Text style={styles.agendaLocation}>📍 {item.location}</Text>
        <Text style={styles.agendaCategory}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Agenda</Text>
      <FlatList
        data={agendaItems}
        renderItem={renderAgendaItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
      <BottomNavigation navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 15,
  },
  agendaCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    boxShadow: "0 0 12px -4px #999",
    marginHorizontal: 8
  },
  agendaIconContainer: {
    marginRight: 10,
    justifyContent: 'center',
    width: 60,
    alignSelf: "center"
  },
  agendaDetails: {
    flex: 1,
  },
  agendaDate: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  agendaTime: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  agendaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
  },
  agendaLocation: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  agendaCategory: {
    fontSize: 12,
    color: '#FF6F61',
  },
});