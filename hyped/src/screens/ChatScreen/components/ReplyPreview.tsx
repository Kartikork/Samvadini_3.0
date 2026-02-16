import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface ReplyPreviewProps {
  title: string;
  message: string;
  onClose: () => void;
}

const ReplyPreview: React.FC<ReplyPreviewProps> = ({
  title,
  message,
  onClose,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <MaterialIcons name="close" size={18} color="#00695C" />
        </TouchableOpacity>
      </View>

      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
    marginRight: 8,
  },
  message: {
    fontSize: 14,
    color: '#444444',
  },
});

export default React.memo(ReplyPreview);

