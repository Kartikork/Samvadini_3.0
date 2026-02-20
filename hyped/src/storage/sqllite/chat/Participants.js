import SQLite from 'react-native-sqlite-storage';
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

export const createParticipantsTable = async () => {
    try {
        const db = await openDatabase();
        db.transaction(tx => {
            tx.executeSql(
                `CREATE TABLE IF NOT EXISTS td_chat_bhagwah_211 (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    samvada_chinha_id INTEGER NOT NULL,
                    ekatma_chinha VARCHAR(30),
                    status VARCHAR(20),
                    durasamparka_sankhya VARCHAR(20),
                    bhumika VARCHAR(20),
                    hidePhoneNumber INTEGER,
                    praman_patrika VARCHAR(255),
                    parichayapatra TEXT,
                    yahyojitah VARCHAR(50),
                    yahniskasitah VARCHAR(30),
                    sakriyamastiva INTEGER DEFAULT 1,
                    nirmatanirgatahastiva INTEGER,
                    is_registered INTEGER DEFAULT 1,
                    inviteSent INTEGER DEFAULT 0,
                    privateKey TEXT,
                    publicKey TEXT,
                    joinedAt DATETIME,
                    removedAt DATETIME,
                    janma_tithi VARCHAR(50),
                    linga VARCHAR(20),
                    FOREIGN KEY (samvada_chinha_id) REFERENCES td_chat_qutubminar_211(samvada_chinha_id)
                );`,
                [],
                () => console.log('Table td_chat_bhagwah_211 created successfully'),
                (_, error) => console.error('Error creating table:', error)
            );

            tx.executeSql(
                `CREATE TRIGGER IF NOT EXISTS update_td_chat_bhagwah_211
                AFTER UPDATE ON td_chat_bhagwah_211
                FOR EACH ROW
                WHEN OLD.sakriyamastiva = 1 AND NEW.sakriyamastiva = 0
                BEGIN
                    UPDATE td_chat_bhagwah_211 SET removedAt = CURRENT_TIMESTAMP WHERE id = OLD.id;
                END;`,
                [],
                () => console.log('Trigger update_td_chat_bhagwah_211 created successfully'),
                (_, error) => console.error('Error creating trigger:', error)
            );

            const indexes = [
                { name: 'idx_status', column: 'status' },
                { name: 'idx_ekatma_chinha', column: 'ekatma_chinha' },
                { name: 'idx_sakriyamastiva', column: 'sakriyamastiva' }
            ];

            indexes.forEach(({ name, column }) => {
                tx.executeSql(
                    `CREATE INDEX IF NOT EXISTS ${name} ON td_chat_bhagwah_211 (${column});`,
                    [],
                    () => console.log(`Index ${name} created successfully`),
                    (_, error) => console.error(`Error creating index ${name}:`, error)
                );
            });
        });
    } catch (error) {
        console.error("Error while creating the 'td_chat_bhagwah_211' table:", error);
    }
};

export const deleteParticipantsTable = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async tx => {
            await tx.executeSql(`DROP TABLE IF EXISTS td_chat_bhagwah_211;`);
        });
        console.log("Table 'td_chat_bhagwah_211' deleted successfully.");
    } catch (error) {
        console.error("Error deleting table 'td_chat_bhagwah_211':", error);
    }
};

