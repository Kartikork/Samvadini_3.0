import SQLite from 'react-native-sqlite-storage';
import { downloadFile } from '../../helper/Helper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEncryptionKey } from './Participants';
import { decryptMessage } from '../../../helper/Encryption';
import { SocketService } from '../../../services/SocketService';
import { getRandomLayout } from '../../../helper/MessageLayout';

SQLite.enablePromise(true);

const openDatabase = async () => {
  try {
    return await SQLite.openDatabase({
      name: 'td_delhi_10.db',
      location: 'default',
    });
  } catch (error) {
    console.error('Error opening database:', error);
    throw error;
  }
};

const serializeReactionMap = value => {
  if (!value || typeof value !== 'object' || Object.keys(value).length === 0) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch (error) {
    console.warn('serializeReactionMap failed:', error?.message || error);
    return null;
  }
};

const parseReactionMap = value => {
  if (!value) {
    return {};
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (_err) {
    return {};
  }
};

const computeReactionSummaryMap = (details = {}) =>
  Object.entries(details).reduce((acc, [, emoji]) => {
    if (!emoji) {
      return acc;
    }
    acc[emoji] = (acc[emoji] || 0) + 1;
    return acc;
  }, {});

const sortSummaryEntries = summary =>
  Object.entries(summary).sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }
    return a[0].localeCompare(b[0]);
  });

const buildReactionDisplayFromSummary = summary => {
  const [topEntry] = sortSummaryEntries(summary);
  if (!topEntry) {
    return null;
  }
  const [emoji, count] = topEntry;
  return count > 1 ? `${emoji} ${count}` : emoji;
};

const pickPrimaryUserFromDetails = (details = {}, summary = {}) => {
  const [topEntry] = sortSummaryEntries(summary);
  if (!topEntry) {
    return null;
  }
  const [targetEmoji] = topEntry;
  const match = Object.entries(details).find(([, emoji]) => emoji === targetEmoji);
  return match ? match[0] : null;
};

export const GroupmessageCreateTable = async () => {
  try {
    const db = await openDatabase();
    await db.executeSql('PRAGMA foreign_keys = ON;');
    await db.transaction(async (tx) => {
      await tx.executeSql(
        `CREATE TABLE IF NOT EXISTS td_gchat_redfort_213 (
          anuvadata_id INTEGER PRIMARY KEY AUTOINCREMENT,
          anuvadata_sandesham INTEGER DEFAULT 0,
          avastha VARCHAR(10) DEFAULT 'sent',
          vishayah TEXT,
          samvada_spashtam INTEGER DEFAULT 0,
          kimFwdSandesha INTEGER DEFAULT 0,
          kimTaritaSandesha INTEGER DEFAULT 0,
          ukti VARCHAR(300),
          sampaditam INTEGER DEFAULT 0,
          nirastah INTEGER DEFAULT 0,
          pathakah_chinha VARCHAR(20),
          pratisandeshah INTEGER DEFAULT 0,
          refrenceId VARCHAR(30) UNIQUE,
          layout VARCHAR(10) DEFAULT 'layout1',
          samvada_chinha VARCHAR(30),
          sandesha_prakara VARCHAR(30) DEFAULT 'text',
          sthapitam_sandesham INTEGER DEFAULT 0,
          reaction TEXT,
          reaction_by VARCHAR(40),
          reaction_updated_at DATETIME,
          reaction_details TEXT,
          reaction_summary TEXT,
          smaranam TEXT,
          preritam_tithih DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (samvada_chinha) REFERENCES td_chat_qutubminar_211 (samvada_chinha) ON DELETE CASCADE
        );`
      );

      await tx.executeSql(
        `CREATE TRIGGER IF NOT EXISTS update_td_gchat_redfort_213
         AFTER UPDATE ON td_gchat_redfort_213
         FOR EACH ROW
         BEGIN
             UPDATE td_gchat_redfort_213 
             SET updatedAt = CURRENT_TIMESTAMP 
             WHERE anuvadata_id = OLD.anuvadata_id;
         END;`
      );

      const indexes = [
        { name: "idx_avastha", column: "avastha" },
        { name: "idx_refrenceId", column: "refrenceId" },
        { name: "idx_sandesha_prakara", column: "sandesha_prakara" },
        { name: "idx_samvada_chinha", column: "samvada_chinha" },
        { name: "idx_preritam_tithih", column: "preritam_tithih" },
      ];

      for (const { name, column } of indexes) {
        await tx.executeSql(
          `CREATE INDEX IF NOT EXISTS ${name} ON td_gchat_redfort_213 (${column});`
        );
      }

      await tx.executeSql(
        `CREATE INDEX IF NOT EXISTS idx_group_chat_time 
         ON td_gchat_redfort_213 (samvada_chinha, preritam_tithih DESC);`
      );
    });
  } catch (error) {
    console.error("Error while creating the 'td_gchat_redfort_213' table:", error);
  }
};

