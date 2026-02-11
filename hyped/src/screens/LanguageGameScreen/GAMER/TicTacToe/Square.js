import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { styles } from './styles';

const Square = ({ value, onPress }) => (
  <TouchableOpacity style={styles.square} onPress={onPress}>
    <Text style={styles.squareText}>{value}</Text>
  </TouchableOpacity>
);

export default Square;