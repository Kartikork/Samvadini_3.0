/**
 * Dashboard Screen Styles
 */

import { StyleSheet, Dimensions } from 'react-native';
import { authAPI } from '../../api';

const { width: windowWidth } = Dimensions.get('window');

const COLORS = {
  white: '#fff',
  black: '#000',
  primary: '#4052d8',
  secondary: '#4787b3',
  accent: '#657383',
  success: '#7c7c7c',
  info: '#0b8ee0',
  warning: '#DD8659',
  teal: '#8f9bbaff',
  purple: '#8659DD',
  pink: '#d33691',
  red: '#dd596e',
  blue: '#ad6b55',
  gray: { light: '#ecf2ffff', medium: '#666', dark: '#333', darker: '#212121' },
  transparent: 'transparent',
};

const wp = (p: number) => (windowWidth * p) / 100;
const hp = (p: number) => (windowWidth * 0.2 * p) / 100; // approximate
const SIZES = {
  cardWidth: wp(46),
  fullWidth: wp(96),
  cardHeight: hp(16),
  gameZoneHeight: hp(10),
  smallHeight: hp(7),
  mediumHeight: hp(5),
  padding: { xs: wp(2), sm: wp(3), md: wp(4), lg: wp(5) },
  fontSize: { xs: wp(3.5), sm: wp(3.5), md: wp(4.5), lg: wp(4.5) },
  borderRadius: { sm: 10, md: 12, lg: wp(4) },
  spacing: { xs: hp(0.1), sm: hp(1), md: hp(2), lg: hp(3) },
};

const BASE_STYLES = {
  baseCard: { borderRadius: SIZES.borderRadius.lg, alignItems: 'center' as const, justifyContent: 'center' as const, position: 'relative' as const },
  baseButton: { justifyContent: 'center' as const, alignItems: 'center' as const, minHeight: SIZES.cardHeight },
  whiteText: { color: COLORS.white, fontSize: SIZES.fontSize.sm },
  centerText: { alignSelf: 'center' as const, textAlign: 'center' as const },
  absoluteIcon: { position: 'absolute' as const, top: 10, right: 10, zIndex: 2 },
  cardShadow: { shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2.5, elevation: 4 },
};

