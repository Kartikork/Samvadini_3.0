/**
 * Header Component Styles
 */

import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const headerStyles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
  },
  safeAreaContainer: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 10,
    shadowRadius: 6,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    height: 60,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  boxshadow: {
    // marginTop: 20,
    width: '100%',
    height: 1,
    backgroundColor: '#eeeeee',
    shadowColor: '#999',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backArrow: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  logo: {
    width: 120,
    height: 35,
    resizeMode: 'contain',
    flex: 1,
    alignItems: 'flex-start',
  },
  profilePhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    resizeMode: 'cover',
  },
  babyBossIcon: {
    // width: 100
    // position: 'relative'
    flex: 2,
    alignItems: 'center',
  },
  babyBossIconInner: {
    width: 100,
    height: 55,
  marginTop: -15,
  },
  sosButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sosText: {
    width: 100,
    height: 30,
  },
  languageIcon: {
    width: 35,
    height: 35,
    marginLeft: 10,
  },
  sosTooltip: {
    position: 'absolute',
    bottom: -35,
    right: -20,
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 1000,
  },
  tooltipArrow: {
    position: 'absolute',
    top: -6,
    right: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#333',
  },
  tooltipText: {
    color: '#FFF',
    fontSize: 11,
  },
  dotsContainer: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  modalOptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalIcon: {
    marginRight: 16,
  },
  modalOption: {
    fontSize: 16,
    color: '#212121',
  },
  logoutText: {
    color: '#FF3B30',
  },
  anuvadini: {
    width: 24,
    height: 24,
    marginRight: 16,
    resizeMode: 'contain',
  },
  sosTimerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosTimerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosTimerHeading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  sosTimerText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 20,
  },
  timerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timerText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sosModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: width * 0.85,
    alignItems: 'center',
  },
  sosModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 12,
  },
  sosModalErrorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 12,
  },
  sosModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  sosModalButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  sosModalButtonLast: {
    backgroundColor: '#E0E0E0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  sosModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
