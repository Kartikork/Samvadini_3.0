import { Clipboard } from 'react-native';
import { axiosConn } from '../../../storage/helper/Config';
import { updateChatMessage } from '../../../storage/sqllite/chat/ChatMessageSchema';
import { SocketService } from '../../../services/SocketService';

type LocalMessage = {
  refrenceId: string;
  [key: string]: any;
};

type PinUpdateType = 'pin' | 'unPin';

interface PinUpdateParams {
  type: PinUpdateType;
  chatId: string;
  selectedMessages: LocalMessage[];
  setMessages: React.Dispatch<React.SetStateAction<LocalMessage[]>>;
}

/**
 * Optimistically update pin / unPin locally and propagate to
 * SQLite + server (socket + REST).
 *
 * This helper is reusable across ChatScreen, GroupChatScreen, etc.
 */
export async function updateMessagesPinState({
  type,
  chatId,
  selectedMessages,
  setMessages,
}: PinUpdateParams): Promise<void> {
  if (!chatId || !selectedMessages?.length) {
    return;
  }
console.log('selectedMessages in updateMessagesPinState', selectedMessages,type,chatId,setMessages);
  // Check internet connectivity before hitting server
  const isInterNetAvailable = await SocketService.checkInternetConnection();
  if (!isInterNetAvailable) {
    return;
  }

  const refrenceIds = selectedMessages
    .map(m => m?.refrenceId)
    .filter(Boolean) as string[];

  if (!refrenceIds.length) {
    return;
  }

  // Optimistic local state update
  setMessages(prevMessages => {
    let hasChanges = false;
    const updated = prevMessages.map(msg => {
      if (refrenceIds.includes(msg.refrenceId)) {
        hasChanges = true;
        return {
          ...msg,
          sthapitam_sandesham: type === 'pin' ? 1 : 0,
        };
      }
      return msg;
    });
    return hasChanges ? updated : prevMessages;
  });

  // Persist to SQLite
  const payloadForDb = {
    refrenceIds,
    type,
    updates: {},
  };
  await updateChatMessage(payloadForDb);

  // Build common payload for socket + REST
  const baseUpdates =
    type === 'pin'
      ? { sthapitam_sandesham: 1 }
      : { sthapitam_sandesham: 0 };

  const formData = {
    refrenceIds,
    type,
    samvada_chinha: chatId,
    updates: baseUpdates,
    timeStamp: new Date().toISOString(),
  };

  try {
    // Socket update for real‑time clients
    SocketService.sendMessageUpdate({
      samvada_chinha: chatId,
      refrenceIds,
      type,
      updates: baseUpdates,
    });

    // REST API update for backend persistence / audit
    await axiosConn('post', 'chat/update-message', formData);
  } catch (error) {
    console.error('[messageActions] Error updating pin state:', error);
  }
}

/**
 * Copy selected messages' text to clipboard.
 * Reusable helper – call from any screen.
 */
export function copyMessagesToClipboard(messages: LocalMessage[]): void {
  if (!messages || messages.length === 0) return;

  const text = messages
    .map(m => (typeof m.vishayah === 'string' ? m.vishayah : ''))
    .filter(Boolean)
    .join('\n');

  if (text) {
    Clipboard.setString(text);
  }
}

