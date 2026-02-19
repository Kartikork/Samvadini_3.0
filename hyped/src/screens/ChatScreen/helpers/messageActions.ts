import { axiosConn } from '../../../storage/helper/Config';
import { updateChatMessage } from '../../../storage/sqllite/chat/ChatMessageSchema';
import { updateEditGroupMessages } from '../../../storage/sqllite/chat/GroupMessageSchema';
import { SocketService } from '../../../services/SocketService';
import { Clipboard } from 'react-native';
import axios from 'axios';
import { env } from '../../../config';

type LocalMessage = {
  refrenceId: string;
  [key: string]: any;
};

type MessageUpdateType =
  | 'pin'
  | 'unPin'
  | 'star'
  | 'unStar'
  | 'delete'
  | 'deleteEveryone';

interface PinUpdateParams {
  type: MessageUpdateType;
  chatId: string;
  selectedMessages: LocalMessage[];
  setMessages: React.Dispatch<React.SetStateAction<LocalMessage[]>>;
}

interface GroupUpdateParams {
  type: MessageUpdateType;
  groupId: string;
  currentUserId: string;
  selectedMessages: LocalMessage[];
  setMessages: React.Dispatch<React.SetStateAction<LocalMessage[]>>;
}

const getRefrenceIdsFromSelection = (selectedMessages: LocalMessage[]) =>
  (selectedMessages || []).map(m => m?.refrenceId).filter(Boolean) as string[];

const applyOptimisticPatch = (
  setMessages: React.Dispatch<React.SetStateAction<LocalMessage[]>>,
  refrenceIds: string[],
  updates: Record<string, any>,
) => {
  setMessages(prevMessages => {
    let hasChanges = false;

    const updated = prevMessages.map(msg => {
      if (refrenceIds.includes(msg.refrenceId)) {
        hasChanges = true;
        return { ...msg, ...updates };
      }
      return msg;
    });

    return hasChanges ? updated : prevMessages;
  });
};

// central update builder
const getUpdatesByType = (type: MessageUpdateType) => {
  switch (type) {
    case 'pin':
      return { sthapitam_sandesham: 1 };

    case 'unPin':
      return { sthapitam_sandesham: 0 };

    case 'star':
      return { kimTaritaSandesha: 1 };

    case 'unStar':
      return { kimTaritaSandesha: 0 };

    case 'delete':
      return { samvada_spashtam: 1 }; // delete for me

    case 'deleteEveryone':
      return { nirastah: 1 }; // delete for everyone

    default:
      return {};
  }
};

export async function updateMessagesActionState({
  type,
  chatId,
  selectedMessages,
  setMessages,
}: PinUpdateParams): Promise<void> {
  if (!chatId || !selectedMessages?.length) return;
  const isInterNetAvailable = await SocketService.checkInternetConnection();
  if (!isInterNetAvailable) return;

  const refrenceIds = getRefrenceIdsFromSelection(selectedMessages);

  if (!refrenceIds.length) return;

  const updates = getUpdatesByType(type);

  // Optimistic UI Update
  applyOptimisticPatch(setMessages, refrenceIds, updates);

  // SQLite update
  try {
    await updateChatMessage({
      refrenceIds,
      type,
      updates,
    });
  } catch (err) {
    console.error('SQLite update failed:', err);
  }

  // star / unstar / delete (local delete) → no backend call
  if (type === 'star' || type === 'unStar') {
    return;
  }

  const timeStamp = new Date().toISOString();
  const payload = {
    refrenceIds,
    type,
    samvada_chinha: chatId,
    updates,
    timeStamp,
  };

  try {
    // realtime sync
    SocketService.sendMessageUpdate(payload);

    // backend persistence
    await axios.post(`${env.API_BASE_URL}/chat/update-message`, payload);
  } catch (error) {
    console.error('[messageActions] Update failed:', error);
  }
}

/**
 * Group chat variant:
 * - Backend: `chat/update-group-message`
 * - Local: `updateEditGroupMessages`
 */
export async function updateGroupMessagesActionState({
  type,
  groupId,
  currentUserId,
  selectedMessages,
  setMessages,
}: GroupUpdateParams): Promise<void> {
  if (!groupId || !selectedMessages?.length) return;

  const isInterNetAvailable = await SocketService.checkInternetConnection();
  if (!isInterNetAvailable) return;

  const refrenceIds = getRefrenceIdsFromSelection(selectedMessages);

  if (!refrenceIds.length) return;

  const updates = getUpdatesByType(type);

  // Optimistic UI update (same pattern as 1-to-1)
  applyOptimisticPatch(setMessages, refrenceIds, updates);

  // Local SQLite update
  try {
    await updateEditGroupMessages({
      referenceIds: refrenceIds,
      type,
      updates,
    });
  } catch (err) {
    console.error('[messageActions] Group SQLite update failed:', err);
  }

  // star / unstar / delete (local delete) → backend requires arrays
  // but we keep the same local shape as 1-to-1 and only change
  // API endpoint + SQL helper.

  try {
    const timeStamp = new Date().toISOString();

    // realtime sync over socket (payload shape same as 1-to-1)
    SocketService.sendGroupUpdate({
      samvada_chinha: groupId,
      refrenceIds,
      type,
      updates,
    });

    // backend persistence
    await axios.post(`${env.API_BASE_URL}/chat/update-group-message`, {
      referenceIds: refrenceIds,
      type,
      updates,
      timeStamp,
    });
  } catch (error) {
    console.error('[messageActions] Group update failed:', error);
  }
}

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
