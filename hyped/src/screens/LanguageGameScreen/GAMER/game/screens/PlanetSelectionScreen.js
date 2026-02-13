/**
 * Planet Selection Screen
 * Enhanced with educational facts and improved UI
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ImageBackground,
  StatusBar,
  Modal,
  ScrollView
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { PLANET_DATA, getPlanetOverview } from '../data/planetData';
import { BACKGROUNDS } from '../constants/assets';
import { GAME_CONFIG } from '../constants/gameConfig';
import ErrorBoundary from '../components/shared/ErrorBoundary';

const PLANETS_ARRAY = [
  { id: 'sun', data: PLANET_DATA.sun },
  { id: 'mercury', data: PLANET_DATA.mercury },
  { id: 'venus', data: PLANET_DATA.venus },
  { id: 'earth', data: PLANET_DATA.earth },
  { id: 'mars', data: PLANET_DATA.mars },
  { id: 'jupiter', data: PLANET_DATA.jupiter },
  { id: 'saturn', data: PLANET_DATA.saturn },
  { id: 'uranus', data: PLANET_DATA.uranus },
  { id: 'neptune', data: PLANET_DATA.neptune },
  { id: 'moon', data: PLANET_DATA.moon },
  { id: 'random', data: null }
];

const PlanetInfoModal = ({ visible, planet, onClose, onProceed }) => {
  if (!planet || planet.id === 'random') return null;

  const { name, type, basicFacts, funFact, moons, rings } = planet.data;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>{name}</Text>
            <Text style={styles.modalSubtitle}>{type}</Text>

            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Moons</Text>
                <Text style={styles.statValue}>{moons}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Rings</Text>
                <Text style={styles.statValue}>{rings ? 'Yes' : 'No'}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Diameter</Text>
                <Text style={styles.statValue}>{basicFacts.diameter}</Text>
              </View>
            </View>

            <Text style={styles.overviewText}>{getPlanetOverview(planet.id)}</Text>

            <View style={styles.funFactContainer}>
              <Text style={styles.funFactLabel}>Did you know?</Text>
              <Text style={styles.funFactText}>{funFact}</Text>
            </View>

            <Text style={styles.missionText}>
              Complete mini-games to learn more about {name}!
            </Text>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.proceedButton]}
              onPress={onProceed}
            >
              <LinearGradient
                colors={GAME_CONFIG.UI.GRADIENTS.PLANET}
                style={styles.gradientButton}
              >
                <Text style={styles.buttonText}>Start Mission →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PlanetCard = ({ planet, onPress }) => {
  const isRandom = planet.id === 'random';

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={() => onPress(planet)}
      activeOpacity={0.7}
    >
      <View style={[styles.card, isRandom && styles.randomCard]}>
        {isRandom ? (
          <View style={styles.randomContent}>
            <Text style={styles.randomIcon}>🎲</Text>
            <Text style={styles.randomText}>Random</Text>
          </View>
        ) : (
          <>
            <Image
              source={planet.data.image}
              style={styles.planetImage}
              resizeMode="contain"
            />
            <Text style={styles.planetName}>{planet.data.name}</Text>
            <Text style={styles.planetType}>{planet.data.type}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const PlanetSelectionScreen = ({ navigation }) => {
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handlePlanetPress = (planet) => {
    if (planet.id === 'random') {
      const actualPlanets = PLANETS_ARRAY.filter(p => p.id !== 'random');
      const randomIndex = Math.floor(Math.random() * actualPlanets.length);
      const randomPlanet = actualPlanets[randomIndex];
      navigateToPlanet(randomPlanet);
    } else {
      setSelectedPlanet(planet);
      setShowModal(true);
    }
  };

  const navigateToPlanet = (planet) => {
    const planetData = {
      id: planet.id,
      name: planet.data.name,
      image: planet.data.image,
      surfaceImage: planet.data.surfaceImage
    };

    navigation.navigate('MiniGamesHubScreen', { selectedPlanet: planetData });
  };

  const handleProceed = () => {
    setShowModal(false);
    navigateToPlanet(selectedPlanet);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPlanet(null);
  };

  return (
    <ErrorBoundary
      fallbackMessage="Unable to load planet selection. Please restart the app."
      showBackButton={false}
    >
      <ImageBackground
        source={BACKGROUNDS.space}
        style={styles.container}
        resizeMode="cover"
      >
        <StatusBar hidden={true} />

        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Destination</Text>
          <Text style={styles.subtitle}>Explore the Solar System</Text>
        </View>

        <FlatList
          data={PLANETS_ARRAY}
          renderItem={({ item }) => (
            <PlanetCard planet={item} onPress={handlePlanetPress} />
          )}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        />

        <PlanetInfoModal
          visible={showModal}
          planet={selectedPlanet}
          onClose={handleCloseModal}
          onProceed={handleProceed}
        />
      </ImageBackground>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10
  },
  subtitle: {
    fontSize: 16,
    color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
    textAlign: 'center'
  },
  grid: {
    alignItems: 'center',
    paddingBottom: 30
  },
  cardContainer: {
    margin: 8
  },
  card: {
    width: 110,
    height: 160,
    backgroundColor: 'rgba(30, 30, 70, 0.8)',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6
  },
  randomCard: {
    backgroundColor: 'rgba(100, 50, 150, 0.8)',
    borderColor: GAME_CONFIG.UI.COLORS.SECONDARY
  },
  planetImage: {
    width: 70,
    height: 70,
    marginBottom: 8
  },
  planetName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center'
  },
  planetType: {
    fontSize: 10,
    color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 2
  },
  randomContent: {
    alignItems: 'center'
  },
  randomIcon: {
    fontSize: 50,
    marginBottom: 8
  },
  randomText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: GAME_CONFIG.UI.COLORS.FACT_CARD_BG,
    borderRadius: 20,
    padding: 25,
    maxWidth: 500,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: GAME_CONFIG.UI.COLORS.PRIMARY
  },
  modalTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 5
  },
  modalSubtitle: {
    fontSize: 16,
    color: GAME_CONFIG.UI.COLORS.PRIMARY,
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
    marginBottom: 4
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: GAME_CONFIG.UI.COLORS.PRIMARY
  },
  overviewText: {
    fontSize: 15,
    lineHeight: 22,
    color: GAME_CONFIG.UI.COLORS.TEXT_PRIMARY,
    marginBottom: 20,
    textAlign: 'center'
  },
  funFactContainer: {
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: GAME_CONFIG.UI.COLORS.PRIMARY,
    marginBottom: 20
  },
  funFactLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: GAME_CONFIG.UI.COLORS.PRIMARY,
    marginBottom: 8
  },
  funFactText: {
    fontSize: 14,
    lineHeight: 20,
    color: GAME_CONFIG.UI.COLORS.TEXT_PRIMARY,
    fontStyle: 'italic'
  },
  missionText: {
    fontSize: 14,
    color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 20
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden'
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  proceedButton: {
    flex: 1
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default PlanetSelectionScreen;
