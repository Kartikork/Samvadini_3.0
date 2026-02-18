import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
  Dimensions,
  TouchableWithoutFeedback
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

// --- MINI THUMBNAIL COMPONENT ---
const CharacterThumbnail = ({ char, isPreviewing, isCurrentActive, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isPreviewing ? 1.15 : 1, // Slightly larger if currently previewing
      useNativeDriver: true,
      friction: 5
    }).start();
  }, [isPreviewing]);

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <Animated.View style={[styles.thumbContainer, { transform: [{ scale: scaleAnim }] }]}>
        {/* Glow Border */}
        <LinearGradient
          colors={isPreviewing ? ['#FFD700', '#FFA500'] : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
          style={styles.thumbGradient}
        >
          <View style={[styles.thumbInner, isPreviewing && { backgroundColor: '#fff' }]}>
            <Icon 
              name={char.icon} 
              size={28} 
              color={isPreviewing ? '#333' : 'rgba(255,255,255,0.8)'} 
            />
          </View>
        </LinearGradient>
        
        {/* 1. THE TICK MARK (Shows on the one you are currently looking at) */}
        {isPreviewing && (
          <View style={styles.checkBadge}>
            <Icon name="check" size={12} color="#fff" />
          </View>
        )}

        {/* Optional: A small dot to show which one is currently active in the Game (if different from preview) */}
        {!isPreviewing && isCurrentActive && (
          <View style={styles.currentActiveDot} />
        )}

      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const CharacterSelectionScreen = ({ onBack, onSelect, currentCharacterId, characters }) => {
  // 2. LOCAL STATE: Tracks what we are looking at BEFORE we confirm
  const [previewId, setPreviewId] = useState(currentCharacterId);

  // Find the full object based on the local preview ID
  const previewChar = characters.find(c => c.id === previewId) || characters[0];
  
  // Animation refs
  const mainCharScale = useRef(new Animated.Value(1)).current;
  const mainCharOpacity = useRef(new Animated.Value(1)).current;

  // Handle clicking a thumbnail (Just updates preview, doesn't finalize yet)
  const handlePreviewChange = (char) => {
    if (char.id === previewId) return;

    // Pop out animation
    Animated.parallel([
      Animated.timing(mainCharScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(mainCharOpacity, { toValue: 0, duration: 100, useNativeDriver: true })
    ]).start(() => {
      
      // Update Local State
      setPreviewId(char.id);

      // Pop in animation
      Animated.parallel([
        Animated.spring(mainCharScale, { toValue: 1, friction: 6, useNativeDriver: true }),
        Animated.timing(mainCharOpacity, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
    });
  };

  // 3. FINALIZE SELECTION: Actually update the App
  const confirmSelection = () => {
    onSelect(previewChar); // Calls the function in App.js
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2c3e50', '#000000']} style={styles.backgroundGradient}>
        
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="close" size={32} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Character</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* --- MIDDLE: LARGE PREVIEW --- */}
        <View style={styles.previewArea}>
          
          <View style={styles.nameTag}>
            <Text style={styles.charName}>{previewChar.name}</Text>
          </View>

          <Animated.View style={[
              styles.mainCharContainer, 
              { transform: [{ scale: mainCharScale }], opacity: mainCharOpacity }
            ]}>
             <View style={[styles.bgGlow, { backgroundColor: previewChar.gradient[0] }]} />
             <Image 
                source={previewChar.image} 
                style={styles.largeImage} 
                resizeMode="contain" 
             />
          </Animated.View>

          <View style={styles.floorShadow} />
        </View>

        {/* --- BOTTOM SECTION --- */}
        <View style={styles.bottomSelectorContainer}>
          
          {/* 4. CONFIRM BUTTON: Only visible here */}
          <View style={styles.confirmButtonContainer}>
             <TouchableOpacity onPress={confirmSelection}>
                <LinearGradient 
                  colors={previewChar.gradient} 
                  style={styles.confirmButton}
                  start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                >
                  <Text style={styles.confirmText}>SELECT {previewChar.name.toUpperCase()}</Text>
                  <Icon name="check-circle" size={20} color="#fff" />
                </LinearGradient>
             </TouchableOpacity>
          </View>

          <View style={styles.selectorLabelContainer}>
             <Text style={styles.selectorLabel}>Scroll to preview</Text>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {characters.map((char) => (
              <View key={char.id} style={styles.scrollItem}>
                <CharacterThumbnail 
                  char={char}
                  // Is this the one currently showing in the big picture?
                  isPreviewing={char.id === previewId}
                  // Is this the one actually active in the game?
                  isCurrentActive={char.id === currentCharacterId} 
                  onPress={() => handlePreviewChange(char)}
                />
              </View>
            ))}
          </ScrollView>
        </View>

      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundGradient: { flex: 1 },
  
  header: { 
    paddingTop: 50, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    zIndex: 10
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  backButton: { padding: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },

  previewArea: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 160 // More space for the button + scroll
  },
  nameTag: {
    marginBottom: 20,
    paddingHorizontal: 25,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  charName: { fontSize: 28, fontWeight: 'bold', color: '#fff', letterSpacing: 1 },
  mainCharContainer: {
    width: width * 0.75,
    height: width * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5
  },
  bgGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.4,
    // Note: 'filter' property is web-only usually. 
    // On React Native, opacity serves as the glow effect or use an Image with blur.
  },
  largeImage: {
    width: '100%',
    height: '100%',
  },
  floorShadow: {
    marginTop: -10,
    width: 140,
    height: 15,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.6)',
    transform: [{ scaleX: 2 }]
  },

  // Bottom Area
  bottomSelectorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180, // Taller to fit button
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 20
  },
  
  // NEW CONFIRM BUTTON STYLES
  confirmButtonContainer: {
    position: 'absolute',
    top: -25, // Floating halfway out
    alignSelf: 'center',
    zIndex: 20,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
    gap: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  confirmText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5
  },

  selectorLabelContainer: { alignItems: 'center', marginTop: 45 },
  selectorLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase' },
  
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 15,
    paddingTop: 10
  },
  scrollItem: {
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5
  },

  thumbContainer: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  thumbInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  checkBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#2ecc71',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 2
  },
  currentActiveDot: {
    position: 'absolute',
    bottom: -5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff'
  }
});

export default CharacterSelectionScreen;