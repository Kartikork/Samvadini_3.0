import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Geolocation from 'react-native-geolocation-service';
import Toast from 'react-native-toast-message';
import { useAppSelector } from '../../../state/hooks';
import { getAppTranslations } from '../../../translations';
import { showPermissionDeniedWithSettings } from '../../../utils/permissions';
import { useMediaPermission } from '../../../hooks/useMediaPermission';
import { OutgoingMessageManager } from '../../../services/OutgoingMessageManager';
import { GroupChatManager } from '../../../services/GroupChatManager';

type LocationShareRouteParams = {
  chatId: string;
  isGroup?: boolean;
};

const LocationShareScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { chatId, isGroup } = (route.params || {}) as LocationShareRouteParams;

  const lang = useAppSelector(state => state.language.lang);
  const t = getAppTranslations(lang);
  const { ensureLocationAccess } = useMediaPermission();

  const [region, setRegion] = useState<Region | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  const loadCurrentLocation = useCallback(async () => {
    setIsLoading(true);

    // Helper: try to get location with configurable accuracy/timeout
    const tryGetLocation = (highAccuracy: boolean, timeoutMs: number) => {
      return new Promise<any>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          position => resolve(position),
          error => reject(error),
          {
            enableHighAccuracy: highAccuracy,
            timeout: timeoutMs,
            // Allow cached locations on the fast / low‑accuracy path
            maximumAge: highAccuracy ? 0 : 60_000,
          },
        );
      });
    };

    try {
      const granted = await ensureLocationAccess();
      if (!granted) {
        setIsLoading(false);
        showPermissionDeniedWithSettings(
          t.PermissionDenied,
          t.LocationPermissionRequired,
          t.Settings,
        );
        navigation.goBack();
        return;
      }

      let position: any | null = null;

      // 1) Fast attempt: low‑accuracy, short timeout, can use cached fix
      try {
        position = await tryGetLocation(false, 3000);
      } catch (fastError) {
        console.warn(
          '[LocationShareScreen] Fast location attempt failed, trying high accuracy:',
          fastError,
        );
      }

      // 2) Fallback: high‑accuracy with longer timeout if needed
      if (!position) {
        try {
          position = await tryGetLocation(true, 10000);
        } catch (accurateError) {
          console.warn(
            '[LocationShareScreen] High‑accuracy location attempt failed:',
            accurateError,
          );
          setIsLoading(false);
          return;
        }
      }

      if (position?.coords) {
        const { latitude, longitude } = position.coords;
        setRegion(prev => ({
          // Keep previous deltas if user has panned/zoomed
          latitude,
          longitude,
          latitudeDelta: prev?.latitudeDelta ?? 0.01,
          longitudeDelta: prev?.longitudeDelta ?? 0.01,
        }));
      }

      setIsLoading(false);
    } catch (err) {
      console.warn('[LocationShareScreen] loadCurrentLocation error:', err);
      setIsLoading(false);
    }
  }, [
    ensureLocationAccess,
    navigation,
    t.PermissionDenied,
    t.LocationPermissionRequired,
    t.Settings,
  ]);

  useEffect(() => {
    loadCurrentLocation();
  }, [loadCurrentLocation]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSendCurrentLocation = useCallback(async () => {
    if (!region) {
      console.warn('[LocationShareScreen] No region available');
      return;
    }

    setIsSending(true);
    const { latitude, longitude } = region;

    try {
      console.log('[LocationShareScreen] Sending location:', {
        chatId,
        isGroup,
        latitude,
        longitude,
      });

      if (isGroup) {
        // Send to group
        await GroupChatManager.sendGroupLocationMessage(
          chatId,
          latitude,
          longitude,
        );
        Toast.show({
          type: 'success',
          text1: 'Location sent',
          text2: 'Location shared with group',
        });
      } else {
        // Send to 1-to-1 chat
        await OutgoingMessageManager.sendLocationMessage(
          chatId,
          latitude,
          longitude,
        );
        Toast.show({
          type: 'success',
          text1: 'Location sent',
          text2: 'Location shared with contact',
        });
      }

      // Navigate back after successful send
      navigation.goBack();
    } catch (error) {
      console.error('[LocationShareScreen] Error sending location:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to send location',
        text2: (error as any)?.message || 'Please try again',
      });
    } finally {
      setIsSending(false);
    }
  }, [region, chatId, isGroup, navigation]);

  const handleSendLiveLocation = () => {
    if (!region) return;
    // TODO: Integrate live location flow similar to legacy implementation
    Toast.show({
      type: 'info',
      text1: 'Feature coming soon',
      text2: 'Live location sharing will be available soon',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerIcon}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {'Send location'}
          </Text>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={loadCurrentLocation}
            disabled={isLoading}
          >
            <Ionicons name="refresh" size={22} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          {region && (
            <MapView
              style={styles.map}
              region={region}
              showsUserLocation
              showsMyLocationButton={false}
            >
              <Marker coordinate={region} title="Your location" />
            </MapView>
          )}

          {/* Recenter */}
          <TouchableOpacity
            style={styles.recenterButton}
            onPress={loadCurrentLocation}
            disabled={isLoading}
          >
            <Ionicons name="locate" size={22} color="#000000" />
          </TouchableOpacity>

          {/* Loader overlay */}
          {isLoading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSendCurrentLocation}
            disabled={!region || isLoading || isSending}
          >
            <LinearGradient
              colors={['#6462AC', '#028BD3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.actionButton,
                (!region || isLoading || isSending) && styles.actionButtonDisabled,
              ]}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons
                  name={
                    Platform.OS === 'ios' ? 'location' : 'location-outline'
                  }
                  size={22}
                  color="#ffffff"
                />
              )}
              <Text style={styles.actionButtonText}>
                {isSending ? 'Sending location...' : 'Send your current location'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSendLiveLocation}
            disabled={!region || isLoading || isSending}
          >
            <LinearGradient
              colors={['#fc8e5f', '#fc8e5f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.actionButton,
                (!region || isLoading || isSending) && styles.actionButtonDisabled,
              ]}
            >
              <Ionicons name="radio-outline" size={22} color="#ffffff" />
              <Text style={styles.actionButtonText}>Send live location</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  headerIcon: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  recenterButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  actionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default LocationShareScreen;

