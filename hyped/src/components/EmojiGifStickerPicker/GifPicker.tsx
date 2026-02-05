import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, TouchableOpacity, View, TextInput, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Tenor public key (can be replaced with your own key)
const TENOR_KEY = 'LIVDSRZULELA';

const GifPicker = ({ inputText, visible, onSelect, onClose, height = 300 }: any) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const debounceRef = useRef<any>(null);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchGifs(search || inputText);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, inputText, visible]);

  const fetchGifs = async (q: string) => {
    try {
      setLoading(true);

      let url;
      if (q && q.trim().length > 0) {
        url = `https://g.tenor.com/v1/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=50`;
      } else {
        url = `https://g.tenor.com/v1/trending?key=${TENOR_KEY}&limit=50`;
      }

      const res = await fetch(url);
      const json = await res.json();

      const mapped = (json?.results || []).map((g: any) => {
        const media = g.media && g.media[0];
        const gifUrl = media?.gif?.url || media?.tinygif?.url || media?.mediumgif?.url || media?.nanogif?.url;
        const thumb = media?.tinygif?.url || media?.nanogif?.url || gifUrl;
        return {
          id: g.id,
          url: gifUrl,
          thumb,
          type: 'image/gif',
        };
      }).filter((i: any) => !!i.url);

      setItems(mapped);
    } catch (e) {
      console.error('Tenor fetch error', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const numColumns = containerWidth > 700 ? 4 : 3;
  const gap = 6;
  const itemWidth = Math.floor(
    (containerWidth - gap * (numColumns - 1) - 12) / numColumns
  );

  return (
    <View
      style={[styles.container, { height }]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w && w !== containerWidth) setContainerWidth(w);
      }}
    >
      {onClose && (
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <TextInput
              style={[styles.searchBar, styles.flex1]}
              placeholder="Search GIFs..."
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Icon name="close" size={20} color="#555" />
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#0080ff" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => `${item.id.toString()}-${index}`}
          numColumns={numColumns}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.flatContent}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          removeClippedSubviews={false}
          initialNumToRender={30}
          maxToRenderPerBatch={15}
          windowSize={21}
          updateCellsBatchingPeriod={100}
          disableVirtualization={true}
          legacyImplementation={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.item,
                {
                  width: itemWidth,
                  height: itemWidth,
                  marginBottom: gap,
                },
              ]}
              onPress={() => onSelect?.(item)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: item.thumb || item.url }} style={styles.thumb} resizeMode="contain" />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#ddddddc5' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 6 },
  searchContainer: { flex: 1, marginRight: 6 },
  searchBar: {
    backgroundColor: '#f2f2f2',
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 36,
  },
  closeBtn: { padding: 6 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  item: { borderRadius: 8, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
    flex1: { flex: 1 },
    flatContent: { paddingHorizontal: 6, paddingBottom: 20 },
    columnWrapper: { justifyContent: 'space-between' },
});

export default GifPicker;
