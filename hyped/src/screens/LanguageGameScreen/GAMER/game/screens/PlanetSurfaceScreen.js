import { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert, ScrollView, Image, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import AstronautPhotoScreen from './AstronautPhotoScreen';

const MAX_PHOTOS = 5;
const POINTS_PER_PHOTO = 100;
const FLASH_DURATION = 100;
const MISSION_END_DELAY = 500;
const PHOTO_UNIQUENESS_THRESHOLD = 15; // Degrees of difference needed for a new photo

const PlanetSurfaceScreen = ({ selectedPlanet, navigation, route, onComplete }) => {
  const params = route?.params || {};
  const completeCallback = params.onComplete || onComplete;

  const [showFlash, setShowFlash] = useState(false);
  const [points, setPoints] = useState(0);
  const [photosTaken, setPhotosTaken] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState([]); // State for captured photos
  const [missionEnded, setMissionEnded] = useState(false);
  const [takenLocations, setTakenLocations] = useState([]);
  const [isWebViewReady, setIsWebViewReady] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showAstronautPhoto, setShowAstronautPhoto] = useState(false);

  const webviewRef = useRef(null);

  const handleTakePhoto = useCallback(() => {
    if (!isWebViewReady || photosTaken >= MAX_PHOTOS) return;

    console.log('[RN] Requesting coordinates from WebView...');
    if (webviewRef.current) {
      // Only request coordinates first to check for uniqueness
      webviewRef.current.postMessage('get_coordinates');
    }
  }, [isWebViewReady, photosTaken]);

  const onWebViewMessage = (event) => {
    const messageData = event.nativeEvent.data;
    console.log(`[RN] Received message from WebView: "${messageData.substring(0, 100)}..."`);

    if (messageData === 'webview_ready') {
      setIsWebViewReady(true);
      return;
    }

    try {
      const data = JSON.parse(messageData);

      // Handle coordinate data for uniqueness check
      if (data.type === 'coordinates') {
        const { yaw, pitch } = data;
        const isUnique = takenLocations.every(loc => {
          const yawDifference = Math.abs(loc.yaw - yaw);
          const pitchDifference = Math.abs(loc.pitch - pitch);
          return yawDifference > PHOTO_UNIQUENESS_THRESHOLD || pitchDifference > PHOTO_UNIQUENESS_THRESHOLD;
        });

        if (isUnique) {
          // Location is unique, now request the photo
          if (webviewRef.current) {
            webviewRef.current.postMessage('get_photo');
          }

          const newPhotosTaken = photosTaken + 1;
          setPoints((prev) => prev + POINTS_PER_PHOTO);
          setPhotosTaken(newPhotosTaken);
          setTakenLocations(prev => [...prev, { yaw, pitch }]);

          setShowFlash(true);
          setTimeout(() => setShowFlash(false), FLASH_DURATION);

          if (newPhotosTaken === MAX_PHOTOS) {
            setTimeout(() => setMissionEnded(true), MISSION_END_DELAY);
          }
        } else {
          Alert.alert("Duplicate Photo", "You've already captured this view! Explore a different angle.");
        }
      // Handle the captured photo data (only runs if 'get_photo' was requested)
      } else if (data.type === 'photo') {
          setCapturedPhotos(prevPhotos => [...prevPhotos, data.uri]);
      }
    } catch (error) {
      // It's possible to receive console logs from the WebView here, so we don't want to crash
      // Only log an error if parsing fails on something that is supposed to be JSON
      if (messageData.startsWith('{')) {
        console.error("[RN] Error parsing JSON message from WebView:", error);
      }
    }
  };

  const handleReturnToShip = useCallback(() => {
    try {
      if (completeCallback && typeof completeCallback === 'function') {
        completeCallback();
        return;
      }
      if (navigation?.navigate) {
        navigation.navigate('PlanetSelectionScreen');
      } else if (navigation?.goBack) {
        navigation.goBack();
      } else {
        console.warn('No navigation method available');
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [navigation, completeCallback]);

  const openImageModal = (uri) => {
    setSelectedImage(uri);
    setModalVisible(true);
  };

  const closeImageModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  const panoramaHtml = useMemo(() => {
    const imageName = selectedPlanet?.surfaceImage || 'saturn.png';
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
          <title>Planet Surface</title>
          <link rel="stylesheet" href="pannellum.css"/>
          <style>
              html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
              #panorama { width: 100%; height: 100%; }
          </style>
      </head>
      <body>
          <div id="panorama"></div>
          <script type="text/javascript" src="pannellum.js"></script>
          <script>
            try {
              const viewer = pannellum.viewer('panorama', {
                  "type": "equirectangular",
                  "panorama": "${imageName}",
                  "autoLoad": true,
                  "checkCrossOrigin": false,
                  "showControls": false,
                  "mouseZoom": false,
                  "autoRotate": -2
              });

              viewer.on('load', function() {
                  window.ReactNativeWebView.postMessage('webview_ready');
              });

              document.addEventListener('message', function(event) {
                  if (event.data === 'get_coordinates') {
                      const yaw = viewer.getYaw();
                      const pitch = viewer.getPitch();
                      const message = JSON.stringify({ type: 'coordinates', yaw, pitch });
                      window.ReactNativeWebView.postMessage(message);
                  }

                  if (event.data === 'get_photo') {
                    // Use Pannellum's API to get the current view as a base64 URI
                    const imageURI = viewer.getRenderer().render(
                        viewer.getPitch() * Math.PI / 180,
                        viewer.getYaw() * Math.PI / 180,
                        viewer.getHfov() * Math.PI / 180,
                        { 'returnImage': true }
                    );
                    const message = JSON.stringify({ type: 'photo', uri: imageURI });
                    window.ReactNativeWebView.postMessage(message);
                  }
              });
            } catch (e) {
              window.ReactNativeWebView.postMessage('Error in WebView: ' + e.message);
            }
          </script>
      </body>
      </html>
    `;
  }, [selectedPlanet?.surfaceImage]);

  const progressPercentage = `${(photosTaken / MAX_PHOTOS) * 100}%`;

  // If user wants to create astronaut photo, show that screen
  if (showAstronautPhoto) {
    return (
      <AstronautPhotoScreen
        route={{ params: { capturedPhotos } }}
        navigation={{
          ...navigation,
          goBack: () => setShowAstronautPhoto(false)
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <WebView
        ref={webviewRef}
        style={styles.panorama}
        source={{
          html: panoramaHtml,
          baseUrl: 'file:///android_asset/panorama/',
        }}
        onMessage={onWebViewMessage}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        allowsInlineMediaPlayback={true}
      />
      {showFlash && <View style={styles.flash} />}
      {missionEnded ? (
        <View style={styles.resultsContainer}>
          <View style={styles.resultsCard}>
            <Text style={styles.congratsText}>🎉 Mission Complete!</Text>
            <Text style={styles.winnerText}>Excellent Work, Explorer!</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Photos Captured</Text>
                <Text style={styles.statValue}>{photosTaken}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Final Score</Text>
                <Text style={styles.statValue}>{points}</Text>
              </View>
            </View>

            {/* Final Photo Gallery */}
            <View style={styles.finalGalleryContainer}>
              <Text style={styles.finalGalleryTitle}>Your Discoveries</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {capturedPhotos.map((uri, index) => (
                  <TouchableOpacity key={index} onPress={() => openImageModal(uri)}>
                    <Image source={{ uri }} style={styles.finalPhoto} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={styles.astronautPhotoButton}
              onPress={() => setShowAstronautPhoto(true)}
            >
              <Text style={styles.astronautPhotoButtonText}>🧑‍🚀 Create Astronaut Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.returnButton} onPress={handleReturnToShip}>
              <Text style={styles.returnButtonText}>🚀 New Mission</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.uiContainer}>
          <View style={styles.missionHeader}>
            <Text style={styles.missionTitle}>📸 Photo Mission</Text>
            <Text style={styles.planetName}>{selectedPlanet?.name || 'Unknown Planet'}</Text>
          </View>

          {/* Captured Photos Gallery */}
          {capturedPhotos.length > 0 && (
            <View style={styles.galleryContainer}>
              <Text style={styles.galleryTitle}>Captured Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {capturedPhotos.map((uri, index) => (
                  <TouchableOpacity key={index} onPress={() => openImageModal(uri)}>
                    <Image source={{ uri }} style={styles.thumbnail} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: progressPercentage }]} />
            </View>
            <Text style={styles.progressText}>
              {photosTaken} / {MAX_PHOTOS} Unique Photos
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.photoButton, (photosTaken >= MAX_PHOTOS || !isWebViewReady) && styles.photoButtonDisabled]}
            onPress={handleTakePhoto}
            disabled={photosTaken >= MAX_PHOTOS || !isWebViewReady}
            activeOpacity={0.7}
          >
            <Text style={styles.photoButtonText}>
              {!isWebViewReady
                ? '🌎 Loading Surface...'
                : photosTaken >= MAX_PHOTOS
                ? '✓ Mission Complete'
                : '📷 Take Photo'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeImageModal}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={closeImageModal}>
            <Text style={styles.modalCloseButtonText}>X</Text>
          </TouchableOpacity>
          <Image source={{ uri: selectedImage }} style={styles.modalImage} resizeMode="contain" />
        </View>
      </Modal>
    </View>
  );
};

// --- Your existing styles remain unchanged ---
const styles = StyleSheet.create({
  // ... (previous styles are unchanged)
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  panorama: {
    flex: 1,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'white',
    zIndex: 100,
  },
  uiContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingVertical: 20,
    paddingHorizontal: 20,
    zIndex: 200,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  missionHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  missionTitle: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  planetName: {
    fontSize: 16,
    color: '#AAA',
    fontStyle: 'italic',
  },
  galleryContainer: {
    marginBottom: 15,
  },
  galleryTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  thumbnail: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: '#444',
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 100,
  },
  statBadgeLabel: {
    fontSize: 12,
    color: '#AAA',
    marginBottom: 4,
  },
  statBadgeValue: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: 'bold',
  },
  photoButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  photoButtonDisabled: {
    backgroundColor: '#555',
    shadowOpacity: 0,
  },
  photoButtonText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: 'bold',
  },
  resultsContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 300,
    padding: 20,
  },
  resultsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  congratsText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  winnerText: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 20, // Adjusted margin
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 20, // Adjusted margin
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 15,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 15,
  },
  statLabel: {
    fontSize: 12,
    color: '#AAA',
    marginBottom: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 28,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  // New styles for the final gallery
  finalGalleryContainer: {
    width: '100%',
    marginBottom: 25,
    alignItems: 'center',
  },
  finalGalleryTitle: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 12,
  },
  finalPhoto: {
    width: 100,
    height: 75,
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFD700', // Gold border for final photos
  },
  astronautPhotoButton: {
    backgroundColor: '#9C27B0',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  astronautPhotoButtonText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: 'bold',
  },
  returnButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  returnButtonText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalImage: {
    width: '90%',
    height: '80%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 20,
    zIndex: 1,
  },
  modalCloseButtonText: {
    color: 'black',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PlanetSurfaceScreen;