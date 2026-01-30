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

export const callingDeleteTables = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(`DROP TABLE IF EXISTS td_call_gatewayofindia_311;`);
        });

        console.log("Table td_call_gatewayofindia_311 deleted successfully.");
    } catch (error) {
        console.error("Error deleting td_call_gatewayofindia_311 table:", error);
    }
};

export const CallingCreateTable = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(`
                CREATE TABLE IF NOT EXISTS td_call_gatewayofindia_311 (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chatId VARCHAR(20),
                    senderId VARCHAR(20) NOT NULL,
                    recieverId VARCHAR(20) NOT NULL,
                    call_start_time VARCHAR(50) NOT NULL,
                    call_end_time VARCHAR(50) DEFAULT NULL,
                    call_type VARCHAR(20) NOT NULL,
                    referenceId VARCHAR(30) NOT NULL UNIQUE,
                    call_status VARCHAR(20) DEFAULT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);

            await tx.executeSql(`
                CREATE TRIGGER IF NOT EXISTS update_td_call_gatewayofindia_311
                AFTER UPDATE ON td_call_gatewayofindia_311
                FOR EACH ROW
                BEGIN
                    UPDATE td_call_gatewayofindia_311 
                    SET updatedAt = CURRENT_TIMESTAMP 
                    WHERE id = OLD.id;
                END;
            `);

            // Create Indexes
            const indexes = [
                { name: "idx_chatId", column: "chatId" },
                { name: "idx_senderId", column: "senderId" },
                { name: "idx_recieverId", column: "recieverId" },
                { name: "idx_call_type", column: "call_type" }
            ];

            for (const { name, column } of indexes) {
                await tx.executeSql(`
                    CREATE INDEX IF NOT EXISTS ${name} ON td_call_gatewayofindia_311 (${column});
                `);
            }

            console.log("Table 'td_call_gatewayofindia_311' and indexes created successfully.");
        });
    } catch (error) {
        console.error("Error creating 'td_call_gatewayofindia_311' table:", error);
    }
};

export const getTotalRecordCount = async () => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT COUNT(*) as total FROM td_call_gatewayofindia_311;`,
                    [],
                    (_, resultSet) => {
                        resolve(resultSet.rows.item(0).total);
                    },
                    (_, error) => {
                        console.error('Error counting records:', error);
                        reject(0);
                    }
                );
            });
        });
    } catch (error) {
        console.error('Error in getTotalRecordCount:', error);
        return 0;
    }
};

export const fetchAllRecords = async (uniqueId) => {
    try {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT
                            tcg.*,
                            COALESCE(tf.praman_patrika, tcb.praman_patrika) AS patrika_name,
                            COALESCE(tf.parichayapatra, tcb.parichayapatra, '') AS photo
                        FROM td_call_gatewayofindia_311 tcg

                        LEFT JOIN (
                            SELECT * FROM td_chat_bhagwah_211
                            GROUP BY ekatma_chinha
                        ) tcb ON tcb.ekatma_chinha = CASE
                            WHEN tcg.senderId = ? THEN tcg.recieverId
                            ELSE tcg.senderId
                        END

                        LEFT JOIN (
                            SELECT * FROM td_fort_113
                            GROUP BY ekatma_chinha
                        ) tf ON tf.ekatma_chinha = CASE
                                WHEN tcg.senderId = ? THEN tcg.recieverId
                            ELSE tcg.senderId
                        END

                        WHERE
                            tcg.senderId = ?
                            OR tcg.recieverId = ?

                        ORDER BY
                            tcg.createdAt DESC;`,
                    [uniqueId, uniqueId, uniqueId, uniqueId],
                    (_, resultSet) => {
                        let records = [];
                        if (resultSet.rows.length > 0) {
                            for (let i = 0; i < resultSet.rows.length; i++) {
                                const row = resultSet.rows.item(i);
                                if (!row._id && row.referenceId) {
                                    row._id = row.referenceId;
                                }
                                records.push(row);
                            }
                        }
                        resolve(records);
                    },
                    (_, error) => {
                        console.error('SQL Error:', error);
                        reject([]);
                    }
                );
            });
        });
    } catch (error) {
        console.error('Error fetching records:', error);
        return [];
    }
};

export const insertOrUpdateBulkRecords = async (records) => {
    if (!records || records.length === 0) {
        console.log('No records to insert');
        return;
    }
    
    try {
        const db = await openDatabase();
        let successCount = 0;
        let errorCount = 0;
        
        // Pre-filter records to remove invalid ones
        const validRecords = records.filter(record => {
            if (!record.senderId || !record.recieverId || !record.referenceId) {
                console.warn('⚠️ Skipping record with missing required fields:', {
                    referenceId: record.referenceId,
                    senderId: record.senderId,
                    recieverId: record.recieverId
                });
                errorCount++;
                return false;
            }
            return true;
        });
        
        console.log(`📝 Processing ${validRecords.length} valid records (${errorCount} invalid skipped)`);
        
        // Process each record individually to avoid transaction rollback on errors
        for (const record of validRecords) {
            try {
                await db.executeSql(
                    `INSERT OR REPLACE INTO td_call_gatewayofindia_311 (
                        chatId, senderId, recieverId, call_start_time, 
                        call_end_time, call_type, call_status, referenceId, createdAt, updatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);`,
                    [
                        record.chatId || null,
                        record.senderId,
                        record.recieverId,
                        record.call_start_time,
                        record.call_end_time || null,
                        record.call_type,
                        record.call_status || null,
                        record.referenceId,
                        record.createdAt || new Date().toISOString(),
                    ]
                );
                successCount++;
            } catch (recordError) {
                errorCount++;
                console.error('❌ Error inserting record:', {
                    error: recordError.message || recordError,
                    referenceId: record.referenceId,
                    senderId: record.senderId,
                    recieverId: record.recieverId
                });
                // Continue with next record
            }
        }
        
        console.log(`✅ Successfully inserted or updated ${successCount} records`);
        if (errorCount > 0) {
            console.warn(`⚠️ Failed to insert ${errorCount} records out of ${records.length} total`);
        }
    } catch (error) {
        console.error('❌ Error in bulk insert transaction:', error);
    }
};

export const deleteBulkRecords = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(`DELETE FROM td_call_gatewayofindia_311`);
        });
        console.log('All records deleted successfully.');
    } catch (error) {
        console.error('Error deleting all records:', error);
    }
};

export const deleteSingleRecord = async (referenceId) => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(
                `DELETE FROM td_call_gatewayofindia_311 WHERE referenceId = ?`,
                [referenceId]
            );
        });
        console.log('Record deleted successfully:', referenceId);
    } catch (error) {
        console.error('Error deleting record:', error);
    }
};

export const deleteBulkRecordsByReferenceIds = async (referenceIds) => {
    try {
        if (!referenceIds || referenceIds.length === 0) {
            console.log('No reference IDs provided for deletion');
            return;
        }

        const db = await openDatabase();
        await db.transaction(async (tx) => {
            const placeholders = referenceIds.map(() => '?').join(',');
            const query = `DELETE FROM td_call_gatewayofindia_311 WHERE referenceId IN (${placeholders})`;

            await tx.executeSql(query, referenceIds);
        });
        console.log(`Bulk deleted ${referenceIds.length} records successfully:`, referenceIds);
    } catch (error) {
        console.error('Error bulk deleting records:', error);
    }
};