import React, { useMemo, useState } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';

// Expanded emoji set (common emojis) and dynamic sizing to match keyboard-like grid
const EMOJIS = (`😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😍 😘 😗 😙 😚 😋 😜 😝 😛 🤪 🤨 🧐 🤓 😎 😤 😠 😡 😭 😢 😥 😓 😰 😱 😬 🤗 🤝 🙏 👍 👎 👊 ✊ 🤛 🤜 👋 🤚 🖐 ✋ 🤙 🤟 🤞 ✌️ 👌 👈 👉 👆 👇 ⬆️ ⬇️ ↗️ ↘️ 🧡 💙 💚 💛 💜 🖤 ❤️ 💔 💕 💞 💓 😺 😸 😹 😻 😼 😽 😿 🙀 🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🦄`).split(/\s+/g);

const EmojiGrid = ({ onSelect, visible }: any) => {
  const [filter, setFilter] = useState('');

  const data = useMemo(() => {
    if (!filter) return EMOJIS;
    return EMOJIS.filter(e => e.includes(filter) || e === filter);
  }, [filter]);

  if (!visible) return null;

  const width = Dimensions.get('window').width;
  // Aim for 6-8 columns like native keyboard; adjust based on width
  const numColumns = Math.min(8, Math.max(6, Math.floor(width / 48)));
  const itemSize = Math.floor(width / numColumns) - 8; // spacing
  const emojiFontSize = Math.round(itemSize * 0.62);

  return (
    <View style={[styles.containerPadding, styles.containerPaddingExtra]}> 
      <TextInput
        style={styles.search}
        placeholder="Search emoji (type emoji or short name)"
        value={filter}
        onChangeText={setFilter}
      />

      <FlatList
        data={data}
        keyExtractor={(item, i) => `${item}-${i}`}
        numColumns={numColumns}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onSelect(item)} style={[styles.item, styles.itemMargin, { width: itemSize, height: itemSize }]}>
            <Text style={[styles.emoji, { fontSize: emojiFontSize }]}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  containerPadding: { padding: 8 },
  containerPaddingExtra: { paddingBottom: 6 },
  search: {
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    marginBottom: 8,
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemMargin: { margin: 4 },
  emoji: { fontSize: 22 },
});

export default EmojiGrid;
