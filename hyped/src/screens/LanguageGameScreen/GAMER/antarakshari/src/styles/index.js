// client/src/styles/index.js
import { StyleSheet, Platform } from 'react-native';
import { Colors } from './colors';

export const GlobalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.muted,
  },
  name: {
    fontSize: 18,
    color: Colors.text,
    marginBottom: 8,
  },
  // Buttons
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: Platform.OS === 'ios' ? 0.12 : 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  ghostText: {
    color: Colors.accent,
    fontWeight: '700',
  },
  // Input
  input: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    color: Colors.text,
  },
  // Card styles
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: Platform.OS === 'ios' ? 0.08 : 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  smallBadge: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});