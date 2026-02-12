import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Text,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  DEFAULT_QUICK_REACTIONS,
  DEFAULT_EMOJI_CATEGORIES,
} from './MessageReactionConfig';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
type MessageReactionPickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelectReaction: (emoji: string) => void;
  quickReactions?: string[];
  emojiCategories?: Record<string, string[]>;
  messagePosition?: {
    top: number;
    left: number;
  };
  isSelfMessage?: boolean;
};

const MessageReactionPicker: React.FC<MessageReactionPickerProps> = ({
  visible,
  onClose,
  onSelectReaction,
  quickReactions = DEFAULT_QUICK_REACTIONS,
  emojiCategories = DEFAULT_EMOJI_CATEGORIES,
  messagePosition,
}) => {
  const [layout, setLayout] = useState<1 | 2>(1); // 1 = quick reactions, 2 = full emoji panel
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [selectedCategory, setSelectedCategory] =
    useState<string>(Object.keys(emojiCategories)[0] || 'Smileys & People');

  useEffect(() => {
    if (visible) {
      setLayout(1); // Always reset to Layout 1 when opening
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, scaleAnim]);

  const handleSelectReaction = (emoji: string) => {
    onSelectReaction(emoji);
    onClose();
  };

  const handleOpenFullPanel = () => {
    setLayout(2);
  };

  const handleBackToQuick = () => {
    setLayout(1);
  };

  if (!visible) return null;

  // Position:
  // - Layout 1 (quick pill): just above the message (using passed messagePosition)
  // - Layout 2 (full panel): centered on the screen so it never goes off-screen
  let containerPositionStyle: { top: number; left: number } = { top: 0, left: 0 };

  if (layout === 1 && messagePosition) {
    containerPositionStyle = {
      top: messagePosition.top,
      left: messagePosition.left,
    };
  } else {
    const panelWidth = SCREEN_WIDTH * 0.9;
    const estimatedPanelHeight = 400;
    containerPositionStyle = {
      top: Math.max((SCREEN_HEIGHT - estimatedPanelHeight) / 2, 40),
      left: (SCREEN_WIDTH - panelWidth) / 2,
    };
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Animated.View
        style={[
          styles.container,
          containerPositionStyle,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {layout === 1 ? (
          // Layout 1: Quick reactions bar (WhatsApp style)
          <View style={styles.quickReactionsContainer}>
              {quickReactions.map((emoji, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickReactionButton}
                onPress={() => handleSelectReaction(emoji)}
              >
                <Text style={styles.quickReactionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.quickReactionButton}
              onPress={handleOpenFullPanel}
            >
              <Icon name="add-circle-outline" size={28} color="#555" />
            </TouchableOpacity>
          </View>
        ) : (
          // Layout 2: Full emoji panel
          <View style={styles.fullPanelContainer}>
            {/* Header with back button */}
            <View style={styles.fullPanelHeader}>
              <TouchableOpacity
                onPress={handleBackToQuick}
                style={styles.backButton}
              >
                <Icon name="arrow-back" size={24} color="#555" />
              </TouchableOpacity>
              <Text style={styles.fullPanelTitle}>Select Reaction</Text>
            </View>

            {/* Category tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryTabs}
            >
              {Object.keys(emojiCategories).map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryTab,
                    selectedCategory === category &&
                    styles.categoryTabActive,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      selectedCategory === category &&
                      styles.categoryTabTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Emoji grid */}
            <ScrollView style={styles.emojiScrollView}>
              <View style={styles.emojiGrid}>
                {emojiCategories[selectedCategory].map(
                  (emoji: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.emojiButton}
                      onPress={() => handleSelectReaction(emoji)}
                    >
                      <Text style={styles.emoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // Allow touches to pass through except on the picker itself
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  container: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  // Layout 1: Quick Reactions
  quickReactionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  quickReactionButton: {
    paddingHorizontal: 2,
  },
  quickReactionEmoji: {
    fontSize: 28,
  },
  // Layout 2: Full Panel
  fullPanelContainer: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: 450,
    borderRadius: 20,
  },
  fullPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  fullPanelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  categoryTabs: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  categoryTab: {
    paddingHorizontal: 6,
    paddingVertical: 10,
    marginHorizontal: 4,
  },
  categoryTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#0036a1ff',
  },
  categoryTabText: {
    fontSize: 13,
    color: '#666',
  },
  categoryTabTextActive: {
    color: '#0036a1ff',
    fontWeight: '600',
  },
  emojiScrollView: {
    maxHeight: 320,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    justifyContent: 'flex-start',
  },
  emojiButton: {
    width: '12.5%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  emoji: {
    fontSize: 22,
  },
});

export default MessageReactionPicker;

