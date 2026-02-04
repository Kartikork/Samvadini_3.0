import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

// Open database function
let dbInstance = null;
const openDatabase = async () => {
    if (!dbInstance) {
        try {
            dbInstance = await SQLite.openDatabase({ name: "td_delhi_10.db", location: "default" });
        } catch (error) {
            console.error("Error opening database:", error);
            throw error;
        }
    }
    return dbInstance;
};

// Function to create tables
export const createTables = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(
                `CREATE TABLE IF NOT EXISTS internshipjobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    referenceID VARCHAR(100) NOT NULL UNIQUE,
                    interns TEXT,
                    uid TEXT,
                    logo_url TEXT,
                    posted_on TEXT,
                    last_date TEXT,
                    apply_url TEXT,
                    company TEXT,
                    state TEXT,
                    internship_type TEXT,
                    qualification TEXT,
                    title TEXT,
                    specialisation TEXT,
                    duration TEXT,
                    description TEXT,
                    perks TEXT
                );`
            );
        });
        console.log("Table 'internshipjobs' created successfully.");
    } catch (error) {
        console.error("Error creating tables:", error);
    }
};

// Delete tables
export const deleteTables = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(`DROP TABLE IF EXISTS internshipjobs;`);
        });
        console.log("Table 'internshipjobs' deleted successfully.");
    } catch (error) {
        console.error("Error deleting table 'internshipjobs':", error);
    }
};

// Function to save internship job data
export const saveSQLLiteInternshipJobData = async (dataArray) => {
    if (!Array.isArray(dataArray)) {
        console.error('Invalid data: Expected an array of objects.');
        return;
    }

    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            for (const data of dataArray) {
                const {
                    referenceID,
                    interns,
                    uid,
                    logo_url,
                    posted_on,
                    last_date,
                    apply_url,
                    company,
                    state,
                    internship_type,
                    qualification,
                    title,
                    specialisation,
                    duration,
                    description,
                    perks,
                } = data;

                // Check if the record exists
                const [result] = await tx.executeSql(
                    `SELECT COUNT(*) AS count FROM internshipjobs WHERE referenceID = ?`,
                    [referenceID]
                );

                const count = result.rows.item(0).count;

                if (count > 0) {
                    // Delete the existing record
                    await tx.executeSql(`DELETE FROM internshipjobs WHERE referenceID = ?`, [referenceID]);
                }

                // Insert the new data
                await tx.executeSql(
                    `INSERT INTO internshipjobs (
                        referenceID,
                        interns,
                        uid,
                        logo_url,
                        posted_on,
                        last_date,
                        apply_url,
                        company,
                        state,
                        internship_type,
                        qualification,
                        title,
                        specialisation,
                        duration,
                        description,
                        perks
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                    [
                        referenceID,
                        interns || null,
                        uid || null,
                        logo_url || null,
                        posted_on || null,
                        last_date || null,
                        apply_url || null,
                        company || null,
                        state || null,
                        internship_type || null,
                        qualification || null,
                        title || null,
                        specialisation || null,
                        duration || null,
                        description || null,
                        perks || null,
                    ]
                );
            }
        });
        console.log("All data processed successfully.");
    } catch (error) {
        console.error("Error saving internship job data:", error);
    }
};

// Function to fetch all internship job data
export const getInternshipJobDataSQLlite = async () => {
    try {
        const db = await openDatabase();
        const results = await db.transaction((tx) =>
            tx.executeSql(
                `SELECT * FROM internshipjobs ORDER BY posted_on DESC`
            )
        );

        return results[0]?.rows.raw() || [];
    } catch (error) {
        console.error("Error fetching internship job data:", error);
        return [];
    }
};

// Function to fetch internship job data by ID
export const getInternshipJobDataSQLlitebyID = async ({ referenceID = '' }) => {
    if (!referenceID) {
        console.error("Invalid referenceID: Cannot fetch data.");
        return null;
    }

    try {
        const db = await openDatabase();
        const results = await db.transaction((tx) =>
            tx.executeSql(
                `SELECT * FROM internshipjobs WHERE referenceID = ?`,
                [referenceID]
            )
        );

        return results[0]?.rows.item(0) || null;
    } catch (error) {
        console.error("Error fetching internship job data by ID:", error);
        return null;
    }
};
