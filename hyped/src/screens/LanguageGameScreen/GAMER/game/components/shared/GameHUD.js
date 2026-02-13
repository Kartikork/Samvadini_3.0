/**
 * GameHUD Component
 * Heads-up display for game stats (lives, score, etc.)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GAME_CONFIG } from '../../constants/gameConfig';

const GameHUD = ({
  lives = 3,
  maxLives = 3,
  score = 0,
  showMuteButton = false,
  isMuted = false,
  onMuteToggle = null,
  extraInfo = null,
  style = {}
}) => {
  const renderHearts = () => {
    const hearts = [];
    for (let i = 0; i < maxLives; i++) {
      hearts.push(
        <Text
          key={i}
          style={[
            styles.heart,
            { opacity: i < lives ? 1 : 0.3 }
          ]}
        >
          {i < lives ? '❤️' : '🖤'}
        </Text>
      );
    }
    return hearts;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftSection}>
        <View style={styles.livesContainer}>
          <Text style={styles.label}>Lives: </Text>
          <View style={styles.hearts}>
            {renderHearts()}
          </View>
        </View>
      </View>

      <View style={styles.centerSection}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {extraInfo && (
          <View style={styles.extraInfo}>
            {extraInfo}
          </View>
        )}

        {showMuteButton && (
          <TouchableOpacity
            style={styles.muteButton}
            onPress={onMuteToggle}
          >
            <Text style={styles.muteIcon}>
              {isMuted ? '🔇' : '🔊'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderBottomWidth: 2,
    borderBottomColor: GAME_CONFIG.UI.COLORS.PRIMARY
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start'
  },
  centerSection: {
    flex: 1,
    alignItems: 'center'
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  livesContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  label: {
    color: GAME_CONFIG.UI.COLORS.TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: 'bold'
  },
  hearts: {
    flexDirection: 'row'
  },
  heart: {
    fontSize: 20,
    marginLeft: 4
  },
  scoreContainer: {
    alignItems: 'center'
  },
  scoreLabel: {
    color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1
  },
  scoreValue: {
    color: GAME_CONFIG.UI.COLORS.PRIMARY,
    fontSize: 28,
    fontWeight: 'bold'
  },
  extraInfo: {
    marginRight: 10
  },
  muteButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  muteIcon: {
    fontSize: 20
  }
});

export default GameHUD;
