import React, { useEffect, useState, useRef } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    TouchableOpacity,
    View,
    TextInput,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const API_KEY = 'IoZfnvUGDcwclWtC7D4PmH4fONhVWYhOtzo8VrbSCu7YkSDfxaC6XQbPgXu6TwGt';

const Stickers = ({ inputText, visible, onSelect, onClose, height = 300 }: any) => {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const debounceRef = useRef<any>(null);
    const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);

    useEffect(() => {
        if (!visible) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            fetchStickers(search || inputText);
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [search, inputText, visible]);

    const fetchStickers = async (q: string) => {
        try {
            setLoading(true);

            let url;
            if (q && q.trim().length > 0) {
                // Search: 100 stickers
                url = `https://api.klipy.com/api/v1/${API_KEY}/stickers/search?q=${encodeURIComponent(q)}&page=1&per_page=100`;
            } else {
                // Trending: 100 stickers with randomization
                url = `https://api.klipy.com/api/v1/${API_KEY}/stickers/trending?page=1&per_page=100`;
            }

            const res = await fetch(url, { headers: { Accept: "application/json" } });

            if (!res.ok) {
                console.error("Klipy fetch failed:", res.status, res.statusText);
                setItems([]);
                return;
            }

            const json = await res.json();

            let mapped = (json?.data?.data || []).map((s: any) => {
                const hdPng = s.file?.hd?.png?.url;
                const mdPng = s.file?.md?.png?.url;
                const smPng = s.file?.sm?.png?.url;
                const xsPng = s.file?.xs?.png?.url;
                const pngUrl = hdPng || mdPng || smPng || xsPng;
                const thumbUrl = smPng || xsPng || mdPng || hdPng;

                return {
                    id: s.id,
                    url: pngUrl,
                    thumb: thumbUrl,
                    type: "image/sticker",
                };
            }).filter((item: any) => !!item.url);

            if (!q || q.trim().length === 0) {
                mapped = mapped.sort(() => 0.5 - Math.random());
            }

            setItems(mapped);
        } catch (e) {
            console.error("Klipy fetch error:", e);
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
                            placeholder="Search Klipy stickers..."
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
                                    marginBottom: gap
                                }
                            ]}
                            onPress={() => onSelect?.(item)}
                            activeOpacity={0.8}
                        >
                            <Image
                                source={{ uri: item.thumb || item.url }}
                                style={styles.thumb}
                                resizeMode="contain"
                            />
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
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    item: { borderRadius: 8, overflow: 'hidden' },
    thumb: { width: '100%', height: '100%' },
    flex1: { flex: 1 },
    flatContent: { paddingHorizontal: 6, paddingBottom: 20 },
    columnWrapper: { justifyContent: 'space-between' },
});

export default Stickers;
