import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Dimensions,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import ViewShot from 'react-native-view-shot';
import Share from 'react-native-share';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AstronautPhotoScreen = ({ route, navigation }) => {
  const { capturedPhotos } = route?.params || { capturedPhotos: [] };

  const [selectedPlanetPhoto, setSelectedPlanetPhoto] = useState(null);
  const [selfiePhoto, setSelfiePhoto] = useState(null);
  const [step, setStep] = useState(1);
  const [isCapturing, setIsCapturing] = useState(false);

  const viewShotRef = useRef(null);
  const cameraRef = useRef(null);

  // Vision Camera hooks
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleSelectPlanetPhoto = (photoUri) => {
    setSelectedPlanetPhoto(photoUri);
    setStep(2);
  };

  const handleTakeSelfie = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera is not ready yet.');
      return;
    }

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'quality',
      });
      setSelfiePhoto(`file://${photo.path}`);
      setStep(3); // Go to preview step
    } catch (error) {
      console.error('Failed to take photo', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetakeSelfie = () => {
    setSelfiePhoto(null);
    setStep(2);
  };

  const handleConfirmSelfie = () => {
    setStep(4); // Go to final composite
  };

  const handleReturnToPlanetSurface = () => {
    navigation.goBack();
  };

  const handleSharePhoto = async () => {
    if (viewShotRef.current) {
      try {
        const uri = await viewShotRef.current.capture();

        const shareOptions = {
          title: 'My Astronaut Photo!',
          message: 'Check out this cool astronaut photo I made using HYPED messenger! 🚀',
          url: uri,
          failOnCancel: false,
        };

        await Share.open(shareOptions);

      } catch (error) {
        Alert.alert('Error', 'Could not share the photo at this time.');
        console.error('Share Error:', error);
      }
    }
  };

  const renderPlanetSelection = () => (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌍 Choose Your Background</Text>
      </View>
      <ScrollView contentContainerStyle={styles.photoGrid}>
        {capturedPhotos.length > 0 ? (
          capturedPhotos.map((photoUri, index) => (
            <TouchableOpacity key={index} style={styles.photoCard} onPress={() => handleSelectPlanetPhoto(photoUri)}>
              <Image source={{ uri: photoUri }} style={styles.planetPhoto} />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No photos available.</Text>
        )}
      </ScrollView>
    </View>
  );

  const renderLiveCameraWithOverlay = () => {
    // Check permissions
    if (!hasPermission) {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>📷 Camera permission is required</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Check device
    if (!device) {
      return (
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.permissionText}>Loading camera...</Text>
        </View>
      );
    }

    return (
      <View style={styles.cameraScreenContainer}>
        <StatusBar barStyle="light-content" />

        <View style={styles.cameraHeader}>
          <Text style={styles.cameraTitle}>🚀 Astronaut Selfie</Text>
          <Text style={styles.cameraSubtitle}>Position your face in the helmet</Text>
        </View>

        <View style={styles.cameraWrapper}>
          {/* The circular camera view */}
          <View style={styles.circularCameraContainer}>
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={step === 2}
              photo={true}
            />
          </View>

          {/* Golden helmet frame overlay */}
          <View style={styles.helmetOverlay} pointerEvents="none">
            <View style={styles.helmetRing} />
            <View style={styles.helmetInnerRing} />
            {/* Corner decorations */}
            <View style={[styles.helmetDecor, styles.decorTopLeft]} />
            <View style={[styles.helmetDecor, styles.decorTopRight]} />
            <View style={[styles.helmetDecor, styles.decorBottomLeft]} />
            <View style={[styles.helmetDecor, styles.decorBottomRight]} />
          </View>

          {/* Center guide */}
          <View style={styles.centerGuide} pointerEvents="none">
            <View style={styles.crosshairH} />
            <View style={styles.crosshairV} />
          </View>
        </View>

        <View style={styles.cameraInstructions}>
          <Text style={styles.instructionText}>✨ Center your face in the golden circle</Text>
          <Text style={styles.instructionSubtext}>This is how you'll appear in the helmet!</Text>
        </View>

        <View style={styles.cameraFooter}>
          <TouchableOpacity
            style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
            onPress={handleTakeSelfie}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSelfiePreview = () => {
    return (
      <View style={styles.previewContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>🎯 Preview Your Selfie</Text>
          <Text style={styles.previewSubtitle}>This is how you'll look in the helmet!</Text>
        </View>

        <View style={styles.circularPreviewContainer}>
          <View style={styles.helmetOuter}>
            <View style={styles.helmetVisor}>
              {selfiePhoto && (
                <Image
                  source={{ uri: selfiePhoto }}
                  style={styles.selfiePreviewImage}
                  resizeMode="cover"
                />
              )}
            </View>
          </View>
          <Text style={styles.helmetLabel}>Astronaut Helmet View</Text>
        </View>

        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetakeSelfie}>
            <Text style={styles.retakeButtonText}>🔄 Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmSelfie}>
            <Text style={styles.confirmButtonText}>✅ Use This</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderComposite = () => (
    <View style={styles.compositeScreenContainer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.compositeHeader}>
        <Text style={styles.compositeTitle}>🚀 Your Astronaut Photo</Text>
      </View>

      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }} style={styles.compositeImageContainer}>

        {selectedPlanetPhoto && <Image source={{ uri: selectedPlanetPhoto }} style={styles.backgroundImage} resizeMode="cover" />}

        <View style={styles.astronautFigure}>
          {selfiePhoto && (
            <>
              <Image
                source={require('../astronaut-suit.png')}
                style={styles.astronautSuitOverlay}
                resizeMode="contain"
              />
              <Image
                source={{ uri: selfiePhoto }}
                style={styles.selfieOverlay}
                resizeMode="cover"
              />
            </>
          )}
        </View>

      </ViewShot>

      <View style={styles.compositeFooter}>
        <TouchableOpacity style={styles.shareButton} onPress={handleSharePhoto}>
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneButton} onPress={handleReturnToPlanetSurface}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      {step === 1 && renderPlanetSelection()}
      {step === 2 && renderLiveCameraWithOverlay()}
      {step === 3 && renderSelfiePreview()}
      {step === 4 && renderComposite()}
    </>
  );
};

const CAMERA_SIZE = 300;

const styles = StyleSheet.create({
  stepContainer: { flex: 1, backgroundColor: '#000' },
  header: { paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFD700', textAlign: 'center' },

  photoGrid: { padding: 15, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' },
  photoCard: { width: (SCREEN_WIDTH - 45) / 2, height: 150, marginBottom: 15, borderRadius: 12, overflow: 'hidden' },
  planetPhoto: { width: '100%', height: '100%' },
  emptyText: { color: '#AAA', fontSize: 16, marginTop: 50, textAlign: 'center' },

  // Permission Screen
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionText: {
    fontSize: 18,
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Live Camera Screen
  cameraScreenContainer: {
    flex: 1,
    backgroundColor: '#0a0e27',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
  },
  cameraHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cameraTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  cameraSubtitle: {
    fontSize: 14,
    color: '#a0b0d0',
    marginTop: 5,
  },

  cameraWrapper: {
    width: CAMERA_SIZE,
    height: CAMERA_SIZE,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularCameraContainer: {
    width: CAMERA_SIZE,
    height: CAMERA_SIZE,
    borderRadius: CAMERA_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#000',
  },

  // Helmet overlay
  helmetOverlay: {
    position: 'absolute',
    width: CAMERA_SIZE,
    height: CAMERA_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helmetRing: {
    position: 'absolute',
    width: CAMERA_SIZE,
    height: CAMERA_SIZE,
    borderRadius: CAMERA_SIZE / 2,
    borderWidth: 8,
    borderColor: '#FFD700',
  },
  helmetInnerRing: {
    position: 'absolute',
    width: CAMERA_SIZE - 30,
    height: CAMERA_SIZE - 30,
    borderRadius: (CAMERA_SIZE - 30) / 2,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  helmetDecor: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#FFD700',
    borderWidth: 3,
  },
  decorTopLeft: {
    top: 20,
    left: 20,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  decorTopRight: {
    top: 20,
    right: 20,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  decorBottomLeft: {
    bottom: 20,
    left: 20,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  decorBottomRight: {
    bottom: 20,
    right: 20,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },

  // Crosshair guide
  centerGuide: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairH: {
    position: 'absolute',
    width: 20,
    height: 2,
    backgroundColor: 'rgba(255, 215, 0, 0.5)',
  },
  crosshairV: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.5)',
  },

  cameraInstructions: {
    alignItems: 'center',
    marginTop: 25,
    paddingHorizontal: 20,
  },
  instructionText: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: '600',
    textAlign: 'center',
  },
  instructionSubtext: {
    fontSize: 13,
    color: '#a0b0d0',
    marginTop: 5,
    textAlign: 'center',
  },

  cameraFooter: {
    marginTop: 'auto',
    paddingBottom: 40,
    alignItems: 'center',
  },
  captureButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF6B35',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Preview Screen Styles
  previewContainer: {
    flex: 1,
    backgroundColor: '#0a0e27',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60,
    paddingHorizontal: 20,
  },
  previewHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  previewTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  previewSubtitle: {
    fontSize: 14,
    color: '#a0b0d0',
    marginTop: 8,
  },
  circularPreviewContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  helmetOuter: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#1a1a3a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  helmetVisor: {
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: 'hidden',
    backgroundColor: '#0a0e27',
    borderWidth: 3,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  selfiePreviewImage: {
    width: '100%',
    height: '100%',
  },
  helmetLabel: {
    color: '#a0b0d0',
    fontSize: 14,
    marginTop: 15,
    fontStyle: 'italic',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 'auto',
    paddingBottom: 40,
    gap: 20,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Composite Screen Styles
  compositeScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  compositeHeader: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  compositeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
  },
  compositeImageContainer: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  astronautFigure: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    width: '80%',
    aspectRatio: 0.7,
  },
  astronautSuitOverlay: {
    width: '100%',
    height: '100%',
  },
  selfieOverlay: {
    position: 'absolute',
    width: '18%',
    aspectRatio: 1,
    top: '23%',
    left: '39%',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  compositeFooter: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 15,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  doneButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AstronautPhotoScreen;