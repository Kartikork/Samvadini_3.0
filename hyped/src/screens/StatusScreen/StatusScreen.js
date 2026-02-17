import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import axios from 'axios';
import ImagePicker from 'react-native-image-crop-picker';
import { formatDatewithTime } from '../../helper/DateFormate';
import { getAllContactsUniqueId } from '../../storage/sqllite/authentication/UsersContactsList';
import StatusPreviewModal from "./StatusPreviewModal";
import { deleteStatus, getAllStatus, getOthersStatus, insertBulkStatus, updateStatus } from '../../storage/sqllite/chat/StatusSchema';
// import { SocketService } from '../../services/socketService';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import BottomNavigation from '../../components/BottomNavigation';
import NetInfo from '@react-native-community/netinfo';
import { env } from '../../config';
import { userIcon, cameraIcon } from '../../assets';
import { useAppSelector } from '../../state/hooks';

const StatusAvatar = ({ media, size = 60, allViewed }) => {
  const ringCount = media.length;
  const thickness = 4;
  const radius = (size / 2) - thickness;
  const ringGap = 2;

  const previewStatus = media[0];
  let previewContent = null;

  if (previewStatus?.type?.startsWith('image/') || previewStatus?.type?.startsWith('video/')) {
    const previewUri = previewStatus.type.startsWith('image/')
      ? previewStatus.content
      : previewStatus.thumbnail || previewStatus.content;
    previewContent = (
      <View style={[styles.avatarImageWrapper, { width: size, height: size }]}>
        <View style={styles.avatarImageInner}>
          <View style={{ flex: 1 }}>
            <View style={styles.avatarOverflowHidden}>
              <Image
                source={{ uri: previewUri + env.SAS_KEY }}
                style={{
                  width: size - thickness * 2,
                  height: size - thickness * 2,
                  borderRadius: (size - thickness * 2) / 2
                }}
              />
            </View>
          </View>
        </View>
      </View>
    );
  } else if (previewStatus?.type === 'text' && previewStatus?.content) {
    previewContent = (
      <View style={[
        styles.avatarTextWrapper,
        { width: size - thickness * 2, height: size - thickness * 2, borderRadius: (size - thickness * 2) / 2 }
      ]}>
        <Text numberOfLines={2} style={styles.avatarText}>{previewStatus.content}</Text>
      </View>
    );
  } else {
    previewContent = (
      <View style={[styles.avatarTextWrapper, { borderRadius: (size - thickness * 2) / 2 }]}>
        <Text style={styles.avatarText}>No Preview</Text>
      </View>
    );
  }

  const rings = [];
  for (let i = 0; i < ringCount; i++) {
    const angle = 360 / ringCount;
    const startAngle = i * angle;
    const isViewed = media[i].viewed;
    const color = allViewed || isViewed ? 'gray' : '#028BD3';
    rings.push(
      <Circle
        key={`ring-${i}`}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={thickness}
        fill="none"
        strokeDasharray={`${(Math.PI * radius * angle / 180) - 2}, ${Math.PI * radius * angle / 180 + 2}`}
        strokeDashoffset={-startAngle * Math.PI * radius / 180}
      />
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      {previewContent}
      <Svg width={size} height={size} style={styles.avatarSvg}>
        {rings}
      </Svg>
    </View>
  );
};

const StatusScreen = ({ navigation }) => {
  const UserName = useAppSelector(state => state.auth.userSettings?.praman_patrika);
  const myPhoto = useAppSelector(state => state.auth.userSettings?.parichayapatra);
  const uniqueId = useAppSelector(state => state.auth.uniqueId);
  const [statusData, setStatusData] = useState([]);
  const [myStatusData, setMyStatusData] = useState([]);
  const [mutedExpanded, setMutedExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [myContacts, setMyContacts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInit = async () => {
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        fetchAllStatus(uniqueId);
      } else {
        fetchAllLocalStatus(uniqueId);
      }
      const uniqueids = await getAllContactsUniqueId();
      setMyContacts(uniqueids);
    };
    fetchInit();
  }, []);

  const fetchAllStatus = async (myId) => {
    try {
      const response = await axios.get(`${env.API_BASE_URL}/status/get-statuses?my_id=${myId}`
      );

      if (response.status === 200) {
        const statusData = response.data.data || [];
        if (statusData.length === 0) {
          setMyStatusData([]);
          setStatusData([]);
          setLoading(false);
          return;
        }

        await insertBulkStatus(statusData, myId);

        await fetchAllLocalStatus(myId);

        setLoading(false);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching status:', error);
      setLoading(false);
    }
  };

  const safeJSON = (value) => {
    if (!value || typeof value !== "string") return [];
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  };

  const fetchAllLocalStatus = async (myId) => {
    try {
      const newData = await getAllStatus(myId);

      if (newData && newData.length > 0) {
        const myStatus = { id: myId, name: 'My Status', media: [] };
        const otherStatusMap = {};

        for (const status of newData) {
          const isMyStatus = status.pathakah_chinha === myId;

          const mediaItem = {
            id: status.status_id,
            create_at: status.createdAt,
            type: status.sandesha_prakara,
            content: status.content,
            thumbnail: status.thumbnail,
            caption: status.ukti,
            viewed: status.is_view === 1,
            like: status.is_liked === 1,
            viewed_by: Array.isArray(status.viewed_by)
              ? status.viewed_by
              : safeJSON(status.viewed_by),
          };

          if (isMyStatus) {
            myStatus.media.push(mediaItem);
          } else {
            const userId = status.pathakah_chinha;

            if (!otherStatusMap[userId]) {
              otherStatusMap[userId] = {
                id: userId,
                name: status.contact_name || status.name || 'Unknown',
                photo: status.contact_photo || status.photo || '',
                media: [],
              };
            }

            otherStatusMap[userId].media.push(mediaItem);
          }
        }

        setMyStatusData(myStatus.media.length > 0 ? [myStatus] : []);
        setStatusData(Object.values(otherStatusMap));
      } else {
        setMyStatusData([]);
        setStatusData([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching status:', error);
      setLoading(false);
    }
  };

  const initiateAddStatus = () => {
    ImagePicker.openPicker({
      multiple: true,
      mediaType: 'any',
      maxFiles: 5,
    }).then(images => {
      const initialSelected = images.map(image => ({
        content: image.path,
        type: image.mime.startsWith('video') ? 'video' : 'image',
        caption: '',
        duration: image.duration ? image.duration / 1000 : 0,
      }));
      setSelectedMedia(initialSelected);
      setShowPreview(true);
    }).catch(e => {
      console.log(e);
    });
  };

  const fetchOtherData = async (myId) => {
    try {
      const newData = await getOthersStatus(myId);
      const otherStatusMap = {};
      for (const status of newData) {
        if (status.pathakah_chinha === myId) continue;
        const userId = status.pathakah_chinha;
        const mediaItem = {
          id: status.status_id,
          create_at: status.createdAt,
          type: status.sandesha_prakara,
          content: status.content,
          thumbnail: status.thumbnail,
          caption: status.ukti,
          viewed: Number(status.is_view) === 1,
          like: Number(status.is_liked) === 1,
          viewed_by: status.viewed_by ? JSON.parse(status.viewed_by) : [],
        };
        const name = status.contact_name || status.name || 'Unknown';
        const photo = status.contact_photo || status.photo || '';
        if (!otherStatusMap[userId]) {
          otherStatusMap[userId] = {
            id: userId,
            name,
            photo,
            media: [],
          };
        }
        otherStatusMap[userId].media.push(mediaItem);
      }
      setStatusData(Object.values(otherStatusMap));
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    // if (!SocketService.channel) return;

    const saveNewStatuses = async (payload) => {
      if (uniqueId === payload.pathakah_chinha) return;
      await insertBulkStatus(payload.data, payload.pathakah_chinha);
      fetchOtherData(uniqueId);
    };
    const updateStatuses = async (payload) => {
      if (uniqueId === payload.pathakah_chinha) return;
      setStatusData(prev =>
        prev.map(s => {
          const newMedia = s.media.map(m => {
            if (m.id === payload.id) {
              return {
                ...m,
                like: payload.like,
                viewedAt: new Date().toISOString(),
              };
            }
            return m;
          });
          return { ...s, media: newMedia };
        })
      );
      const newdata = { id: payload.id, uniqueId, like: payload.like };
      await updateStatus(newdata);
    };

    const deleteStatuses = async (payload) => {
      setStatusData(prev =>
        prev.map(s => ({
          ...s,
          media: s.media.filter(m => m.id !== payload.id),
        })).filter(s => s.media.length > 0)
      );
      await deleteStatus(payload.id);
    };

    // SocketService.channel.on('new_status', saveNewStatuses);
    // SocketService.channel.on('update_status', updateStatuses);
    // SocketService.channel.on('delete_status', deleteStatuses);

    return () => {
      // SocketService.channel?.off('new_status', saveNewStatuses);
      // SocketService.channel?.off('update_status', updateStatuses);
      // SocketService.channel?.off('delete_status', deleteStatuses);
    };
  }, [uniqueId]);

  const handleDelete = (index) => {
    if (selectedMedia.length <= 1) {
      setShowPreview(false);
      setSelectedMedia([]);
      return;
    }
    const newMedia = selectedMedia.filter((_, i) => i !== index);
    setSelectedMedia(newMedia);
  };

  const handleCaptionChange = (index, content) => {
    const newMedia = [...selectedMedia];
    newMedia[index].caption = content;
    setSelectedMedia(newMedia);
  };

  const confirmUpload = async () => {
    try {
      setLoading(true);
      const uploadedMedia = [];
      const payloadMedia = [];
      for (const asset of selectedMedia) {
        let uri = asset.content;
        let type = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
        const name = uri.split('/').pop();

        const formData = new FormData();
        formData.append('file', {
          uri,
          type,
          name,
        });

        const uploadResponse = await axios.post(
          `${env.API_BASE_URL}/chat/upload-media`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        if (uploadResponse.status === 200) {

          const content = uploadResponse.data.fileUrl;
          uploadedMedia.push({
            content: content,
            ukti: asset.caption || '',
            type: type,
            viewed_by: [],
          });
          payloadMedia.push({
            sandesha_prakara: type,
            ukti: asset.caption || '',
            content: content,
            thumbnail: "",
            viewed_by: [],
          });
        } else {
          alert('Upload failed for a file.');
        }
      }

      const newStatus = {
        pathakah_chinha: uniqueId,
        media: uploadedMedia,
        name: UserName,
        photo: myPhoto,
      };
      setMyStatusData(prev => [newStatus, ...prev]);
      const payload = {
        pathakah_chinha: uniqueId,
        content: payloadMedia,
        all_contacts: myContacts,
        name: UserName,
        photo: myPhoto,
      };

      const response = await axios.post(`${env.API_BASE_URL}/status/add-status`, payload);
      if (response.status === 200) {
        // await SocketService.connect(uniqueId);
        // SocketService.channel.push('new_status', {
        //   pathakah_chinha: uniqueId,
        //   data: response.data.inserted,
        //   all_contacts: myContacts,
        // });
      }
      setShowPreview(false);
      setSelectedMedia([]);
    } catch (error) {
      console.error('Error in confirmUpload:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStatus = (item, type) => {
    const screenName = type === "my" ? 'ViewMyStatus' : 'ViewStatus';
    navigation.navigate(screenName, {
      status: item,
      index: 0,
      myId: uniqueId,
      statusOwnerId: item.id,
      userList: myContacts,
      myPhoto,
      onViewStatus: (statusIndex) => {
        setStatusData(prev =>
          prev.map(s => {
            if (s.id === item.id) {
              const newMedia = [...s.media];
              newMedia[statusIndex].viewed = true;
              return { ...s, media: newMedia };
            }
            return s;
          }),
        );
        setMyStatusData(prev =>
          prev.map(s => {
            if (s.id === item.id) {
              const newMedia = [...s.media];
              // newMedia[statusIndex].viewed = true;
              return { ...s, media: newMedia };
            }
            return s;
          }),
        );
      },
      onLikeStatus: (statusIndex, like) => {
        setStatusData(prev =>
          prev.map(s => {
            if (s.id === item.id) {
              const newMedia = [...s.media];
              newMedia[statusIndex].like = like;
              return { ...s, media: newMedia };
            }
            return s;
          }),
        );
      },
      onDelete: (deletedId) => {
        if (type === "my") {
          setMyStatusData(prev =>
            prev.map(s => ({
              ...s,
              media: s.media.filter(m => m.id !== deletedId),
            })).filter(s => s.media.length > 0)
          );
        }
      },
    });
  };

  const toggleMute = item => {
    setStatusData(prev =>
      prev.map(status =>
        status.id === item.id ? { ...status, muted: !status.muted } : status,
      ),
    );
  };

  const recentUpdates = statusData.filter(item => item.media.some(m => !m.viewed) && !item.muted);
  const viewedUpdates = statusData.filter(item => item.media.every(m => m.viewed) && !item.muted);
  const mutedUpdates = statusData.filter(item => item.muted);
  const combinedData = [
    ...(recentUpdates.length > 0
      ? [{ type: 'header', title: 'Recent Updates' }, ...recentUpdates]
      : []),
    ...(viewedUpdates.length > 0
      ? [{ type: 'header', title: 'Viewed Updates' }, ...viewedUpdates]
      : []),
    ...(mutedUpdates.length > 0
      ? [{ type: 'header', title: 'Muted Updates', isMutedHeader: true }]
      : []),
    ...(mutedExpanded && mutedUpdates.length > 0 ? mutedUpdates : []),
  ];

  const renderItem = ({ item }) => {
    if (item.type === 'header') {
      if (item.isMutedHeader) {
        return (
          <TouchableOpacity onPress={() => setMutedExpanded(!mutedExpanded)}>
            <Text style={styles.heading}>
              {item.title} {mutedExpanded ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>
        );
      }
      return <Text style={styles.heading}>{item.title}</Text>;
    }

    const allViewed = item.media.every(m => m.viewed);
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => handleViewStatus(item, "other")}
        onLongPress={() => toggleMute(item)}
      >
        <StatusAvatar media={item.media} allViewed={allViewed} />
        <View style={[{ flex: 1 }, { marginLeft: 15 }]}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.subText}>
            {formatDatewithTime(item.media[item.media.length - 1]?.create_at) || ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMyStatus = () => {
    if (myStatusData.length === 0) {
      return (
        <TouchableOpacity
          style={styles.myStatusContainer}
          onPress={initiateAddStatus}
        >
          <View style={styles.myAvatarWrapper}>
            <Image source={myPhoto ? { uri: myPhoto } : userIcon} style={styles.myAvatar} />
            <LinearGradient
              colors={['#6462AC', '#028BD3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addIcon}
            >
              <Text style={styles.addText}>+</Text>
            </LinearGradient>
          </View>
          <View>
            <Text style={styles.subText}>Tap to add updates</Text>
          </View>
        </TouchableOpacity>
      );
    }

    const myStatus = myStatusData[0];
    const allViewed = myStatus.media.every(m => m.viewed);
    return (
      <TouchableOpacity
        style={styles.myStatusContainer}
        onPress={() => handleViewStatus(myStatus, "my", myPhoto)}
      >
        <StatusAvatar media={myStatus.media} allViewed={allViewed} />
        <View >
          <Text style={styles.name}>My Updates</Text>
          <Text style={styles.subText}>Tap to view your updates</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <View style={styles.container}>
        {loading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color="#01d5f5" />
            <Text style={styles.loaderText}>Loading...</Text>
          </View>
        )}
        <Text style={[styles.name, { marginLeft: 15, marginTop: 10 }]}>My Updates</Text>
        {renderMyStatus()}
        <FlatList
          data={combinedData}
          keyExtractor={(item, index) => item.id || `header-${index}`}
          renderItem={renderItem}
          extraData={statusData.length + myStatusData.length}
        />
        <StatusPreviewModal
          visible={showPreview}
          selectedMedia={selectedMedia}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          caption={selectedMedia[currentIndex]?.caption || ""}
          setCaption={txt => handleCaptionChange(currentIndex, txt)}
          onClose={() => setShowPreview(false)}
          onDelete={handleDelete}
          onUpload={confirmUpload}
          loading={loading}
        />
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('StatusEditor')} style={{ marginBottom: 15, alignItems: 'center' }}>
            <MaterialIcons name="mode-edit-outline" size={34} color="#131111ff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={initiateAddStatus} >
            <LinearGradient
              colors={['#6462AC', '#028BD3']}
              start={{ x: 0, y: 0 }}
              style={{ padding: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
            >
              <Image source={cameraIcon} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </View>
      <BottomNavigation navigation={navigation} activeScreen="Status" />
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  myStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  myAvatarWrapper: {
    position: 'relative',
    marginRight: 15,
  },
  myAvatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#028BD3' },
  addIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: -2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingVertical: 10,
  },
  avatarImageWrapper: {
    position: 'absolute',
    top: 4, left: 0,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImageInner: {
    position: 'relative',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverflowHidden: {
    overflow: 'hidden',
    borderRadius: 999,
  },
  avatarSvg: {
    position: 'absolute',
    top: 0, left: 0,
  },
  floatingButtonContainer: {
    position: 'absolute', bottom: 60, right: 20
  },
  avatarTextWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#dfeaf5',
    padding: 4,
  },
  avatarText: { color: '#555', fontSize: 11, textAlign: 'center' },
  name: { fontSize: 16, fontWeight: '600' },
  subText: { fontSize: 13, color: 'gray' },
  heading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'gray',
    marginLeft: 15,
    marginBottom: 5,
    marginTop: 10,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  }
});

export default StatusScreen;
