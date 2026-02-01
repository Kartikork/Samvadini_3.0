/**
 * TabBar Component
 * 
 * PERFORMANCE:
 * - Memoized to prevent unnecessary re-renders
 * - Horizontal scroll for many tabs
 * - Badge only when needed
 */

import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import { ChatTab } from '../../../state/chatListSlice';

interface Tab {
  key: ChatTab;
  label: string;
}

interface Props {
  tabs: Tab[];
  activeTab: ChatTab;
  onTabChange: (tab: ChatTab) => void;
  requestBadge?: number;
}

export const TabBar = memo<Props>(({ tabs, activeTab, onTabChange, requestBadge = 0 }) => {
  const renderTab = useCallback((tab: Tab) => {
    const isActive = activeTab === tab.key;
    const showBadge = tab.key === 'requests' && requestBadge > 0;

    return (
      <TouchableOpacity
        key={tab.key}
        style={[styles.tab, isActive && styles.activeTab]}
        onPress={() => {
          // Add haptic feedback for better UX
          onTabChange(tab.key);
        }}
        activeOpacity={0.6}
      >
        <Animated.View style={isActive ? styles.activeTabIndicator : null}>
          <Text style={[styles.tabText, isActive && styles.activeTabText]}>
            {tab.label}
          </Text>
        </Animated.View>
        {showBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {requestBadge > 99 ? '99+' : requestBadge}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [activeTab, requestBadge, onTabChange]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map(renderTab)}
      </ScrollView>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.requestBadge === nextProps.requestBadge
  );
});

TabBar.displayName = 'TabBar';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  scrollContent: {
    paddingHorizontal: 12,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    position: 'relative',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#028BD3',
  },
  activeTabIndicator: {
    // Smooth transition indicator
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#028BD3',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

