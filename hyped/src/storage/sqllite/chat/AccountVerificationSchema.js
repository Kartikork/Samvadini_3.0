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
export const accountVerifyCreateTables = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(
                `CREATE TABLE IF NOT EXISTS td_chat_knapur_214 (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    upayogakarta_chinha TEXT NOT NULL,
                    adhaar_patrikayaha_sweekritah INTEGER DEFAULT 0,
                    pan_patrikayaha_sweekritah INTEGER DEFAULT 0,
                    lekha_patrikayaha_sweekritah INTEGER DEFAULT 0,
                    passport_patrikayaha_sweekritah INTEGER DEFAULT 0,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
            );
        });
        console.log("Table 'td_chat_knapur_214' created successfully.");
    } catch (error) {
        console.error("Error creating tables:", error);
    }
};

// Delete tables
export const accountVerifyDeleteTables = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(`DROP TABLE IF EXISTS td_chat_knapur_214;`);
        });
        console.log("Table 'td_chat_knapur_214' deleted successfully.");
    } catch (error) {
        console.error("Error deleting table 'td_chat_knapur_214':", error);
    }
};