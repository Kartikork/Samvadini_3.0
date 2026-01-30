import SQLite from "react-native-sqlite-storage";

SQLite.enablePromise(true);

export const deleteFUllDatabase = async () => {
    try {
        const dbName = "td_delhi_10.db";
        const dbLocation = "default";

        const db = await SQLite.openDatabase({ name: dbName, location: dbLocation });
        await db.close();
        await SQLite.deleteDatabase({ name: dbName, location: dbLocation });
        console.log(`Database '${dbName}' deleted successfully.`);
    } catch (error) {
        console.error("Error deleting database 'td_delhi_10.db':", error.message, error);
        throw error;
    }
};