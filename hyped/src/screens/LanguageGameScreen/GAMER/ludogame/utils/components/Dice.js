import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Image } from 'react-native';
import { TILE_SIZE } from '../../utils/gameEngine';
// import Sound from 'react-native-sound';

// Sound.setCategory('Playback');

// const diceRollSound = new Sound(
//   require('../../../Assets/audio/dice_roll.mp3'),
//   (error) => {
//     if (error) {
//       console.log('Failed to load the sound', error);
//       return;
//     }
//   }
// );

const diceImages = {
  1: require('../../dice_1.png'),
  2: require('../../dice_2.png'),
  3: require('../../dice_3.png'),
  4: require('../../dice_4.png'),
  5: require('../../dice_5.png'),
  6: require('../../dice_6.png'),
};

const DiceFace = ({ value }) => {
  console.log(`DiceFace trying to render for value: ${value}`);

  const imageSource = diceImages[value];

  if (!imageSource) {
    console.log('--> Image source is INVALID.');
    return null;
  }

  console.log('--> Image source found, asset ID:', imageSource);

  return (
    <Image
      source={imageSource}
      style={styles.diceImage}
      resizeMode="contain"
    />
  );
};


const Dice = ({ value, onRoll, isRolling, disabled }) => {

  const handlePress = () => {
    // diceRollSound.play();
    onRoll();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.dice, disabled && styles.disabled]}
      disabled={disabled || isRolling}>
      {isRolling ? (
        <Text style={styles.diceText}>...</Text>
      ) : (
        <DiceFace value={value} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  dice: {
    width: TILE_SIZE * 3,
    height: TILE_SIZE * 3,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  diceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  disabled: {
    backgroundColor: '#E0E0E0',
  },
  diceImage: {
    width: TILE_SIZE * 2.8,
    height: TILE_SIZE * 2.8,
  },
});

export default Dice;