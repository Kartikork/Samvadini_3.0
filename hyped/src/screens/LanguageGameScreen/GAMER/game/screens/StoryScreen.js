import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ImageBackground, 
  TouchableOpacity, 
  Dimensions,
  SafeAreaView,
  StatusBar
} from 'react-native';
import TypewriterText from '../components/TypewriterText';
import { PLANET_DATA as planetData } from '../data/planetData';

const { width, height } = Dimensions.get('window');

const StoryScreen = ({ route, navigation }) => {
  // Get the selected planet from route params with a fallback
  const { selectedPlanet } = route.params || {};
  const [currentPage, setCurrentPage] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const typewriterRef = useRef(null);

  // Get planet info with fallback to Earth if not found
  const planetKey = selectedPlanet?.name?.toLowerCase();
  const planetInfo = planetKey && planetData[planetKey] 
    ? planetData[planetKey] 
    : planetData.earth;

  // Memoize story parts to prevent recreation on every render
  const storyParts = React.useMemo(() => {
    const basicFacts = planetInfo.basicFacts || {};
    return [
      `As you approach ${planetInfo.name}, your sensors detect its ${basicFacts.diameter || 'unknown'} diameter.`,
      `The distance from Earth: ${basicFacts.distanceFromEarth || 'unknown'}. It takes light ${Math.floor(Math.random() * 15) + 5} minutes to reach here from Earth.`,
      `A day on ${planetInfo.name} lasts ${basicFacts.rotationPeriod || 'unknown'}, while a year takes ${basicFacts.orbitalPeriod || 'unknown'}.`,
      `Surface temperatures range from ${basicFacts.temperature || 'unknown'}. ${planetInfo.funFact || ''}`,
      `Mission Objective: Take ${planetInfo.surfaceImage ? 'photos of the surface' : 'surface samples'} and return to your ship.`
    ];
  }, [planetInfo, selectedPlanet]);

  const handleTypingComplete = useCallback(() => {
    setIsTypingComplete(true);
  }, []);

  const handleScreenPress = useCallback(() => {
    if (!isTypingComplete) {
      if (typewriterRef.current?.skipToEnd) {
        typewriterRef.current.skipToEnd();
      }
      return;
    }

    if (currentPage >= storyParts.length - 1) {
      if (route.params?.onStoryComplete) {
        route.params.onStoryComplete();
      } else {
        navigation.replace('PlanetSurfaceScreen', { selectedPlanet });
      }
    } else {
      setCurrentPage(prev => prev + 1);
      setIsTypingComplete(false);
    }
  }, [currentPage, isTypingComplete, navigation, route.params, selectedPlanet, storyParts.length]);

  useEffect(() => {
    const backHandler = navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      if (!isTypingComplete && typewriterRef.current?.skipToEnd) {
        typewriterRef.current.skipToEnd();
        return;
      }
      
      if (currentPage === 0) {
        navigation.dispatch(e.data.action);
        return;
      }
      
      setCurrentPage(prev => Math.max(0, prev - 1));
      setIsTypingComplete(false);
    });

    return () => backHandler();
  }, [currentPage, isTypingComplete, navigation]);

  useEffect(() => {
    setIsTypingComplete(false);
    if (typewriterRef.current && typeof typewriterRef.current.reset === 'function') {
      typewriterRef.current.reset();
    } else if (typewriterRef.current && typewriterRef.current.skipToEnd) {
      typewriterRef.current.skipToEnd();
    }
  }, [currentPage]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar hidden />
      <TouchableOpacity 
        style={styles.container} 
        activeOpacity={1}
        onPress={handleScreenPress}
      >
        <ImageBackground
          source={require('../../Assets/space_background.png')}
          style={styles.background}
          resizeMode="cover"
        >
          <View style={styles.overlay}>
            <View style={styles.storyContainer}>
              <Text style={styles.planetName}>{planetInfo.name}</Text>
              <View style={styles.storyTextContainer}>
                <TypewriterText
                  ref={typewriterRef}
                  key={`story-${currentPage}`}
                  text={storyParts[currentPage] || ''}
                  speed={30}
                  onComplete={handleTypingComplete}
                  style={styles.storyText}
                />
              </View>
              <View style={styles.progressDots}>
                {storyParts.map((_, index) => (
                  <View 
                    key={`dot-${index}`}
                    style={[
                      styles.dot, 
                      index === currentPage && styles.activeDot,
                      index < currentPage && styles.completedDot
                    ]} 
                  />
                ))}
              </View>
              <Text style={styles.hintText}>
                {isTypingComplete ? 
                  (currentPage < storyParts.length - 1 ? 'Tap to continue' : 'Tap to begin mission') : 
                  'Tap to skip'}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'black',
  },
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  storyContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  planetName: {
    fontSize: 32,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(76, 175, 80, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  storyTextContainer: {
    minHeight: 150,
    marginBottom: 20,
  },
  storyText: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#4CAF50',
    transform: [{ scale: 1.2 }],
  },
  completedDot: {
    backgroundColor: 'rgba(76, 175, 80, 0.5)',
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 10,
    fontStyle: 'italic',
  },
});

export default StoryScreen;
