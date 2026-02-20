import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import Video from 'react-native-video';
import { formatDatewithTime } from '../../helper/DateFormate';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { deleteStatus, viewAndLikeStatus } from '../../storage/sqllite/chat/StatusSchema';
// import { SocketService } from '../../services/socketService';
import { env } from '../../config';
import { backArrowIcon, userIcon } from '../../assets';
const { height } = Dimensions.get('window');
import axios from 'axios';

export default function ViewMyStatus({ route, navigation }) {
  const { status: initialStatus, index = 0, myId, statusOwnerId, onViewStatus, onLikeStatus, userList, onDelete, viewers = [], viewCount = 0, myPhoto = '' } = route.params;
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [currentIndex, setCurrentIndex] = useState(index);
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentViewers, setCurrentViewers] = useState([]);
  const [currentViewCount, setCurrentViewCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [remainingDuration, setRemainingDuration] = useState(0);

  const progressRef = useRef(initialStatus.media.map(() => new Animated.Value(0)));
  const animationRef = useRef(null);
  const fullDurationRef = useRef(0);

  useEffect(() => {
    progressRef.current.forEach(p => p.stopAnimation());
    progressRef.current = currentStatus.media.map(() => new Animated.Value(0));
  }, [currentStatus.media.length]);

  useEffect(() => {
    const media = currentStatus.media[currentIndex];
    if (media?.viewed_by?.length && myId) {
      const uniqueMap = new Map();
      media.viewed_by.forEach(v => {
        if (String(v?.uniqueId) !== String(myId) && v?.name !== null) {
          uniqueMap.set(v.uniqueId, {
            ...v,
            liked: !!v.like,
            time: formatDatewithTime(v.viewedAt),
          });
        }
      });

      const uniqueViewers = Array.from(uniqueMap.values());
      setCurrentViewers(uniqueViewers);
      setCurrentViewCount(uniqueViewers.length);
    } else {
      setCurrentViewers([]);
      setCurrentViewCount(0);
    }

    startProgress(currentIndex);
    return stopProgress;
  }, [currentIndex, myId]);

  useEffect(() => {
    if (modalVisible || menuVisible) {
      pauseProgress();
    } else if (!isPaused) {
      resumeProgress();
    }
  }, [modalVisible, menuVisible]);

  const startProgress = (i) => {
    if (!media.viewed) {
      handleLike(false);
    }
    if (i >= currentStatus.media.length || i < 0) return;
    const mediaItem = currentStatus.media[i];
    if (!mediaItem) return;
    if (onViewStatus) onViewStatus(i);
    if (progressRef.current[i]) {
      progressRef.current[i].setValue(0);
      const fullDuration = mediaItem.type.startsWith('video/') ? 7000 : mediaItem.type.startsWith('image/') ? 5000 : 3000;
      fullDurationRef.current = fullDuration;
      setRemainingDuration(fullDuration);
      animationRef.current = Animated.timing(progressRef.current[i], {
        toValue: 1,
        duration: fullDuration,
        useNativeDriver: false,
      });
      animationRef.current.start(({ finished }) => {
        if (finished) handleNext();
      });
    }
  };

  const pauseProgress = () => {
    if (animationRef.current) {
      animationRef.current.stop();
      progressRef.current[currentIndex].stopAnimation((value) => {
        const rem = (1 - value) * (fullDurationRef.current || 0);
        setRemainingDuration(rem);
        setIsPaused(true);
      });
    }
  };

  const resumeProgress = () => {
    if (isPaused && progressRef.current[currentIndex]) {
      animationRef.current = Animated.timing(progressRef.current[currentIndex], {
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
    progressRef.current.forEach(p => p.stopAnimation());
  };

  const handlePressIn = () => {
    pauseProgress();
  };

  const handlePressOut = () => {
    if (!modalVisible && !menuVisible) {
      resumeProgress();
    }
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

  const handleDelete = async (data) => {
    try {
      // await socketService.connect(myId);
      // socketService.channel.push('delete_status', {
      //   id: media.id,
      //   pathakah_chinha: statusOwnerId,
      //   all_contacts: userList,
      // });
      await deleteStatus(data.id)
      const response = await axios.delete(`${env.API_BASE_URL}/status/delete-status`, {
        pathakah_chinha: myId,
        status_id: data.id,
      });
      if (response.status === 200) {
        const deletedIndex = currentStatus.media.findIndex(m => m.id === data.id);
        if (deletedIndex === -1) return;
        const newMedia = currentStatus.media.filter((_, i) => i !== deletedIndex);
        if (newMedia.length === 0) {
          if (onDelete) onDelete(data.id);
          navigation.goBack();
          return;
        }
        let newIndex = currentIndex;
        if (currentIndex < deletedIndex) {
          newIndex = currentIndex;
        } else if (currentIndex > deletedIndex) {
          newIndex = currentIndex - 1;
        } else {
          newIndex = currentIndex;
          if (newIndex >= newMedia.length) {
            newIndex = newMedia.length - 1;
          }
        }
        setCurrentIndex(newIndex);
        setCurrentStatus({ ...currentStatus, media: newMedia });
        if (onDelete) onDelete(data.id);
      }
    } catch (error) {
      console.error('Error deleting status:', error);
    }
  };

  const handleLike = async (action = false) => {
    try {
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

  const handleForward = (data) => {
    const forwardData = {
      sandesha_prakara: data.type,
      vishayah: data.content,
      ukti: data.caption || '',
    };
    navigation.navigate('FwdListing', {
      selectedMessages: [forwardData],
      curUserUid: myId,
    });
  };

  if (currentIndex >= currentStatus.media.length || currentIndex < 0) {
    return null;
  }
  const media = currentStatus.media[currentIndex];

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
          paused={isPaused || modalVisible || menuVisible}
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
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        {currentStatus.media.map((_, i) => {
          const widthAnim = progressRef.current[i]?.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
          }) || '0%';
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
        <Image source={myPhoto ? { uri: myPhoto + env.SAS_KEY } : userIcon} style={styles.avatar} />
        <View style={{ flexDirection: 'column', marginLeft: 7 }}>
          <Text style={styles.statusName}>My Updates</Text>
          <Text style={styles.statusTime}>
            {formatDatewithTime(media.create_at) || ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.moreIcon} onPress={() => setMenuVisible(true)}>
          <Text style={{ color: '#fff', fontSize: 30 }}>⋮</Text>
        </TouchableOpacity>
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
      <View style={styles.eyeContainer}>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.eyeButton}>
          <Text style={styles.eyeIcon}><Ionicons size={30} name="eye-outline" /></Text>
          <Text style={styles.eyeCount}>{currentViewCount || 0}</Text>
        </TouchableOpacity>
      </View>

      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.viewerTitle}>Viewed by {currentViewCount || 0}</Text>
              <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={() => setModalVisible(false)}>
                <Text style={{ color: '#fff', fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }}>
              {currentViewers && currentViewers.map((viewer, idx) => (
                <View key={idx} style={styles.viewerRow}>
                  <Image
                    source={viewer.photo ? { uri: viewer.photo + env.SAS_KEY } : userIcon}
                    style={styles.viewerAvatar}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.viewerName}>{viewer.name || "Name"}</Text>
                    <Text style={styles.viewerTime}>{viewer.time || "Time"}</Text>
                  </View>
                  {!!viewer.like &&
                    <Ionicons name="heart" size={28} color="#028BD3" />
                  }
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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

      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuVisible(false)}>
          <View style={styles.sideMenu}>
            <TouchableOpacity style={styles.menuRow} onPress={() => {
              setMenuVisible(false); handleForward(media);
            }}>
              <Text style={styles.menuText}>Forward</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={() => {
              setMenuVisible(false); handleDelete(media);
            }}>
              <Text style={[styles.menuText, { color: '#ff4444' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', },
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
  backArrow: {
    width: 25,
    height: 25,
    tintColor: '#fff',
    resizeMode: 'contain',
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
  eyeContainer: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9,
  },
  eyeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28,28,28,0.75)',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 29,
  },
  eyeIcon: {
    fontSize: 23,
    color: '#fff',
    marginRight: 7,
  },
  eyeCount: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,10,10,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#191c20',
    minHeight: height * 0.58,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingTop: 11,
    paddingHorizontal: 6,
    paddingBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  viewerTitle: {
    color: '#fff',
    fontSize: 16,
    marginRight: 8,
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#232323',
    borderBottomWidth: 0.7,
    paddingHorizontal: 10,
  },
  viewerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#999',
  },
  viewerName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  viewerTime: {
    color: '#aaa',
    fontSize: 13,
  },
  dilIcon: {
    fontSize: 21,
    color: '#ff2577',
    marginLeft: 5,
    marginRight: 4,
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
  moreIcon: {
    marginLeft: 'auto',
    paddingHorizontal: 3,
    paddingVertical: 4,
  },
  backdrop: {
    flex: 1,
  },
  sideMenu: {
    position: 'absolute',
    top: 90,
    right: 14,
    width: 160,
    backgroundColor: '#2b2b2b',
    borderRadius: 8,
    elevation: 6,
    paddingVertical: 4,
  },
  menuRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
