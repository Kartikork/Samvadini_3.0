/**
 * GlobalDashboard - Placeholder for non-India dashboard
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Footer } from '../Footer';

export default function GlobalDashboard({ navigation }: { navigation: any }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Global Dashboard</Text>
      <Text style={styles.subtitle}>Content for non-India users</Text>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666' },
});
