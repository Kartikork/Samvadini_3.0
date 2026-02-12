import SQLite from 'react-native-sqlite-storage';
import { downloadFile } from '../../helper/Helper';
import { getEncryptionKey } from './Participants';
import { decryptMessage } from '../../../helper/Encryption';
import { SocketService } from '../../../services/SocketService';
import { getRandomLayout } from '../../../helper/MessageLayout';

SQLite.enablePromise(true);

const openDatabase = async () => {
  try {
    const db = await SQLite.openDatabase({
      name: 'td_delhi_10.db',
      location: 'default',
    });
    await db.executeSql('PRAGMA foreign_keys = ON;');
    return db;
  } catch (error) {
    console.error('Error opening database:', error);
    throw error;
  }
};

export const messageCreateTable = async () => {
  try {
    const db = await openDatabase();
    await db.transaction(async tx => {
      await tx.executeSql(
        `CREATE TABLE IF NOT EXISTS td_chat_hawamahal_212 (
          anuvadata_id INTEGER PRIMARY KEY AUTOINCREMENT,
          anuvadata_sandesham INTEGER DEFAULT 0,
          avastha VARCHAR(10) DEFAULT 'sent',
          vishayah TEXT,
          kimFwdSandesha INTEGER DEFAULT 0,
          nirastah INTEGER DEFAULT 0,
          samvada_spashtam INTEGER DEFAULT 0,
          pathakah_chinha VARCHAR(20),
          pratisandeshah TEXT,
          kimTaritaSandesha INTEGER DEFAULT 0,
          sampaditam INTEGER DEFAULT 0,
          refrenceId VARCHAR(30) UNIQUE,
          ukti VARCHAR(300),
          prasaranamId VARCHAR(30),
          samvada_chinha VARCHAR(30),
          sandesha_prakara VARCHAR(30) DEFAULT 'text',
          layout VARCHAR(10) DEFAULT 'layout1',
          sthapitam_sandesham INTEGER DEFAULT 0,
          preritam_tithih DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_disappearing INTEGER DEFAULT 0,
          disappear_at DATETIME,
          reaction TEXT,
          reaction_by VARCHAR(40),
          reaction_updated_at DATETIME,
          reaction_details TEXT,
          reaction_summary TEXT,
          last_disappear_check VARCHAR(50)
        );`,
      );

      await tx.executeSql(
        `CREATE TRIGGER IF NOT EXISTS update_td_chat_hawamahal_212
         AFTER UPDATE ON td_chat_hawamahal_212
         FOR EACH ROW
         BEGIN
             UPDATE td_chat_hawamahal_212 
             SET updatedAt = CURRENT_TIMESTAMP 
             WHERE anuvadata_id = OLD.anuvadata_id;
         END;`,
      );

      const indexes = [
        { name: 'idx_avastha', column: 'avastha' },
        { name: 'idx_refrenceId', column: 'refrenceId' },
        { name: 'idx_sandesha_prakara', column: 'sandesha_prakara' },
        { name: 'idx_samvada_chinha', column: 'samvada_chinha' },
        { name: 'idx_is_disappearing', column: 'is_disappearing' },
        { name: 'idx_disappear_at', column: 'disappear_at' },
        { name: 'idx_preritam_tithih', column: 'preritam_tithih' },
        { name: 'idx_prasaranamId', column: 'prasaranamId' },
      ];

      for (const { name, column } of indexes) {
        await tx.executeSql(
          `CREATE INDEX IF NOT EXISTS ${name} ON td_chat_hawamahal_212 (${column});`,
        );
      }

      await tx.executeSql(
        `CREATE INDEX IF NOT EXISTS idx_chat_time_disappearing 
         ON td_chat_hawamahal_212 (samvada_chinha, preritam_tithih DESC, is_disappearing);`
      );

      console.log('Table, trigger, and indexes created successfully.');
    });
  } catch (error) {
    console.error('Error while creating the table:', error);
  }
};

export const messageDeleteTables = async () => {
  try {
    const db = await openDatabase();
    await db.transaction(async tx => {
      await tx.executeSql(`DROP TABLE IF EXISTS td_chat_hawamahal_212;`);
    });
    console.log("Table 'td_chat_hawamahal_212' deleted successfully.");
  } catch (error) {
    console.error("Error deleting table 'td_chat_hawamahal_212':", error);
  }
};

