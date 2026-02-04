import databaseManager from '../DatabaseManager';

export const contactListCreateTables = async () => {
  try {
    return await databaseManager.executeTransaction(async tx => {
      await tx.executeSql(
        `CREATE TABLE IF NOT EXISTS td_fort_113 (
          durasamparka_sankhya INTEGER PRIMARY KEY,
          ekatma_chinha VARCHAR(30) DEFAULT NULL,
          praman_patrika VARCHAR(100),
          parichayapatra TEXT,
          chatId VARCHAR(50),
          isRequestSent INTEGER DEFAULT 0,
          desha_suchaka_koda VARCHAR(5) DEFAULT '+91',
          samvadini_patrika_samarthah INTEGER DEFAULT 0,
          nimantrana_prasthitah INTEGER DEFAULT 0,
          is_emergency INTEGER DEFAULT 0,
          emergency_reltive VARCHAR(100),
          janma_tithi TEXT,
          linga VARCHAR(10),
          upayogakarta_nama VARCHAR(50) DEFAULT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );`,
        [],
        () => console.log("Table td_fort_113 created successfully"),
        (_, error) => console.error("Error creating td_fort_113 table:", error)
      );

      await tx.executeSql(
        `CREATE TRIGGER IF NOT EXISTS update_td_fort_113
          AFTER UPDATE ON td_fort_113
          FOR EACH ROW
          BEGIN
            UPDATE td_fort_113 
            SET updatedAt = CURRENT_TIMESTAMP 
            WHERE durasamparka_sankhya = OLD.durasamparka_sankhya;
          END;`,
        [],
        null,
        (_, error) => console.error("Error creating trigger update_td_fort_113:", error)
      );

      const indexes = [
        { name: "idx_ekatma_chinha", column: "ekatma_chinha" },
        { name: "idx_durasamparka_sankhya", column: "durasamparka_sankhya" },
        { name: "idx_is_emergency", column: "is_emergency" },
        { name: "idx_isRequestSent", column: "isRequestSent" },
        { name: "idx_chatId", column: "chatId" },
        { name: "idx_upayogakarta_nama", column: "upayogakarta_nama" },
      ];

      indexes.forEach(({ name, column }) => {
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS ${name} ON td_fort_113 (${column});`,
          [],
          () => console.log(`Index ${name} created successfully`),
          (_, error) => console.error(`Error creating index ${name}:`, error)
        );
      });
    });

  } catch (error) {
    console.error("Error in contactListCreateTables:", error);
  }
};

export const contactDeleteTables = async () => {
  try {
    return await databaseManager.executeTransaction(async tx => {
      await tx.executeSql(`DROP TABLE IF EXISTS td_fort_113;`);
    });
  } catch (error) {
    console.error('Error deleting td_fort_113 table:', error);
  }
};

export const insertSyncContact = async (contacts) => {
  const nowIso = new Date().toISOString();

  const rows = (contacts || [])
    .filter(c => c && c.phoneNumber)
    .map(c => ({
      phone: String(c.phoneNumber).trim(),
      name: c.name || '',
      uid: c.uid || null,
      parichayapatra: c.parichayapatra || '',
      countryCode: c.countryCode || '+91',
      isRegistered: c.isRegistered || false,
      chatId: c.chatId || null,
      nimantrana_prasthitah: false,
      isRequestSent: false,
      janma_tithi: c.janma_tithi || null,
      linga: c.linga || null,
      upayogakarta_nama: c.upayogakarta_nama || null,
    }));

  try {
    return await databaseManager.executeTransaction(tx => {
      // TEMP staging for deletion
      tx.executeSql(`CREATE TEMP TABLE IF NOT EXISTS temp_contacts (phone TEXT PRIMARY KEY)`);
      tx.executeSql(`DELETE FROM temp_contacts`);

      rows.forEach(r => {
        tx.executeSql(
          `INSERT OR IGNORE INTO temp_contacts (phone) VALUES (?)`,
          [r.phone]
        );
      });

      // INSERT OR REPLACE logic (safe on all SQLite versions)
      rows.forEach(r => {
        tx.executeSql(
          `INSERT OR REPLACE INTO td_fort_113 (
            durasamparka_sankhya,
            praman_patrika,
            ekatma_chinha,
            parichayapatra,
            chatId,
            desha_suchaka_koda,
            samvadini_patrika_samarthah,
            nimantrana_prasthitah,
            isRequestSent,
            janma_tithi,
            linga,
            upayogakarta_nama,
            createdAt,
            updatedAt
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            COALESCE(
              (SELECT createdAt FROM td_fort_113 WHERE durasamparka_sankhya = ?),
              ?
            ),
            strftime('%Y-%m-%d %H:%M:%S', 'now')
          )`,
          [
            r.phone,
            r.name,
            r.uid,
            r.parichayapatra,
            r.chatId,
            r.countryCode,
            r.isRegistered,
            r.nimantrana_prasthitah,
            r.isRequestSent,
            r.janma_tithi,
            r.linga,
            r.upayogakarta_nama,
            r.phone,      // for COALESCE lookup
            nowIso        // fallback createdAt if new
          ],
          () => { },
          (_, error) => {
            console.error(`Insert/Replace failed for ${r.phone}:`, error);
            return true; // abort transaction
          }
        );
      });

      // DELETE contacts that no longer exist
      tx.executeSql(
        `DELETE FROM td_fort_113
   WHERE NOT EXISTS (
     SELECT 1 FROM temp_contacts
     WHERE temp_contacts.phone = td_fort_113.durasamparka_sankhya
   )`,
        [],
        () => { },
        (_, error) => {
          console.error('Delete-missing failed:', error);
          return true;
        }
      );

      tx.executeSql(`DROP TABLE IF EXISTS temp_contacts`);
    });
  } catch (error) {
    console.error('Error processing contacts batch:', error);
    throw error;
  }
};


export const getAllContacts = async () => {
  try {
    const result = await databaseManager.executeSql(
      `SELECT * FROM td_fort_113 ORDER BY praman_patrika ASC;`
    );
    const contacts = result.rows.raw();
    return contacts;
  } catch (error) {
    console.error('Error fetching contacts:', error);
    if (error.message && error.message.includes('no such table: td_fort_113')) {
      console.log('Table td_fort_113 does not exist, attempting to create it...');
      try {
        await contactListCreateTables();
        console.log('Table td_fort_113 created successfully, returning empty contacts array');
        return [];
      } catch (createError) {
        console.error('Error creating td_fort_113 table:', createError);
        return [];
      }
    }

    return [];
  }
};

export const updateIsRequestSentById = async (number, field) => {
  try {
    return await databaseManager.executeTransaction(tx => {
      // First check if the record exists
      tx.executeSql(
        `SELECT * FROM td_fort_113 WHERE durasamparka_sankhya = ?;`,
        [number],
        (_tx1, { rows }) => {
          const currentTime = new Date().toISOString();

          if (rows.length === 0) {
            // If record doesn't exist, create it
            tx.executeSql(
              `INSERT INTO td_fort_113 (
                durasamparka_sankhya,
                ${field},
                createdAt,
                updatedAt
              ) VALUES (?, 1, ?, ?);`,
              [number, currentTime, currentTime],
              () => {
                console.log(
                  `Created new record for durasamparka_sankhya ${number} and set ${field} to 1.`,
                );
              },
              (_tx2, error) => {
                console.error(
                  `Error creating record for durasamparka_sankhya ${number}:`,
                  error,
                );
              },
            );
          } else {
            // If record exists, update it
            tx.executeSql(
              `UPDATE td_fort_113
               SET ${field} = 1, updatedAt = ?
               WHERE durasamparka_sankhya = ?;`,
              [currentTime, number],
              () => {
                console.log(
                  `Record with durasamparka_sankhya ${number} successfully updated.`,
                );
              },
              (_tx3, error) => {
                console.error(
                  `Error updating record with durasamparka_sankhya ${number}:`,
                  error,
                );
              },
            );
          }
        },
        (_tx4, error) => {
          console.error(
            `Error checking record with durasamparka_sankhya ${number}:`,
            error,
          );
        },
      );
    });
  } catch (error) {
    console.error('Error in updateIsRequestSentById:', error);
    throw error;
  }
};

export const getNameAndPhotoById = async (ekatma_chinha) => {
  try {
    const result = await databaseManager.executeSql(
      `SELECT 
          COALESCE(tf.praman_patrika, tcb.praman_patrika) AS praman_patrika,
          COALESCE(tf.parichayapatra, tcb.parichayapatra) AS parichayapatra
       FROM td_chat_bhagwah_211 tcb
       LEFT JOIN td_fort_113 tf ON tf.ekatma_chinha = tcb.ekatma_chinha
       WHERE tcb.ekatma_chinha = ?`,
      [ekatma_chinha]
    );

    if (result.rows.length > 0) {
      const row = result.rows.item(0);
      return {
        name: row.praman_patrika,
        photo: row.parichayapatra,
      };
    }

    return { name: '', photo: null };
  } catch (error) {
    console.error("❌ getNameAndPhotoById error:", error);
    return { name: '', photo: null };
  }
};

export const getAllRegisterContacts = async () => {
  try {
    const result = await databaseManager.executeSql(
      `SELECT praman_patrika, durasamparka_sankhya,
              emergency_reltive, is_emergency
       FROM td_fort_113
       WHERE IFNULL(CAST(is_emergency AS INTEGER), 0) = 1;`,
      []
    );

    const contacts = [];
    for (let i = 0; i < result.rows.length; i++) {
      contacts.push(result.rows.item(i));
    }
    return contacts;
  } catch (error) {
    console.error('Error in getAllRegisterContacts:', error);
    throw error;
  }
};

export const updateEmergancyChat = async (data) => {
  try {
    const { ekatma_chinha, emergency_reltive, is_emergency } = data;

    if (!ekatma_chinha || is_emergency === undefined) {
      throw new Error('Missing required fields: ekatma_chinha or is_emergency');
    }

    // Check emergency contact limit
    const limitResult = await databaseManager.executeSql(
      `SELECT COUNT(*) AS count 
       FROM td_fort_113 
       WHERE is_emergency = 1;`
    );

    const emergencyCount = limitResult.rows.item(0).count;

    if (is_emergency && emergencyCount >= 10) {
      throw new Error('Limit of 10 emergency contacts reached.');
    }

    // Get samvada_chinha
    const chatResult = await databaseManager.executeSql(
      `SELECT tcq.samvada_chinha 
       FROM td_chat_qutubminar_211 AS tcq
       INNER JOIN td_chat_bhagwah_211 AS tcb 
       ON tcb.samvada_chinha_id = tcq.samvada_chinha_id 
       WHERE tcq.prakara = 'Chat' 
       AND tcq.is_private_room = 0 
       AND tcb.ekatma_chinha = ?;`,
      [ekatma_chinha]
    );

    if (chatResult.rows.length === 0) {
      throw new Error(`No chat found for ekatma_chinha: ${ekatma_chinha}`);
    }

    const samvada_chinha = chatResult.rows.item(0).samvada_chinha;

    // Update both tables in a transaction
    await databaseManager.executeTransaction(tx => {
      tx.executeSql(
        `UPDATE td_chat_qutubminar_211 
         SET emergency_reltive = ?, is_emergency = ? 
         WHERE samvada_chinha = ?;`,
        [emergency_reltive, is_emergency ? 1 : 0, samvada_chinha],
        () => console.log('Updated td_chat_qutubminar_211'),
        (_, error) => console.error('Error updating td_chat_qutubminar_211:', error)
      );

      tx.executeSql(
        `UPDATE td_fort_113
         SET emergency_reltive = ?, is_emergency = ? 
         WHERE ekatma_chinha = ?;`,
        [emergency_reltive, is_emergency ? 1 : 0, ekatma_chinha],
        () => console.log('Updated td_fort_113'),
        (_, error) => console.error('Error updating td_fort_113:', error)
      );
    });

    console.log('Emergency chat updated successfully.');
    return { success: true, samvada_chinha };
  } catch (error) {
    console.error('Error in updateEmergancyChat:', error);
    throw error;
  }
};

export const updateEmergancyLocalContact = async (data) => {
  try {
    const { durasamparka_sankhya, emergency_reltive, is_emergency } = data;

    if (!durasamparka_sankhya) {
      throw new Error('Missing required fields: durasamparka_sankhya');
    }
    if (is_emergency === 1) {
      const limitResult = await databaseManager.executeSql(
        `SELECT COUNT(*) AS count 
       FROM td_fort_113 
       WHERE is_emergency = 1;`
      );

      const emergencyCount = limitResult.rows.item(0).count;
      if (is_emergency && emergencyCount >= 10) {
        throw new Error('Limit of 10 emergency contacts reached.');
      }
    }
    await databaseManager.executeTransaction(tx => {
      tx.executeSql(
        `UPDATE td_fort_113
         SET emergency_reltive = ?, is_emergency = ? 
         WHERE durasamparka_sankhya = ?;`,
        [emergency_reltive, is_emergency, durasamparka_sankhya],
        () => console.log('Updated td_fort_113'),
        (_, error) => console.error('Error updating td_fort_113:', error)
      );
    });

    console.log('Emergency chat updated successfully.');
    return { success: true, durasamparka_sankhya };
  } catch (error) {
    console.error('Error in updateEmergancyChat:', error);
    throw error;
  }
};

export const getAllContactsUniqueId = async () => {
  try {
    const result = await databaseManager.executeSql(
      `SELECT ekatma_chinha FROM td_fort_113 WHERE samvadini_patrika_samarthah = 1;`
    );
    const contacts = [];
    for (let i = 0; i < result.rows.length; i++) {
      contacts.push(result.rows.item(i).ekatma_chinha);
    }
    return contacts;
  } catch (error) {
    console.error('Error in getAllRegisterContacts:', error);
    throw new Error('Failed to fetch registered contacts.');
  }
};

export const getChatIdByUniqueId = async (ekatma_chinha) => {
  try {
    const result = await databaseManager.executeSql(
      `SELECT chatId FROM td_fort_113 WHERE ekatma_chinha = ? AND chatId IS NOT NULL AND chatId != '' LIMIT 1;`,
      [ekatma_chinha]
    );
    if (result.rows.length > 0) {
      return result.rows.item(0).chatId;
    }
    return null;
  } catch (error) {
    console.error('Error in getChatIdByUniqueId:', error);
    return null;
  }
};
