import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ImageStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainNavigator';
import { splashScreen } from '../../assets';

type SplashScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Splash'
>;

export default function SplashScreen() {
  const navigation = useNavigation<SplashScreenNavigationProp>();

  useEffect(() => {
    // Simulate initialization delay
    const timer = setTimeout(() => {
      navigation.replace('LanguageSelection');
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Splash Screen Image */}
      <Image
        source={splashScreen}
        style={styles.splashImage}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  } as ImageStyle,
});
