// client/src/screens/RoomScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, SafeAreaView, Pressable, ScrollView } from 'react-native';
import { GlobalStyles } from '../styles';
import { useSocket } from '../utils/socket';
import { requestAudioPermissions, startRecording, stopRecording, audioFileToBase64 } from '../utils/audio';
import AudioPlayer from '../components/AudioPlayer';
import { Colors } from '../styles/colors';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Buffer } from 'buffer';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

const RoomScreen = ({ route, navigation }) => {
  const { room: initialRoom, playerName } = route.params;
  const [currentRoom, setCurrentRoom] = useState(initialRoom);
  const [myId, setMyId] = useState(initialRoom?.yourId || null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUri, setRecordedAudioUri] = useState(null);
  
  // TIMER STATE
  const [recordingTime, setRecordingTime] = useState(0); // Current clip duration
  const [totalRecordingAttempts, setTotalRecordingAttempts] = useState(0); // Max 2
  const [totalRecordingTimeUsed, setTotalRecordingTimeUsed] = useState(0); // Max 60

  const recordingTimerRef = useRef(null);
  const recordingActiveRef = useRef(false);
  const timedOutRef = useRef(false);
  const stopHandledRef = useRef(false);
  const attemptsAutoPassedRef = useRef(false);
  const prevRemainingRef = useRef(2);
  const lastActionRef = useRef(0);
  const ACTION_DEBOUNCE_MS = 300;

  // --- HELPER TO RESET LOCAL STATE ---
  const resetRecordingState = useCallback(() => {
    setIsRecording(false);
    setRecordedAudioUri(null);
    setRecordingTime(0);
    setTotalRecordingAttempts(0);
    setTotalRecordingTimeUsed(0);
    recordingActiveRef.current = false;
    timedOutRef.current = false;
    stopHandledRef.current = false;
    attemptsAutoPassedRef.current = false;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const handleSocketMessage = useCallback((data) => {
    switch (data.type) {
      case 'roomCreated':
      case 'roomJoined':
        if (data.yourId) setMyId(data.yourId);
        const newRoom = data.room || {};
        if (!newRoom.currentTurnId && typeof newRoom.currentTurnIndex === 'number' && newRoom.players) {
          newRoom.currentTurnId = newRoom.players[newRoom.currentTurnIndex]?.id || null;
        }
        setCurrentRoom(prev => ({ ...newRoom, yourId: prev?.yourId || data.yourId || null }));
        break;

      case 'playerJoined':
        setCurrentRoom(prev => {
          const playerExists = prev.players.some(p => p.id === data.player.id);
          if (playerExists) return prev;
          return { ...prev, players: [...prev.players, data.player] };
        });
        break;

      case 'playerLeft':
        if (data.room) {
          setCurrentRoom(prev => ({ ...(data.room || {}), yourId: prev?.yourId || null }));
        } else {
          setCurrentRoom(prev => ({
            ...prev,
            players: prev.players.filter(p => p.id !== data.playerId),
          }));
        }
        break;

      case 'audioReceived':
        setCurrentRoom(prev => {
          const audioExists = prev.audios.some(a => a.id === data.audio.id);
          if (audioExists) return prev;
          return {
            ...prev,
            audios: [...prev.audios, data.audio],
            scores: data.scores || prev.scores,
          };
        });
        // Reset state when ANY audio is received (new round essentially)
        resetRecordingState();
        break;

      case 'turnChanged':
        setCurrentRoom(prev => ({ 
            ...prev, 
            currentTurnId: data.currentTurnId, 
            scores: data.scores || prev.scores 
        }));
        // *** CRITICAL FIX: Reset timer/attempts when turn changes ***
        resetRecordingState();
        break;

      case 'turnPassed':
        setCurrentRoom(prev => ({ ...prev, scores: data.scores || prev.scores }));
        Alert.alert('Turn Passed', data.message || 'A player timed out.');
        // *** CRITICAL FIX: Reset timer/attempts if turn passes (e.g. due to timeout) ***
        resetRecordingState();
        break;

      case 'updateCurrentLetter':
        setCurrentRoom(prev => ({ ...prev, currentLetter: data.letter }));
        break;

      case 'newHost':
        setCurrentRoom(prev => ({ ...prev, host: data.newHostId }));
        Alert.alert('Host Changed', `New host is ${data.newHostId}`);
        break;

      case 'roomLeft':
        Alert.alert('Room Left', 'You have left the room.');
        navigation.goBack();
        break;

      case 'error':
        Alert.alert('Error', data.message);
        break;
    }
  }, [navigation, resetRecordingState]);

  const { sendMessage, isConnected } = useSocket(handleSocketMessage);

  // ... (Rest of your ID logic remains the same)
  useEffect(() => {
    if (!myId && currentRoom && Array.isArray(currentRoom.players) && playerName) {
      const targetName = (playerName || '').toString().trim().toLowerCase();
      const me = currentRoom.players.find(p => (p.name || '').toString().trim().toLowerCase() === targetName);
      if (me && me.id) setMyId(me.id);
    }
  }, [currentRoom, playerName, myId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      Alert.alert('Leave Room?', 'Are you sure you want to leave this room?', [
          { text: "Don't leave", style: 'cancel', onPress: () => {} },
          { text: 'Leave', style: 'destructive', onPress: () => {
              sendMessage({ type: 'leaveRoom' });
              navigation.dispatch(e.data.action); 
            }},
        ]);
    });
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      unsubscribe();
    };
  }, [currentRoom, navigation, sendMessage]);

  // --- RECORDING LOGIC ---

  const handleStartRecording = async () => {
    if (Date.now() - lastActionRef.current < ACTION_DEBOUNCE_MS) return;
    lastActionRef.current = Date.now();

    const currentTurnId = currentRoom.currentTurnId || (currentRoom.players && typeof currentRoom.currentTurnIndex === 'number' ? currentRoom.players[currentRoom.currentTurnIndex]?.id : null);
    
    if (!currentRoom || !myId || currentTurnId !== myId) {
      return;
    }
    if (totalRecordingAttempts >= 2) {
      Alert.alert('Recording Limit Reached', 'You have used both your recording attempts.');
      return;
    }
    if (totalRecordingTimeUsed >= 60) {
      Alert.alert('Time Limit Reached', 'You have used your total recording time of 60 seconds.');
      return;
    }

    const hasPermission = await requestAudioPermissions();
    if (hasPermission) {
      const path = await startRecording();
      if (path) {
        setRecordedAudioUri(null);
        setIsRecording(true);
        recordingActiveRef.current = true;
        timedOutRef.current = false;
        stopHandledRef.current = false;
        setRecordingTime(0);

        recordingTimerRef.current = setInterval(() => {
          setRecordingTime(prev => {
            const newTime = prev + 1;
            
            setTotalRecordingTimeUsed(prevTotal => {
              const nextTotal = prevTotal + 1;
              
              // Check limits: 20s per attempt OR 60s total global time
              if ((newTime >= 20 || nextTotal >= 60) && recordingActiveRef.current && !timedOutRef.current) {
                timedOutRef.current = true;
                if (!stopHandledRef.current) {
                  stopHandledRef.current = true;
                  recordingActiveRef.current = false;
                  if (recordingTimerRef.current) {
                    clearInterval(recordingTimerRef.current);
                    recordingTimerRef.current = null;
                  }
                  
                  setTotalRecordingAttempts(prevAttempts => prevAttempts + 1);
                  
                  // If we hit the GLOBAL 60s limit, force a turn pass immediately
                  if (nextTotal >= 60) {
                     sendMessage({ type: 'timeExceeded', roomId: currentRoom.id });
                     Alert.alert('Time Up', 'Total 60s limit reached. Turn passed.');
                  } else {
                     // Just the 20s limit per clip
                     Alert.alert('Time Up', '20s recording limit reached.');
                  }
                  
                  setRecordedAudioUri(null); // Optionally keep it if you want them to send partial
                  setIsRecording(false);
                  setRecordingTime(0);
                }
              }
              return nextTotal;
            });
            return newTime;
          });
        }, 1000);
      }
    }
  };

  const handleStopRecording = async (maybeIsTimeout = false) => {
    const isTimeout = typeof maybeIsTimeout === 'boolean' ? maybeIsTimeout : false;
    if (!isTimeout) {
      if (Date.now() - lastActionRef.current < ACTION_DEBOUNCE_MS) return;
      lastActionRef.current = Date.now();
    }
    if (stopHandledRef.current) return;
    stopHandledRef.current = true;

    const wasActive = recordingActiveRef.current;
    recordingActiveRef.current = false;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const result = await stopRecording();
    setTotalRecordingAttempts(prev => prev + 1); // Increment attempts

    if (isTimeout) {
      // Logic handled inside interval mostly, but safety catch here
      setRecordedAudioUri(null);
      setIsRecording(false);
      setRecordingTime(0);
      return;
    }

    // Manual stop
    if (result) {
      setRecordedAudioUri(result);
      setIsRecording(false);
      setRecordingTime(0);
    } else if (!wasActive) {
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  const handleSendAudio = async () => {
    if (!recordedAudioUri) {
      Alert.alert('No Audio', 'Please record an audio first.');
      return;
    }
    if (!isMyTurn) {
      Alert.alert('Not your turn', 'You can only send audio on your turn.');
      return;
    }
    const base64Audio = await audioFileToBase64(recordedAudioUri);
    if (base64Audio) {
      sendMessage({ type: 'sendAudio', roomId: currentRoom.id, audioBase64: base64Audio });
      // Optimistic UI update handled by resetRecordingState in audioReceived
      Alert.alert('Audio Sent', 'Your audio has been sent to the room!');
      setRecordedAudioUri(null);
      setIsRecording(false);
    } else {
      Alert.alert('Error', 'Failed to prepare audio for sending.');
    }
  };

  const handleDiscardAudio = () => {
    setRecordedAudioUri(null);
    setIsRecording(false);
    setRecordingTime(0);
    
    // Check if that was the last attempt
    if (isMyTurn && Number(totalRecordingAttempts) >= 2 && !attemptsAutoPassedRef.current) {
      attemptsAutoPassedRef.current = true;
      resetRecordingState();
      try {
        if (currentRoom && currentRoom.id) {
          sendMessage({ type: 'timeExceeded', roomId: currentRoom.id });
        }
      } catch (e) { console.warn(e); }
    }
  };

  const currentTurnId = currentRoom.currentTurnId || (currentRoom.players && typeof currentRoom.currentTurnIndex === 'number' ? currentRoom.players[currentRoom.currentTurnIndex]?.id : null);
  const isMyTurn = myId && currentTurnId && String(myId).toString().trim() === String(currentTurnId).toString().trim();

  const scoredPlayers = (() => {
    const scores = currentRoom.scores || {};
    const players = currentRoom.players || [];
    const arr = players.map(p => ({ player: p, score: scores[p.id] || 0 }));
    arr.sort((a, b) => b.score - a.score);
    return arr;
  })();

  // Auto-pass logic
  useEffect(() => {
    const used = Number(totalRecordingAttempts) || 0;
    const remaining = Math.max(0, 2 - used);
    const prevRemaining = prevRemainingRef.current ?? 2;

    if (!isMyTurn) {
      attemptsAutoPassedRef.current = false;
      prevRemainingRef.current = remaining;
      return;
    }

    // Check if attempts exhausted OR time exhausted
    const timeExhausted = totalRecordingTimeUsed >= 60;
    const attemptsExhausted = remaining === 0 && prevRemaining > 0;

    if ((attemptsExhausted || timeExhausted) && !attemptsAutoPassedRef.current) {
      if (recordingActiveRef.current && !timedOutRef.current) {
        prevRemainingRef.current = remaining;
        return;
      }
      if (recordedAudioUri) {
        prevRemainingRef.current = remaining;
        return;
      }

      attemptsAutoPassedRef.current = true;
      resetRecordingState();

      try {
        if (currentRoom && currentRoom.id) {
          sendMessage({ type: 'timeExceeded', roomId: currentRoom.id });
        }
      } catch (e) { console.warn(e); }
    }
    prevRemainingRef.current = remaining;
  }, [isMyTurn, totalRecordingAttempts, totalRecordingTimeUsed, recordedAudioUri, currentRoom?.id, sendMessage, resetRecordingState]);

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={{ flex: 1, paddingBottom: 10 }}>
        <View style={[GlobalStyles.header, { marginBottom: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="musical-notes" size={26} color={Colors.accent} style={{ marginRight: 8 }} />
            <View>
              <Text style={GlobalStyles.title}>Antakshari</Text>
            </View>
          </View>
        </View>



 
            {/*LEADERBOARD /*}
 
        {/* <View style={[GlobalStyles.card, styles.roomCard]}>
          <View>
            <Text style={{ color: Colors.muted }}>Leaderboard</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scoreScrollContainer}>
              {scoredPlayers.map(({ player, score }) => (
                <View key={player.id} style={styles.scorePlayerCard}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarInitial}>{(player.name || '').charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.scorePlayerName} numberOfLines={1}>{player.name}</Text>
                  <View style={styles.scoreValue}><Text style={styles.scorePoints}>{score}</Text></View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View> */}

        <Text style={[GlobalStyles.title, { marginTop: 8, fontSize: 18 }]}>Shared Audios</Text>
        {currentRoom.audios.length === 0 ? (
          <Text style={{ color: Colors.muted }}>No audios shared yet. Be the first!</Text>
        ) : (
          <FlatList
            data={currentRoom.audios.slice().reverse()}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const sender = currentRoom.players.find(p => p.id === item.from);
              const senderName = sender ? sender.name : 'Unknown Player';
              return (
                <AudioPlayer
                  audioBase64={item.audioBase64}
                  playerName={senderName}
                  timestamp={item.timestamp}
                />
              );
            }}
          />
        )}

        {isMyTurn && (
          <View style={[GlobalStyles.card, styles.recordingSection]}>
            <Text style={{ color: Colors.muted, marginBottom: 8 }}>
              {isRecording ? `Recording — ${recordingTime}s` : 'CURRENT WORD:'}
              <Text style={styles.currentWordText}> {currentRoom.currentWord || currentRoom.currentLetter || '—'}</Text> 
            </Text>
            <Text style={{ color: Colors.muted, marginBottom: 8 }}>
              Current Turn: {currentRoom.players.find(p => p.id === currentTurnId)?.name || '—'}
            </Text>

            <View style={styles.statusRow}>
              <View style={styles.badge}><Text style={{ color: Colors.text }}>Attempts: {2 - totalRecordingAttempts}</Text></View>
              {/* FIX: Ensure math max(0) to prevent negative numbers display */}
              <View style={styles.badge}>
                <Text style={{ color: Colors.text }}>
                  Time Left: {Math.max(0, 60 - totalRecordingTimeUsed)}s
                </Text>
              </View>
            </View>

            <View style={{ alignItems: 'center', marginTop: 6 }}>
              <Pressable
                onPress={() => (isRecording ? handleStopRecording(false) : handleStartRecording())}
                disabled={totalRecordingAttempts >= 2 || totalRecordingTimeUsed >= 60 || !isConnected || !isMyTurn}
                style={({ pressed }) => [
                  styles.recordButton, 
                  { 
                    opacity: pressed ? 0.86 : 1, 
                    backgroundColor: isRecording ? Colors.danger : (totalRecordingTimeUsed >= 60 ? Colors.muted : Colors.primary) 
                  }
                ]}
              >
                <Ionicons name={isRecording ? 'stop' : 'mic'} size={12} color="#fff" />
              </Pressable>
              <Text style={{ color: Colors.muted, marginTop: 4 }}>
                {isRecording ? 'Tap to stop' : 'Tap to record (Max 20s)'}
              </Text>
            </View>

            {recordedAudioUri && (
              <View style={styles.recordedActions}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordedLabel}>Audio ready to send</Text>
                </View>
                <TouchableOpacity style={[GlobalStyles.button, styles.sendButton]} onPress={handleSendAudio}>
                  <Ionicons name="send" size={10} color={Colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={[GlobalStyles.secondaryButton, styles.discardButton]} onPress={handleDiscardAudio}>
                  <Ionicons name="trash" size={10} color={Colors.muted} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  roomInfoText: { fontSize: 16, marginBottom: 5, color: Colors.muted },
  recordingSection: { padding: 8, borderRadius: 10, marginBottom: 6, alignItems: 'center' },
  recordedActions: { marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end', width: '100%', alignItems: 'center', gap: 6 },
  recordedLabel: { fontSize: 14, fontWeight: '700', marginBottom: 6, color: Colors.text },
  sendButton: { width: 44, height: 44, borderRadius: 22 },
  discardButton: { backgroundColor: Colors.surface, marginHorizontal: 5, paddingHorizontal: 12 },
  roomCard: { marginBottom: 0 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 4, elevation: 3 },
  avatarInitial: { color: '#fff', fontWeight: '800', fontSize: 14 },
  currentWordText: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  badge: { backgroundColor: Colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  recordButton: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  scorePlayerName: { fontSize: 13, color: Colors.text, fontWeight: '600' },
  scoreValue: { backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  scorePoints: { fontSize: 12, fontWeight: '800', color: '#fff' },
  scoreScrollContainer: { alignItems: 'center', paddingVertical: 6 },
  scorePlayerCard: { alignItems: 'center', marginRight: 12, width: 96 },
});

export default RoomScreen;