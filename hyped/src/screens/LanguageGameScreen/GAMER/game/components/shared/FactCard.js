/**
 * FactCard Component
 * Displays educational facts in an attractive card format
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { GAME_CONFIG } from '../../constants/gameConfig';

const FactCard = ({
  fact,
  onDismiss,
  duration = GAME_CONFIG.GENERAL.FACT_DISPLAY_DURATION,
  autoDismiss = false
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();

    // Auto dismiss timer
    if (autoDismiss && duration > 0) {
      const timer = setTimeout(() => {
        dismissCard();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, []);

  const dismissCard = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 250,
        useNativeDriver: true
      })
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  if (!fact) return null;

  const { category, fact: factText, difficulty } = fact;

  const difficultyColors = {
    easy: '#4CAF50',
    medium: '#FFC107',
    hard: '#F44336'
  };

  const difficultyColor = difficultyColors[difficulty] || '#4A90E2';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onDismiss ? dismissCard : null}
        activeOpacity={onDismiss ? 0.8 : 1}
      >
        <View style={styles.header}>
          <Text style={styles.category}>{category}</Text>
          <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor }]}>
            <Text style={styles.difficultyText}>{difficulty.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.factText}>{factText}</Text>

        {onDismiss && (
          <Text style={styles.tapHint}>Tap to continue</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: 'center'
  },
  card: {
    backgroundColor: GAME_CONFIG.UI.COLORS.FACT_CARD_BG,
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: GAME_CONFIG.UI.COLORS.PRIMARY
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  category: {
    fontSize: 16,
    fontWeight: 'bold',
    color: GAME_CONFIG.UI.COLORS.PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF'
  },
  factText: {
    fontSize: 15,
    lineHeight: 22,
    color: GAME_CONFIG.UI.COLORS.TEXT_PRIMARY,
    marginBottom: 10
  },
  tapHint: {
    fontSize: 12,
    color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8
  }
});

export default FactCard;
