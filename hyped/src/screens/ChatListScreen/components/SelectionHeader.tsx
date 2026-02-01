/**
 * SelectionHeader Component
 * 
 * PERFORMANCE:
 * - Lazy loaded (only when selection mode active)
 * - Memoized to prevent re-renders
 */

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
  selectedCount: number;
  onCancel: () => void;
  onArchive: () => void;
  onPin: () => void;
  onDelete: () => void;
  isArchivedTab?: boolean;
  hasPinnedChats?: boolean;
}

export const SelectionHeader = memo<Props>(({ 
  selectedCount, 
  onCancel, 
  onArchive, 
  onPin,
  onDelete,
  isArchivedTab = false,
  hasPinnedChats = false
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
        <Icon name="close" size={24} color="#028BD3" />
      </TouchableOpacity>
      
      <Text style={styles.count}>
        {selectedCount} selected
      </Text>
      
      <View style={styles.actions}>
        <TouchableOpacity onPress={onPin} style={styles.actionButton}>
          <Icon 
            name={hasPinnedChats ? 'pin-off' : 'pin'} 
            size={24} 
            color="#028BD3" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onArchive} style={styles.actionButton}>
          <Icon 
            name={isArchivedTab ? 'archive-arrow-up' : 'archive'} 
            size={24} 
            color="#028BD3" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
          <Icon name="delete" size={24} color="#f44336" />
        </TouchableOpacity>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.selectedCount === nextProps.selectedCount &&
    prevProps.isArchivedTab === nextProps.isArchivedTab &&
    prevProps.hasPinnedChats === nextProps.hasPinnedChats
  );
});

SelectionHeader.displayName = 'SelectionHeader';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  cancelButton: {
    marginRight: 12,
    padding: 4,
  },
  count: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 16,
    padding: 4,
  },
});