export const insertChatMessage = async data => {
  try {
    const db = await openDatabase();
    const layout = getRandomLayout();
    await db.transaction(async tx => {
      if (!data.refrenceId || !data.samvada_chinha || !data.pathakah_chinha) {
        console.warn(`Missing required fields`);
        return;
      }

      const reactionValue = data.reaction ?? null;
      const reactionByValue = data.reaction_by ?? null;
      const reactionUpdatedAtValue = data.reaction_updated_at
        ? new Date(data.reaction_updated_at).toISOString()
        : null;
      const reactionDetailsValue = data.reaction_details
        ? (typeof data.reaction_details === 'string' ? data.reaction_details : JSON.stringify(data.reaction_details))
        : null;
      const reactionSummaryValue = data.reaction_summary
        ? (typeof data.reaction_summary === 'string' ? data.reaction_summary : JSON.stringify(data.reaction_summary))
        : null;

      const sqlParams = [
        data.samvada_chinha,
        data.refrenceId,
        data.pathakah_chinha,
        data.vishayah,
        data.sandesha_prakara || 'text',
        data.anuvadata_sandesham ? 1 : 0,
        data.avastha || 'sent',
        data.ukti || '',
        data.samvada_spashtam ? 1 : 0,
        data.kimTaritaSandesha ? 1 : 0,
        data.nirastah ? 1 : 0,
        data.sthapitam_sandesham || null,
        data.preritam_tithih,
        data.pratisandeshah || '',
        data.kimFwdSandesha ? 1 : 0,
        data.sampaditam ? 1 : 0,
        reactionValue,
        reactionByValue,
        reactionUpdatedAtValue,
        reactionDetailsValue,
        reactionSummaryValue,
        data.createdAt || new Date().toISOString(),
        data.updatedAt || new Date().toISOString(),
        data.is_disappearing ? 1 : 0,
        data.prasaranamId || "",
        layout,
        data.disappear_at ? data.disappear_at.toISOString() : null,
        new Date().toISOString(),
      ];

      tx.executeSql(
        `INSERT OR REPLACE INTO td_chat_hawamahal_212 (
          samvada_chinha, refrenceId, pathakah_chinha, vishayah, sandesha_prakara,
          anuvadata_sandesham, avastha, ukti, samvada_spashtam, kimTaritaSandesha,
          nirastah, sthapitam_sandesham, preritam_tithih, pratisandeshah,
          kimFwdSandesha, sampaditam, reaction, reaction_by, reaction_updated_at,
          reaction_details, reaction_summary,
          createdAt, updatedAt, is_disappearing,prasaranamId,layout,
          disappear_at, last_disappear_check
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        sqlParams,
        (_, result) => {
          tx.executeSql(
            `UPDATE td_chat_qutubminar_211 
             SET samvadaspashtah = 0, updatedAt = CURRENT_TIMESTAMP 
             WHERE samvada_chinha = ?`,
            [data.samvada_chinha],
            () => console.log(`Chat list updated for samvada_chinha: ${data.samvada_chinha}`),
            (_, error) => console.error(`Error updating chat list for ${data.samvada_chinha}:`, error)
          );
        },
        (_, error) => {
          console.error('Insert error:', error);
          return false;
        }
      );
    });
  } catch (err) {
    console.error('DB Error during insertChatMessage:', err);
    throw err;
  }
};

export const BroadcastManyinsertMessage = async (messages) => {
  try {
    const db = await openDatabase();

    await new Promise((resolve, reject) => {
      db.transaction((tx) => {
        const sql = `
          INSERT OR REPLACE INTO td_chat_hawamahal_212 (
            samvada_chinha, refrenceId, pathakah_chinha, vishayah, sandesha_prakara,
            anuvadata_sandesham, avastha, ukti, samvada_spashtam, kimTaritaSandesha,
            nirastah, sthapitam_sandesham, preritam_tithih, pratisandeshah,
            kimFwdSandesha, sampaditam, reaction, reaction_by, reaction_updated_at,
            reaction_details, reaction_summary,
            createdAt, updatedAt, is_disappearing,
            prasaranamId, disappear_at, last_disappear_check
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        messages.forEach((msg) => {
          const reactionValue = msg.reaction ?? null;
          const reactionByValue = msg.reaction_by ?? null;
          const reactionUpdatedAtValue = msg.reaction_updated_at
            ? new Date(msg.reaction_updated_at).toISOString()
            : null;
          const reactionDetailsValue = msg.reaction_details
            ? (typeof msg.reaction_details === 'string' ? msg.reaction_details : JSON.stringify(msg.reaction_details))
            : null;
          const reactionSummaryValue = msg.reaction_summary
            ? (typeof msg.reaction_summary === 'string' ? msg.reaction_summary : JSON.stringify(msg.reaction_summary))
            : null;

          tx.executeSql(
            sql,
            [
              msg.samvada_chinha,
              msg.refrenceId,
              msg.pathakah_chinha,
              msg.vishayah,
              msg.sandesha_prakara,
              msg.anuvadata_sandesham,
              msg.avastha,
              msg.ukti,
              msg.samvada_spashtam,
              msg.kimTaritaSandesha,
              msg.nirastah,
              msg.sthapitam_sandesham,
              msg.preritam_tithih,
              msg.pratisandeshah,
              msg.kimFwdSandesha,
              msg.sampaditam,
              reactionValue,
              reactionByValue,
              reactionUpdatedAtValue,
              reactionDetailsValue,
              reactionSummaryValue,
              msg.createdAt,
              msg.updatedAt,
              msg.is_disappearing,
              msg.prasaranamId,
              msg.disappear_at,
              msg.last_disappear_check,
            ],
            (_, result) => {
              console.log(`Inserted ${result.rowsAffected} message(s)`);
            },
            (_, error) => {
              console.error('Insert error:', error);
              reject(error);
              return true;
            }
          );
        });
      }, (error) => {
        console.error('Transaction error:', error);
        reject(error);
      }, () => {
        console.log('Transaction completed');
        resolve();
      });
    });
  } catch (err) {
    console.error('DB Error during insertManyChatMessages:', err);
    throw err;
  }
};