export const getAllChatParticipants = async (id) => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT tcb.ekatma_chinha,tcb.id,tcb.inviteSent, tcb.durasamparka_sankhya, tcb.is_registered, tcb.privateKey, tcb.publicKey, tcb.status, tcb.sakriyamastiva, tcb.bhumika, tcb.hidePhoneNumber,
                    CASE
                        WHEN tf1.ekatma_chinha IS NOT NULL
                        THEN tf1.praman_patrika
                        WHEN tf1.ekatma_chinha = tcb.ekatma_chinha
                            AND tf1.praman_patrika IS NULL
                        THEN tcb.praman_patrika
                        ELSE tcb.praman_patrika
                    END AS contact_name,
                    CASE
                        WHEN tf1.ekatma_chinha IS NOT NULL
                        THEN tf1.parichayapatra
                        WHEN tf1.ekatma_chinha = tcb.ekatma_chinha
                            AND tf1.parichayapatra IS NULL
                        THEN tcb.parichayapatra
                        ELSE tcb.parichayapatra
                    END AS contact_photo,
                    tf1.linga AS linga,
                    tf1.janma_tithi AS janma_tithi
                    FROM td_chat_bhagwah_211 tcb
                    LEFT JOIN td_fort_113 tf1
                    ON tf1.ekatma_chinha = tcb.ekatma_chinha
                    WHERE  samvada_chinha_id = ?
                    group by tcb.ekatma_chinha;`,
                    [id],
                    (_, results) => {
                        const allParticipants = results.rows.raw();
                        resolve(allParticipants.length > 0 ? allParticipants : []);
                    },
                    (_, error) => {
                        console.error("Error fetching participants:", error);
                        resolve([]);
                    }
                );
            });
        });
    } catch (error) {
        console.error("Database error:", error);
        return [];
    }
};

export const updateParticipantStatus = async (samvada_chinha_id, ekatma_chinha, status, avastha = 0) => {
    try {
        const db = await openDatabase();

        // 🚀 FIX: Return a Promise and wait for transaction to complete
        return new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    `UPDATE td_chat_bhagwah_211 
                     SET status = ?, sakriyamastiva = ?
                     WHERE samvada_chinha_id = ? AND ekatma_chinha = ?;`,
                    [status, avastha, samvada_chinha_id, ekatma_chinha],
                    (_, result) => {
                        console.log(`✅ Status updated successfully for samvada_chinha_id: ${samvada_chinha_id}, status: ${status}`);
                        resolve(result);
                    },
                    (_, error) => {
                        console.error(`❌ Error updating status for samvada_chinha_id: ${samvada_chinha_id}`, error);
                        reject(error);
                    }
                );
            });
        });

    } catch (error) {
        console.error("❌ Error in updateParticipantStatus function:", error);
        throw error;
    }
};

export const getEncryptionKey = async () => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT * FROM td_chat_bhagwah_211 LIMIT 1;`,
                    [],
                    (_, results) => {
                        const firstParticipant = results.rows.length > 0 ? results.rows.item(0) : null;
                        resolve(firstParticipant);
                    },
                    (_, error) => {
                        console.error("Error fetching first participant:", error);
                        resolve(null);
                    }
                );
            });
        });
    } catch (error) {
        console.error("Database error:", error);
        return null;
    }
};


