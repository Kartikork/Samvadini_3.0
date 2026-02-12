import { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions } from 'react-native';

interface SelectableMessage {
  refrenceId: string;
  is_outgoing?: boolean;
}

type Layout = { x: number; y: number; width: number; height: number };

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Shared hook for:
 * - single/multi message selection (WhatsApp style)
 * - computing anchor position for the reaction picker above a message
 *
 * Can be reused in ChatScreen, GroupChatScreen, TempChatScreen, etc.
 */
export function useMessageSelectionWithReactions<T extends SelectableMessage>(
  messages: T[],
) {
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isReactionPickerVisible, setReactionPickerVisible] = useState(false);
  const [reactionPickerPosition, setReactionPickerPosition] =
    useState<{ top: number; left: number } | null>(null);
  const [reactionTargetMessageId, setReactionTargetMessageId] =
    useState<string | null>(null);

  const messageLayoutsRef = useRef<Record<string, Layout>>({});

  const isSelectionMode = selectedMessageIds.length > 0;

  const toggleMessageSelection = useCallback((message: T) => {
    setSelectedMessageIds(prev => {
      const exists = prev.includes(message.refrenceId);
      const next = exists
        ? prev.filter(id => id !== message.refrenceId)
        : [...prev, message.refrenceId];

      // When more than one message is selected, reactions should not be shown
      if (next.length !== 1) {
        setReactionPickerVisible(false);
        setReactionTargetMessageId(null);
      }

      return next;
    });
  }, []);

  const handleMessageLongPress = useCallback((message: T) => {
    setSelectedMessageIds(prev => {
      // If nothing selected, start selection with this message
      if (prev.length === 0) {
        return [message.refrenceId];
      }
      // If already selected, keep existing (do not unselect on long press)
      if (prev.includes(message.refrenceId)) {
        return prev;
      }
      // Add to selection (multi-select)
      const next = [...prev, message.refrenceId];

      if (next.length !== 1) {
        setReactionPickerVisible(false);
        setReactionTargetMessageId(null);
      }

      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMessageIds([]);
    setReactionPickerVisible(false);
    setReactionTargetMessageId(null);
  }, []);

  /**
   * Called from each message bubble once it has layout.
   * Anchors the reaction picker above the single selected message.
   */
  const handleMeasureMessage = useCallback(
    (id: string, layout: Layout) => {
      messageLayoutsRef.current[id] = layout;

      // When exactly one message is selected and it is this one, open the picker
      if (selectedMessageIds.length === 1 && selectedMessageIds[0] === id) {
        const pickerWidth = SCREEN_WIDTH * 0.9;
        const left = Math.min(
          Math.max(layout.x, 16),
          SCREEN_WIDTH - pickerWidth - 16,
        );
        const top = Math.max(layout.y - 80, 40);

        setReactionTargetMessageId(id);
        setReactionPickerPosition({ top, left });
        setReactionPickerVisible(true);
      }
    },
    [selectedMessageIds],
  );

  const closeReactionPicker = useCallback(() => {
    setReactionPickerVisible(false);
  }, []);

  const isSelfTargetMessage = useMemo(() => {
    if (!reactionTargetMessageId) return false;
    const msg = messages.find(m => m.refrenceId === reactionTargetMessageId);
    return !!msg?.is_outgoing;
  }, [reactionTargetMessageId, messages]);

  return {
    // selection state
    selectedMessageIds,
    isSelectionMode,
    toggleMessageSelection,
    handleMessageLongPress,
    clearSelection,

    // reaction picker state
    isReactionPickerVisible,
    reactionPickerPosition,
    reactionTargetMessageId,
    isSelfTargetMessage,
    handleMeasureMessage,
    closeReactionPicker,
  };
}

