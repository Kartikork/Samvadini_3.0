import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import Video from 'react-native-video';
import { formatDatewithTime } from '../../helper/DateFormate';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { viewAndLikeStatus } from '../../storage/sqllite/chat/StatusSchema';
// import { SocketService } from '../../services/socketService';
import { env } from '../../config';
import { backArrowIcon, userIcon } from '../../assets';
import axios from 'axios';

export default function ViewStatus({ route, navigation }) {
  const { status: initialStatus, index = 0, myId, statusOwnerId, onViewStatus, onLikeStatus } = route.params;
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [currentIndex, setCurrentIndex] = useState(index);
  const [replyText, setReplyText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [remainingDuration, setRemainingDuration] = useState(0);

  const progressArray = useRef(
    initialStatus.media.map(() => new Animated.Value(0))
  ).current;
  const animationRef = useRef(null);
  const fullDurationRef = useRef(0);
  const inputRef = useRef(null);
  const media = currentStatus.media[currentIndex];

  useEffect(() => {
    startProgress(currentIndex);
    return () => {
      stopProgress();
    };
  }, [currentIndex]);

  useEffect(() => {
    if (isInputFocused || isHolding) {
      pauseProgress();
    } else {
      resumeProgress();
    }
  }, [isInputFocused, isHolding]);

  const startProgress = (i) => {
    if (!media.viewed) {
      handleLike(false);
    }
    if (onViewStatus) onViewStatus(i);
    progressArray[i].setValue(0);
    const fullDuration = media.type.startsWith('video/') ? 7000 : media.type.startsWith('image/') ? 5000 : 3000;
    fullDurationRef.current = fullDuration;
    setRemainingDuration(fullDuration);
    animationRef.current = Animated.timing(progressArray[i], {
      toValue: 1,
      duration: fullDuration,
      useNativeDriver: false,
    });
    animationRef.current.start(({ finished }) => {
      if (finished) handleNext();
    });
  };

  const pauseProgress = () => {
    if (animationRef.current) {
      animationRef.current.stop();
      progressArray[currentIndex].stopAnimation((value) => {
        const rem = (1 - value) * (fullDurationRef.current || 0);
        setRemainingDuration(rem);
        setIsPaused(true);
      });
    }
  };

  const resumeProgress = () => {
    if (isPaused && progressArray[currentIndex]) {
      animationRef.current = Animated.timing(progressArray[currentIndex], {
        toValue: 1,
        duration: remainingDuration,
        useNativeDriver: false,
      });
      animationRef.current.start(({ finished }) => {
        if (finished) handleNext();
      });
      setIsPaused(false);
    }
  };

  const stopProgress = () => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
    progressArray.forEach(p => p.stopAnimation());
  };

  const handlePressIn = () => {
    setIsHolding(true);
  };

  const handlePressOut = () => {
    setIsHolding(false);
  };

  const handleNext = () => {
    if (currentIndex < currentStatus.media.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.goBack();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleLike = async (action = false) => {
    try {
      // await socketService.connect(myId);
      // socketService.channel.push('update_status', {
      //   id: media.id,
      //   like: action,
      //   uniqueId: myId,
      //   pathakah_chinha: statusOwnerId,
      // });
      await viewAndLikeStatus(media.id, action);
      const response = await axios.post(`${env.API_BASE_URL}/status/update-status`, {
        uniqueId: myId,
        status_id: media.id,
        like: action,
      });
      if (response.status === 200) {
        const newMedia = [...currentStatus.media];
        newMedia[currentIndex] = { ...newMedia[currentIndex], like: action };
        setCurrentStatus({ ...currentStatus, media: newMedia });
        if (onLikeStatus) onLikeStatus(currentIndex, action);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const sendReply = async () => {
    if (replyText.trim() === '') return;
    setReplyText('');
    setIsInputFocused(false);
    inputRef.current.blur();
  };

  const renderMedia = () => {
    if (media.type.startsWith('image/')) {
      return <Image source={{ uri: media.content + env.SAS_KEY }} style={styles.media} resizeMode="cover" />;
    } else if (media.type.startsWith('video/')) {
      return (
        <Video
          source={{ uri: media.content + env.SAS_KEY }}
          style={styles.media}
          resizeMode="cover"
          repeat={false}
          onEnd={handleNext}
          paused={isPaused || isInputFocused || isHolding}
        />
      );
    } else if (media.type === 'text') {
      return (
        <View style={styles.media}>
          <Text style={styles.textContent}>{media.content}</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
    >
      <View style={styles.container}>
        <View style={styles.progressContainer}>
          {currentStatus.media.map((_, i) => {
            const widthAnim = progressArray[i].interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            });
            return (
              <View key={i} style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    i < currentIndex && { width: '100%' },
                    i === currentIndex && { width: widthAnim },
                  ]}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <Image
              source={backArrowIcon}
              style={styles.backArrow}
            />
          </TouchableOpacity>
          <Image
            source={currentStatus.photo ? { uri: currentStatus.photo + env.SAS_KEY } : userIcon}
            style={styles.avatar}
          />
          <View style={{ flexDirection: 'column', marginLeft: 7 }}>
            <Text style={styles.statusName}>{currentStatus.name}</Text>
            <Text style={styles.statusTime}>{formatDatewithTime(media.create_at) || ''}</Text>
          </View>
        </View>

        <TouchableWithoutFeedback
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <View style={{ flex: 1 }}>
            {renderMedia()}
          </View>
        </TouchableWithoutFeedback>

        {media.caption && (
          <Text style={styles.caption}>{media.caption}</Text>
        )}

        <View style={styles.bottomInputIcon}>
          {isInputFocused ? (
            <TouchableOpacity style={styles.sendButton} onPress={sendReply}>
              <Ionicons name="send" size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.heartIcon}
              onPress={() => handleLike(!media.like)}
            >
              {media.like ? (
                <Ionicons name="heart" size={28} color="#028BD3" />
              ) : (
                <Ionicons name="heart-outline" size={28} color="#fff" />
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.touchContainer}>
          <TouchableOpacity
            style={styles.leftZone}
            onPress={handlePrev}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          />
          <TouchableOpacity
            style={styles.rightZone}
            onPress={handleNext}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  media: { width: '100%', height: '100', flex: 1, marginBottom: 60, alignItems: 'center', justifyContent: 'center' },
  textContent: { color: '#fff', fontSize: 18, textAlign: 'center', padding: 20, alignSelf: 'center', lineHeight: 26 },
  caption: {
    color: 'white',
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 16,
  },
  progressContainer: {
    position: 'absolute',
    top: 37,
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 8,
    zIndex: 20,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  progressFill: {
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  headerRow: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 4,
    backgroundColor: 'rgba(35,35,35,0.88)',
  },
  headerIcon: {
    marginRight: 8,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: "#fff", backgroundColor: "#ccc" },
  statusName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  statusTime: { color: '#eee', fontSize: 12, marginTop: 2 },
  moreIcon: {
    marginLeft: 'auto',
    paddingHorizontal: 3,
    paddingVertical: 4,
  },
  bottomInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
    backgroundColor: 'rgba(50,50,50,0.7)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginHorizontal: 8,
    marginBottom: 10,
  },
  replyInput: {
    flex: 1,
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: 16,
    borderWidth: 0,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  heartIcon: {
    marginLeft: 9,
  },
  sendButton: {
    marginLeft: 9,
  },
  touchContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    zIndex: 1,
  },
  leftZone: { flex: 1 },
  rightZone: { flex: 1 },
  backArrow: {
    width: 25,
    height: 25,
    tintColor: '#fff',
    resizeMode: 'contain',
  },
  bottomInputIcon: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 25,
    alignItems: 'center',
  },
});
