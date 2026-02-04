import SQLite from 'react-native-sqlite-storage';
import { axiosConn } from '../../helper/Config';
import { DeviceEventEmitter } from 'react-native';
SQLite.enablePromise(true);

export const openDatabase = async () => {
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

export const createChatListTable = async () => {
  try {
    const db = await openDatabase();
    db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS td_chat_qutubminar_211 (
          samvada_chinha_id INTEGER PRIMARY KEY AUTOINCREMENT,
          samvada_chinha VARCHAR(20) UNIQUE NOT NULL,
          pathakah_chinha VARCHAR(20),
          myId VARCHAR(20),
          prakara VARCHAR(7) DEFAULT 'Chat',
          laghu_sthapitam_upayogakartarah INTEGER DEFAULT 0,
          sangrahita_upayogakartarah INTEGER DEFAULT 0,
          samuha_chitram TEXT,
          samvada_nama VARCHAR(255),
          samuhavarnanam VARCHAR(500),
          prayoktaramnishkasaya VARCHAR(150),
          is_chat_reported VARCHAR(150),
          samvadaspashtah INTEGER DEFAULT 0,
          is_private_room INTEGER DEFAULT 0,
          room_code VARCHAR(20) UNIQUE DEFAULT NULL,
          private_room_name VARCHAR(20),
          is_emergency INTEGER DEFAULT 0,
          expires_at INTEGER DEFAULT 0,
          emergency_reltive VARCHAR(50),
          prasaranam TEXT DEFAULT NULL,
          sandesh_ghatita VARCHAR(50) DEFAULT "Off",
          vargah VARCHAR(50) DEFAULT "All",
          linga VARCHAR(50) DEFAULT "All",
          vayah_min INTEGER DEFAULT 0,
          vayah_max INTEGER DEFAULT 0,
          onlyAdminsCanMessage INTEGER DEFAULT 0,
          guptata VARCHAR(50) DEFAULT "Public",
          createdAt DATETIME,
          updatedAt DATETIME
        );`,
        [],
        () => console.log('Table td_chat_qutubminar_211 created successfully'),
        (_, error) => console.error('Error creating table:', error)
      );

      const indexes = [
        { name: 'idx_pathakah_chinha', column: 'pathakah_chinha' },
        { name: 'idx_prakara', column: 'prakara' },
        { name: 'idx_is_private_room', column: 'is_private_room' },
        { name: 'idx_is_emergency', column: 'is_emergency' },
        { name: 'idx_samvadaspashtah', column: 'samvadaspashtah' },
        { name: 'idx_myId', column: 'myId' },
        { name: 'idx_samvada_chinha', column: 'samvada_chinha' },
        { name: 'idx_room_code', column: 'room_code' },
        { name: 'idx_sandesh_ghatita', column: 'sandesh_ghatita' },
      ];

      indexes.forEach(({ name, column }) => {
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS ${name} ON td_chat_qutubminar_211 (${column});`,
          [],
          () => console.log(`Index ${name} created successfully`),
          (_, error) => console.error(`Error creating index ${name}:`, error)
        );
      });
    });
  } catch (error) {
    console.error("Error while creating 'td_chat_qutubminar_211' table:", error);
  }
};

