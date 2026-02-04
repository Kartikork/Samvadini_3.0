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
                `CREATE TABLE IF NOT EXISTS linkedin_jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    referenceID VARCHAR(100) NOT NULL UNIQUE,
                    job_profile TEXT,
                    job_skills TEXT,
                    job_link TEXT,
                    company_name TEXT,
                    job_location TEXT,
                    job_posted_time TEXT,
                    job_type TEXT,
                    full_time_part_time TEXT,
                    number_applicants TEXT
                );`
            );
        });
        console.log("Table 'linkedin_jobs' created successfully.");
    } catch (error) {
        console.error("Error creating tables:", error);
    }
};

// Function to delete tables
export const deleteTables = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(`DROP TABLE IF EXISTS linkedin_jobs;`);
        });
        console.log("Table 'linkedin_jobs' deleted successfully.");
    } catch (error) {
        console.error("Error deleting table 'linkedin_jobs':", error);
    }
};

// Function to save LinkedIn job data
export const saveSQLLiteLinkedinJobData = async (dataArray) => {
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
                    job_profile,
                    job_skills,
                    job_link,
                    company_name,
                    job_location,
                    job_posted_time,
                    job_type,
                    full_time_part_time,
                    number_applicants
                } = data;

                // Check if the record exists
                const [result] = await tx.executeSql(
                    `SELECT COUNT(*) AS count FROM linkedin_jobs WHERE referenceID = ?`,
                    [referenceID]
                );

                const count = result.rows.item(0).count;

                if (count > 0) {
                    // Delete the existing record
                    await tx.executeSql(
                        `DELETE FROM linkedin_jobs WHERE referenceID = ?`,
                        [referenceID]
                    );
                }

                // Insert the new data
                await tx.executeSql(
                    `INSERT INTO linkedin_jobs (
                        referenceID,
                        job_profile,
                        job_skills,
                        job_link,
                        company_name,
                        job_location,
                        job_posted_time,
                        job_type,
                        full_time_part_time,
                        number_applicants
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        referenceID,
                        job_profile || null,
                        job_skills || null,
                        job_link || null,
                        company_name || null,
                        job_location || null,
                        job_posted_time || null,
                        job_type || null,
                        full_time_part_time || null,
                        number_applicants || null
                    ]
                );
            }
        });
        console.log("All data processed successfully.");
    } catch (error) {
        console.error("Error saving LinkedIn job data:", error);
    }
};

// Function to fetch all LinkedIn job data
export const getLinkedinJobDataSQLlite = async () => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT * FROM linkedin_jobs ORDER BY job_posted_time DESC`,
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
        console.error("Error fetching LinkedIn job data:", error);
        return null;
    }
};

// Function to fetch LinkedIn job data by ID
export const getLinkedinJobDataSQLlitebyID = async ({ referenceID = "" }) => {
    if (!referenceID) {
        console.error("Invalid referenceID provided.");
        return null;
    }

    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT * FROM linkedin_jobs WHERE referenceID = ?`,
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
        console.error("Error fetching LinkedIn job data by ID:", error);
        return null;
    }
};
