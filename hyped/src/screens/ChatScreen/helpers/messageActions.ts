import { axiosConn } from '../../../storage/helper/Config';
import { updateChatMessage } from '../../../storage/sqllite/chat/ChatMessageSchema';
import { SocketService } from '../../../services/SocketService';

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

  const refrenceIds = selectedMessages
    .map(m => m?.refrenceId)
    .filter(Boolean) as string[];

  if (!refrenceIds.length) return;

  const updates = getUpdatesByType(type);

  // Optimistic UI Update
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
  console.log(
    {
      refrenceIds,
      type,
      updates,
    },
    '000000000000000000000000000000000000000000000000000000000000000',
  );

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

  const payload = {
    refrenceIds,
    type,
    samvada_chinha: chatId,
    updates,
    timeStamp: new Date().toISOString(),
  };
  console.log(
    payload,
    '2222222222222222222222222222222222222222222222222222222222222222222',
  );

  try {
    // realtime sync
    SocketService.sendMessageUpdate(payload);

    // backend persistence
    await axiosConn('post', 'chat/update-message', payload);
  } catch (error) {
    console.error('[messageActions] Update failed:', error);
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
