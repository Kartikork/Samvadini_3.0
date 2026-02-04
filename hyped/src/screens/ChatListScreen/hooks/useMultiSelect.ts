/**
 * useMultiSelect Hook
 * 
 * PERFORMANCE:
 * - Selection stored as IDs only
 * - Bulk operations on DB directly
 * - No full list re-render
 */

import { useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../../../state/hooks';
import { chatListActions } from '../../../state/chatListSlice';
import { openDatabase } from '../../../storage/sqllite/chat/ChatListSchema';
import { Alert } from 'react-native';
import { getAllChatLists } from '../../../storage/sqllite/chat/ChatListSchema';

export function useMultiSelect() {
  const dispatch = useAppDispatch();
  
  const isSelectionMode = useAppSelector(state => state.chatList.isSelectionMode);
  const selectedChatIds = useAppSelector(state => state.chatList.selectedChatIds);
  const { uniqueId } = useAppSelector(state => state.auth);

  /**
   * Toggle selection mode
   */
  const toggleSelectionMode = useCallback(() => {
    dispatch(chatListActions.toggleSelectionMode());
  }, [dispatch]);

  /**
   * Toggle individual chat selection
   */
  const toggleChatSelection = useCallback((chatId: string) => {
    dispatch(chatListActions.toggleChatSelection(chatId));
  }, [dispatch]);

  /**
   * Select all visible chats
   */
  const selectAll = useCallback(() => {
    dispatch(chatListActions.selectAllChats());
  }, [dispatch]);

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    dispatch(chatListActions.clearSelection());
  }, [dispatch]);

  /**
   * Check if chat is selected
   */
  const isChatSelected = useCallback((chatId: string) => {
    return selectedChatIds.includes(chatId);
  }, [selectedChatIds]);

  /**
   * Bulk archive selected chats
   */
  const bulkArchive = useCallback(async () => {
    if (selectedChatIds.length === 0 || !uniqueId) return;

    try {
      const db = await openDatabase();

      await new Promise<void>((resolve, reject) => {
        db.transaction(tx => {
          selectedChatIds.forEach(chatId => {
            tx.executeSql(
              `UPDATE td_chat_qutubminar_211 
               SET samvadaspashtah = 1 
               WHERE samvada_chinha = ?`,
              [chatId],
              () => {},
              (_, error) => {
                console.error('Archive error:', error);
                return false;
              }
            );
          });
        }, reject, resolve);
      });

      dispatch(chatListActions.clearSelection());
      
      // Update Redux to trigger archived list refresh
      const allChats = await getAllChatLists(uniqueId);
      const archivedIds = allChats
        .filter(c => c.samvadaspashtah === 1)
        .map(c => c.samvada_chinha);
      dispatch(chatListActions.setChatIds({
        all: allChats.map(c => c.samvada_chinha),
        filtered: allChats.filter(c => c.samvadaspashtah === 0).map(c => c.samvada_chinha),
        archived: archivedIds,
      }));
      
      // Return success to trigger refresh
      return true;
    } catch (error) {
      console.error('[useMultiSelect] Bulk archive error:', error);
      Alert.alert('Error', 'Failed to archive chats');
      return false;
    }
  }, [selectedChatIds, uniqueId, dispatch]);

  /**
   * Bulk unarchive selected chats
   */
  const bulkUnarchive = useCallback(async () => {
    if (selectedChatIds.length === 0 || !uniqueId) {
      console.log('[useMultiSelect] ⚠️ Cannot unarchive: no selection or uniqueId');
      return false;
    }

    console.log('[useMultiSelect] 📤 Unarchiving chats:', selectedChatIds);

    try {
      const db = await openDatabase();

      await new Promise<void>((resolve, reject) => {
        let completed = 0;
        let hasError = false;

        db.transaction(
          (tx) => {
            selectedChatIds.forEach((chatId, index) => {
              tx.executeSql(
                `UPDATE td_chat_qutubminar_211 
                 SET samvadaspashtah = 0 
                 WHERE samvada_chinha = ?`,
                [chatId],
                (_, result) => {
                  completed++;
                  console.log(`[useMultiSelect] ✅ Unarchived chat: ${chatId}`, {
                    rowsAffected: result.rowsAffected,
                    completed: `${completed}/${selectedChatIds.length}`,
                  });
                  
                  // All queries completed
                  if (completed === selectedChatIds.length && !hasError) {
                    console.log('[useMultiSelect] ✅ All chats unarchived successfully');
                  }
                },
                (_, error) => {
                  hasError = true;
                  console.error(`[useMultiSelect] ❌ Unarchive error for ${chatId}:`, error);
                  // Continue with other chats even if one fails
                }
              );
            });
          },
          (error) => {
            console.error('[useMultiSelect] ❌ Transaction error:', error);
            reject(error);
          },
          () => {
            // Transaction success
            if (hasError) {
              console.warn('[useMultiSelect] ⚠️ Some chats failed to unarchive');
            } else {
              console.log('[useMultiSelect] ✅ Transaction completed successfully');
            }
            resolve();
          }
        );
      });

      dispatch(chatListActions.clearSelection());
      
      // Update Redux to trigger archived list refresh
      const allChats = await getAllChatLists(uniqueId);
      const archivedIds = allChats
        .filter(c => c.samvadaspashtah === 1)
        .map(c => c.samvada_chinha);
      
      console.log('[useMultiSelect] 📦 Updated Redux state:', {
        totalChats: allChats.length,
        archivedCount: archivedIds.length,
      });

      dispatch(chatListActions.setChatIds({
        all: allChats.map(c => c.samvada_chinha),
        filtered: allChats.filter(c => c.samvadaspashtah === 0).map(c => c.samvada_chinha),
        archived: archivedIds,
      }));
      
      return true;
    } catch (error) {
      console.error('[useMultiSelect] ❌ Bulk unarchive error:', error);
      Alert.alert('Error', 'Failed to unarchive chats');
      return false;
    }
  }, [selectedChatIds, uniqueId, dispatch]);

  /**
   * Bulk delete selected chats
   */
  const bulkDelete = useCallback(async () => {
    if (selectedChatIds.length === 0 || !uniqueId) return;

    Alert.alert(
      'Delete Chats',
      `Are you sure you want to delete ${selectedChatIds.length} chat(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await openDatabase();

              await new Promise<void>((resolve, reject) => {
                db.transaction(tx => {
                  selectedChatIds.forEach(chatId => {
                    // Mark as deleted (soft delete)
                    tx.executeSql(
                      `UPDATE td_chat_qutubminar_211 
                       SET samvadaspashtah = 1 
                       WHERE samvada_chinha = ?`,
                      [chatId],
                      () => {},
                      (_, error) => {
                        console.error('Delete error:', error);
                        return false;
                      }
                    );
                  });
                }, reject, resolve);
              });

              dispatch(chatListActions.clearSelection());
              return true;
            } catch (error) {
              console.error('[useMultiSelect] Bulk delete error:', error);
              Alert.alert('Error', 'Failed to delete chats');
              return false;
            }
          },
        },
      ]
    );
  }, [selectedChatIds, uniqueId, dispatch]);

  /**
   * Bulk pin selected chats
   */
  const bulkPin = useCallback(async () => {
    if (selectedChatIds.length === 0 || !uniqueId) {
      console.log('[useMultiSelect] ⚠️ Cannot pin: no selection or uniqueId');
      return false;
    }

    console.log('[useMultiSelect] 📌 Pinning chats:', selectedChatIds);

    try {
      const db = await openDatabase();

      await new Promise<void>((resolve, reject) => {
        db.transaction(
          (tx) => {
            selectedChatIds.forEach((chatId) => {
              tx.executeSql(
                `UPDATE td_chat_qutubminar_211 
                 SET is_pinned = 1, updatedAt = CURRENT_TIMESTAMP
                 WHERE samvada_chinha = ?`,
                [chatId],
                (_, result) => {
                  console.log(`[useMultiSelect] ✅ Pinned chat: ${chatId}`, {
                    rowsAffected: result.rowsAffected,
                  });
                },
                (_, error) => {
                  console.error(`[useMultiSelect] ❌ Pin error for ${chatId}:`, error);
                }
              );
            });
          },
          (error) => {
            console.error('[useMultiSelect] ❌ Transaction error:', error);
            reject(error);
          },
          () => {
            console.log('[useMultiSelect] ✅ Pin transaction completed');
            resolve();
          }
        );
      });

      dispatch(chatListActions.clearSelection());
      
      // Update Redux to trigger refresh
      const allChats = await getAllChatLists(uniqueId);
      dispatch(chatListActions.setChatIds({
        all: allChats.map(c => c.samvada_chinha),
        filtered: allChats.filter(c => c.samvadaspashtah === 0).map(c => c.samvada_chinha),
        archived: allChats.filter(c => c.samvadaspashtah === 1).map(c => c.samvada_chinha),
      }));
      
      return true;
    } catch (error) {
      console.error('[useMultiSelect] ❌ Bulk pin error:', error);
      Alert.alert('Error', 'Failed to pin chats');
      return false;
    }
  }, [selectedChatIds, uniqueId, dispatch]);

  /**
   * Bulk unpin selected chats
   */
  const bulkUnpin = useCallback(async () => {
    if (selectedChatIds.length === 0 || !uniqueId) {
      console.log('[useMultiSelect] ⚠️ Cannot unpin: no selection or uniqueId');
      return false;
    }

    console.log('[useMultiSelect] 📌 Unpinning chats:', selectedChatIds);

    try {
      const db = await openDatabase();

      await new Promise<void>((resolve, reject) => {
        db.transaction(
          (tx) => {
            selectedChatIds.forEach((chatId) => {
              tx.executeSql(
                `UPDATE td_chat_qutubminar_211 
                 SET is_pinned = 0, updatedAt = CURRENT_TIMESTAMP
                 WHERE samvada_chinha = ?`,
                [chatId],
                (_, result) => {
                  console.log(`[useMultiSelect] ✅ Unpinned chat: ${chatId}`, {
                    rowsAffected: result.rowsAffected,
                  });
                },
                (_, error) => {
                  console.error(`[useMultiSelect] ❌ Unpin error for ${chatId}:`, error);
                }
              );
            });
          },
          (error) => {
            console.error('[useMultiSelect] ❌ Transaction error:', error);
            reject(error);
          },
          () => {
            console.log('[useMultiSelect] ✅ Unpin transaction completed');
            resolve();
          }
        );
      });

      dispatch(chatListActions.clearSelection());
      
      // Update Redux to trigger refresh
      const allChats = await getAllChatLists(uniqueId);
      dispatch(chatListActions.setChatIds({
        all: allChats.map(c => c.samvada_chinha),
        filtered: allChats.filter(c => c.samvadaspashtah === 0).map(c => c.samvada_chinha),
        archived: allChats.filter(c => c.samvadaspashtah === 1).map(c => c.samvada_chinha),
      }));
      
      return true;
    } catch (error) {
      console.error('[useMultiSelect] ❌ Bulk unpin error:', error);
      Alert.alert('Error', 'Failed to unpin chats');
      return false;
    }
  }, [selectedChatIds, uniqueId, dispatch]);

  return {
    isSelectionMode,
    selectedChatIds,
    selectedCount: selectedChatIds.length,
    toggleSelectionMode,
    toggleChatSelection,
    selectAll,
    clearSelection,
    isChatSelected,
    bulkArchive,
    bulkUnarchive,
    bulkPin,
    bulkUnpin,
    bulkDelete,
  };
}

