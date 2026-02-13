// client/src/components/RoomCard.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GlobalStyles } from '../styles';
import { Colors } from '../styles/colors';

const RoomCard = ({ room, onJoin }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.roomID}>Room ID: {room.id.substring(0, 8)}</Text>
      <Text style={styles.playerCount}>Players: {room.playerCount}/10</Text>
      <Text style={styles.currentLetter}>Starts with: {room.currentLetter}</Text>
      <TouchableOpacity style={GlobalStyles.button} onPress={() => onJoin(room.id)}>
        <Text style={GlobalStyles.buttonText}>Join Room</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roomID: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 5,
  },
  playerCount: {
    fontSize: 14,
    color: Colors.darkGray,
    marginBottom: 5,
  },
  currentLetter: {
    fontSize: 14,
    color: Colors.darkGray,
    marginBottom: 10,
  },
});

export default RoomCard;