/**
 * TextToVoiceIconWrapper - Stub
 * Renders a small speaker icon; TTS can be wired later.
 */

import React, { forwardRef } from 'react';
import { View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface TextToVoiceIconWrapperProps {
  text?: string | string[];
  lang?: string;
  autoplay?: boolean;
  size?: number;
  iconColor?: string;
}

const TextToVoiceIconWrapper = forwardRef<unknown, TextToVoiceIconWrapperProps>(
  function TextToVoiceIconWrapper({ size = 24, iconColor = '#666' }, ref) {
    return (
      <View>
        <Icon name="volume-medium-outline" size={size} color={iconColor} />
      </View>
    );
  }
);

export default TextToVoiceIconWrapper;
