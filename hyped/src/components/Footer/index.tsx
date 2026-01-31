/**
 * Footer Component
 * 
 * App footer component with branding and links
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Image,
  Dimensions,
  Linking,
  TouchableOpacity,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../../state/hooks';
import { anuvadiniLogo, makeInIndia } from '../../assets';

const { width } = Dimensions.get('window');

export function Footer() {
  const isIndia = useAppSelector((state) => state.country.isIndia);
  const poweredByText = '';

  return (
    <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }}>
      <View style={styles.footer}>
        <View style={styles.topRow}>
          <View style={styles.poweredByContainer}>
            <Text style={styles.poweredByText}>{poweredByText}</Text>
            <Image
              source={anuvadiniLogo}
              style={styles.anuvadiniLogo}
            />
          </View>
          <View style={{ width: '50%' }}>
            {isIndia && (
              <Image
                source={makeInIndia}
                style={styles.anuvadiniLogo}
              />
            )}
          </View>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => Linking.openURL('https://anuvadini.aicte-india.org')}>
            <Text style={styles.footerText}>anuvadini.aicte-india.org</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#fff',
    alignItems: 'center',
    width: width,
    paddingTop: 0,
    height: 40,
    },
  footerText: {
    color: '#212121',
    fontSize: 14,
    marginLeft: -100,
    flexShrink: 1,
    paddingHorizontal: 5,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: '100%',
  },
  poweredByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  poweredByText: {
    fontSize: 10,
    color: '#333333',
    fontWeight: 'bold',
    flexShrink: 1,
  },
  anuvadiniLogo: {
    width: 80,
    height: 25,
    resizeMode: 'contain',
  },
});
