import SQLite from "react-native-sqlite-storage";
import databaseManager from "../DatabaseManager";
SQLite.enablePromise(true);

export const openDatabase = async () => {
    try {
        const db = await SQLite.openDatabase({
            name: "td_delhi_10.db",
            location: "default",
        });
        return db;
    } catch (e) {
        console.error("DB OPEN ERROR:", e);
        throw e;
    }
};

export const CreateStatusTable = async () => {
    const db = await openDatabase();

    await db.transaction(async (tx) => {
        await tx.executeSql(`
      CREATE TABLE IF NOT EXISTS td_status (
        id INTEGER PRIMARY KEY,
        status_id VARCHAR(20) NOT NULL UNIQUE,
        pathakah_chinha VARCHAR(20) NOT NULL,
        sandesha_prakara VARCHAR(20),
        ukti VARCHAR(100),
        content VARCHAR(200),
        thumbnail VARCHAR(200),
        is_liked INTEGER DEFAULT 0,
        is_view INTEGER DEFAULT 0,
        expire_at TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );
    `);

        await tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_status_id ON td_status (status_id);`);
        await tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_expire_at ON td_status (expire_at);`);
    });
};

export const CreateStatusVisibilityTable = async () => {
    const db = await openDatabase();

    await db.transaction(async (tx) => {
        await tx.executeSql(`
      CREATE TABLE IF NOT EXISTS td_status_visible (
        id INTEGER PRIMARY KEY,
        status_id TEXT,
        uniqueId VARCHAR(20) NOT NULL,
        is_liked INTEGER DEFAULT 0,
        viewedAt TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );
    `);

        await tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_vis_status ON td_status_visible(status_id);`);
    });
};

export const DeleteStatusTables = async () => {
    try {
        return await databaseManager.executeTransaction(async tx => {
            await tx.executeSql(`DROP TABLE IF EXISTS td_status;`);
            console.log('Table td_status deleted successfully.');
        });
    } catch (error) {
        console.error('Error deleting td_status table:', error);
    }
};

export const DeleteStatusVisibilityTables = async () => {
    try {
        return await databaseManager.executeTransaction(async tx => {
            await tx.executeSql(`DROP TABLE IF EXISTS td_status_visible;`);
            console.log('Table td_status_visible deleted successfully.');
        });
    } catch (error) {
        console.error('Error deleting td_status_visible table:', error);
    }
};

export const insertBulkStatus = async (data, myId) => {
    try {
        const db = await openDatabase();

        await db.transaction(tx => {
            for (const record of data) {
                const {
                    _id,
                    pathakah_chinha,
                    sandesha_prakara,
                    ukti = "",
                    content = "",
                    thumbnail = "",
                    expire_at = "",
                    createdAt = "",
                    updatedAt = "",
                    viewed_by = [],
                } = record;

                let is_view = 0;
                let is_liked = 0;

                if (Array.isArray(viewed_by) && viewed_by.length > 0) {
                    const myView = viewed_by.find(
                        v => v?.uniqueId === myId
                    );

                    if (myView) {
                        is_view = 1;
                        is_liked = myView.like ? 1 : 0;
                    }
                }

                tx.executeSql(
                    `INSERT OR REPLACE INTO td_status (
            id,
            status_id,
            pathakah_chinha,
            sandesha_prakara,
            ukti,
            content,
            thumbnail,
            is_liked,
            is_view,
            expire_at,
            createdAt,
            updatedAt
          )
          VALUES (
            (SELECT id FROM td_status WHERE status_id = ?),
            ?,?,?,?,?,?,
            ?,?,
            ?,?,?
          );`,
                    [
                        _id,                     // for sub-query
                        _id,                     // status_id
                        pathakah_chinha,
                        sandesha_prakara,
                        ukti,
                        content,
                        thumbnail,
                        is_liked,
                        is_view,
                        expire_at,
                        createdAt,
                        updatedAt || new Date().toISOString(),
                    ]
                );
                if (pathakah_chinha === myId && viewed_by.length > 0) {
                    for (const v of viewed_by) {
                        const { uniqueId, like, viewedAt } = v;

                        tx.executeSql(
                            `UPDATE td_status_visible
               SET is_liked=?, viewedAt=?
               WHERE status_id=? AND uniqueId=?`,
                            [like, viewedAt, _id, uniqueId],
                            (_, rs) => {
                                if (rs.rowsAffected === 0) {
                                    tx.executeSql(
                                        `INSERT INTO td_status_visible
                       (status_id, uniqueId, is_liked, viewedAt)
                     VALUES (?,?,?,?)`,
                                        [_id, uniqueId, like, viewedAt]
                                    );
                                }
                            }
                        );
                    }
                }
            }
        });

        console.log("✓ insertBulkStatus completed");
    } catch (e) {
        console.error("insertBulkStatus ERROR:", e);
    }
};

export const getAllStatus = async (myId) => {
    try {
        const db = await openDatabase();

        return new Promise((resolve) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT 
                        s.*,
                        c.praman_patrika AS contact_name,
                        c.parichayapatra AS contact_photo
                    FROM td_status s
                    LEFT JOIN td_fort_113 c ON s.pathakah_chinha = c.ekatma_chinha
                    ORDER BY datetime(s.createdAt) DESC;`,
                    [],
                    async (_, results) => {
                        const rows = results.rows.raw();
                        const final = await attachViewersToStatuses(rows, myId);
                        resolve(final);
                    }
                );
            });
        });
    } catch (e) {
        console.error("getAllStatus ERROR:", e);
        return [];
    }
};

