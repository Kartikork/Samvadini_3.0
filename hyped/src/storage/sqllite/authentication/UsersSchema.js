import SQLite from "react-native-sqlite-storage";

SQLite.enablePromise(true);

const openDatabase = async () => {
    try {
        return await SQLite.openDatabase({ name: "td_delhi_10.db", location: "default" });
    } catch (error) {
        console.error("Error opening database:", error);
        throw error;
    }
};

export const usersCreateTables = async () => {
    try {
        const db = await openDatabase();

        db.transaction((tx) => {
            tx.executeSql(
                `CREATE TABLE IF NOT EXISTS td_tajmahal_111 (
                    ekatma_chinha VARCHAR(30) PRIMARY KEY,
                    token TEXT,
                    dootapatra VARCHAR(55) NOT NULL UNIQUE,
                    gopyata_suchi TEXT,
                    desha_suchaka_koda VARCHAR(5) DEFAULT '+91',
                    durasamparka_sankhya INTEGER NOT NULL UNIQUE,
                    lekha_nirastah BOOLEAN DEFAULT 1,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );`,
                [],
                () => console.log("td_tajmahal_111 table created successfully"),
                (_, error) => console.error("Error creating td_tajmahal_111 table:", error)
            );

            tx.executeSql(
                `CREATE TRIGGER IF NOT EXISTS update_td_tajmahal_111
                AFTER UPDATE ON td_tajmahal_111
                FOR EACH ROW
                BEGIN
                    UPDATE td_tajmahal_111 SET updatedAt = CURRENT_TIMESTAMP WHERE ekatma_chinha = OLD.ekatma_chinha;
                END;`,
                [],
                null,
                (_, error) => console.error("Error creating trigger update_td_tajmahal_111:", error)
            );

            tx.executeSql(
                `CREATE INDEX IF NOT EXISTS idx_durasamparka_sankhya ON td_tajmahal_111(durasamparka_sankhya);`,
                [],
                null,
                (_, error) => console.error("Error creating index idx_durasamparka_sankhya:", error)
            );
        });
    } catch (error) {
        console.error("Error creating table:", error);
    }
};

export const insertOrUpdateUser = async (token, user) => {
    try {
        const db = await openDatabase();

        db.transaction((tx) => {
            tx.executeSql(
                `SELECT * FROM td_tajmahal_111 WHERE durasamparka_sankhya = ?;`,
                [parseInt(user.durasamparka_sankhya, 10)],
                (tx, result) => {
                    if (result.rows.length > 0) {
                        tx.executeSql(
                            `UPDATE td_tajmahal_111 SET 
                                token = ?, 
                                ekatma_chinha = ?, 
                                dootapatra = ?, 
                                gopyata_suchi = ?, 
                                desha_suchaka_koda = ?, 
                                lekha_nirastah = ?, 
                                updatedAt = CURRENT_TIMESTAMP
                            WHERE durasamparka_sankhya = ?;`,
                            [
                                token,
                                user.ekatma_chinha,
                                user.dootapatra,
                                user.gopyata_suchi || null,
                                user.desha_suchaka_koda || "+91",
                                user.lekha_nirastah || 1,
                                parseInt(user.durasamparka_sankhya, 10)
                            ],
                            null,
                            (_, error) => console.error("Error updating record:", error)
                        );
                    } else {
                        tx.executeSql(
                            `INSERT INTO td_tajmahal_111 
                                (token, ekatma_chinha, dootapatra, gopyata_suchi, desha_suchaka_koda, durasamparka_sankhya, lekha_nirastah) 
                            VALUES (?, ?, ?, ?, ?, ?, ?);`,
                            [
                                token,
                                user.ekatma_chinha,
                                user.dootapatra,
                                user.gopyata_suchi || null,
                                user.desha_suchaka_koda || "+91",
                                parseInt(user.durasamparka_sankhya, 10),
                                user.lekha_nirastah || 1
                            ],
                            null,
                            (_, error) => console.error("Error inserting record:", error)
                        );
                    }
                },
                (_, error) => console.error("Error executing SELECT query:", error)
            );
        });
    } catch (error) {
        console.error("Error in insertOrUpdateUser:", error);
    }
};

export const usersDeleteTables = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(`DROP TABLE IF EXISTS td_tajmahal_111;`);
        });

        console.log("Table td_tajmahal_111 deleted successfully.");
    } catch (error) {
        console.error("Error deleting td_tajmahal_111 table:", error);
    }
};

export const getUserById = async (ekatma_chinha) => {
    try {
        const db = await openDatabase();
        let result = null;

        await new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT * FROM td_tajmahal_111 WHERE ekatma_chinha = ?;`,
                    [ekatma_chinha],
                    (tx, queryResult) => {
                        if (queryResult.rows.length > 0) {
                            result = queryResult.rows.item(0);
                        }
                        resolve();
                    },
                    (tx, error) => {
                        console.error("Query failed1:", error);
                        reject(error);
                    }
                );
            });
        });

        if (result) {
            return result;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching user by ekatma_chinha:", error);
        throw error;
    }
};