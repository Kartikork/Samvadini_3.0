import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const PlanetInfoDialog = ({ planet, onDismiss, showContinue = true }) => {
  if (!planet) return null;

  return (
    <View style={styles.overlay}>
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.title}>Planet {planet.name}</Text>
        
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Distance from Earth:</Text>
            <Text style={styles.value}>{planet.distanceFromEarth}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Diameter:</Text>
            <Text style={styles.value}>{planet.diameter}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Day Length:</Text>
            <Text style={styles.value}>{planet.dayLength}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Year Length:</Text>
            <Text style={styles.value}>{planet.yearLength}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Surface Temp:</Text>
            <Text style={styles.value}>{planet.surfaceTemp}</Text>
          </View>
          
          <View style={styles.funFactContainer}>
            <Text style={styles.funFactLabel}>Did you know?</Text>
            <Text style={styles.funFactText}>{planet.funFact}</Text>
          </View>
          
          <Text style={styles.description}>{planet.description}</Text>
        </View>
        
        {showContinue && (
          <TouchableOpacity style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>Continue to Mission</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  container: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  infoContainer: {
    width: '100%',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 8,
  },
  label: {
    color: '#aaa',
    fontSize: 14,
    flex: 1,
  },
  value: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  funFactContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginTop: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  funFactLabel: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 5,
    fontSize: 14,
  },
  funFactText: {
    color: '#fff',
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 18,
  },
  description: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 10,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default PlanetInfoDialog;