export const insertOrUpdateBulkChatMessages = async (records, curUserUid) => {
  if (!records || records.length === 0) return;

  try {
    const db = await openDatabase();
    const self = await getEncryptionKey();
    const nowUTC = new Date().toISOString();
    const processedRecords = await Promise.all(
      records.map(async data => {
        if (!data || !data.refrenceId) return null;

        let vishayahValue = data.vishayah;

        const encryptedTypes = ["text", "link", "sos", "location"];

        if (data.sandesha_prakara?.startsWith("application/") || data.sandesha_prakara.startsWith('image/') || data.sandesha_prakara.startsWith('video/')) {
          try {
            const [fileUri, fileName, fileSize] = (data.vishayah.join(",") || "").split("|||");
            const localFilePath = await downloadFile(
              fileUri,
              fileName || data.refrenceId,
              fileSize,
              data.sandesha_prakara
            );
            if (localFilePath) vishayahValue = localFilePath;
          } catch (err) {
            console.error("File download error:", err);
          }
        }

        if (encryptedTypes.includes(data.sandesha_prakara)) {
          try {
            vishayahValue = await decryptMessage(vishayahValue, self?.privateKey);
          } catch {
            console.warn("Decrypt failed");
          }
        }

        const reactionUpdatedAt =
          data.reaction_updated_at
            ? new Date(data.reaction_updated_at).toISOString()
            : data.reaction
              ? nowUTC
              : null;

        const reactionDetails =
          typeof data.reaction_details === "string"
            ? data.reaction_details
            : JSON.stringify(data.reaction_details || null);

        const reactionSummary =
          typeof data.reaction_summary === "string"
            ? data.reaction_summary
            : JSON.stringify(data.reaction_summary || null);

        return {
          ...data,
          vishayahValue,
          createdAt: data.createdAt || nowUTC,
          updatedAt: data.updatedAt || nowUTC,
          last_disappear_check: nowUTC,
          reaction_updated_at: reactionUpdatedAt,
          reaction_details: reactionDetails,
          reaction_summary: reactionSummary,
        };
      })
    );

    await new Promise((resolve, reject) => {
      db.transaction(tx => {
        let completed = 0;

        processedRecords.forEach(data => {
          if (!data) {
            completed++;
            return;
          }

          const layout = getRandomLayout();
          const scalar = (v) => (v == null ? null : typeof v === 'object' ? JSON.stringify(v) : v);

          const insertParams = [
            data.samvada_chinha,
            data.refrenceId,
            data.pathakah_chinha,
            data.vishayahValue || "",
            data.sandesha_prakara || "text",
            data.anuvadata_sandesham || 0,
            data.avastha || "sent",
            data.ukti || "",
            data.samvada_spashtam || 0,
            data.kimTaritaSandesha || 0,
            data.nirastah || 0,
            data.sthapitam_sandesham || 0,
            scalar(data.preritam_tithih),
            data.pratisandeshah || "",
            data.kimFwdSandesha || 0,
            data.sampaditam || 0,
            scalar(data.reaction),
            scalar(data.reaction_by),
            scalar(data.reaction_updated_at),
            data.reaction_details,
            data.reaction_summary,
            scalar(data.createdAt),
            scalar(data.updatedAt),
            data.is_disappearing || 0,
            scalar(data.disappear_at),
            typeof layout === 'string' ? layout : (layout || 'layout1'),
            data.prasaranamId || "",
            scalar(data.last_disappear_check),
          ];

          tx.executeSql(
            `INSERT OR IGNORE INTO td_chat_hawamahal_212 (
              samvada_chinha, refrenceId, pathakah_chinha, vishayah, sandesha_prakara,
              anuvadata_sandesham, avastha, ukti, samvada_spashtam, kimTaritaSandesha,
              nirastah, sthapitam_sandesham, preritam_tithih, pratisandeshah,
              kimFwdSandesha, sampaditam, reaction, reaction_by, reaction_updated_at,
              reaction_details, reaction_summary, createdAt, updatedAt,
              is_disappearing, disappear_at, layout, prasaranamId, last_disappear_check
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            insertParams,
            () => {
              tx.executeSql(
                `UPDATE td_chat_hawamahal_212 SET
                  vishayah=?,
                  ukti=?,
                  samvada_spashtam=?,
                  nirastah=?,
                  sthapitam_sandesham=?,
                  pratisandeshah=?,
                  sampaditam=?,
                  reaction=?,
                  reaction_by=?,
                  reaction_updated_at=?,
                  reaction_details=?,
                  reaction_summary=?,
                  updatedAt=?,
                  is_disappearing=?,
                  disappear_at=?,
                  last_disappear_check=?,
                  prasaranamId=?
                 WHERE refrenceId=?`,
                [
                  data.vishayahValue || "",
                  data.ukti || "",
                  data.samvada_spashtam || 0,
                  data.nirastah || 0,
                  data.sthapitam_sandesham || 0,
                  data.pratisandeshah || "",
                  data.sampaditam || 0,
                  scalar(data.reaction),
                  scalar(data.reaction_by),
                  scalar(data.reaction_updated_at),
                  data.reaction_details,
                  data.reaction_summary,
                  nowUTC,
                  data.is_disappearing || 0,
                  scalar(data.disappear_at),
                  nowUTC,
                  data.prasaranamId || "",
                  data.refrenceId
                ]
              );

              try {
                SocketService.sendMessageStatusUpdate({
                  refrenceId: data.refrenceId,
                  avastha: "delivered",
                  ekatma_chinha: curUserUid,
                  pathakah_chinha: data.pathakah_chinha,
                  delivered_At: new Date().toISOString(),
                });
              } catch (e) {
                console.warn("Socket status failed:", e);
              }

              try {
                SocketService.emit("message_inserted", {
                  ...data,
                  vishayah: data.vishayahValue,
                });
              } catch (e) {
                console.error("Socket emit failed:", e);
              }

              completed++;
              if (completed === processedRecords.length) resolve();
            },
            (_, error) => {
              console.error("INSERT Error:", error);
              completed++;
              if (completed === processedRecords.length) resolve();
              return true;
            }
          );
        });
      }, reject);
    });

    console.log("✔ Bulk chat UPSERT completed successfully");
  } catch (err) {
    console.error("❌ Bulk Insert Error:", err);
  }
};

export const fetchChatMessages = async (samvada_chinha, limit = 100, offset = 0) => {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM td_chat_hawamahal_212
           WHERE samvada_chinha = ? 
           ORDER BY preritam_tithih DESC
           LIMIT ? OFFSET ?;`,
          [samvada_chinha, limit, offset],
          (_, results) => {
            const allMessages = results.rows.raw();
            resolve(allMessages.length > 0 ? allMessages : []);
          },
          (_, error) => {
            console.error('Error fetching Messages:', error);
            resolve([]);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in fetchChatMessages:', error);
    throw error;
  }
};

export const getChatMessageCount = async samvada_chinha => {
  try {
    const db = await openDatabase();
    const nowUTC = new Date().toISOString();

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT COUNT(*) as count FROM td_chat_hawamahal_212
           WHERE samvada_chinha = ? 
           AND (is_disappearing = 0 OR (is_disappearing = 1 AND disappear_at > ?));`,
          [samvada_chinha, nowUTC],
          (_, results) => {
            const count = results.rows.item(0).count;
            resolve(count);
          },
          (_, error) => {
            console.error('Error counting messages:', error);
            resolve(0);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in getChatMessageCount:', error);
    throw error;
  }
};

export const updateChatMessage = async data => {
  if (!data || !data.refrenceIds || !Array.isArray(data.refrenceIds) || !data.updates) {
    throw new Error('Invalid update payload structure');
  }

  try {
    const db = await openDatabase();
    const { refrenceIds, updates, type } = data;

    if (type === 'delete') {
      const deleteQuery = `DELETE FROM td_chat_hawamahal_212 WHERE refrenceId IN (${refrenceIds.map(() => '?').join(', ')})`;

      await new Promise((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            deleteQuery,
            refrenceIds,
            () => resolve(),
            (_, error) => reject(error)
          );
        });
      });

      console.log(`${refrenceIds.length} messages deleted successfully`);
      return {
        success: true,
        message: `${refrenceIds.length} messages deleted successfully`,
      };
    }

    let updateQuery = { ...updates, updatedAt: new Date().toISOString() };

    switch (type) {
      case 'edit':
        updateQuery = { ...updates, sampaditam: true, updatedAt: new Date().toISOString() };
        break;
      case 'star':
        updateQuery = { kimTaritaSandesha: 1, updatedAt: new Date().toISOString() };
        break;
      case 'unStar':
        updateQuery = { kimTaritaSandesha: 0, updatedAt: new Date().toISOString() };
        break;
      case 'pin':
        updateQuery = { sthapitam_sandesham: 1, updatedAt: new Date().toISOString() };
        break;
      case 'unPin':
        updateQuery = { sthapitam_sandesham: 0, updatedAt: new Date().toISOString() };
        break;
      case 'deleteEveryone':
        updateQuery = { nirastah: 1, sthapitam_sandesham: 0, kimTaritaSandesha: 0, avastha: 'read', updatedAt: new Date().toISOString() };
        break;
      case 'reaction': {
        const isoNow = new Date().toISOString();
        const reactionValue = data.updates?.reaction ?? null;
        updateQuery = {
          reaction: reactionValue,
          reaction_by: reactionValue ? data.updates?.reaction_by ?? null : null,
          reaction_updated_at: reactionValue
            ? data.updates?.reaction_updated_at ?? isoNow
            : null,
          updatedAt: isoNow,
        };
        break;
      }
      default:
        updateQuery = { ...updates, updatedAt: new Date().toISOString() };
        break;
    }

    const updateFields = Object.keys(updateQuery).map(key => `${key} = ?`).join(', ');
    const updateValues = Object.values(updateQuery);
    updateValues.push(...refrenceIds);

    const query = `UPDATE td_chat_hawamahal_212 SET ${updateFields} WHERE refrenceId IN (${refrenceIds.map(() => '?').join(', ')})`;

    await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          query,
          updateValues,
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });

    console.log(`${refrenceIds.length} messages updated successfully`);
    return {
      success: true,
      message: `${refrenceIds.length} messages updated successfully`,
    };
  } catch (error) {
    console.error('Error updating messages:', error);
    return {
      success: false,
      message: `Failed to update messages: ${error.message}`,
    };
  }
};

export const updateMessageReaction = async (
  refrenceId,
  reaction,
  reactedBy = null,
  reactionTimestamp = new Date().toISOString(),
  reactionDetails = null,
  reactionSummary = null
) => {
  if (!refrenceId) {
    throw new Error('refrenceId is required to update reaction');
  }
  const db = await openDatabase();
  const updatedAt = new Date().toISOString();
  const normalizedReaction = reaction ?? null;
  const normalizedReactionBy = normalizedReaction ? reactedBy ?? null : null;
  let normalizedReactionTimestamp = null;

  if (normalizedReaction) {
    try {
      normalizedReactionTimestamp = new Date(reactionTimestamp).toISOString();
    } catch (e) {
      console.warn('updateMessageReaction: invalid timestamp, using current time', e);
      normalizedReactionTimestamp = updatedAt;
    }
  }

  const normalizedReactionDetails = reactionDetails ? JSON.stringify(reactionDetails) : null;
  const normalizedReactionSummary = reactionSummary ? JSON.stringify(reactionSummary) : null;

  const params = [
    normalizedReaction,
    normalizedReactionBy,
    normalizedReactionTimestamp,
    normalizedReactionDetails,
    normalizedReactionSummary,
    updatedAt,
    refrenceId,
  ];

  await db.transaction(async tx => {
    await tx.executeSql(
      `UPDATE td_chat_hawamahal_212
       SET reaction = ?, reaction_by = ?, reaction_updated_at = ?, reaction_details = ?, reaction_summary = ?, updatedAt = ?
       WHERE refrenceId = ?;`,
      params
    );
  });

  return {
    success: true,
    refrenceId,
    reaction: normalizedReaction,
    reaction_by: normalizedReactionBy,
    reaction_updated_at: normalizedReactionTimestamp,
    reaction_details: reactionDetails,
    reaction_summary: reactionSummary,
  };
};

export const formatGroupMedia = (rows = []) => {
  let finalOutput = [];

  const getType = (uri = "") => {
    const ext = uri.split(".").pop().toLowerCase();
    if (["mp4", "mov", "avi", "mkv"].includes(ext)) return "video";
    return "image";
  };

  rows.forEach(message => {
    if (message.sandesha_prakara === "multiple/media") {
      const items = message.vishayah.split(",");

      items.forEach(item => {
        const [uri, fileName, size, thumbnail] = item.split("|||");

        const cleanedUri = uri?.trim();
        const type = getType(cleanedUri);

        finalOutput.push({
          preritam_tithih: message.preritam_tithih,
          samvada_spashtam: message.samvada_spashtam,
          sandesha_prakara: type,
          thumbnail: thumbnail
            ? thumbnail.replace("base64", "base64,")
            : null,
          vishayah: cleanedUri,
        });
      });

      return;
    }
    finalOutput.push({
      ...message,
      thumbnail: "",
    });
  });

  return finalOutput;
};

export const FetchChatMedia = async (samvada_chinha) => {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT vishayah, sandesha_prakara, preritam_tithih
           FROM td_chat_hawamahal_212
           WHERE samvada_chinha = ?
             AND nirastah != 1
             AND (
               sandesha_prakara LIKE 'image/%' OR
               sandesha_prakara = 'multiple/media' OR
               sandesha_prakara LIKE 'audio/%' OR
               sandesha_prakara LIKE 'video/%' OR
               sandesha_prakara LIKE 'application/%' OR
               sandesha_prakara LIKE 'contact%' OR
               sandesha_prakara LIKE 'location%' OR
               sandesha_prakara LIKE 'live_location%' OR
               sandesha_prakara = 'link'
             );`,
          [samvada_chinha],

          (tx, results) => {
            const rows = results.rows.raw();

            const formatted = formatGroupMedia(rows);

            resolve({
              messages: formatted,
              totalMediaCount: formatted.length,
            });
          },

          (tx, error) => {
            console.error("SQL Error:", error);
            reject(error);
            return true;
          }
        );
      });
    });

  } catch (error) {
    console.error("Error in FetchGroupMedia:", error);
    throw error;
  }
};

export const clearLocalChat = async (data, isClearChat) => {
  let db_name = "td_chat_hawamahal_212";
  if (data.type === "Group") {
    db_name = "td_gchat_redfort_213";
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      db.transaction(
        (tx) => {
          const ids = data.samvada_chinha;
          const placeholders = ids.map(() => '?').join(', ');

          // First conditionally update the td_chat_qutubminar_211 table
          if (isClearChat !== "true") {
            const updateQuery = `
              UPDATE td_chat_qutubminar_211 
              SET samvadaspashtah = 1, updatedAt = CURRENT_TIMESTAMP
              WHERE samvada_chinha IN (${placeholders});
            `;
            tx.executeSql(updateQuery, ids,
              () => {
                console.log("Updated td_chat_qutubminar_211 successfully.");
              },
              (_, error) => {
                console.error("Error updating chat list:", error);
                reject(error);
              }
            );
          }

          // Now delete from appropriate db_name table
          const deleteQuery = `DELETE FROM ${db_name} WHERE samvada_chinha IN (${placeholders});`;
          tx.executeSql(deleteQuery, ids,
            () => {
              resolve({ success: true, message: "All messages deleted successfully" });
            },
            (_, error) => {
              console.error("Error deleting messages:", error);
              reject(error);
            }
          );
        },
        (transactionError) => {
          console.error("Transaction error:", transactionError);
          reject(transactionError);
        }
      );
    });
  } catch (error) {
    console.error('Error in clearLocalChat:', error);
    throw error;
  }
};

export const clearSingleChat = async (data) => {
  try {
    const db = await openDatabase();
    const { type, samvada_chinha, isdelete } = data;
    const dbName =
      type === "Group" ? "td_gchat_redfort_213" : "td_chat_hawamahal_212";

    return new Promise((resolve, reject) => {
      db.transaction(
        (tx) => {
          const deleteQuery = `DELETE FROM ${dbName} WHERE samvada_chinha = ?;`;
          tx.executeSql(
            deleteQuery,
            [samvada_chinha],
            () => {
              console.log("Messages deleted successfully.");
              resolve({
                success: true,
                message: "All messages deleted successfully.",
              });
            },
            (_, error) => {
              console.error("Error deleting messages:", error);
              reject(error);
              return false;
            }
          );
          if (isdelete === true) {
            const updateQuery = `
              UPDATE td_chat_qutubminar_211 
              SET samvadaspashtah = 1, updatedAt = CURRENT_TIMESTAMP
              WHERE samvada_chinha = ?;
            `;
            tx.executeSql(updateQuery, [samvada_chinha],
              () => {
                console.log("Updated td_chat_qutubminar_211 successfully.");
              },
              (_, error) => {
                console.error("Error updating chat list:", error);
                reject(error);
              }
            );
          }
        },

        (transactionError) => {
          console.error("❌ Transaction error:", transactionError);
          reject(transactionError);
        }
      );
    });
  } catch (error) {
    console.error("❌ Error in clearSingleChat:", error);
    throw error;
  }
};

export const messageStatuslocalDb = async ({ refrenceId, avastha }) => {
  try {
    if (!refrenceId || !avastha) {
      throw new Error('Invalid update payload structure');
    }

    const db = await openDatabase();
    if (!db) throw new Error('Database connection failed');

    const updatedAt = new Date().toISOString();
    const query = `UPDATE td_chat_hawamahal_212 SET avastha = ?, updatedAt = ? WHERE refrenceId = ?`;
    const updateValues = [avastha, updatedAt, refrenceId];

    await db.transaction(tx => {
      return tx.executeSql(query, updateValues);
    });
    return { success: true, message: 'Message status updated successfully' };
  } catch (error) {
    console.error('Error updating message status in DB:', error);
    return { success: false, message: `Failed to update status: ${error.message}` };
  }
};

export const fetchAllStarredMessages = async myId => {
  try {
    const db = await openDatabase();
    const nowUTC = new Date().toISOString();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT tf2.ekatma_chinha AS otherUser, tch.*,tcq.prakara,tcq.samvada_nama as broadcastNAme,
            CASE
                WHEN tf2.ekatma_chinha IS NOT NULL AND tcq.prakara = 'Chat'
                THEN tf2.praman_patrika
                WHEN tf2.ekatma_chinha = tcb.ekatma_chinha AND tf2.praman_patrika IS NULL
                THEN tcb.praman_patrika
                ELSE tcb.praman_patrika
            END AS samvada_nama,
            CASE
                WHEN tf2.ekatma_chinha IS NOT NULL AND tcq.prakara = 'Chat'
                THEN tf2.parichayapatra
                WHEN tf2.ekatma_chinha = tcb.ekatma_chinha AND tf2.parichayapatra IS NULL
                THEN tcb.parichayapatra
                ELSE tcb.parichayapatra
            END AS samuha_chitram
           FROM td_chat_hawamahal_212 tch
           INNER JOIN td_chat_qutubminar_211 tcq ON tcq.samvada_chinha = tch.samvada_chinha
           INNER JOIN td_chat_bhagwah_211 tcb ON tcb.samvada_chinha_id = tcq.samvada_chinha_id AND tcb.ekatma_chinha != ?
           LEFT JOIN td_fort_113 tf2 ON tf2.ekatma_chinha = tcb.ekatma_chinha
           WHERE tch.kimTaritaSandesha = 1 AND tch.nirastah = 0
           AND (tch.is_disappearing = 0 OR (tch.is_disappearing = 1 AND tch.disappear_at > ?))
           GROUP BY tch.anuvadata_id
           ORDER BY tch.preritam_tithih DESC`,
          [myId, nowUTC],
          (_, results) => {
            const allStarMessages = results.rows.raw();
            resolve(allStarMessages.length > 0 ? allStarMessages : []);
          },
          (_, error) => {
            console.error('Error fetching Messages:', error);
            resolve([]);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in fetchAllStarredMessages:', error);
    throw error;
  }
};

export const getLastMessage = async (samvada_chinha = null) => {
  try {
    const db = await openDatabase();
    const nowUTC = new Date().toISOString();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        let query = `SELECT * FROM td_chat_hawamahal_212 
                     WHERE nirastah = 0 
                     AND (is_disappearing = 0 OR (is_disappearing = 1 AND disappear_at > ?))`;
        const queryParams = [nowUTC];
        if (samvada_chinha) {
          query += ` AND samvada_chinha = ?`;
          queryParams.push(samvada_chinha);
        }
        query += ` ORDER BY datetime(updatedAt) DESC LIMIT 1`;

        tx.executeSql(
          query,
          queryParams,
          (_, results) => {
            if (results.rows.length > 0) {
              const message = results.rows.item(0);
              resolve(message);
            } else {
              resolve(null);
            }
          },
          (_, error) => {
            console.error('Error fetching last message:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in getLastMessage:', error);
    throw error;
  }
};

export const getLastUpdatedTime = async (samvada_chinha = null) => {
  try {
    const lastMessage = await getLastMessage(samvada_chinha);
    if (lastMessage && lastMessage.updatedAt) {
      const date = new Date(lastMessage.updatedAt);
      const isoDate = date.toISOString();
      return isoDate;
    } else {
      return '1970-01-01T00:00:00Z';
    }
  } catch (error) {
    console.error('Error in getLastUpdatedTime:', error);
    return '1970-01-01T00:00:00Z';
  }
};

export const updateChatAvashatha = async (chatId, myId) => {
  try {
    const db = await openDatabase();
    const updatedAt = new Date().toISOString();

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `UPDATE td_chat_hawamahal_212
           SET avastha = 'read', updatedAt = ? 
           WHERE pathakah_chinha != ? AND avastha != 'read' AND samvada_chinha = ?`,
          [updatedAt, myId, chatId],
          (_, results) => {
            resolve(results.rowsAffected);
          },
          (_, error) => {
            console.error('Error updating chat avastha:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in updateChatAvashatha:', error);
    throw error;
  }
};

export const cleanupDisappearingMessages = async () => {
  try {
    const db = await openDatabase();
    const nowUTC = new Date().toISOString();

    const [countResult] = await db.executeSql(
      `SELECT COUNT(*) as count FROM td_chat_hawamahal_212 
       WHERE is_disappearing = 1 AND disappear_at <= ?`,
      [nowUTC]
    );

    const count = countResult.rows.item(0).count;
    if (count === 0) {
      console.log('[Cleanup] No expired messages found');
      return { deleted: 0 };
    }

    const BATCH_SIZE = 100;
    let totalDeleted = 0;

    while (totalDeleted < count) {
      const [result] = await db.executeSql(
        `DELETE FROM td_chat_hawamahal_212 
         WHERE rowid IN (
           SELECT rowid FROM td_chat_hawamahal_212 
           WHERE is_disappearing = 1 AND disappear_at <= ?
           LIMIT ?
         )`,
        [nowUTC, BATCH_SIZE]
      );

      totalDeleted += result.rowsAffected;
      if (result.rowsAffected < BATCH_SIZE) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Update chat list visibility for chats with no remaining messages
    await db.executeSql(
      `UPDATE td_chat_qutubminar_211 
       SET samvadaspashtah = 1, updatedAt = CURRENT_TIMESTAMP
       WHERE samvada_chinha NOT IN (
         SELECT samvada_chinha FROM td_chat_hawamahal_212
         WHERE is_disappearing = 0 OR (is_disappearing = 1 AND disappear_at > ?)
       )`,
      [nowUTC]
    );

    return { deleted: totalDeleted };
  } catch (error) {
    console.error('[Cleanup] Failed:', error.message);
    return { deleted: 0, error: error.message };
  }
};

export const startPeriodicCleanup = () => {
  if (cleanupInterval) clearInterval(cleanupInterval);

  cleanupDisappearingMessages().catch(err =>
    console.error('[Cleanup] Initial run failed:', err.message)
  );

  cleanupInterval = setInterval(() => {
    cleanupDisappearingMessages().catch(err =>
      console.error('[Cleanup] Periodic run failed:', err.message)
    );
  }, 60 * 1000);
};

export const stopPeriodicCleanup = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    console.log('[Cleanup] Stopped');
  }
};

export const updateChatMMessages = async (refrenceId, vishayah) => {
  try {
    const db = await openDatabase();
    await db.transaction(async tx => {
      await tx.executeSql(
        `UPDATE td_chat_hawamahal_212
         SET vishayah = ?
         WHERE refrenceId = ?;`,
        [vishayah, refrenceId],
        (_, result) => {
          console.log(
            'Message updated'
          );
        },
        (_, error) => {
          console.error('Error updating message:', error);
          return false;
        },
      );
    });
  } catch (error) {
    console.error('Transaction failed:', error);
  }
};

let cleanupInterval;
