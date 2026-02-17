import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
// import TrackPlayer from 'react-native-track-player';

// Add `customImageStyle` to the props
const DrumPad = ({ soundFile, label, imageFile, onPadPress, isActive, customImageStyle }) => {

  const handlePress = async () => {
    /*
    try {
      if (soundFile) {
        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: label,
          url: soundFile,
          title: label,
          artist: 'Drum',
        });
        await TrackPlayer.play();
      }
    } catch (e) {
      console.log('Error playing drum sound:', e);
    }
    */
    onPadPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.pad, isActive ? styles.activePad : null]}
    >
      {/* Apply the custom style to the Image component */}
      <Image source={imageFile} style={[styles.image, customImageStyle]} resizeMode="contain" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pad: {
    marginHorizontal: 5, // Add some horizontal space
    borderRadius: 999, // Use a large value for a perfect circle if the image is square
  },
  activePad: {
    // A more subtle glow effect
    borderColor: '#34d399', // A nice mint green color
    borderWidth: 3,
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  image: {
    width: 80, // Default width
    height: 80, // Default height
  },
});

export default DrumPad;