// Delete tables
export const GroupmessageDeleteTables = async () => {
  try {
    const db = await openDatabase();
    await db.transaction(async tx => {
      await tx.executeSql(`DROP TABLE IF EXISTS td_gchat_redfort_213;`);
    });
  } catch (error) {
    console.error("Error deleting table 'td_gchat_redfort_213':", error);
  }
};

// Utility to check permission
export const hasGroupChatPermission = async (samvada_chinha, uniqueId) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT 
          tcb.status, tcb.bhumika,
          tcb.sakriyamastiva, tcq.onlyAdminsCanMessage
        FROM td_chat_qutubminar_211 tcq
        INNER JOIN td_chat_bhagwah_211 tcb
          ON tcq.samvada_chinha_id = tcb.samvada_chinha_id
        WHERE tcq.samvada_chinha = ?
          AND tcb.ekatma_chinha = ?
          AND tcb.status = 'Accepted'
          AND tcb.sakriyamastiva = 1`,
        [samvada_chinha, uniqueId],
        (_, result) => {
          const data = result.rows.length > 0 ? result.rows.item(0) : null;
          resolve(data);
        },
        (_, error) => {
          console.error('❌ Error checking permission:', error);
          reject(error);
        }
      );
    });
  });
};

// Main insert function
export const insertGroupMessage = async (data) => {
  try {
    const uniqueId = await AsyncStorage.getItem("uniqueId");
    const hasPermission = await hasGroupChatPermission(data.samvada_chinha, uniqueId);
    const layout = getRandomLayout();
    if (!hasPermission) {
      console.log("Don't have permission");
      return;
    }

    const db = await openDatabase();
    db.transaction((tx) => {
      const reactionValue = data?.reaction ?? null;
      const reactionByValue = data?.reaction ? data?.reaction_by ?? null : null;
      const reactionDetailsValue = serializeReactionMap(data?.reaction_details);
      const reactionSummaryValue = serializeReactionMap(data?.reaction_summary);
      let reactionUpdatedAtValue = null;

      if (reactionValue) {
        try {
          reactionUpdatedAtValue = data?.reaction_updated_at
            ? new Date(data.reaction_updated_at).toISOString()
            : new Date().toISOString();
        } catch (e) {
          reactionUpdatedAtValue = new Date().toISOString();
        }
      }

      tx.executeSql(
        `INSERT INTO td_gchat_redfort_213
          (avastha, vishayah, kimFwdSandesha, nirastah, pathakah_chinha, 
          pratisandeshah, kimTaritaSandesha, sampaditam, refrenceId, ukti, 
          samvada_chinha, sandesha_prakara, sthapitam_sandesham, reaction, reaction_by, reaction_updated_at, reaction_details, reaction_summary, smaranam, preritam_tithih, layout,
          createdAt, updatedAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          data?.avastha || 'sent',
          data?.vishayah || '',
          data?.kimFwdSandesha ? 1 : 0,
          data?.nirastah ? 1 : 0,
          data?.pathakah_chinha || '',
          data?.pratisandeshah || '',
          data?.kimTaritaSandesha ? 1 : 0,
          data?.sampaditam ? 1 : 0,
          data?.refrenceId || '',
          data?.ukti || '',
          data?.samvada_chinha,
          data?.sandesha_prakara || 'text',
          data?.sthapitam_sandesham ? 1 : 0,
          reactionValue,
          reactionByValue,
          reactionUpdatedAtValue,
          reactionDetailsValue,
          reactionSummaryValue,
          Array.isArray(data?.smaranam) ? JSON.stringify(data.smaranam) : (data?.smaranam || ''),
          new Date().toISOString(),
          layout,
        ],
        (_, result) => {
          console.log('Message inserted successfully:');
        },
        (_, error) => {
          console.error(' Error inserting message:', error);
        }
      );
    });
  } catch (error) {
    console.error(" Error inserting group message:", error);
  }
};
export const insertOrUpdateBulkGroupMessages = async (records) => {
  if (!records || records.length === 0) {
    return;
  }

  try {
    const db = await openDatabase();
    const self = await getEncryptionKey();
    const nowISO = new Date().toISOString();

    const processedRecords = await Promise.all(
      records.map(async (data) => {
        if (!data.refrenceId || !data.samvada_chinha || !data.pathakah_chinha) return null;

        const validPrakara = ['text', 'link', 'sos', 'contact', 'video_call', 'location', 'live_location', 'audio_call', 'system_event'];
        const validPrakaraEncrypt = ['text', 'link', 'sos', 'contact', 'location', 'live_location', 'multiple/media'];
        let vishayahValue = data.vishayah;

        if (data.sandesha_prakara?.startsWith("application/") || data.sandesha_prakara.startsWith('image/') || data.sandesha_prakara.startsWith('video/')) {
          try {
            const [fileUri, fileName, fileSize] = (data.vishayah.join(',') || '').split('|||');
            const localFilePath = await downloadFile(
              fileUri,
              fileName || data.refrenceId,
              fileSize,
              data.sandesha_prakara
            );
            if (localFilePath) vishayahValue = localFilePath;
          } catch (downloadError) {
            console.error('File download error:', downloadError);
            return null;
          }
        }

        if (validPrakaraEncrypt.includes(data.sandesha_prakara)) {
          try {
            vishayahValue = await decryptMessage(vishayahValue, self?.privateKey);
          } catch (error) {
            console.log('Decryption failed:', error);
          }
        }

        const reactionRaw = data.reaction ?? null;
        const hasReaction = !!reactionRaw && reactionRaw !== '';
        let normalizedReactionTimestamp = null;

        const reactionDetailsRaw = parseReactionMap(data.reaction_details || data.reactionDetails);
        const reactionSummaryRaw = parseReactionMap(data.reaction_summary || data.reactionSummary);

        if (hasReaction) {
          try {
            normalizedReactionTimestamp = data.reaction_updated_at
              ? new Date(data.reaction_updated_at).toISOString()
              : nowISO;
          } catch (e) {
            normalizedReactionTimestamp = nowISO;
          }
        }

        return {
          ...data,
          vishayahValue,
          avastha: data.avastha || 'sent',
          createdAt: data.createdAt || nowISO,
          updatedAt: data.updatedAt || nowISO,
          layout: getRandomLayout(),
          samvada_spashtam: JSON.stringify(data.samvada_spashtam || []),
          smaranam: Array.isArray(data?.smaranam) ? JSON.stringify(data.smaranam) : (data?.smaranam || ''),
          reaction: hasReaction ? reactionRaw : null,
          reaction_by: hasReaction ? data.reaction_by ?? null : null,
          reaction_updated_at: hasReaction ? normalizedReactionTimestamp : null,
          reaction_details: reactionDetailsRaw,
          reaction_summary: reactionSummaryRaw,
        };
      })
    );

    // Filter out nulls
    const validRecords = processedRecords.filter(Boolean);
    if (validRecords.length === 0) return;

    await new Promise((resolve, reject) => {
      db.transaction((tx) => {
        let completed = 0;
        const total = validRecords.length;

        for (const data of validRecords) {
          // First, try to update existing record
          const updateQuery = `
            UPDATE td_gchat_redfort_213 SET
              vishayah = ?,
              ukti = ?,
              samvada_spashtam = ?,
              nirastah = ?,
              sthapitam_sandesham = ?,
              pratisandeshah = ?,
              sampaditam = ?,
              reaction = COALESCE(?, reaction),
              reaction_by = COALESCE(?, reaction_by),
              reaction_updated_at = COALESCE(?, reaction_updated_at),
              reaction_details = COALESCE(?, reaction_details),
              reaction_summary = COALESCE(?, reaction_summary),
              updatedAt = ?
            WHERE refrenceId = ?`;

          const updateParams = [
            data.vishayahValue || '',
            data.ukti || '',
            data.samvada_spashtam,
            data.nirastah ? 1 : 0,
            data.sthapitam_sandesham || null,
            data.pratisandeshah || '',
            data.sampaditam ? 1 : 0,
            data.reaction,
            data.reaction_by,
            data.reaction_updated_at,
            serializeReactionMap(data.reaction_details),
            serializeReactionMap(data.reaction_summary),
            data.updatedAt,
            data.refrenceId
          ];

          tx.executeSql(
            updateQuery,
            updateParams,
            (tx, result) => {
              // If no rows were updated, insert new record
              if (result.rowsAffected === 0) {
                const insertParams = [
                  data.samvada_chinha,
                  data.refrenceId,
                  data.pathakah_chinha,
                  data.vishayahValue || '',
                  data.sandesha_prakara || 'text',
                  data.anuvadata_sandesham ? 1 : 0,
                  data.avastha || 'sent',
                  data.ukti || '',
                  data.samvada_spashtam,
                  data.nirastah ? 1 : 0,
                  data.sthapitam_sandesham || null,
                  data.preritam_tithih || nowISO,
                  data.pratisandeshah || '',
                  data.kimFwdSandesha ? 1 : 0,
                  data.sampaditam ? 1 : 0,
                  data.reaction,
                  data.reaction_by,
                  data.reaction_updated_at,
                  serializeReactionMap(data.reaction_details),
                  serializeReactionMap(data.reaction_summary),
                  data.smaranam,
                  data.layout,
                  data.createdAt,
                  data.updatedAt,
                ];

                const insertQuery = `
                  INSERT INTO td_gchat_redfort_213 (
                    samvada_chinha, refrenceId, pathakah_chinha, vishayah, sandesha_prakara,
                    anuvadata_sandesham, avastha, ukti, samvada_spashtam, nirastah,
                    sthapitam_sandesham, preritam_tithih, pratisandeshah, kimFwdSandesha,
                    sampaditam, reaction, reaction_by, reaction_updated_at, reaction_details, reaction_summary,
                    smaranam, layout, createdAt, updatedAt
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                tx.executeSql(
                  insertQuery,
                  insertParams,
                  () => {
                    handleSuccess(data);
                    completed++;
                    if (completed === total) resolve();
                  },
                  (_, err) => {
                    console.error('Insert Error:', err);
                    completed++;
                    if (completed === total) resolve();
                    return false;
                  }
                );
              } else {
                // Update was successful
                handleSuccess(data);
                completed++;
                if (completed === total) resolve();
              }
            },
            (_, err) => {
              console.error('Update Error:', err);
              completed++;
              if (completed === total) resolve();
              return false;
            }
          );
        }
      }, reject);
    });
  } catch (err) {
    console.error('Bulk Insert/Update Error:', err);
    throw err;
  }

  function handleSuccess(data) {
    try {
      SocketService.emit('message_inserted', {
        ...data,
        vishayah: data.vishayahValue,
        sandesha_prakara: data.sandesha_prakara || 'text',
        reaction: data.reaction,
        reaction_by: data.reaction_by,
        reaction_updated_at: data.reaction_updated_at,
      });
    } catch (e) {
      console.error('❌ [GroupMessageSchema] Message insert emit failed:', e);
    }
  }
};
export const fetchGroupMessages = async (samvada_chinha, uniqueId, limit = 50, offset = 0) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT
              grp.*,
              CASE
                  WHEN grp.pathakah_chinha = ? THEN 'You'
                  ELSE COALESCE(tf.praman_patrika, tcb.praman_patrika)
              END AS name,
              CASE
                  WHEN grp.pathakah_chinha = ? THEN NULL
                  ELSE COALESCE(tf.parichayapatra, tcb.parichayapatra)
              END AS photo
          FROM td_gchat_redfort_213 grp
          LEFT JOIN td_fort_113 tf
              ON tf.ekatma_chinha = grp.pathakah_chinha
          LEFT JOIN (
                  SELECT *
                  FROM td_chat_bhagwah_211 AS x
                  WHERE x.id IN (
                      SELECT MAX(id)
                      FROM td_chat_bhagwah_211
                      GROUP BY ekatma_chinha
                  )
          ) AS tcb
              ON tcb.ekatma_chinha = grp.pathakah_chinha
          WHERE grp.samvada_chinha = ?
          ORDER BY grp.preritam_tithih DESC
          LIMIT ? OFFSET ?;`,
          [uniqueId, uniqueId, samvada_chinha, limit, offset],
          (_, results) => {
            const allMessages = results.rows.raw();
            resolve(allMessages.length > 0 ? allMessages : []);
          },
          (_, error) => {
            console.error("Error fetching Messages:", error);
            resolve([]);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in fetchGroupMessages:', error);
    throw error;
  }
};

export const getGroupMessageCount = async (samvada_chinha, uniqueId) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT COUNT(*) as count FROM td_gchat_redfort_213
           WHERE samvada_chinha = ?;`,
          [samvada_chinha],
          (_, results) => {
            const count = results.rows.item(0).count;
            resolve(count);
          },
          (_, error) => {
            console.error("Error counting messages:", error);
            resolve(0);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in getGroupMessageCount:', error);
    throw error;
  }
};

export const updateEditGroupMessages = async data => {
  try {
    const db = await openDatabase();
    const { referenceIds, updates, type } = data;
    let updateQuery = { ...updates, updatedAt: new Date().toISOString() };

    if (type === 'delete') {
      const deleteQuery = `DELETE FROM td_gchat_redfort_213 WHERE refrenceId IN (${referenceIds
        .map(() => '?')
        .join(', ')})`;

      await new Promise((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            deleteQuery,
            referenceIds,
            () => resolve(),
            (_, error) => reject(error),
          );
        });
      });
      return {
        success: true,
        message: `${referenceIds.length} messages deleted successfully`,
      };
    }

    switch (type) {
      case 'edit':
        updateQuery = {
          ...updates,
          sampaditam: true,
          updatedAt: new Date().toISOString()
        };
        break;

      case 'reaction': {
        const isoNow = new Date().toISOString();
        const reactionValue = updates?.reaction ?? null;
        const normalizedDetails = parseReactionMap(updates?.reaction_details);
        const normalizedSummary = parseReactionMap(updates?.reaction_summary);
        const serializedDetails = serializeReactionMap(normalizedDetails);
        const serializedSummary = serializeReactionMap(normalizedSummary);
        const hasDetails = !!serializedDetails;

        updateQuery = {
          reaction: reactionValue,
          reaction_by: hasDetails ? updates?.reaction_by ?? null : null,
          reaction_updated_at: hasDetails
            ? updates?.reaction_updated_at ?? isoNow
            : null,
          reaction_details: serializedDetails,
          reaction_summary: serializedSummary,
          updatedAt: isoNow,
        };
        break;
      }

      case 'star':
        updateQuery = {
          kimTaritaSandesha: 1,
          updatedAt: new Date().toISOString(),
        };
        break;

      case 'unStar':
        updateQuery = {
          kimTaritaSandesha: 0,
          updatedAt: new Date().toISOString(),
        };
        break;

      case 'pin':
        updateQuery = {
          sthapitam_sandesham: 1,
          updatedAt: new Date().toISOString(),
        };
        break;

      case 'unPin':
        updateQuery = {
          sthapitam_sandesham: 0,
          updatedAt: new Date().toISOString(),
        };
        break;

      case 'deleteEveryone':
        updateQuery = { nirastah: 1, sthapitam_sandesham: 0, kimTaritaSandesha: 0, updatedAt: new Date().toISOString() };
        break;

      default:
        updateQuery = { ...updates, updatedAt: new Date().toISOString() };
        break;
    }

    const updateFields = Object.keys(updateQuery)
      .map(key => `${key} = ?`)
      .join(', ');
    const updateValues = Object.values(updateQuery);
    updateValues.push(...referenceIds);

    const query = `UPDATE td_gchat_redfort_213 SET ${updateFields} WHERE refrenceId IN (${referenceIds
      .map(() => '?')
      .join(', ')})`;

    await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          query,
          updateValues,
          () => resolve(),
          (_, error) => reject(error),
        );
      });
    });

    return {
      success: true,
      message: `${referenceIds.length} messages updated successfully`,
    };
  } catch (error) {
    console.error('Error updating messages:', error);
    return {
      success: false,
      message: `Failed to update messages: ${error.message}`,
    };
  }
};

export const updateGroupMessageReaction = async (
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
  const normalizedDetails = parseReactionMap(reactionDetails);
  const providedSummary = parseReactionMap(reactionSummary);
  const effectiveSummary =
    Object.keys(providedSummary).length > 0
      ? providedSummary
      : computeReactionSummaryMap(normalizedDetails);

  const normalizedReaction = reaction ?? buildReactionDisplayFromSummary(effectiveSummary) ?? null;
  const normalizedReactionBy = normalizedReaction
    ? pickPrimaryUserFromDetails(normalizedDetails, effectiveSummary) ?? reactedBy ?? null
    : null;

  let normalizedReactionTimestamp = null;
  const hasAnyReaction = Object.keys(normalizedDetails).length > 0;

  if (hasAnyReaction) {
    try {
      normalizedReactionTimestamp = new Date(reactionTimestamp).toISOString();
    } catch (e) {
      normalizedReactionTimestamp = updatedAt;
    }
  }

  const serializedDetails = serializeReactionMap(normalizedDetails);
  const serializedSummary = serializeReactionMap(effectiveSummary);

  const params = [
    normalizedReaction,
    normalizedReactionBy,
    normalizedReactionTimestamp,
    serializedDetails,
    serializedSummary,
    updatedAt,
    refrenceId,
  ];

  await db.transaction(async tx => {
    await tx.executeSql(
      `UPDATE td_gchat_redfort_213
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
    reaction_details: normalizedDetails,
    reaction_summary: effectiveSummary,
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


export const FetchGroupMedia = async (samvada_chinha) => {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT vishayah, sandesha_prakara, preritam_tithih
           FROM td_gchat_redfort_213
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

export const fetchAllStarredGroupMessages = async () => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT grp.*, tq.samvada_nama, tq.samuha_chitram FROM td_gchat_redfort_213 grp
          inner join td_chat_qutubminar_211 tq
          on tq.samvada_chinha = grp.samvada_chinha
           WHERE grp.kimTaritaSandesha = 1 AND grp.nirastah = 0;
           ORDER BY preritam_tithih DESC`,
          [],
          (_, results) => {
            const allStarMessages = results.rows.raw();
            resolve(allStarMessages.length > 0 ? allStarMessages : []);
          },
          (_, error) => {
            console.error("Error fetching Messages:", error);
            resolve([]);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in fetchAllStarredGroupMessages:', error);
    throw error;
  }
};

export const updateGroupStatusUpdate = async (samvada_chinha, uniqueId, status, isactive) => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT samvada_chinha_id FROM td_chat_qutubminar_211 WHERE samvada_chinha = ?`,
        [samvada_chinha],
        (_, result) => {
          if (result.rows.length > 0) {
            const samvadaChinhaId = result.rows.item(0).samvada_chinha_id;

            tx.executeSql(
              `UPDATE td_chat_bhagwah_211 
               SET status = ?, sakriyamastiva = ? 
               WHERE samvada_chinha_id = ? 
               AND ekatma_chinha IN (?, (
                   SELECT ekatma_chinha 
                   FROM td_chat_bhagwah_211 
                   WHERE samvada_chinha_id = ?
               ))`,
              [status, isactive, samvadaChinhaId, uniqueId, samvadaChinhaId],
              (_, updateResult) => {

                tx.executeSql(
                  `UPDATE td_chat_qutubminar_211 SET samvadaspashtah = 0 WHERE samvada_chinha = ?`,
                  [samvada_chinha],
                  () => {
                    resolve(true);
                  },
                  (_, updateError) => {
                    console.error('❌ Error updating samvadaspashtah:', updateError);
                    reject(updateError);
                  }
                );
              },
              (_, updateError) => {
                console.error('❌ Error updating participant status:', updateError);
                reject(updateError);
              }
            );
          } else {
            resolve(false);
          }
        },
        (_, error) => {
          console.error('❌ Error fetching samvada_chinha_id:', error);
          reject(error);
        }
      );
    });
  });
};

export const updateGroupAvashatha = async (chatId, myId) => {
  try {
    const db = await openDatabase();
    const updatedAt = new Date().toISOString();

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `UPDATE td_gchat_redfort_213 
           SET avastha = "read", updatedAt = ? 
           WHERE pathakah_chinha != ? AND avastha != 'read' AND samvada_chinha = ?`,
          [updatedAt, myId, chatId],
          (_, results) => {
            resolve(results.rowsAffected);
          },
          (_, error) => {
            console.error('Error updating group avastha:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in updateGroupAvashatha:', error);
    throw error;
  }
};

export const updateAvasthaByRefrenceId = async (refrenceId, newAvastha) => {
  try {
    const db = await openDatabase();
    await db.transaction(async (tx) => {
      await tx.executeSql(
        `UPDATE td_gchat_redfort_213 
         SET avastha = ?, updatedAt = CURRENT_TIMESTAMP 
         WHERE refrenceId = ?;`,
        [newAvastha, refrenceId]
      );
    });
    return true;
  } catch (error) {
    console.error("Error while updating avastha:", error);
    return false;
  }
};

export const updateGrpMMessages = async (refrenceId, vishayah) => {
  try {
    const db = await openDatabase();
    await db.transaction(async tx => {
      await tx.executeSql(
        `UPDATE td_gchat_redfort_213
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