export default StyleSheet.create({
  safeAreaView: { flex: 1, backgroundColor: '#F8F7F6' },
  flexContainer: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 10, backgroundColor: '#F8F7F6' },
  scrollView: { flex: 1 },
  welcomeText: { fontSize: SIZES.fontSize.lg, fontWeight: 'bold', color: COLORS.gray.dark, textAlign: 'left', marginTop: 15 },
  cardText: { ...BASE_STYLES.whiteText, ...BASE_STYLES.centerText, marginTop: SIZES.spacing.xs, marginLeft: 10, fontSize: 15,},
  whiteCenterText: { fontSize: 15, fontWeight: 500, marginTop:10, color: COLORS.white },
  ordersCard: { backgroundColor: '#0a88d2', width: '48%', position: 'relative', borderRadius: 8, marginVertical: 5, marginLeft: 0, padding: 12, paddingLeft: 20, marginTop: 15, overflow: 'hidden' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', },
  gameZoneContainer: { ...BASE_STYLES.baseCard, ...BASE_STYLES.cardShadow, borderRadius: SIZES.borderRadius.md, marginVertical: 5, marginLeft: 0, backgroundColor: '#5D5FEF', padding: 5, },
  reminderContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  gameZoneButton: { ...BASE_STYLES.baseButton, paddingVertical: 15, minHeight: SIZES.gameZoneHeight, overflow: 'hidden' },
  dailyPlannerButton: { width: '48%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#6564a8', paddingVertical: 12, paddingLeft: 15, borderRadius: 8, position: 'relative', overflow: 'hidden', marginRight: 7 },
  eventButton: { width: '48%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#6564a8', marginLeft: 7, paddingVertical: 12, paddingLeft: 15, borderRadius: 8, position: 'relative', overflow: 'hidden' },
  jobsButton: { width: '100%', backgroundColor: '#7A76B5', borderRadius: 8, position: 'relative', padding: 12, flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10, alignItems: 'center', paddingRight: 20, },
  admissions: { width: '100%', backgroundColor: '#0B88D2', borderRadius: 8, position: 'relative', padding: 12, flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10, alignItems: 'center' },
  startupsButton: { width: '100%', padding: 12, backgroundColor: '#EE898B', borderRadius: 8, flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10, alignItems: 'center' },
  govtSchemesButton: { width: '100%', backgroundColor: '#AF7373', padding: 12, borderRadius: 8, marginBottom: 10, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' },
  womenButton: { width: '100%', backgroundColor: '#FE4AD7', borderRadius: 8, position: 'relative', padding: 12, flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10, alignItems: 'center', paddingRight: 30 },
  farmersButton: { width: '100%', padding: 12, borderRadius: 8, position: 'relative', backgroundColor: '#AD6B55', flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10, alignItems: 'center' },
  aboutButton: { width: '100%', padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#223EC730' },
  absoluteIcon: { ...BASE_STYLES.absoluteIcon },
  addContactIcon: { position: 'absolute', right: 10, top: 1, zIndex: 2 },
  addPlanIcon: { position: 'absolute', right: 1, top: 5, zIndex: 2 },
  absoluteRightNeg5: { position: 'absolute', right: -5, top: 10, zIndex: 2 },
  gameZoneIcon: { position: 'absolute', top: 5, right: 8, zIndex: 2 },
  iconCenter: { alignSelf: 'center' },
  callsButton: { borderRightColor: COLORS.white, paddingRight: 20, flexDirection: 'row', justifyContent: 'flex-start', position: 'relative' },
  banking: { flexDirection: 'column', justifyContent: 'flex-start', width: '100%', borderRadius: SIZES.borderRadius.sm },
  bankingbg: {},
  welcomeRow: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'column', width: '30%', height: 81, backgroundColor: '#ffff', padding: 13, borderRadius: 8, paddingLeft: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  addContactRow: { paddingVertical: 13, flexDirection: 'column', minWidth: '28%', height: 81, justifyContent: 'center', borderRadius: 8, paddingHorizontal: 10, marginVertical: 15, backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  addGroupRow: { flexDirection: 'column', minWidth: '30%', height: 81, padding: 13, paddingHorizontal: 10, borderRadius: 8, marginVertical: 15, backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  temporaryRow: { flexDirection: 'column', width: '30%', height: 81, borderRadius: 8, marginVertical: 15, backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  addPlanRow: { flexDirection: 'column', width: '30%', height: 81, backgroundColor: '#ffff', padding: 13, borderRadius: 8, paddingHorizontal: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  addReminderRow: { flexDirection: 'column', width: '30%', height: 81, backgroundColor: '#ffff', borderRadius: 8, paddingHorizontal: 5, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  addText: { color: '#000', marginLeft: 3, fontSize: 12, marginTop: 5 },
  addGroupText: { textAlign: 'left', color: '#000', marginLeft: 3, fontSize: 12, marginTop: 5 },
  temporaryIdText: { alignSelf: 'flex-start', textAlign: 'left', color: '#000', marginLeft: 3, fontSize: 12, marginTop: 5 },
  addPlanText: { color: '#000', fontSize: 12, marginTop: 5 },
  addReminderText: { textAlign: 'left', color: '#000', fontSize: 12, marginTop: 5 },
  emergencyText: { color: '#000', textAlign: 'left', fontSize: 12, marginTop: 5 },
  govtText: { ...BASE_STYLES.whiteText, ...BASE_STYLES.centerText, marginLeft: 10 },
  womenText: { color: COLORS.white, fontSize: SIZES.fontSize.sm, marginLeft: 10 },
  aboutText: { fontSize: SIZES.fontSize.sm, fontWeight: '600', marginTop: SIZES.spacing.xs, alignSelf: 'center', textAlign: 'center', color: COLORS.gray.darker },
  shopBtnImage: { width: 30, height: 30, resizeMode: 'contain' as const, alignSelf: 'center', marginBottom: 0 },
  games: { width: 50, height: 50, resizeMode: 'contain' as const, alignSelf: 'center', marginBottom: 0 },
  anuvadiniLogoContainer: { width: wp(40) },
  anuvadiniLogo: { width: 140, height: 40 },
  loadingView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: COLORS.gray.medium },
  bottomContainer: { marginTop: 20 },
  shapes: { position: 'absolute', width: 50, height: 50, right: -15, top: -12, resizeMode: 'contain' as const },
  shapesbottom: { position: 'absolute', width: 30, height: 30, left: -20, bottom: -15, resizeMode: 'contain' as const, zIndex: 0 },
  shapesevents: { position: 'absolute', width: 50, height: 50, right: -6, top: 2, resizeMode: 'contain' as const },
  shapesplanevents: { position: 'absolute', width: 50, height: 50, left: -10, bottom: -19, resizeMode: 'contain' as const },
  shapesbottompl: { position: 'absolute', left: 0, top: 0, right: 0, resizeMode: 'contain' as const, width: '100%', height: 90 },
  shapeslng: { position: 'absolute', left: 0, top: 0, right:0, bottom: 0, margin: 'auto', resizeMode: 'contain' as const, height: 90 },
  
  
  quickParent: {
    borderWidth: 1,
    width: 22,
    height: 22,
    padding: 15,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#E6E6E6',
  },
  qucikText: {
    fontSize: 12,
    color: '#000000',
    marginTop: 5,
  },
  quickAction: {
    borderWidth: 1,
    width:32,
    height: 32,
    borderRadius: 50,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconParent: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  alignItems: 'center',
  },
  iconSize: {
    width: '100%',
  height: '100%',
  resizeMode: 'contain',
  },
  fontStyle: {
    fontSize: 15,
    color: '#ffffff',
    marginLeft: 10,
  },
});

export { COLORS, SIZES };