export const upsertParticipant = async ({
    samvada_chinha_id,
    ekatma_chinha,
    status = 'Accepted',
    bhumika = 'Member',
    praman_patrika = '',
    parichayapatra = '',
    sakriyamastiva = 1,
    hidePhoneNumber = 0,
    nirmatanirgatahastiva = 0,
    janma_tithi = null,
    linga = null,
}) => {
    const db = await openDatabase();

    // --- helper to run queries safely ---
    const runQuery = (sql, params = []) =>
        new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    sql,
                    params,
                    (_, result) => resolve(result),
                    (_, error) => {
                        console.error(
                            'SQL error:',
                            { sql, params, error }
                        );
                        reject(error || new Error('Unknown SQL error'));
                        return false; // IMPORTANT for WebSQL/sqlite
                    }
                );
            });
        });

    try {
        // Check if participant already exists
        const selectResult = await runQuery(
            `SELECT id 
             FROM td_chat_bhagwah_211 
             WHERE samvada_chinha_id = ? AND ekatma_chinha = ?;`,
            [samvada_chinha_id, ekatma_chinha]
        );

        const exists = selectResult.rows.length > 0;

        if (exists) {
            // --- UPDATE ---
            await runQuery(
                `UPDATE td_chat_bhagwah_211
                 SET status = ?, bhumika = ?, praman_patrika = ?, parichayapatra = ?, 
                     sakriyamastiva = ?, hidePhoneNumber = ?, nirmatanirgatahastiva = ?, 
                     janma_tithi = ?, linga = ?, removedAt = NULL
                 WHERE samvada_chinha_id = ? AND ekatma_chinha = ?;`,
                [
                    status,
                    bhumika,
                    praman_patrika,
                    parichayapatra,
                    sakriyamastiva,
                    hidePhoneNumber,
                    nirmatanirgatahastiva,
                    janma_tithi,
                    linga,
                    samvada_chinha_id,
                    ekatma_chinha,
                ]
            );
            return { action: 'updated' };
        } else {
            // --- INSERT ---
            await runQuery(
                `INSERT INTO td_chat_bhagwah_211 (
                    samvada_chinha_id, ekatma_chinha, privateKey, publicKey, status,
                    praman_patrika, parichayapatra, yahyojitah, yahniskasitah, sakriyamastiva,
                    hidePhoneNumber, bhumika, nirmatanirgatahastiva, joinedAt, janma_tithi, linga, removedAt
                ) VALUES (?, ?, NULL, NULL, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, NULL);`,
                [
                    samvada_chinha_id,
                    ekatma_chinha,
                    status,
                    praman_patrika,
                    parichayapatra,
                    sakriyamastiva,
                    hidePhoneNumber,
                    bhumika,
                    nirmatanirgatahastiva,
                    janma_tithi,
                    linga,
                ]
            );
            return { action: 'inserted' };
        }
    } catch (error) {
        console.error(
            `Database error in upsertParticipant for ${samvada_chinha_id}/${ekatma_chinha}:`,
            error
        );
        throw error;
    }
};


export const getSOSChat = async (myId) => {
    try {
        if (!myId || typeof myId !== "string") {
            console.warn("Invalid myId provided to getSOSChat:", myId);
            return [];
        }
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT tcq.samvada_chinha, tcb.privateKey, tcb.publicKey, tcb.ekatma_chinha FROM td_chat_qutubminar_211 as tcq
                    inner join td_chat_bhagwah_211 as tcb on tcb.samvada_chinha_id = tcq.samvada_chinha_id and tcq.prakara = "Chat"
                    WHERE tcq.is_emergency = 1 AND tcq.prakara = "Chat" AND tcq.myID = ? and tcb.ekatma_chinha!= ? GROUP BY tcb.ekatma_chinha;`,
                    [myId, myId],
                    (_, results) => {
                        const sosChats = [];
                        for (let i = 0; i < results.rows.length; i++) {
                            sosChats.push(results.rows.item(i));
                        }
                        resolve(sosChats);
                    },
                    (_, error) => {
                        console.error("Error fetching SOS chats:", error);
                        reject(error);
                    }
                );
            });
        });
    } catch (error) {
        console.error("Database error in getSOSChat:", error);
        return [];
    }
};

/**
 * Get other participant's public key for a chat
 * @param {string} chatId - samvada_chinha
 * @param {string} currentUserId - ekatma_chinha of current user
 * @returns {Promise<{publicKey: string, ekatma_chinha: string} | null>}
 */
export const getOtherParticipantPublicKey = async (chatId, currentUserId) => {
    if (!chatId || !currentUserId) {
        console.warn('[getOtherParticipantPublicKey] Missing chatId or currentUserId');
        return null;
    }

    try {
        const db = await openDatabase();
        return new Promise((resolve) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT tcb.ekatma_chinha, tcb.publicKey, tcq.samvada_chinha_id
                    FROM td_chat_qutubminar_211 tcq
                    INNER JOIN td_chat_bhagwah_211 tcb ON tcb.samvada_chinha_id = tcq.samvada_chinha_id
                    WHERE tcq.samvada_chinha = ? AND tcb.ekatma_chinha != ?
                    LIMIT 1`,
                    [chatId, currentUserId],
                    (_, results) => {
                        if (results.rows.length > 0) {
                            const participant = results.rows.item(0);
                            resolve({
                                publicKey: participant.publicKey,
                                ekatma_chinha: participant.ekatma_chinha,
                            });
                        } else {
                            console.warn('[getOtherParticipantPublicKey] No other participant found');
                            resolve(null);
                        }
                    },
                    (_, error) => {
                        console.error('[getOtherParticipantPublicKey] Error:', error);
                        resolve(null);
                    }
                );
            });
        });
    } catch (error) {
        console.error('[getOtherParticipantPublicKey] Database error:', error);
        return null;
    }
};

