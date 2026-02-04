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

// Function to create the required tables
export const createTables = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(
                `CREATE TABLE IF NOT EXISTS add_bussiness (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
            );
        });
        console.log("Table 'add_bussiness' created successfully.");
    } catch (error) {
        console.error("Error creating tables:", error);
    }
};

// Delete tables
export const deleteTables = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(`DROP TABLE IF EXISTS add_bussiness;`);
        });
        console.log("Table 'add_bussiness' deleted successfully.");
    } catch (error) {
        console.error("Error deleting table 'add_bussiness':", error);
    }
};