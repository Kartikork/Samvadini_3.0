import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, BackHandler, FlatList, Dimensions, Modal, Text, Alert, PermissionsAndroid, Platform, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video';
import RNFS from 'react-native-fs';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';
import ImageZoom from 'react-native-image-pan-zoom';
import Share from 'react-native-share';

const { width, height } = Dimensions.get('window');
export const MediaViewer = ({ visible, onClose, mediaItems, initialIndex }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const [downloading, setDownloading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const flatListRef = useRef(null);
  const navigation = useNavigation();
  const showSuccessToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (visible) {
          try {
            onClose && onClose();
          } catch (e) {
            console.error('Error closing modal on back press (focus handler):', e);
          }
          return true;
        }

        const currentRoute = navigation.getState().routes[navigation.getState().index].name;
        if (currentRoute === 'Dashboard') {
          Alert.alert(
            'Exit App',
            'Are you sure you want to exit?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'YES', onPress: () => BackHandler.exitApp() },
            ]
          );
          return true;
        }
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
          })
        );
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [navigation, visible, onClose])
  );

  const hideToast = () => {
    setShowToast(false);
    setToastMessage('');
  };

  const Toast = ({ visible, message, onHide }) => {
    const fadeAnimRef = useRef(new Animated.Value(0));
    const fadeAnim = fadeAnimRef.current;

    useEffect(() => {
      if (visible) {
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(2000),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onHide();
        });
      }
    }, [visible, fadeAnim, onHide]);

    if (!visible) return null;

    return (
      <Animated.View style={[styles.toast, { opacity: fadeAnim }]}>
        <Icon name="check-circle" size={20} color="#4CAF50" />
        <Text style={styles.toastText}>{message}</Text>
      </Animated.View>
    );
  };

  const renderMainContent = () => (
    <FlatList
      ref={flatListRef}
      data={mediaItems}
      horizontal
      pagingEnabled
      initialScrollIndex={initialIndex ?? 0}
      getItemLayout={(data, index) => ({
        length: width,
        offset: width * index,
        index,
      })}
      showsHorizontalScrollIndicator={false}
      onScroll={(e) => {
        const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
        if (newIndex !== currentIndex) {
          setCurrentIndex(newIndex);
        }
      }}
      scrollEventThrottle={16}
      renderItem={({ item }) => (
        <View style={styles.mediaContainer}>
          {item.type === 'video' ? (
            <Video
              source={{ uri: item.uri || item.url }}
              style={styles.mainImage}
              resizeMode="cover"
              controls
              onError={(error) => {
                console.error('❌ [MediaViewer] Video load error:', {
                  uri: item.uri || item.url,
                  error: error
                });
              }}
              onLoad={() => {
                console.log('✅ [MediaViewer] Video loaded successfully:', {
                  uri: item.uri || item.url
                });
              }}
              onLoadStart={() => {
                console.log('🔄 [MediaViewer] Video loading started:', {
                  uri: item.uri || item.url
                });
              }}
              onLoadEnd={() => {
                console.log('🏁 [MediaViewer] Video loading ended:', {
                  uri: item.uri || item.url
                });
              }}
            />
          ) : item.type === 'audio' ? (
            <View style={styles.audioContainer}>
              <View style={styles.audioIcon}>
                <Icon size={150} name="headset" style={styles.audioIconInner} color="#fe651d" />
              </View>
              <Video
                source={{ uri: item.uri || item.url }}
                audioOnly={true}
                style={styles.mainImage}
                controls
                onError={(error) => {
                  console.error('❌ [MediaViewer] Audio load error:', {
                    uri: item.uri || item.url,
                    error: error
                  });
                }}
                onLoad={() => {
                  console.log('✅ [MediaViewer] Audio loaded successfully:', {
                    uri: item.uri || item.url
                  });
                }}
                onLoadStart={() => {
                  console.log('🔄 [MediaViewer] Audio loading started:', {
                    uri: item.uri || item.url
                  });
                }}
                onLoadEnd={() => {
                  console.log('🏁 [MediaViewer] Audio loading ended:', {
                    uri: item.uri || item.url
                  });
                }}
              />
            </View>
          ) : (
            <ImageZoom
              cropWidth={width}
              cropHeight={height}
              imageWidth={width}
              imageHeight={height - 190}
              enableDoubleClickZoom={true}
              enableScale={false}
              enableCenterFocus={true}
              maxScale={3}
              minScale={1}
              onDoubleClick={(scale) => {
                const nextScale = scale === 1 ? 2 : scale === 2 ? 3 : 1;
                setZoomLevel(nextScale);
                setIsZoomed(nextScale > 1);
              }}
              onMove={({ scale }) => {
                setZoomLevel(Number(scale.toFixed(1)));
                setIsZoomed(scale > 1);
              }}
              onRelease={() => {
                if (zoomLevel <= 1) {
                  setZoomLevel(1);
                  setIsZoomed(false);
                }
              }}>
              <Image
                source={{ uri: item.uri || item.url }}
                style={styles.mainImage}
                resizeMode="contain"
                onError={(error) => {
                  console.error('❌ [MediaViewer] Image load error:', {
                    uri: item.uri || item.url,
                    error: error
                  });
                }}
                onLoad={() => {
                  console.log('✅ [MediaViewer] Image loaded successfully:', {
                    uri: item.uri || item.url
                  });
                }}
                onLoadStart={() => {
                  console.log('🔄 [MediaViewer] Image loading started:', {
                    uri: item.uri || item.url
                  });
                }}
                onLoadEnd={() => {
                  console.log('🏁 [MediaViewer] Image loading ended:', {
                    uri: item.uri || item.url
                  });
                }}
              />
            </ImageZoom>
          )}
        </View>
      )}
      keyExtractor={(item, index) => (item?.id ? String(item.id) : `media-${index}`)}
    />
  );

  const renderThumbnails = () => (
    <View style={styles.thumbnailContainer}>
      <FlatList
        data={mediaItems}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => {
              setCurrentIndex(index);
              try {
                flatListRef.current?.scrollToIndex({
                  index,
                  animated: true,
                  viewPosition: 0.5
                });
              } catch (e) {
                flatListRef.current?.scrollToOffset({ offset: index * width, animated: true });
              }
            }}
            style={[
              styles.thumbnailWrapper,
              currentIndex === index && styles.activeThumbnail,
            ]}
          >
            {item.type === 'audio' ? (
              <View style={styles.thumbnailAudio}>
                <Icon name="music-note" size={30} color="#fff" />
              </View>
            ) : (

              <Image
                source={{ uri: item.uri || item.url }}
                style={styles.thumbnail}
                resizeMode="cover"
                onError={(error) => {
                  console.error('❌ [MediaViewer] Thumbnail load error:', {
                    uri: item.uri || item.url,
                    error: error
                  });
                }}
                onLoad={() => {
                  console.log('✅ [MediaViewer] Thumbnail loaded successfully:', {
                    uri: item.uri || item.url
                  });
                }}
                onLoadStart={() => {
                  console.log('🔄 [MediaViewer] Thumbnail loading started:', {
                    uri: item.uri || item.url
                  });
                }}
                onLoadEnd={() => {
                  console.log('🏁 [MediaViewer] Thumbnail loading ended:', {
                    uri: item.uri || item.url
                  });
                }}
              />
            )}
          </TouchableOpacity>
        )}
        keyExtractor={(item, index) => `thumbnail-${index}`}
      />
    </View>
  );

  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const androidVersion = Platform.Version;

      if (androidVersion >= 33) {
        const permissions = [];
        const currentItem = mediaItems[currentIndex];

        if (currentItem.type === 'image') {
          permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
        } else if (currentItem.type === 'video') {
          permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO);
        } else if (currentItem.type === 'audio') {
          permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO);
        }

        const results = await PermissionsAndroid.requestMultiple(permissions);
        return Object.values(results).every(result => result === PermissionsAndroid.RESULTS.GRANTED);
      }
      else if (androidVersion >= 29) {
        return true;
      }
      else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs access to storage to save media files',
            buttonPositive: 'Allow',
            buttonNegative: 'Cancel',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  };

  const handleDownloadToGallery = async () => {
    try {
      setDownloading(true);
      const currentItem = mediaItems[currentIndex];
      const uri = currentItem.uri || currentItem.url;

      if (uri.toLowerCase().startsWith('ftp://')) {
        Alert.alert(
          'FTP Download Not Supported',
          'FTP downloads are not supported. Please try another method.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (!uri.toLowerCase().startsWith('http://') && !uri.toLowerCase().startsWith('https://')) {
        if (uri.startsWith('file://') || uri.startsWith('/')) {
          await handleLocalFileCopy();
          return;
        } else {
          Alert.alert('Invalid URL', 'Only HTTP, HTTPS, and local file URLs are supported for download.');
          return;
        }
      }

      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Storage permission is required to save media files');
        return;
      }

      let ext = 'jpg';
      let folderPath = '';

      if (currentItem.type === 'video') {
        ext = 'mp4';
        folderPath = Platform.OS === 'android' ? 'Movies' : 'Documents';
      } else if (currentItem.type === 'audio') {
        ext = 'mp3';
        folderPath = Platform.OS === 'android' ? 'Music' : 'Documents';
      } else {
        ext = 'jpg';
        folderPath = Platform.OS === 'android' ? 'Pictures' : 'Documents';
      }

      const fileName = `samvadini_${Date.now()}.${ext}`;
      let localPath = '';

      if (Platform.OS === 'android') {
        const baseDir = RNFS.ExternalStorageDirectoryPath;
        const mediaDir = `${baseDir}/${folderPath}/Samvadini`;

        const dirExists = await RNFS.exists(mediaDir);
        if (!dirExists) {
          await RNFS.mkdir(mediaDir);
        }

        localPath = `${mediaDir}/${fileName}`;
      } else {
        localPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      }

      const downloadResult = await RNFS.downloadFile({
        fromUrl: uri,
        toFile: localPath,
        background: true,
        discretionary: true,
        cacheable: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SamvadiniApp/2.0)',
          'Accept': '*/*',
        },
        connectionTimeout: 15000,
        readTimeout: 30000,
      }).promise;

      if (downloadResult.statusCode === 200) {
        if (Platform.OS === 'android') {
          try {
            await Share.open({
              url: `file://${localPath}`,
              type: currentItem.type === 'image' ? 'image/jpeg' :
                currentItem.type === 'video' ? 'video/mp4' : 'audio/mp3',
              saveToFiles: true,
              showAppsToView: false,
            });
          } catch (shareError) {
            console.log('Share failed but file saved:', shareError);
          }
        }

        showSuccessToast(`Media saved to ${folderPath} folder!`);
      } else {
        throw new Error(`Download failed with status code: ${downloadResult.statusCode}`);
      }
    } catch (error) {
      console.error('Download error:', error);

      if (error.message.includes('FtpURLConnection')) {
        Alert.alert(
          'FTP Not Supported',
          'This file uses FTP protocol which is not supported for direct download.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Download Failed', `Error: ${error.message || 'Unknown error occurred'}`);
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleLocalFileCopy = async () => {
    try {
      const currentItem = mediaItems[currentIndex];
      const uri = currentItem.uri || currentItem.url;

      const sourcePath = uri.replace('file://', '');

      let ext = 'jpg';
      if (currentItem.type === 'video') {
        ext = 'mp4';
      } else if (currentItem.type === 'audio') {
        ext = 'mp3';
      }

      const fileName = `samvadini_${Date.now()}.${ext}`;
      const destinationPath = Platform.OS === 'android'
        ? `${RNFS.ExternalStorageDirectoryPath}/Download/${fileName}`
        : `${RNFS.DocumentDirectoryPath}/${fileName}`;

      await RNFS.copyFile(sourcePath, destinationPath);

      showSuccessToast('Media file copied successfully!');

    } catch (error) {
      console.error('File copy error:', error);
      Alert.alert('Copy Failed', `Error: ${error.message}`);
    }
  };

  const handleDownloadWithFileSystem = async () => {
    try {
      setDownloading(true);
      const currentItem = mediaItems[currentIndex];
      const uri = currentItem.uri || currentItem.url;

      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Storage permission is required to download files');
        return;
      }

      let ext = 'jpg';
      if (currentItem.type === 'video') {
        ext = 'mp4';
      } else if (currentItem.type === 'audio') {
        ext = 'mp3';
      }

      const fileName = `samvadini_${Date.now()}.${ext}`;
      let localPath = '';

      if (Platform.OS === 'android') {
        const possiblePaths = [
          `${RNFS.DownloadDirectoryPath}/${fileName}`,
          `${RNFS.ExternalStorageDirectoryPath}/Download/${fileName}`,
          `${RNFS.ExternalDirectoryPath}/${fileName}`,
        ];

        for (const path of possiblePaths) {
          try {
            const dir = path.substring(0, path.lastIndexOf('/'));
            const dirExists = await RNFS.exists(dir);
            if (!dirExists) {
              await RNFS.mkdir(dir);
            }
            localPath = path;
            break;
          } catch (e) {
            console.log(`Path ${path} not available:`, e);
            continue;
          }
        }

        if (!localPath) {
          throw new Error('No suitable storage path found');
        }
      } else {
        localPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      }

      const downloadResult = await RNFS.downloadFile({
        fromUrl: uri,
        toFile: localPath,
        background: true,
        discretionary: true,
        cacheable: false,
        progressDivider: 1,
        begin: (res) => {
          console.log('Download started:', res);
        },
        progress: (res) => {
          console.log('Download progress:', (res.bytesWritten / res.contentLength * 100).toFixed(2) + '%');
        }
      }).promise;


      if (downloadResult.statusCode === 200) {
        const fileExists = await RNFS.exists(localPath);

        if (fileExists) {
          showSuccessToast('Media saved successfully!');
        } else {
          throw new Error('File download completed but file not found');
        }
      } else {
        throw new Error(`Download failed with status code: ${downloadResult.statusCode}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', `Error: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const currentItem = mediaItems[currentIndex];
      const uri = currentItem?.uri || currentItem?.url;

      if (!uri) {
        Alert.alert('Download Failed', 'No media URL available');
        return;
      }

      if (uri.toLowerCase().startsWith('ftp://')) {
        Alert.alert('FTP Download Not Supported', 'FTP downloads are not supported.');
        return;
      }

      if (uri.startsWith('file://') || uri.startsWith('/')) {
        await handleLocalFileCopy();
        return;
      }

      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        await handleDownloadToGallery();
        return;
      }

      Alert.alert('Unsupported URL', 'Only local files and HTTP/HTTPS URLs are supported');
    } catch (e) {
      console.log('Download error:', e);
      Alert.alert('Error', e?.message || 'Failed to download media');
    }
  };

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={handleDownload}
              disabled={downloading}
            >
              <Icon name={downloading ? "hourglass-empty" : "file-download"} size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {renderMainContent()}

        {renderThumbnails()}

        <Toast
          visible={showToast}
          message={toastMessage}
          onHide={hideToast}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  closeButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  downloadButton: {
    padding: 8,
  },
  mediaContainer: {
    width,
    height: height * 1,
    justifyContent: 'center',
  },
  mainImage: {
    width: '100%',
    height: '87%',

  },
  audioContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 5
  },
  audioText: {
    color: '#fff',
    fontSize: 18,
    marginVertical: 50,
  },
  audioPlayer: {
    width: '100%',
    height: 50,
  },
  thumbnailContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 0,
    height: 70,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 10,
  },
  thumbnailWrapper: {
    marginHorizontal: 5,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeThumbnail: {
    borderColor: '#fff',
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  thumbnailAudio: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toast: {
    position: 'absolute',
    top: 650,
    left: 20,
    right: 20,
    backgroundColor: '#2E7D32',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  toastText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
  },
});