export const getBroadcastEncryptionKey = async (chatIds = []) => {
    if (!Array.isArray(chatIds) || chatIds.length === 0) return [];

    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                const placeholders = chatIds.map(() => '?').join(',');
                const sql = `
                    SELECT tcb.ekatma_chinha,tcb.privateKey, tcb.publicKey,tcb.praman_patrika, tcq.samvada_chinha_id, tcq.samvada_chinha
                    FROM td_chat_qutubminar_211 tcq
                    INNER JOIN td_chat_bhagwah_211 tcb ON tcb.samvada_chinha_id = tcq.samvada_chinha_id
                    WHERE samvada_chinha IN (${placeholders})
                    AND tcb.ekatma_chinha != tcq.myId group by tcq.samvada_chinha_id
                `;

                tx.executeSql(
                    sql,
                    chatIds,
                    (_, results) => {
                        const participants = [];
                        for (let i = 0; i < results.rows.length; i++) {
                            participants.push(results.rows.item(i));
                        }
                        resolve(participants);
                    },
                    (_, error) => {
                        console.error("Error fetching participants:", error);
                        resolve([]);
                    }
                );
            });
        });
    } catch (error) {
        console.error("Database error:", error);
        return [];
    }
};

export const updateBroadcastMessage = async (data) => {
    const { refrenceIds, updates = {}, type } = data || {};

    if (!Array.isArray(refrenceIds) || refrenceIds.length === 0) {
        throw new Error('Invalid or missing refrenceIds');
    }

    try {
        const db = await openDatabase();
        if (type === 'delete') {
            await executeSQL(
                db,
                `DELETE FROM td_chat_hawamahal_212 WHERE refrenceId IN (${refrenceIds.map(() => '?').join(', ')})`,
                refrenceIds
            );
            console.log(`${refrenceIds.length} messages deleted successfully`);
            return { success: true, message: `${refrenceIds.length} messages deleted successfully` };
        }

        let updateQuery;
        const now = new Date().toISOString();

        switch (type) {
            case 'star':
                updateQuery = { kimTaritaSandesha: 1, updatedAt: now };
                break;
            case 'unStar':
                updateQuery = { kimTaritaSandesha: 0, updatedAt: now };
                break;
            case 'deleteEveryone':
                updateQuery = { nirastah: true, kimTaritaSandesha: 0, updatedAt: now };
                break;
            default:
                updateQuery = { ...updates, updatedAt: now };
                break;
        }

        const updateFields = Object.keys(updateQuery).map(key => `${key} = ?`).join(', ');
        const updateValues = Object.values(updateQuery);
        await executeSQL(
            db,
            `UPDATE td_chat_hawamahal_212 SET ${updateFields} WHERE refrenceId IN (${refrenceIds.map(() => '?').join(', ')})`,
            [...updateValues, ...refrenceIds]
        );

        if (type === 'deleteEveryone') {
            await executeSQL(
                db,
                `UPDATE td_chat_hawamahal_212 SET ${updateFields} WHERE prasaranamId IN (${refrenceIds.map(() => '?').join(', ')})`,
                [...updateValues, ...refrenceIds]
            );
        }

        console.log(`${refrenceIds.length} messages updated successfully`);
        return { success: true, message: `${refrenceIds.length} messages updated successfully` };

    } catch (error) {
        console.error('Error updating messages:', error);
        return { success: false, message: `Failed to update messages: ${error.message}` };
    }
};

