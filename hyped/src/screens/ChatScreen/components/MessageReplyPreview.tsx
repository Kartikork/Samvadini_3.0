import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface MessageReplyPreviewProps {
  title: string;
  message: string;
  accentColor?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

const MessageReplyPreview: React.FC<MessageReplyPreviewProps> = ({
  title,
  message,
  accentColor = '#007AFF',
  backgroundColor = '#FFFFFF',
  style,
}) => {
  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: accentColor }]} numberOfLines={1}>
          {title}
        </Text>
        {!!message && (
          <Text style={styles.body} numberOfLines={1}>
            {message}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 8,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  body: {
    fontSize: 14,
    color: '#333333',
  },
});

export default React.memo(MessageReplyPreview);

