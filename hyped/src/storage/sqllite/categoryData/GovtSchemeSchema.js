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

// Create tables
export const createTables = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(
                `CREATE TABLE IF NOT EXISTS govtschemes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    referenceID VARCHAR(100) NOT NULL UNIQUE,
                    image_url TEXT,
                    article_url TEXT,
                    publish_date TEXT,
                    title TEXT,
                    summary TEXT
                );`
            );
        });
        console.log("Table 'govtschemes' created successfully.");
    } catch (error) {
        console.error("Error creating tables:", error);
    }
};

// Delete tables
export const deleteTables = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(`DROP TABLE IF EXISTS govtschemes;`);
        });
        console.log("Table 'govtschemes' deleted successfully.");
    } catch (error) {
        console.error("Error deleting table 'govtschemes':", error);
    }
};

// Save data to SQLite
export const saveSQLLiteGovtSchemesData = async (dataArray) => {
    if (!Array.isArray(dataArray)) {
        console.error("Invalid data: Expected an array of objects.");
        return;
    }

    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            for (const data of dataArray) {
                const { referenceID, image_url, article_url, publish_date, title, summary } = data;

                // Check if the record exists
                const [result] = await tx.executeSql(
                    `SELECT COUNT(*) AS count FROM govtschemes WHERE referenceID = ?`,
                    [referenceID]
                );

                const count = result.rows.item(0).count;

                if (count > 0) {
                    // If record exists, delete it
                    await tx.executeSql(`DELETE FROM govtschemes WHERE referenceID = ?`, [referenceID]);
                }

                // Insert new record
                await tx.executeSql(
                    `INSERT INTO govtschemes (
                        referenceID, 
                        image_url, 
                        article_url, 
                        publish_date, 
                        title, 
                        summary
                    ) VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        referenceID,
                        image_url || null,
                        article_url || null,
                        publish_date || null,
                        title || null,
                        summary || null,
                    ]
                );
            }
        });
        console.log("All data processed successfully.");
    } catch (error) {
        console.error("Error saving govtschemes data:", error);
    }
};

// Get all data
export const getGovtSchemesDataSQLlite = async () => {
    try {
        const db = await openDatabase();
        const results = await db.transaction(async (tx) => {
            const [res] = await tx.executeSql(`SELECT * FROM govtschemes ORDER BY publish_date DESC`);
            const rows = [];
            for (let i = 0; i < res.rows.length; i++) {
                rows.push(res.rows.item(i));
            }
            return rows;
        });
        return results;
    } catch (error) {
        console.error("Error fetching data:", error);
        return [];
    }
};

// Get data by reference ID
export const getGovtSchemesDataSQLlitebyID = async (referenceID = "") => {
    if (!referenceID) {
        console.error("Invalid reference ID.");
        return null;
    }

    try {
        const db = await openDatabase();
        const result = await db.transaction(async (tx) => {
            const [res] = await tx.executeSql(
                `SELECT * FROM govtschemes WHERE referenceID = ?`,
                [referenceID]
            );
            return res.rows.length > 0 ? res.rows.item(0) : null;
        });
        return result;
    } catch (error) {
        console.error("Error fetching data by ID:", error);
        return null;
    }
};