export const attachViewersToStatuses = async (statuses, myId) => {
    const db = await openDatabase();

    for (let status of statuses) {
        if (status.pathakah_chinha !== myId) {
            status.viewed_by = [];
            continue;
        }

        const viewerList = await new Promise((resolve) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT 
              v.uniqueId,
              v.is_liked as like,
              v.viewedAt,
              f.praman_patrika AS name,
              f.parichayapatra AS photo
            FROM td_status_visible v
            LEFT JOIN td_fort_113 f ON v.uniqueId = f.ekatma_chinha
            WHERE v.status_id = ?`,
                    [status.status_id],
                    (_, res) => resolve(res.rows.raw()),
                    () => resolve([])
                );
            });
        });

        status.viewed_by = viewerList.map((v) => ({
            ...v,
            reaction_details: safeJSON(v.reaction_details),
            reaction_summary: safeJSON(v.reaction_summary),
        }));
    }

    return statuses;
};

export const deleteStatus = async (id) => {
    const db = await openDatabase();

    await db.transaction((tx) => {
        tx.executeSql(`DELETE FROM td_status WHERE status_id=?`, [id]);
        tx.executeSql(`DELETE FROM td_status_visible WHERE status_id=?`, [id]);
    });

    console.log("✓ Deleted status:", id);
};


export const viewAndLikeStatus = async (id, like = false) => {
    try {
        const db = await openDatabase();
        db.transaction(tx => {
            tx.executeSql(
                `UPDATE td_status
                SET is_view = 1, is_liked = ?
                WHERE status_id = ?;`,
                [like ? 1 : 0, id],
                () => console.log(`Status updated successfully for id: ${id}`),
                (_, error) => console.error(`Error updating status for id: ${id}`, error)
            );
        });
    } catch (error) {
        console.error("Error in viewAndLikeStatus:", error);
    }
};

export const updateStatus = async (data) => {
    try {
        const { id, uniqueId, like } = data;
        const nowUTC = new Date().toISOString();

        await databaseManager.executeTransaction(tx => {

            tx.executeSql(
                `UPDATE td_status_visible
                SET is_liked = ?, viewedAt = ?
                WHERE status_id = ? AND uniqueId = ?;`,
                [like, nowUTC, id, uniqueId],

                (_, result) => {
                    if (result.rowsAffected === 0) {
                        tx.executeSql(
                            `INSERT INTO td_status_visible 
                                (status_id, uniqueId, is_liked, viewedAt)
                            VALUES (?, ?, ?, ?);`,
                            [id, uniqueId, like, nowUTC],

                            () => {
                                console.log(`Inserted new status_visible for ${uniqueId}.`);
                            },
                            (_, error) => {
                                console.error(`Error inserting status_visible for ${uniqueId}:`, error);
                                return false;
                            }
                        );
                    } else {
                        console.log(`Updated like for status ${id} and viewer ${uniqueId}.`);
                    }
                },

                (_, error) => {
                    console.error(`Error updating is_liked for ${uniqueId}:`, error);
                    return false;
                }
            );
        });

        console.log("✓ updateStatus completed");
    } catch (error) {
        console.error("❌ updateStatus error:", error);
    }
};

const safeJSON = (value) => {
    if (!value || typeof value !== "string") return null;
    try {
        return JSON.parse(value);
    } catch (e) {
        console.warn("❗ Invalid JSON, returning null:", value);
        return null;
    }
};

export const getOthersStatus = async (myId) => {
    try {
        const db = await openDatabase();
        const nowUTC = new Date().toISOString();
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT
                        s.*,
                        c.praman_patrika AS contact_name,
                        c.parichayapatra AS contact_photo
                    FROM td_status s
                    LEFT JOIN td_fort_113 c ON s.pathakah_chinha = c.ekatma_chinha
                    WHERE s.pathakah_chinha != ? AND datetime(s.expire_at) > datetime(?)
                    ORDER BY datetime(s.createdAt) DESC;`,
                    [myId, nowUTC],
                    (_, results) => {
                        const allStatus = results.rows.raw();
                        resolve(allStatus.length ? allStatus : []);
                    },
                    (_, error) => {
                        console.error("Error fetching statuses:", error);
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