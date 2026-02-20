import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp?: string;
}

interface LocationMessageBubbleProps {
  /** Location string in format "lat:lon" or JSON string with {latitude, longitude, address} */
  locationData: string;
  /** Whether this message is sent by current user (affects styling) */
  isOutgoing: boolean;
  /** Optional custom styling */
  style?: any;
  /** Optional callback when location is opened */
  onOpenMap?: (latitude: number, longitude: number) => void;
}

/**
 * Reusable location message bubble component
 * Displays location with interactive map opening capability
 * Used in: chat bubbles, group bubbles, starred/pinned messages, etc.
 */
const LocationMessageBubble: React.FC<LocationMessageBubbleProps> = ({
  locationData,
  isOutgoing,
  style,
  onOpenMap,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Parse location data - supports both "lat:lon" format and JSON format
  const parseLocation = (): LocationData | null => {
    try {
      // Try to parse as JSON first
      if (locationData.startsWith('{')) {
        const parsed = JSON.parse(locationData);
        return {
          latitude: parsed.latitude || parsed.lat,
          longitude: parsed.longitude || parsed.lon,
          address: parsed.address,
          timestamp: parsed.timestamp,
        };
      }

      // Fall back to "lat:lon" format
      const [latStr, lonStr] = locationData.split(':');
      const latitude = parseFloat(latStr);
      const longitude = parseFloat(lonStr);

      if (isNaN(latitude) || isNaN(longitude)) {
        console.warn('[LocationMessageBubble] Invalid location format:', locationData);
        return null;
      }

      return {
        latitude,
        longitude,
      };
    } catch (error) {
      console.error('[LocationMessageBubble] Error parsing location:', error);
      return null;
    }
  };

  const location = parseLocation();

  if (!location) {
    return (
      <View style={[styles.container, style]}>
        <View style={[
          styles.errorContainer,
          isOutgoing && styles.outgoingError,
        ]}>
          <Ionicons name="alert-circle-outline" size={20} color={isOutgoing ? '#FF6B6B' : '#CC0000'} />
          <Text style={[
            styles.errorText,
            isOutgoing && styles.outgoingText,
          ]}>Invalid location</Text>
        </View>
      </View>
    );
  }

  const handleOpenMap = async () => {
    setIsLoading(true);
    try {
      const mapsUrl = Platform.OS === 'ios'
        ? `maps://maps.apple.com/?q=${location.latitude},${location.longitude}`
        : `https://maps.google.com?q=${location.latitude},${location.longitude}`;

      const canOpen = await Linking.canOpenURL(mapsUrl);
      if (canOpen) {
        await Linking.openURL(mapsUrl);
        onOpenMap?.(location.latitude, location.longitude);
      } else {
        // Fallback to web Google Maps
        const webUrl = `https://maps.google.com?q=${location.latitude},${location.longitude}`;
        await Linking.openURL(webUrl);
        onOpenMap?.(location.latitude, location.longitude);
      }
    } catch (error) {
      console.error('[LocationMessageBubble] Failed to open maps:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formattedCoordinates = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;

  return (
    <TouchableOpacity
      onPress={handleOpenMap}
      disabled={isLoading}
      activeOpacity={0.7}
      style={[styles.container, style]}
    >
      <View style={[
        styles.bubble,
        isOutgoing && styles.outgoingBubble,
      ]}>
        {/* Header with icon */}
        <View style={styles.header}>
          <View style={[
            styles.iconContainer,
            isOutgoing && styles.outgoingIconContainer,
          ]}>
            <MaterialCommunityIcons
              name="map-marker"
              size={24}
              color={isOutgoing ? '#FFFFFF' : '#0B88D2'}
            />
          </View>
          <Text style={[
            styles.locationTitle,
            isOutgoing && styles.outgoingTitle,
          ]}>Location Shared</Text>
        </View>

        {/* Address if available */}
        {location.address && (
          <Text style={[
            styles.address,
            isOutgoing && styles.outgoingText,
          ]} numberOfLines={2}>
            {location.address}
          </Text>
        )}

        {/* Coordinates */}
        <View style={styles.coordinatesContainer}>
          <Text style={[
            styles.label,
            isOutgoing && styles.outgoingLabel,
          ]}>Coordinates:</Text>
          <Text style={[
            styles.coordinates,
            isOutgoing && styles.outgoingCoordinates,
          ]}
            selectable
          >
            {formattedCoordinates}
          </Text>
        </View>

        {/* Map preview thumbnail */}
        <View style={[
          styles.mapPreview,
          isOutgoing && styles.outgoingMapPreview,
        ]}>
          {isLoading ? (
            <ActivityIndicator size="small" color={isOutgoing ? '#0B88D2' : '#666666'} />
          ) : (
            <>
              <MaterialCommunityIcons
                name="map"
                size={40}
                color={isOutgoing ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.2)'}
              />
              <Text style={[
                styles.mapText,
                isOutgoing && styles.outgoingMapText,
              ]}>Tap to view in Maps</Text>
            </>
          )}
        </View>

        {/* Timestamp if available */}
        {location.timestamp && (
          <Text style={[
            styles.timestamp,
            isOutgoing && styles.outgoingTimestamp,
          ]}>
            {new Date(location.timestamp).toLocaleTimeString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },

  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    minWidth: 240,
    maxWidth: 280,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  outgoingBubble: {
    backgroundColor: '#0B88D2',
    borderColor: '#0B88D2',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  outgoingIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  locationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },

  outgoingTitle: {
    color: '#FFFFFF',
  },

  address: {
    fontSize: 13,
    color: '#444444',
    marginBottom: 10,
    fontStyle: 'italic',
  },

  coordinatesContainer: {
    marginBottom: 10,
  },

  label: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
    marginBottom: 4,
  },

  outgoingLabel: {
    color: 'rgba(255,255,255,0.8)',
  },

  coordinates: {
    fontSize: 13,
    color: '#0B88D2',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '500',
  },

  outgoingCoordinates: {
    color: '#FFFFFF',
  },

  mapPreview: {
    height: 120,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },

  outgoingMapPreview: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  mapText: {
    fontSize: 12,
    color: '#999999',
    marginTop: 6,
    textAlign: 'center',
  },

  outgoingMapText: {
    color: 'rgba(255,255,255,0.7)',
  },

  timestamp: {
    fontSize: 11,
    color: '#AAAAAA',
    marginTop: 6,
  },

  outgoingTimestamp: {
    color: 'rgba(255,255,255,0.6)',
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE0E0',
    borderRadius: 8,
    padding: 10,
    minWidth: 200,
  },

  outgoingError: {
    backgroundColor: 'rgba(255, 107, 107, 0.25)',
  },

  errorText: {
    fontSize: 13,
    color: '#CC0000',
    marginLeft: 8,
    fontWeight: '500',
  },

  outgoingText: {
    color: '#FFFFFF',
  },
});

export default LocationMessageBubble;
