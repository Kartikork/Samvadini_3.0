/**
 * MessageStatusIcon - Status indicator for outgoing messages
 * 
 * Compatible with existing avastha values:
 * - 'sent': Gray single tick
 * - 'delivered': Gray double tick
 * - 'read': Blue double tick
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

interface MessageStatusIconProps {
  status: 'sent' | 'delivered' | 'read' | string;
}

const MessageStatusIcon: React.FC<MessageStatusIconProps> = ({ status }) => {
  const normalizedStatus = status?.toLowerCase() || 'sent';

  if (normalizedStatus === 'sent') {
    // Single gray tick
    return (
      <View style={styles.container}>
        <Tick color="#CCCCCC" />
      </View>
    );
  }

  if (normalizedStatus === 'delivered') {
    // Double gray tick
    return (
      <View style={styles.container}>
        <View style={styles.doubleTick}>
          <Tick color="#CCCCCC" />
          <Tick color="#CCCCCC" style={styles.tickOffset} />
        </View>
      </View>
    );
  }

  if (normalizedStatus === 'read') {
    // Double blue tick
    return (
      <View style={styles.container}>
        <View style={styles.doubleTick}>
          <Tick color="#4FC3F7" />
          <Tick color="#4FC3F7" style={styles.tickOffset} />
        </View>
      </View>
    );
  }

  // Default: single gray tick
  return (
    <View style={styles.container}>
      <Tick color="#CCCCCC" />
    </View>
  );
};

/**
 * Tick SVG component
 */
const Tick: React.FC<{ color: string; style?: any }> = ({ color, style }) => {
  return (
    <View style={[styles.tick, style]}>
      {/* Simple checkmark using View components */}
      <View
        style={[
          styles.tickLine1,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.tickLine2,
          { backgroundColor: color },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 16,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doubleTick: {
    flexDirection: 'row',
    width: 16,
    height: 12,
  },
  tick: {
    width: 8,
    height: 12,
    position: 'relative',
  },
  tickOffset: {
    marginLeft: -4,
  },
  tickLine1: {
    position: 'absolute',
    width: 2,
    height: 6,
    bottom: 2,
    left: 1,
    transform: [{ rotate: '-45deg' }],
  },
  tickLine2: {
    position: 'absolute',
    width: 2,
    height: 10,
    bottom: 0,
    left: 4,
    transform: [{ rotate: '45deg' }],
  },
});

export default React.memo(MessageStatusIcon);

