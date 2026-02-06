/**
 * ChatListItemSkeleton Component
 * 
 * PERFORMANCE:
 * - Lightweight placeholder (no heavy components)
 * - Shows during initial load (better UX than spinner)
 * - Shimmer effect optional (can be added with Animated)
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * Skeleton for individual chat list item
 */
export const ChatListItemSkeleton = memo(() => {
  return (
    <View style={styles.container}>
      {/* Avatar skeleton */}
      <View style={styles.avatarSkeleton} />

      {/* Content skeleton */}
      <View style={styles.content}>
        {/* Name skeleton */}
        <View style={styles.nameSkeleton} />
        
        {/* Message skeleton */}
        <View style={styles.messageSkeleton} />
      </View>

      {/* Time skeleton */}
      <View style={styles.timeSkeleton} />
    </View>
  );
});

ChatListItemSkeleton.displayName = 'ChatListItemSkeleton';

/**
 * List of skeleton items (for initial load)
 */
export const ChatListSkeletonList = memo(({ count = 8 }: { count?: number }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <ChatListItemSkeleton key={`skeleton-${index}`} />
      ))}
    </>
  );
});

ChatListSkeletonList.displayName = 'ChatListSkeletonList';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  avatarSkeleton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e0e0e0',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  nameSkeleton: {
    height: 16,
    width: '60%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
  },
  messageSkeleton: {
    height: 14,
    width: '80%',
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  timeSkeleton: {
    height: 12,
    width: 40,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
});