export const insertOrUpdateChatList = async (
  chatDataArray,
  isPhoneNumberHidden,
  myId
) => {
  try {
    const db = await openDatabase();
    const results = [];
    const errors = [];

    if (!Array.isArray(chatDataArray)) {
      console.warn("chatDataArray is not an array, wrapping it");
      chatDataArray = chatDataArray ? [chatDataArray] : [];
    }

    for (const chatData of chatDataArray) {
      try {
        const result = await db.transaction(async (tx) => {
          try {
            const samvada_chinha_id = await insertOrUpdateChat(tx, chatData, myId);
            await insertOrUpdateParticipants(
              samvada_chinha_id,
              chatData,
              isPhoneNumberHidden,
              myId
            );
            DeviceEventEmitter.emit("newChatRequest");
            return { success: true, chatId: chatData._id, samvada_chinha_id };
          } catch (error) {
            console.error(`Error processing chat ${chatData._id}:`, error);
            throw error;
          }
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to process chat ${chatData._id}:`, error);
        errors.push({ chatId: chatData._id, error: error.message });
      }
    }

    if (errors.length > 0) {
      console.warn("Some chats failed to process:", errors);
    }
    return { results, errors };
  } catch (error) {
    console.error("Critical error in insertOrUpdateChatList:", error);
    throw error;
  }
};

export const updateChatVargahInDB = async (samvada_chinha, vargahValue) => {
  try {
    const db = await openDatabase();
    await db.executeSql(
      `UPDATE td_chat_qutubminar_211 
       SET vargah = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE samvada_chinha = ?`,
      [vargahValue, samvada_chinha]
    );
    console.log(`✅ Updated vargah in SQLite: ${samvada_chinha} → ${vargahValue}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating vargah in SQLite:', error);
    throw error;
  }
};

const insertOrUpdateChat = (tx, chatData, myId) => {
  const chatId = chatData._id;

  return new Promise((resolve, reject) => {
    let name = '';
    let roomCode = null;
    if (chatData.is_private_room) {
      name = chatData.user_chat_names?.[myId] || '';
      roomCode = chatData.room_code;
    }

    const participantsStr = JSON.stringify(chatData.prayoktaramnishkasaya || []);
    const prasaranamStr = JSON.stringify(chatData.prasaranam || []);

    tx.executeSql(
      `SELECT samvada_chinha_id FROM td_chat_qutubminar_211 WHERE samvada_chinha = ?;`,
      [chatId],
      (_, results) => {
        if (results.rows.length > 0) {
          const samvada_chinha_id = results.rows.item(0).samvada_chinha_id;

          tx.executeSql(
            `UPDATE td_chat_qutubminar_211 SET
                samvada_nama = ?, 
                samuha_chitram = ?, 
                samuhavarnanam = ?,
                prayoktaramnishkasaya = ?,
                is_private_room = ?,
                room_code = ?,
                private_room_name = ?,
                expires_at = ?,
                sandesh_ghatita = ?,
                prasaranam = ?,
                vargah = ?,
                linga = ?,
                vayah_min = ?,
                vayah_max = ?,
                onlyAdminsCanMessage = ?,
                guptata = ?,
                updatedAt = ?
             WHERE samvada_chinha_id = ?;`,
            [
              chatData.samvada_nama,
              chatData.samuha_chitram,
              chatData.samuhavarnanam || '',
              participantsStr,
              chatData.is_private_room ? 1 : 0,
              roomCode,
              name,
              chatData.expires_at ? 1 : 0,
              chatData.sandesh_ghatita || "Off",
              prasaranamStr,
              chatData.vargah || 'All',
              chatData.linga || 'All',
              chatData.vayah_min || 0,
              chatData.vayah_max || 100,
              chatData.onlyAdminsCanMessage ? 1 : 0,
              chatData.guptata || 'Public',
              chatData.updatedAt || new Date().toISOString(),
              samvada_chinha_id,
            ],
            () => {
              resolve(samvada_chinha_id);
            },
            (_, error) => reject(error)
          );
        } else {
          tx.executeSql(
            `INSERT INTO td_chat_qutubminar_211 (
              samvada_chinha, pathakah_chinha, prakara, myId,
              laghu_sthapitam_upayogakartarah, sangrahita_upayogakartarah, 
              samuha_chitram, samvada_nama, samuhavarnanam, prayoktaramnishkasaya,
              samvadaspashtah, is_private_room, expires_at, room_code, private_room_name,
              sandesh_ghatita, prasaranam, vargah, linga, vayah_min, vayah_max, onlyAdminsCanMessage, guptata,
              createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              chatId,
              chatData.pathakah_chinha,
              chatData.prakara,
              myId,
              0, 0,
              chatData.samuha_chitram,
              chatData.samvada_nama,
              chatData.samuhavarnanam || '',
              participantsStr,
              chatData.samvadaspashtah || 0,
              chatData.is_private_room ? 1 : 0,
              chatData.expires_at ? 1 : 0,
              roomCode,
              name,
              chatData.sandesh_ghatita || "Off",
              prasaranamStr,
              chatData.vargah || 'All',
              chatData.linga || 'All',
              chatData.vayah_min || 0,
              chatData.vayah_max || 100,
              chatData.onlyAdminsCanMessage ? 1 : 0,
              chatData.guptata || 'Public',
              chatData.createdAt || new Date().toISOString(),
              chatData.updatedAt || new Date().toISOString(),
            ],
            (_, insertResults) => {
              resolve(insertResults.insertId);
            },
            (_, error) => reject(error)
          );
        }
      },
      (_, error) => reject(error)
    );
  });
};

const insertOrUpdateParticipants = async (samvada_chinha_id, chatData, isPhoneNumberHidden, myId) => {
  try {
    const db = await openDatabase();
    const participants = Array.isArray(chatData?.samuha_suchana) ? chatData.samuha_suchana : [];
    if (participants.length === 0) return;

    // Fetch existing participants once
    const existingParticipants = await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT ekatma_chinha FROM td_chat_bhagwah_211 WHERE samvada_chinha_id = ?;`,
          [samvada_chinha_id],
          (_, results) => {
            const existing = new Set();
            for (let i = 0; i < results.rows.length; i++) {
              existing.add(results.rows.item(i).ekatma_chinha);
            }
            resolve(existing);
          },
          (_, error) => {
            console.error('Error fetching existing participants:', error);
            reject(error);
          }
        );
      });
    });

    // Helper: run SQL
    const runQuery = (query, values, errorMsg) =>
      new Promise((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(query, values, () => resolve(), (_, error) => {
            console.error(errorMsg, error);
            reject(error);
          });
        });
      });

    for (const participant of participants) {
      let statusToInsert = participant.status;

      const removedBy = participant?.removedBy ?? chatData?.removedBy ?? null;
      const commonValues = [
        participant?.role || 'Member',
        participant?.is_registered ? 1 : 0,
        participant?.durasamparka_sankhya || null,
        participant?.hidePhoneNumber ? 1 : 0,
        participant?.participantName || '',
        participant?.participantPhoto || '',
        removedBy,
        participant?.isActive ? 1 : 0,
        participant?.isCreatorExit ? 1 : 0,
        participant?.removedAt || null,
        participant?.janma_tithi || null,
        participant?.linga || null,
        participant.uniqueId,
        samvada_chinha_id,
      ];

      const updateWithStatus = [
        statusToInsert,
        ...commonValues,
      ];

      const isExisting = existingParticipants.has(participant.uniqueId);

      if (isExisting) {
        // Case 1: Non-Chat updates include status
        if (chatData.prakara !== 'Chat') {
          await runQuery(
            `UPDATE td_chat_bhagwah_211 SET status = ?, bhumika = ?, is_registered = ?, durasamparka_sankhya = ?, hidePhoneNumber = ?,
             praman_patrika = ?, parichayapatra = ?, yahniskasitah = ?, sakriyamastiva = ?, nirmatanirgatahastiva = ?, removedAt = ?, janma_tithi = ?, linga = ?
             WHERE ekatma_chinha = ? AND samvada_chinha_id = ?;`,
            updateWithStatus,
            `Error updating participant ${participant.uniqueId}:`
          );
        }
        // Case 2: Chat updates, not self (include status)
        else if (participant.uniqueId !== myId) {
          await runQuery(
            `UPDATE td_chat_bhagwah_211 SET status = ?, bhumika = ?, is_registered = ?, durasamparka_sankhya = ?, hidePhoneNumber = ?,
             praman_patrika = ?, parichayapatra = ?, yahniskasitah = ?, sakriyamastiva = ?, nirmatanirgatahastiva = ?, removedAt = ?, janma_tithi = ?, linga = ?
             WHERE ekatma_chinha = ? AND samvada_chinha_id = ?;`,
            updateWithStatus,
            `Error updating participant ${participant.uniqueId}:`
          );
        }
        // Case 3: Chat updates, self (skip status)
        else {
          await runQuery(
            `UPDATE td_chat_bhagwah_211 SET bhumika = ?, is_registered = ?, durasamparka_sankhya = ?, hidePhoneNumber = ?,
             praman_patrika = ?, parichayapatra = ?, yahniskasitah = ?, sakriyamastiva = ?, nirmatanirgatahastiva = ?, removedAt = ?, janma_tithi = ?, linga = ?
             WHERE ekatma_chinha = ? AND samvada_chinha_id = ?;`,
            commonValues,
            `Error updating participant ${participant.uniqueId}:`
          );
        }
      } else {
        // Insert logic
        if (
          participant.uniqueId === myId &&
          (participant.status === 'Pending' || participant.status === 'MsgSent') &&
          isPhoneNumberHidden &&
          chatData.prakara === 'Chat'
        ) {
          const otherParticipant = participants.find(p => p.uniqueId !== myId);
          if (otherParticipant) {
            const exists = await new Promise((resolve, reject) => {
              db.transaction(tx => {
                tx.executeSql(
                  `SELECT * FROM td_fort_113 WHERE ekatma_chinha = ?;`,
                  [otherParticipant.uniqueId],
                  (_, result) => resolve(result.rows.length > 0),
                  (_, error) => {
                    console.error('SQL Error when checking contacts:', error);
                    reject(error);
                  }
                );
              });
            });

            if (exists) {
              statusToInsert = 'Accepted';
              try {
                await axiosConn('post', 'api/chat/update-chat-request', {
                  id: chatData._id,
                  uniqueId: myId,
                  status: 'Accepted',
                  timeStamp: new Date().toISOString(),
                });
              } catch (error) {
                console.error('Error updating chat request status during insertion:', error);
              }
            }
          }
        }

        const insertValues = [
          samvada_chinha_id,
          participant.uniqueId,
          participant.privateKey || null,
          participant.publicKey || null,
          statusToInsert,
          participant.participantName || '',
          participant.participantPhoto || '',
          chatData.addedBy || null,
          chatData.removedBy || null,
          participant.isActive ? 1 : 0,
          participant.is_registered ? 1 : 0,
          participant?.durasamparka_sankhya || null,
          participant.hidePhoneNumber ? 1 : 0,
          participant.role || 'Member',
          participant.isCreatorExit ? 1 : 0,
          participant.joinedAt || null,
          participant.removedAt || null,
          participant?.janma_tithi || null,
          participant?.linga || null,
        ];

        await runQuery(
          `INSERT INTO td_chat_bhagwah_211 (
            samvada_chinha_id, ekatma_chinha, privateKey, publicKey, status,
            praman_patrika, parichayapatra, yahyojitah, yahniskasitah, sakriyamastiva, is_registered,
            durasamparka_sankhya, hidePhoneNumber, bhumika, nirmatanirgatahastiva, joinedAt, removedAt, janma_tithi, linga
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          insertValues,
          `Error inserting participant ${participant.uniqueId}:`
        );
      }
    }
  } catch (error) {
    console.error('Error processing participants:', error);
  }
};

export const insertSingleChat = async (chatData, isPhoneNumberHidden, myId) => {
  try {
    const db = await openDatabase();
    const result = await new Promise((resolve, reject) => {
      db.transaction(
        tx => {
          insertOrUpdateChat(tx, chatData, myId)
            .then(samvada_chinha_id => {
              return insertOrUpdateParticipants(samvada_chinha_id, chatData, isPhoneNumberHidden, myId)
                .then(() => {
                  const returnValue = { success: true, chatId: chatData._id, samvada_chinha_id };
                  resolve(returnValue);
                });
            })
            .catch(error => {
              console.error(`Error processing chat ${chatData._id}:`, error);
              reject(error);
            });
        },
        error => {
          console.error('Transaction error:', error);
          reject(error);
        }
      );
    });
    return result;
  } catch (error) {
    console.error('Error in insertSingleChat:', error);
    throw error;
  }
};

export const DeleteChatListTables = async () => {
  try {
    const db = await openDatabase();
    await db.transaction(async tx => {
      await tx.executeSql(`DROP TABLE IF EXISTS td_chat_bhagwah_211;`);
      await tx.executeSql(`DROP TABLE IF EXISTS td_chat_qutubminar_211;`);
    });
    console.log("Table 'td_chat_qutubminar_211' and dependencies deleted successfully.");
  } catch (error) {
    console.error('Error deleting tables:', error);
  }
};

export const getAllChatLists = async (uniqueId) => {
  try {
    if (!uniqueId) {
      return [];
    }

    const db = await openDatabase();
    const params = [
      uniqueId,
      uniqueId,
      uniqueId,
      uniqueId,
      uniqueId,
      uniqueId,
      uniqueId,
      uniqueId,
    ];

    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `WITH latest_message AS (
            SELECT m.*
            FROM (
                SELECT samvada_chinha, MAX(preritam_tithih) AS max_tithih
                FROM (
                    SELECT samvada_chinha, preritam_tithih
                    FROM td_chat_hawamahal_212
                    WHERE (is_disappearing = 0 OR disappear_at > CURRENT_TIMESTAMP)

                    UNION ALL

                    SELECT samvada_chinha, preritam_tithih
                    FROM td_gchat_redfort_213
                    WHERE sandesha_prakara NOT IN ('system_event','role_changed','member_added','member_removed')
                )
                GROUP BY samvada_chinha
            ) sub
            JOIN (
                SELECT samvada_chinha, preritam_tithih, 
                       CASE 
                         WHEN sandesha_prakara LIKE 'image/%' THEN '📷 Photo'
                         WHEN sandesha_prakara LIKE 'video/%' THEN '🎥 Video'
                         WHEN sandesha_prakara LIKE 'audio/%' THEN '🎵 Audio'
                         WHEN sandesha_prakara LIKE 'application/%' THEN '📄 Document'
                         ELSE vishayah
                       END as vishayah,
                       vishayah as vishayah_url,
                       avastha, pathakah_chinha, sandesha_prakara, nirastah
                FROM td_chat_hawamahal_212
                WHERE (is_disappearing = 0 OR disappear_at > CURRENT_TIMESTAMP)

                UNION ALL

                SELECT samvada_chinha, preritam_tithih,
                       CASE 
                         WHEN sandesha_prakara LIKE 'image/%' THEN '📷 Photo'
                         WHEN sandesha_prakara LIKE 'video/%' THEN '🎥 Video'
                         WHEN sandesha_prakara LIKE 'audio/%' THEN '🎵 Audio'
                         WHEN sandesha_prakara LIKE 'application/%' THEN '📄 Document'
                         ELSE vishayah
                       END as vishayah,
                       vishayah as vishayah_url,
                       avastha, pathakah_chinha, sandesha_prakara, nirastah
                FROM td_gchat_redfort_213
            ) m
            ON m.samvada_chinha = sub.samvada_chinha
            AND m.preritam_tithih = sub.max_tithih
          ),
          unread_chat AS (
            SELECT samvada_chinha, COUNT(*) AS unread_count
            FROM td_chat_hawamahal_212
            WHERE avastha != 'read'
              AND pathakah_chinha != ?
              AND (is_disappearing = 0 OR disappear_at > CURRENT_TIMESTAMP)
            GROUP BY samvada_chinha
          ),
          unread_group AS (
            SELECT samvada_chinha, COUNT(*) AS unread_count
            FROM td_gchat_redfort_213
            WHERE avastha != 'read'
              AND pathakah_chinha != ?
            GROUP BY samvada_chinha
          )
          SELECT
            tcq.*,
            tcb.status,
            tcb_other.status AS other_status,
            tcb.ekatma_chinha,
            tcb.hidePhoneNumber,
            tcb_other.ekatma_chinha AS contact_uniqueId,
            COALESCE(tf2.praman_patrika, tcb_other.praman_patrika, 'Unknown Contact') AS contact_name,
            COALESCE(tf2.parichayapatra, tcb_other.parichayapatra, '') AS contact_photo,
            COALESCE(lm.vishayah, '') AS lastMessage,
            COALESCE(lm.vishayah_url, '') AS lastMessageUrl,
            COALESCE(lm.avastha, '') AS lastMessageAvastha,
            COALESCE(lm.pathakah_chinha, '') AS lastSender,
            COALESCE(lm.sandesha_prakara, '') AS lastMessageType,
            lm.preritam_tithih AS lastMessageDate,
            COALESCE(lm.nirastah, 0) AS isDeleted,
            COALESCE(
              CASE WHEN tcq.prakara IN ('Chat','Broadcast') THEN uc.unread_count ELSE ug.unread_count END,
              0
            ) AS unread_count,
            CASE 
              WHEN EXISTS (
                SELECT 1 
                FROM td_chat_bhagwah_211 tcb_admin
                JOIN td_chat_bhagwah_211 tcb_me
                  ON tcb_admin.samvada_chinha_id = tcb_me.samvada_chinha_id
                WHERE tcb_admin.samvada_chinha_id = tcq.samvada_chinha_id
                  AND tcb_admin.status = 'Accepted'
                  AND tcb_admin.bhumika = 'Admin'
                  AND tcb_admin.ekatma_chinha != ?
                  AND tcb_me.ekatma_chinha = ?
                  AND tcb_me.bhumika = 'Member'
                  AND tcb_me.status IN ('Pending','MsgSent')
              )
              THEN 1 ELSE 0
            END AS is_request
          FROM td_chat_qutubminar_211 tcq
          INNER JOIN td_chat_bhagwah_211 tcb
            ON tcq.samvada_chinha_id = tcb.samvada_chinha_id
            AND tcb.ekatma_chinha = ?
          LEFT JOIN td_chat_bhagwah_211 tcb_other
            ON tcb_other.samvada_chinha_id = tcq.samvada_chinha_id
            AND tcb_other.ekatma_chinha != ?
          LEFT JOIN td_fort_113 tf2
            ON tf2.ekatma_chinha = tcb_other.ekatma_chinha
          LEFT JOIN latest_message lm
            ON lm.samvada_chinha = tcq.samvada_chinha
          LEFT JOIN unread_chat uc
            ON uc.samvada_chinha = tcq.samvada_chinha
          LEFT JOIN unread_group ug
            ON ug.samvada_chinha = tcq.samvada_chinha
          WHERE (
            tcb.status IN ('Accepted','Removed')
            OR EXISTS (
              SELECT 1 
              FROM td_chat_bhagwah_211 tcb_admin
              JOIN td_chat_bhagwah_211 tcb_me
                ON tcb_admin.samvada_chinha_id = tcb_me.samvada_chinha_id
              WHERE tcb_admin.samvada_chinha_id = tcq.samvada_chinha_id
                AND tcb_admin.status = 'Accepted'
                AND tcb_admin.bhumika = 'Admin'
                AND tcb_admin.ekatma_chinha != ?
                AND tcb_me.ekatma_chinha = ?
                AND tcb_me.bhumika = 'Member'
                AND tcb_me.status IN ('Pending','MsgSent')
            )
          )
          AND (
            tcq.samvadaspashtah = 0
            OR (
              tcq.samvadaspashtah = 1
              AND (
                (tcq.prakara IN ('Chat','Broadcast','SelfChat') AND EXISTS (
                  SELECT 1 FROM td_chat_hawamahal_212 c
                  WHERE c.samvada_chinha = tcq.samvada_chinha
                    AND (c.is_disappearing = 0 OR c.disappear_at > CURRENT_TIMESTAMP)
                ))
                OR
                (tcq.prakara != 'Chat' AND EXISTS (
                  SELECT 1 FROM td_gchat_redfort_213 g
                  WHERE g.samvada_chinha = tcq.samvada_chinha))
              )
            )
          )
          GROUP BY tcq.samvada_chinha
          ORDER BY lastMessageDate DESC;`,
          params,
          (_, results) => {
            resolve(results.rows.raw().length ? results.rows.raw() : []);
          },
          (_, error) => {
            console.error("getAllChatLists: Error executing SQL:", error, { uniqueId });
            return true; // rollback on error
          }
        );
      });
    });
  } catch (error) {
    console.error("getAllChatLists: Database error:", error, { uniqueId });
    throw error;
  }
};

export const getAllChatListsId = async (uniqueId) => {
  if (!uniqueId) return [];

  try {
    const db = await openDatabase();
    const params = [
      uniqueId,
      uniqueId,
    ];

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `
          SELECT
            tcq.*,
            tcb.status,
            tcb_other.status AS other_status,
            tcb.ekatma_chinha,
            tcb.hidePhoneNumber,
            tcb_other.ekatma_chinha AS contact_uniqueId
          FROM td_chat_qutubminar_211 tcq
          INNER JOIN td_chat_bhagwah_211 tcb
            ON tcq.samvada_chinha_id = tcb.samvada_chinha_id
            AND tcb.ekatma_chinha = ?
          LEFT JOIN td_chat_bhagwah_211 tcb_other
            ON tcb_other.samvada_chinha_id = tcq.samvada_chinha_id
            AND tcb_other.ekatma_chinha != ?
          WHERE tcq.prakara = 'Chat'
          GROUP BY tcq.samvada_chinha_id;
          `,
          params,
          (_, results) => {
            const rows = results?.rows?.raw?.() || [];
            resolve(rows);
          },
          (_, error) => {
            console.error(
              'getAllChatListsId: SQL execution error',
              error,
              { uniqueId }
            );
            reject(error);
            return true;
          }
        );
      });
    });
  } catch (error) {
    console.error(
      'getAllChatListsId: Database error',
      error,
      { uniqueId }
    );
    throw error;
  }
};

export const fetchReceivedRequests = async uniqueId => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT
            tcq.*,
            tcb.status,
            tcb.ekatma_chinha,
            CASE
                WHEN tf1.ekatma_chinha IS NOT NULL AND tcq.prakara = 'Chat'
                THEN tf1.praman_patrika
                WHEN tf1.ekatma_chinha = tcb.ekatma_chinha AND tf1.praman_patrika IS NULL
                THEN tcb.praman_patrika
                ELSE tcb.praman_patrika
            END AS contact_name,
            CASE
                WHEN tf1.ekatma_chinha IS NOT NULL AND tcq.prakara = 'Chat'
                THEN tf1.parichayapatra
                WHEN tf1.ekatma_chinha = tcb.ekatma_chinha AND tf1.parichayapatra IS NULL
                THEN tcb.parichayapatra
                ELSE tcb.parichayapatra
            END AS contact_photo
          FROM td_chat_qutubminar_211 tcq
          LEFT JOIN td_chat_bhagwah_211 tcb ON tcq.samvada_chinha_id = tcb.samvada_chinha_id
          LEFT JOIN td_fort_113 tf1 ON tf1.ekatma_chinha = tcb.ekatma_chinha
          WHERE tcb.status IN ('Accepted')
          AND tcb.samvada_chinha_id IN (
              SELECT samvada_chinha_id
              FROM td_chat_bhagwah_211
              WHERE ekatma_chinha = ? AND bhumika = 'Member' AND status IN ('Pending', 'MsgSent')
          )
          AND tcb.ekatma_chinha != ? AND tcb.bhumika = 'Admin'
          GROUP BY tcq.samvada_chinha;`,
          [uniqueId, uniqueId],
          (_, results) => {
            const allLists = results.rows.raw();
            resolve(allLists.length > 0 ? allLists : []);
          },
          (_, error) => {
            console.error('Error fetching chat list:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Database error:', error);
    return [];
  }
};

export const fetchSentRequest = async uniqueId => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        let query = `
          SELECT
            tcq.*,
            tcb.status,
            tcb.ekatma_chinha,
            CASE
                WHEN tf1.ekatma_chinha IS NOT NULL AND tcq.prakara = 'Chat'
                THEN tf1.praman_patrika
                WHEN tf1.ekatma_chinha = tcb.ekatma_chinha AND tf1.praman_patrika IS NULL
                THEN tcb.praman_patrika
                ELSE tcb.praman_patrika
            END AS contact_name,
            CASE
                WHEN tf1.ekatma_chinha IS NOT NULL AND tcq.prakara = 'Chat'
                THEN tf1.parichayapatra
                WHEN tf1.ekatma_chinha = tcb.ekatma_chinha AND tf1.parichayapatra IS NULL
                THEN tcb.parichayapatra
                ELSE tcb.parichayapatra
            END AS contact_photo
          FROM td_chat_qutubminar_211 tcq
          INNER JOIN td_chat_bhagwah_211 tcb ON tcq.samvada_chinha_id = tcb.samvada_chinha_id
          LEFT JOIN td_fort_113 tf1 ON tf1.ekatma_chinha = tcb.ekatma_chinha
          WHERE tcb.status IN ('Pending', 'MsgSent')
          AND tcb.ekatma_chinha != ? AND tcq.pathakah_chinha = ?
          GROUP BY tcq.samvada_chinha_id;`;
        const params = [uniqueId, uniqueId];

        tx.executeSql(
          query,
          params,
          (_, results) => {
            const allLists = results.rows.raw();
            resolve(allLists.length > 0 ? allLists : []);
          },
          (_, error) => {
            console.error('Error fetching chat list:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Database error:', error);
    return [];
  }
};

export const UpdateChatList = async data => {
  try {
    const { samvada_chinha_id, action, update, samvada_chinha } = data;
    const db = await openDatabase();

    if (!db) {
      throw new Error('Failed to open database');
    }

    if (action === 'update') {
      if (!samvada_chinha_id?.length) {
        throw new Error('samvada_chinha_id array is empty or invalid');
      }

      const updateKey = Object.keys(update)[0];
      const updateValue = update[updateKey];
      const placeholders = samvada_chinha_id.map(() => '?').join(', ');
      const query = `
        UPDATE td_chat_qutubminar_211 
        SET ${updateKey} = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE samvada_chinha_id IN (${placeholders})
      `;
      await db.executeSql(query, [updateValue, ...samvada_chinha_id]);
    } else if (action === 'delete') {
      if (!samvada_chinha_id?.length) {
        throw new Error('samvada_chinha_id array is empty or invalid');
      }

      const updateKey = Object.keys(update)[0];
      const updateValue = update[updateKey];
      const placeholders = samvada_chinha_id.map(() => '?').join(', ');
      const updateQuery = `
        UPDATE td_chat_qutubminar_211 
        SET ${updateKey} = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE samvada_chinha_id IN (${placeholders})
      `;
      await db.executeSql(updateQuery, [updateValue, ...samvada_chinha_id]);

      if (samvada_chinha?.length > 0) {
        const deletePlaceholders = samvada_chinha.map(() => '?').join(', ');
        const deleteQuery1 = `DELETE FROM td_chat_hawamahal_212 WHERE samvada_chinha IN (${deletePlaceholders})`;
        const deleteQuery2 = `DELETE FROM td_gchat_redfort_213 WHERE samvada_chinha IN (${deletePlaceholders})`;

        await db.executeSql(deleteQuery1, samvada_chinha);
        await db.executeSql(deleteQuery2, samvada_chinha);
      }
    }

    console.log(`Action '${action}' executed successfully.`);
  } catch (error) {
    console.error('Error in UpdateChatList:', error.message, error);
    throw error;
  }
};

export const fetchChatBySamvadaChinha = async samvadaChinha => {
  try {
    const db = await openDatabase();

    const response = await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM td_chat_qutubminar_211 WHERE samvada_chinha = ?`,
          [samvadaChinha],
          (_, results) => {
            resolve(results.rows.raw());
          },
          (_, error) => {
            console.log('SQL Query Error:', error);
            reject(error);
          }
        );
      });
    });

    return response;
  } catch (error) {
    console.log('Error in fetchChatBySamvadaChinha:', error);
    throw error;
  }
};

export const searchAllMessages = async (searchText, myId) => {
  try {
    const db = await openDatabase();
    const nowUTC = new Date().toISOString();
    const query = `
      SELECT DISTINCT
        c.samvada_chinha,
        c.prakara,
        c.samvada_nama,
        c.samuha_chitram,
        CASE
            WHEN tf1.ekatma_chinha IS NOT NULL THEN tf1.praman_patrika
            WHEN tf1.ekatma_chinha = tcb.ekatma_chinha AND tf1.praman_patrika IS NULL
            THEN tcb.praman_patrika
            ELSE tcb.praman_patrika
        END AS contact_name,
        CASE
            WHEN tf1.ekatma_chinha IS NOT NULL THEN tf1.parichayapatra
            WHEN tf1.ekatma_chinha = tcb.ekatma_chinha AND tf1.parichayapatra IS NULL
            THEN tcb.parichayapatra
            ELSE tcb.parichayapatra
        END AS contact_photo,
        COALESCE(m.pathakah_chinha, g.pathakah_chinha) as pathakah_chinha,
        COALESCE(m.refrenceId, g.refrenceId) as messageId,
        COALESCE(m.vishayah, g.vishayah) as vishayah,
        COALESCE(m.createdAt, g.createdAt) as messageCreatedAt
      FROM td_chat_qutubminar_211 c
      LEFT JOIN td_chat_hawamahal_212 m 
        ON c.samvada_chinha = m.samvada_chinha AND c.prakara = 'Chat' 
        AND (m.is_disappearing = 0 OR (m.is_disappearing = 1 AND m.disappear_at > ?))
      LEFT JOIN td_gchat_redfort_213 g 
        ON c.samvada_chinha = g.samvada_chinha AND c.prakara = 'Group'
      JOIN td_chat_bhagwah_211 tcb ON tcb.samvada_chinha_id = c.samvada_chinha_id  
      LEFT JOIN td_fort_113 tf1 ON tf1.ekatma_chinha = tcb.ekatma_chinha  
      WHERE tcb.ekatma_chinha != ? 
      AND (m.vishayah LIKE ? OR g.vishayah LIKE ? OR m.vishayah LIKE ? OR g.vishayah LIKE ?)
      ORDER BY messageCreatedAt DESC`;

    return await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          query,
          [nowUTC, myId, `%${searchText}%`, `%${searchText}%`, `%|||${searchText}%`, `%|||${searchText}%`],
          (_, results) => {
            const allLists = results.rows.raw();
            resolve(allLists.length > 0 ? allLists : []);
          },
          (_, error) => {
            console.error('Error fetching chat list:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in searchAllMessages:', error);
    return [];
  }
};

export const reInitiateChatList = async (samvada_chinha) => {
  try {
    const db = await openDatabase();
    const query = `
      UPDATE td_chat_qutubminar_211
      SET samvadaspashtah = 0, updatedAt = CURRENT_TIMESTAMP
      WHERE samvada_chinha = ?
    `;
    await db.executeSql(query, [samvada_chinha]);
    console.log(`Chat list re-initiated successfully for ID: ${samvada_chinha}`);
  } catch (error) {
    console.error('Error in reInitiateChatList:', error.message, error);
    throw error;
  }
};

export const LeaveTemporaryRoom = async (samvada_chinha) => {
  try {
    const db = await openDatabase();
    const query = `
      UPDATE td_chat_qutubminar_211
      SET expires_at = 1, updatedAt = CURRENT_TIMESTAMP
      WHERE samvada_chinha = ?
    `;
    await db.executeSql(query, [samvada_chinha]);
    console.log(`expires_at updated to 1 for samvada_chinha: ${samvada_chinha}`);
  } catch (error) {
    console.error('Error updating expires_at:', error);
    throw error;
  }
};

export const updateChatBlockStatus = async (chatId, blockList) => {
  try {
    const db = await openDatabase();

    // Convert array to JSON string for storage
    const blockListStr = JSON.stringify(blockList || []);

    console.log('💾 [updateChatBlockStatus] Updating DB:', {
      chatId,
      blockList,
      blockListStr
    });

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `UPDATE td_chat_qutubminar_211 
           SET prayoktaramnishkasaya = ?, updatedAt = CURRENT_TIMESTAMP 
           WHERE samvada_chinha = ?`,
          [blockListStr, chatId],
          (_, result) => {
            console.log('💾 [updateChatBlockStatus] ✅ Updated rows:', result.rowsAffected);
            resolve(result);
          },
          (_, error) => {
            console.error('💾 [updateChatBlockStatus] ❌ SQL Error:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('💾 [updateChatBlockStatus] ❌ Error:', error);
    throw error;
  }
};

export const getSamvadaChinhaId = async (samvada_chinha) => {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT samvada_chinha_id FROM td_chat_qutubminar_211 WHERE samvada_chinha = ? LIMIT 1;`,
          [samvada_chinha],
          (_, result) => {
            if (result.rows.length > 0) {
              resolve(result.rows.item(0).samvada_chinha_id);
            } else {
              resolve(null);
            }
          },
          (_, error) => {
            console.error("Error fetching samvada_chinha_id:", error);
            reject(error);
          }
        );
      });
    });

  } catch (error) {
    console.error("Error in getSamvadaChinhaId:", error);
    throw error;
  }
};

export const updateGroupList = async (samvada_chinha) => {
  if (!samvada_chinha) {
    console.warn('updateGroupList called without samvada_chinha');
    return { success: false, deletedChats: 0, deletedParticipants: 0 };
  }

  try {
    const db = await openDatabase();

    const results = await new Promise((resolve, reject) => {
      db.transaction((tx) => {
        // 1) Get chat row
        tx.executeSql(
          `SELECT samvada_chinha_id FROM td_chat_qutubminar_211 WHERE samvada_chinha = ?;`,
          [samvada_chinha],
          (_, chatRow) => {
            if (chatRow.rows.length === 0) {
              resolve({ deletedChats: 0, deletedParticipants: 0 });
              return;
            }

            const samvada_chinha_id = chatRow.rows.item(0).samvada_chinha_id;

            // 2) Delete participants
            tx.executeSql(
              `DELETE FROM td_chat_bhagwah_211 WHERE samvada_chinha_id = ?;`,
              [samvada_chinha_id],
              (_, participantDelete) => {
                // 3) Delete chat record
                tx.executeSql(
                  `DELETE FROM td_chat_qutubminar_211 WHERE samvada_chinha = ?;`,
                  [samvada_chinha],
                  (_, chatDelete) => {
                    resolve({
                      deletedChats: chatDelete.rowsAffected || 0,
                      deletedParticipants: participantDelete.rowsAffected || 0,
                    });
                  },
                  (_, err) => reject(err)
                );
              },
              (_, err) => reject(err)
            );
          },
          (_, err) => reject(err)
        );
      });
    });

    return { success: results.deletedChats > 0, ...results };
  } catch (error) {
    console.error('Error deleting chat record:', error);
    throw error;
  }
};

export const updateOnlyAdminMessage = async (samvada_chinha, Value) => {
  try {
    const db = await openDatabase();
    await db.executeSql(
      `UPDATE td_chat_qutubminar_211 
       SET onlyAdminsCanMessage = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE samvada_chinha = ?`,
      [Value, samvada_chinha]
    );
    console.log(`✅ Updated onlyAdminsCanMessage in SQLite`);
    return { success: true };
  } catch (error) {
    console.error('Error updating onlyAdminsCanMessage in SQLite:', error);
    throw error;
  }
};