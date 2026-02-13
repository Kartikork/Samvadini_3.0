// client/src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { GlobalStyles } from '../styles';
import { Colors } from '../styles/colors';
import { useSocket } from '../utils/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

const HomeScreen = ({ navigation }) => {
  const [playerName, setPlayerName] = useState('');
  const [rooms, setRooms] = useState([]);
  const playRequestedRef = useRef(false);
  const [isAutoJoining, setIsAutoJoining] = useState(false);
  const clickThrottleRef = useRef(false);

  const handleSocketMessage = useCallback((data) => {
    switch (data.type) {
      case 'roomCreated':
        setIsAutoJoining(false);
        playRequestedRef.current = false;
        navigation.navigate('roomScreen', { room: data.room, playerName: playerName, yourId: data.yourId || null });
        break;
      case 'joinedRoom':
        setIsAutoJoining(false);
        playRequestedRef.current = false;
        navigation.navigate('roomScreen', { room: data.room, playerName: playerName, yourId: data.yourId || null });
        break;
      case 'roomList':
        setRooms(data.rooms);
        // If play was requested, auto-join the best room
        if (playRequestedRef.current) {
          doAutoJoin(data.rooms);
        }
        break;
      case 'error':
        Alert.alert('Error', data.message);
        break;
    }
  }, [navigation, playerName]);

  const { sendMessage, isConnected } = useSocket(handleSocketMessage);

  useEffect(() => {
    if (isConnected) {
      sendMessage({ type: 'requestRoomList' });
    }
  }, [isConnected, sendMessage]);

  // Load stored player name from AsyncStorage on mount
  useEffect(() => {
    const loadName = async () => {
      try {
        const storedUserName = await AsyncStorage.getItem('userName');
        if (storedUserName) setPlayerName(storedUserName);
      } catch (e) {
        console.warn('Failed to load user name from storage', e);
      }
    };
    loadName();
  }, []);

  // Refresh room list when this screen comes into focus
  useEffect(() => {    
    const unsubscribe = navigation.addListener('focus', () => {
      if (isConnected) {
        sendMessage({ type: 'requestRoomList' });
      }
    });

    return unsubscribe;
  }, [navigation, isConnected, sendMessage]);

  const handleCreateRoom = () => {
    // fallback create
    sendMessage({ type: 'createRoom', playerName: playerName });
  };

  const handleJoinRoom = (roomId) => {
    sendMessage({ type: 'joinRoom', roomId: roomId, playerName: playerName });
  };

  const doAutoJoin = (roomList) => {
    // pick room with highest playerCount
    setIsAutoJoining(false);
    playRequestedRef.current = false;
    if (Array.isArray(roomList) && roomList.length > 0) {
      let best = roomList[0];
      for (const r of roomList) {
        if ((r.playerCount || 0) > (best.playerCount || 0)) best = r;
      }
      handleJoinRoom(best.id);
    } else {
      // no room: create one
      handleCreateRoom();
    }
  };

  const handlePlay = () => {
    if (clickThrottleRef.current) return; // Prevent double-tap
    if (!isConnected) return Alert.alert('Offline', 'Not connected to server.');
    
    clickThrottleRef.current = true;
    // request latest rooms and mark that we want to auto-join
    playRequestedRef.current = true;
    setIsAutoJoining(true);
    // if we already have rooms cached, use them immediately
    if (rooms && rooms.length > 0) {
      doAutoJoin(rooms);
    } else {
      sendMessage({ type: 'requestRoomList' });
    }
    
    // Re-enable button after 300ms
    setTimeout(() => {
      clickThrottleRef.current = false;
    }, 600);
  };

  return (
    <View style={GlobalStyles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={GlobalStyles.title}>Antakshari Arena</Text>
          <Text style={GlobalStyles.subtitle}>Sing, share and compete — modern antakshari</Text>
        </View>
        <Ionicons name="sparkles" size={28} color={"#FFCB6B"} />
      </View>

      <View style={{ alignItems: 'center', marginTop: 40 }}>
        <Text style={{ color: Colors.muted, marginBottom: 8 }}>Playing as</Text>
        <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.text }}>{playerName || 'Player'}</Text>

        <TouchableOpacity
          style={[GlobalStyles.button, { marginTop: 32, paddingVertical: 18, paddingHorizontal: 36 }]}
          onPress={handlePlay}
          disabled={!isConnected || isAutoJoining}
        >
          <Ionicons name="play-circle" size={22} color={Colors.text} style={{ marginRight: 8 }} />
          <Text style={GlobalStyles.buttonText}>{isAutoJoining ? 'Joining...' : 'Play'}</Text>
        </TouchableOpacity>
      </View>

      {/* Manual Join Room (optional, but good for testing) */}

{/*here  */}


      {/* <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: GlobalStyles.input.borderColor, paddingTop: 20 }}>
        <Text style={[GlobalStyles.title, { fontSize: 18 }]}>Join Room by ID</Text>
        <TextInput
          style={GlobalStyles.input}
          placeholder="Enter Room ID"
          value={roomToJoinId}
          onChangeText={setRoomToJoinId}
        />
        <TouchableOpacity
          style={GlobalStyles.button}
          onPress={() => handleJoinRoom(roomToJoinId)}
          disabled={!isConnected || !roomToJoinId.trim()}
        >
          <Text style={GlobalStyles.buttonText}>Join Room</Text>
        </TouchableOpacity>
      </View> */}



      {/*here  */} 

    </View>
  );
};

export default HomeScreen;