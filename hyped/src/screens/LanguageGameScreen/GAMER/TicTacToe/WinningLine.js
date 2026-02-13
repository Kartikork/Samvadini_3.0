import React from 'react';
import { Image } from 'react-native';
import { styles } from './styles';

const WinningLine = ({ line }) => {
  const lineStyleKey = `line_${JSON.stringify(line)}`;
  const lineStyle = styles[lineStyleKey];

  if (!lineStyle) {
    return null;
  }

  return (
    <Image
      source={require('../TicTacToe/strike.png')}
      style={[styles.winningLine, lineStyle]}
      resizeMode="stretch"
    />
  );
};

export default WinningLine;