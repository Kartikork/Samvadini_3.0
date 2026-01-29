/**
 * CountryPicker Component
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Virtualized FlatList with getItemLayout
 * - Memoized list items
 * - Debounced search
 * - Lazy modal render
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { useDebounce } from '../../hooks';
import type { Country } from '../../types/auth';

// Country data - could be loaded lazily if very large
const COUNTRIES: Country[] = [
  { name: 'India', code: 'IN', dialCode: '+91' },
  { name: 'United States', code: 'US', dialCode: '+1' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44' },
  { name: 'Canada', code: 'CA', dialCode: '+1' },
  { name: 'Australia', code: 'AU', dialCode: '+61' },
  { name: 'Germany', code: 'DE', dialCode: '+49' },
  { name: 'France', code: 'FR', dialCode: '+33' },
  { name: 'Japan', code: 'JP', dialCode: '+81' },
  { name: 'China', code: 'CN', dialCode: '+86' },
  { name: 'Brazil', code: 'BR', dialCode: '+55' },
  { name: 'Mexico', code: 'MX', dialCode: '+52' },
  { name: 'Spain', code: 'ES', dialCode: '+34' },
  { name: 'Italy', code: 'IT', dialCode: '+39' },
  { name: 'Russia', code: 'RU', dialCode: '+7' },
  { name: 'South Korea', code: 'KR', dialCode: '+82' },
  { name: 'Indonesia', code: 'ID', dialCode: '+62' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971' },
  { name: 'Singapore', code: 'SG', dialCode: '+65' },
  { name: 'Malaysia', code: 'MY', dialCode: '+60' },
  { name: 'Thailand', code: 'TH', dialCode: '+66' },
  { name: 'Vietnam', code: 'VN', dialCode: '+84' },
  { name: 'Philippines', code: 'PH', dialCode: '+63' },
  { name: 'Pakistan', code: 'PK', dialCode: '+92' },
  { name: 'Bangladesh', code: 'BD', dialCode: '+880' },
  { name: 'Sri Lanka', code: 'LK', dialCode: '+94' },
  { name: 'Nepal', code: 'NP', dialCode: '+977' },
];

interface CountryPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: Country) => void;
  selectedCountry?: Country;
}

// Memoized list item for performance
const CountryItem = memo(function CountryItem({
  item,
  onSelect,
  isSelected,
}: {
  item: Country;
  onSelect: (country: Country) => void;
  isSelected: boolean;
}) {
  const handlePress = useCallback(() => {
    onSelect(item);
  }, [item, onSelect]);

  return (
    <TouchableOpacity
      style={[styles.countryItem, isSelected && styles.countryItemSelected]}
      onPress={handlePress}
      activeOpacity={0.7}>
      <Text style={styles.countryName}>{item.name}</Text>
      <Text style={styles.dialCode}>{item.dialCode}</Text>
    </TouchableOpacity>
  );
});

const ITEM_HEIGHT = 52;

const CountryPicker = memo(function CountryPicker({
  visible,
  onClose,
  onSelect,
  selectedCountry,
}: CountryPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 200);

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    if (!debouncedSearch.trim()) {
      // Put India first by default
      const india = COUNTRIES.find(c => c.code === 'IN');
      const others = COUNTRIES.filter(c => c.code !== 'IN');
      return india ? [india, ...others] : COUNTRIES;
    }

    const query = debouncedSearch.toLowerCase();
    return COUNTRIES.filter(
      country =>
        country.name.toLowerCase().includes(query) ||
        country.dialCode.includes(query)
    );
  }, [debouncedSearch]);

  const handleSelect = useCallback((country: Country) => {
    onSelect(country);
    onClose();
    setSearchQuery('');
    Keyboard.dismiss();
  }, [onSelect, onClose]);

  const handleClose = useCallback(() => {
    onClose();
    setSearchQuery('');
    Keyboard.dismiss();
  }, [onClose]);

  // getItemLayout for optimized scrolling
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: Country }) => (
      <CountryItem
        item={item}
        onSelect={handleSelect}
        isSelected={selectedCountry?.code === item.code}
      />
    ),
    [handleSelect, selectedCountry?.code]
  );

  const keyExtractor = useCallback((item: Country) => item.code, []);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Country</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search country..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          {/* List */}
          <FlatList
            data={filteredCountries}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No countries found</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFF',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    fontSize: 22,
    color: '#666',
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  searchInput: {
    height: 44,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    height: ITEM_HEIGHT,
  },
  countryItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  countryName: {
    fontSize: 16,
    color: '#333',
  },
  dialCode: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default CountryPicker;

