import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

// Open database function
const openDatabase = async () => {
    try {
        return await SQLite.openDatabase({ name: "td_delhi_10.db", location: "default" });
    } catch (error) {
        console.error("Error opening database:", error);
        throw error;
    }
};

// Function to create tables
export const createTables = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(
                `CREATE TABLE IF NOT EXISTS natsjobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    referenceID VARCHAR(100) NOT NULL UNIQUE,
                    vacancy TEXT,
                    posted_on TEXT,
                    last_date TEXT,
                    apply_link TEXT,
                    corporate_organization TEXT,
                    description TEXT,
                    course_type TEXT,
                    location TEXT,
                    title TEXT
                );`
            );
        });
        console.log("Table 'natsjobs' created successfully.");
    } catch (error) {
        console.error("Error creating tables:", error);
    }
};

// Function to delete tables
export const deleteTables = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(`DROP TABLE IF EXISTS natsjobs;`);
        });
        console.log("Table 'natsjobs' deleted successfully.");
    } catch (error) {
        console.error("Error deleting table 'natsjobs':", error);
    }
};

// Function to save NATS job data
export const saveSQLLiteNatsJobData = async (dataArray) => {
    if (!Array.isArray(dataArray)) {
        console.error("Invalid data: Expected an array of objects.");
        return;
    }

    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            for (const data of dataArray) {
                const {
                    referenceID,
                    vacancy,
                    posted_on,
                    last_date,
                    apply_link,
                    corporate_organization,
                    description,
                    course_type,
                    location,
                    title
                } = data;

                // Check if the record exists
                const [result] = await tx.executeSql(
                    `SELECT COUNT(*) AS count FROM natsjobs WHERE referenceID = ?`,
                    [referenceID]
                );

                const count = result.rows.item(0).count;

                if (count > 0) {
                    // Delete the existing record
                    await tx.executeSql(
                        `DELETE FROM natsjobs WHERE referenceID = ?`,
                        [referenceID]
                    );
                }

                // Insert the new data
                await tx.executeSql(
                    `INSERT INTO natsjobs (
                        referenceID,
                        vacancy,
                        posted_on,
                        last_date,
                        apply_link,
                        corporate_organization,
                        description,
                        course_type,
                        location,
                        title
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        referenceID,
                        vacancy || null,
                        posted_on || null,
                        last_date || null,
                        apply_link || null,
                        corporate_organization || null,
                        description || null,
                        course_type || null,
                        location || null,
                        title || null
                    ]
                );
            }
        });
        console.log("All data processed successfully.");
    } catch (error) {
        console.error("Error saving NATS job data:", error);
    }
};

// Function to fetch all NATS job data
export const getNatsJobDataSQLlite = async () => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT * FROM natsjobs ORDER BY posted_on DESC`,
                    [],
                    (_, { rows: { _array } }) => resolve(_array),
                    (tx, error) => {
                        console.error("Database query error:", error);
                        reject(error);
                    }
                );
            });
        });
    } catch (error) {
        console.error("Error fetching NATS job data:", error);
        return null;
    }
};

// Function to fetch NATS job data by ID
export const getNatsJobDataSQLlitebyID = async ({ referenceID = "" }) => {
    if (!referenceID) {
        console.error("Invalid referenceID provided.");
        return null;
    }

    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT * FROM natsjobs WHERE referenceID = ?`,
                    [referenceID],
                    (_, { rows }) => resolve(rows.item(0)),
                    (tx, error) => {
                        console.error("Database query error:", error);
                        reject(error);
                    }
                );
            });
        });
    } catch (error) {
        console.error("Error fetching NATS job data by ID:", error);
        return null;
    }
};
