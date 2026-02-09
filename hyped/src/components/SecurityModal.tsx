import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Dimensions,
  ScrollView,
  Text,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hypedLogo } from '../assets';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ThreatData {
  threats: string[];
  riskLevel?: string;
  details?: Record<string, any>;
  timestamp?: string;
}

interface SecurityModalProps {
  visible: boolean;
  threatData: ThreatData | null;
}

const THREAT_MESSAGES: Record<
  string,
  { title: string; message: string }
> = {
  ROOT_DETECTED: {
    title: 'Rooted Device Detected',
    message:
      'Your device appears to be rooted. This may pose a security risk to your account and data.',
  },
  EMULATOR_DETECTED: {
    title: 'Emulator Detected',
    message:
      'The app is running on an emulator. For security reasons, some features may be restricted.',
  },
  DEBUGGER_DETECTED: {
    title: 'Debugger Detected',
    message: 'A debugger is attached to this app. This may indicate a security risk.',
  },
  HOOKING_DETECTED: {
    title: 'Hooking Framework Detected',
    message:
      'A hooking framework (Frida, Xposed, etc.) has been detected. This is a serious security threat.',
  },
  SCREEN_MIRRORING_DETECTED: {
    title: 'Screen Mirroring Detected',
    message:
      'Your screen is being mirrored or cast to another device. This may expose sensitive information.',
  },
  PROXY_DETECTED: {
    title: 'Proxy Detected',
    message: 'A network proxy has been detected. This may intercept your network traffic.',
  },
  VPN_DETECTED: {
    title: 'VPN Detected',
    message: 'A VPN connection is active. This may affect the security of your connection.',
  },
  MITM_DETECTED: {
    title: 'Man-in-the-Middle Attack Detected',
    message:
      'A potential man-in-the-middle attack has been detected. Your connection may be compromised.',
  },
  CERTIFICATE_PINNING_FAILURE: {
    title: 'Server Certificate Mismatch',
    message:
      "The server's certificate did not match the app's security pins. Your connection may be intercepted. Do not enter sensitive data and use a trusted network.",
  },
  ACCESSIBILITY_ABUSE: {
    title: 'Suspicious Accessibility Service',
    message:
      'A suspicious accessibility service has been detected. This may be used to monitor your activity.',
  },
  APP_REPACKAGED: {
    title: 'App Tampering Detected',
    message:
      'The app signature does not match the original. The app may have been modified or tampered with.',
  },
  DEVELOPER_OPTIONS_ENABLED: {
    title: 'Developer Options Enabled',
    message:
      'Developer options are enabled on your device. This may allow unauthorized access and pose a security risk.',
  },
  APP_SPOOFING_DETECTED: {
    title: 'App Spoofing Detected',
    message:
      'The app identity may have been compromised. Please download the app only from the official Play Store.',
  },
  TIME_MANIPULATION_DETECTED: {
    title: 'Time Manipulation Detected',
    message:
      'System time appears to have been tampered with. Please ensure your device time is set automatically.',
  },
  MOCK_LOCATION_DETECTED: {
    title: 'Mock Location Detected',
    message:
      'Your device is using fake GPS coordinates. Please disable mock location in Developer Options.',
  },
  SMS_INTERCEPTION_DETECTED: {
    title: 'SMS Interception Risk Detected',
    message:
      'SMS interception or forwarding apps have been detected. Please uninstall any SMS forwarding apps immediately.',
  },
};

export default function SecurityModal({ visible, threatData }: SecurityModalProps) {
  if (!visible || !threatData?.threats?.length) return null;

  const threatTypes = [...new Set(threatData.threats)];
  const summaryTitle = 'Security risks detected on your device';
  const summaryMessage =
    'To keep your account and chats safe, we detected one or more security issues on this device. ' +
    'Please remove these risks. Some features may be limited until your device is secure.';

  const getThreatInfo = (threatType: string) => {
    if (
      threatType === 'MITM_DETECTED' &&
      threatData?.details?.certificatePinningFailure
    ) {
      return THREAT_MESSAGES.CERTIFICATE_PINNING_FAILURE;
    }
    return (
      THREAT_MESSAGES[threatType] || {
        title: 'Security Threat Detected',
        message: 'A security threat has been detected on your device.',
      }
    );
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => { }}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Image
                source={hypedLogo}
                style={styles.logo}
                resizeMode="contain"
              />
              <View style={styles.iconContainer}>
                <Text style={styles.iconText}>⚠</Text>
              </View>
            </View>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
              bounces={false}
            >
              <Text style={styles.title}>{summaryTitle}</Text>
              <Text style={styles.message}>{summaryMessage}</Text>
              <View style={styles.detailsContainer}>
                <Text style={styles.detailsTitle}>Detected issues:</Text>
                {threatTypes.map((type) => {
                  const info = getThreatInfo(type);
                  return (
                    <View key={type} style={styles.threatItem}>
                      <Text style={styles.threatTitle}>• {info.title}</Text>
                      <Text style={styles.threatMessage}>{info.message}</Text>
                    </View>
                  );
                })}
              </View>
              {threatData.details && Object.keys(threatData.details).length > 0 && (
                <View style={styles.detailsContainer}>
                  <Text style={styles.detailsTitle}>Technical details:</Text>
                  {Object.entries(threatData.details).map(([key, value]) => (
                    <Text key={key} style={styles.detailItem}>
                      {key}: {String(value)}
                    </Text>
                  ))}
                </View>
              )}
              {threatData.timestamp && (
                <Text style={styles.timestamp}>
                  Last checked: {new Date(threatData.timestamp).toLocaleString()}
                </Text>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  scrollView: {
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 120,
    height: 48,
    marginBottom: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  detailsContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detailItem: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
  threatItem: {
    marginBottom: 8,
  },
  threatTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  threatMessage: {
    fontSize: 12,
    color: '#555',
  },
});
