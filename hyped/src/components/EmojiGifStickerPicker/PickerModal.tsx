import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import EmojiGrid from './EmojiGrid';
import GifPicker from './GifPicker';
import Stickers from '../StickerPicker/Stickers';

const Tabs = {
  EMOJI: 'emoji',
  GIF: 'gif',
  STICKER: 'sticker',
};

const PickerModal = ({ visible, onClose, onSelectEmoji, onSelectGif, onSelectSticker, inputText, height }: any) => {
  const [activeTab, setActiveTab] = useState(Tabs.EMOJI);
  const defaultHeight = Math.min(Math.floor(Dimensions.get('window').height * 0.45), 360);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.container, { height: height || defaultHeight }]}>
          <View style={styles.tabBar}>
            <TouchableOpacity onPress={() => setActiveTab(Tabs.EMOJI)} style={[styles.tab, activeTab === Tabs.EMOJI && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === Tabs.EMOJI && styles.tabTextActive]}>Emoji</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab(Tabs.GIF)} style={[styles.tab, activeTab === Tabs.GIF && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === Tabs.GIF && styles.tabTextActive]}>GIF</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab(Tabs.STICKER)} style={[styles.tab, activeTab === Tabs.STICKER && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === Tabs.STICKER && styles.tabTextActive]}>Sticker</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          {activeTab === Tabs.EMOJI && (
            <EmojiGrid visible={visible} onSelect={(emoji: string) => { onSelectEmoji?.(emoji); onClose?.(); }} />
          )}

          {activeTab === Tabs.GIF && (
            <GifPicker inputText={inputText} visible={visible} onSelect={(gif: any) => { onSelectGif?.(gif); onClose?.(); }} onClose={onClose} />
          )}

          {activeTab === Tabs.STICKER && (
            <Stickers inputText={inputText} visible={visible} onSelect={(sticker: any) => { onSelectSticker?.(sticker); onClose?.(); }} onClose={onClose} />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  container: { backgroundColor: '#fff', borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '70%' },
  tabBar: { flexDirection: 'row', alignItems: 'center', padding: 8, borderBottomColor: '#eee', borderBottomWidth: 1 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginRight: 8 },
  tabActive: { backgroundColor: '#007AFF' },
  tabText: { color: '#333', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  closeBtn: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 6 },
  closeText: { color: '#666' },
});

export default PickerModal;