const executeSQL = (db, query, params) => {
    return new Promise((resolve, reject) => {
        db.transaction(tx => {
            tx.executeSql(
                query,
                params,
                () => resolve(),
                (_, error) => reject(error)
            );
        });
    });
};


export const deleteBroadcastMessage = async (data) => {
    const { refrenceIds } = data || {};
    if (!Array.isArray(refrenceIds) || refrenceIds.length === 0) {
        throw new Error('Invalid or missing refrenceIds');
    }

    try {
        const db = await openDatabase();

        let updateQuery = { nirastah: true, kimTaritaSandesha: 0, updatedAt: now };
        const now = new Date().toISOString();

        const updateFields = Object.keys(updateQuery).map(key => `${key} = ?`).join(', ');
        const updateValues = Object.values(updateQuery);

        await executeSQL(
            db,
            `UPDATE td_chat_hawamahal_212 SET ${updateFields} WHERE prasaranamId IN (${refrenceIds.map(() => '?').join(', ')})`,
            [...updateValues, ...refrenceIds]
        );

        console.log(`${refrenceIds.length} messages updated successfully`);
        return { success: true, message: `${refrenceIds.length} messages updated successfully` };

    } catch (error) {
        console.error('Error updating messages:', error);
        return { success: false, message: `Failed to update messages: ${error.message}` };
    }
};

export const sentInviteToGroup = async (id) => {
    try {
        const db = await openDatabase();
        await executeSQL(
            db,
            `UPDATE td_chat_bhagwah_211 SET inviteSent = 1 WHERE id = ?`,
            [id]
        );

        console.log(`1 message updated successfully`);
        return { success: true, message: `1 message updated successfully` };
    } catch (error) {
        console.error('Error updating messages:', error);
        return { success: false, message: `Failed to update messages: ${error.message}` };
    }
};

export const updateParticipantRole = async (samvada_chinha_id, ekatma_chinha, newRole) => {
    try {
        const db = await openDatabase();

        await new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    `UPDATE td_chat_bhagwah_211 
                     SET bhumika = ? 
                     WHERE samvada_chinha_id = ? AND ekatma_chinha = ?;`,
                    [newRole, samvada_chinha_id, ekatma_chinha],
                    (_, result) => {
                        console.log(`Role updated successfully for participant: ${ekatma_chinha} to: ${newRole}`);
                        resolve(result);
                    },
                    (_, error) => {
                        console.error(`Error updating role for participant: ${ekatma_chinha}`, error);
                        reject(error);
                    }
                );
            });
        });

        return { success: true, message: 'Role updated successfully' };
    } catch (error) {
        console.error("Error in updateParticipantRole function:", error);
        return { success: false, message: `Failed to update role: ${error.message}` };
    }
};

export const exitGroup = async (samvada_chinha_id, ekatma_chinha) => {
    try {
        const db = await openDatabase();

        await new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    `UPDATE td_chat_bhagwah_211 
                    SET 
                        sakriyamastiva = 0,
                        removedAt = CURRENT_TIMESTAMP,
                        status = 'Removed',
                        yahniskasitah = ?
                    WHERE samvada_chinha_id = ? 
                        AND ekatma_chinha = ?;`,
                    [ekatma_chinha, samvada_chinha_id, ekatma_chinha],
                    (_, result) => {
                        console.log(
                            `Participant ${ekatma_chinha} exited group ${samvada_chinha_id}`
                        );
                        resolve(result);
                    },
                    (_, error) => {
                        console.error(
                            `Error exiting group for participant: ${ekatma_chinha}`,
                            error
                        );
                        reject(error);
                        return false;
                    },
                );
            });
        });

        return { success: true };
    } catch (error) {
        console.error('Error in exitGroup:', error);
        throw error; // IMPORTANT: let caller catch it
    }
};