/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in child component tree
 * Provides graceful error handling and recovery
 */

import React, { Component } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GAME_CONFIG } from '../../constants/gameConfig';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Optional: Log error to crash reporting service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
              {this.props.fallbackMessage || 'An unexpected error occurred in the game.'}
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Error Details (Dev Mode):</Text>
                <Text style={styles.debugText}>{this.state.error.toString()}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={this.handleReset}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>

            {this.props.showBackButton && (
              <TouchableOpacity
                style={[styles.button, styles.backButton]}
                onPress={this.props.onBack}
              >
                <Text style={styles.buttonText}>Go Back</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GAME_CONFIG.UI.COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorCard: {
    backgroundColor: GAME_CONFIG.UI.COLORS.FACT_CARD_BG,
    borderRadius: 15,
    padding: 30,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: GAME_CONFIG.UI.COLORS.DANGER
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 20
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: GAME_CONFIG.UI.COLORS.TEXT_PRIMARY,
    marginBottom: 15,
    textAlign: 'center'
  },
  message: {
    fontSize: 16,
    color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 24
  },
  debugInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%'
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: GAME_CONFIG.UI.COLORS.WARNING,
    marginBottom: 8
  },
  debugText: {
    fontSize: 11,
    color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
    fontFamily: 'monospace'
  },
  button: {
    backgroundColor: GAME_CONFIG.UI.COLORS.PRIMARY,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
    minWidth: 150
  },
  backButton: {
    backgroundColor: GAME_CONFIG.UI.COLORS.SECONDARY
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center'
  }
});

export default ErrorBoundary;
