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

export const deleteCategoryTables = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(`DROP TABLE IF EXISTS td_cat_suntemple_411;`);
        });
        await createCategoryTables();
        console.log("Table 'td_cat_suntemple_411' deleted successfully.");
    } catch (error) {
        console.error("Error deleting table 'td_cat_suntemple_411':", error);
    }
};

export const createCategoryTables = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(`
                CREATE TABLE IF NOT EXISTS td_cat_suntemple_411 (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    referenceID VARCHAR(24) NOT NULL UNIQUE,
                    category VARCHAR(150) NOT NULL,
                    image_url TEXT,
                    article_url TEXT NOT NULL,
                    publish_date DATE,  
                    summary TEXT,
                    tags VARCHAR(100),  
                    title TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);

            await Promise.all([
                tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_category ON td_cat_suntemple_411(category);`),
                tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_publish_date ON td_cat_suntemple_411(publish_date);`),
                tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_referenceID ON td_cat_suntemple_411(referenceID);`),
                tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_created_at ON td_cat_suntemple_411(created_at);`)
            ]);
        });

        console.log("✅ Table and indexes created successfully.");
    } catch (error) {
        console.error("Error creating tables:", error);
        throw error;
    }
};

export const saveSQLLiteCategoryData = async (dataArray) => {
    try {
        const db = await openDatabase();

        await db.transaction(async (tx) => {
            for (const item of dataArray) {
                const referenceID = item._id || "";
                const category = item.category || "";
                const image_url = item.image_url || "";
                const article_url = item.article_url || "";
                const publish_date = item.publish_date || "";
                const summary = item.summary || "";
                const tags = item.hashtags || "";
                const title = item.title || "";

                // Check if referenceID exists
                const checkQuery = `SELECT referenceID FROM td_cat_suntemple_411 WHERE referenceID = ?;`;
                tx.executeSql(checkQuery, [referenceID], (_, results) => {
                    if (results.rows.length > 0) {
                        // If referenceID exists, update only title and summary
                        const updateQuery = `
                            UPDATE td_cat_suntemple_411 
                            SET title = ?, summary = ?
                            WHERE referenceID = ?;
                        `;
                        tx.executeSql(updateQuery, [title, summary, referenceID], (_, result) => {
                            console.log("✅ Updated:", referenceID);
                        }, (_, error) => {
                            console.error("Update Error:", error);
                        });
                    } else {
                        // If referenceID doesn't exist, insert a new record
                        const insertQuery = `
                            INSERT INTO td_cat_suntemple_411 
                            (referenceID, category, image_url, article_url, publish_date, summary, tags, title) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                        `;
                        tx.executeSql(insertQuery, [referenceID, category, image_url, article_url, publish_date, summary, tags, title], (_, result) => {
                            console.log("✅ Inserted:", referenceID);
                        }, (_, error) => {
                            console.error("Insert Error:", error);
                        });
                    }
                });
            }
        });

        console.log("✅ Bulk insert/update completed.");
    } catch (error) {
        console.error("Error in bulk insert/update:", error);
    }
};


export const getCategoryDataSQLlite = async (category = "") => {
    try {
        const db = await openDatabase();
        let results = [];
        if (category === "Central Govt. Schemes, Policies") {
            const [res] = await db.executeSql(
                `SELECT * FROM td_cat_pib_412 ORDER BY date DESC`
            );
            for (let i = 0; i < res.rows.length; i++) {
                results.push(res.rows.item(i));
            }
        } else if (category !== "hotTrends") {
            const [res] = await db.executeSql(
                `SELECT * FROM td_cat_suntemple_411 WHERE category = ? ORDER BY publish_date DESC`,
                [category?.trim()]
            );

            for (let i = 0; i < res.rows.length; i++) {
                results.push(res.rows.item(i));
            }
        } else {
            const [res] = await db.executeSql(
                `SELECT * FROM td_cat_suntemple_411 ORDER BY publish_date DESC`
            );
            for (let i = 0; i < res.rows.length; i++) {
                results.push(res.rows.item(i));
            }
        }

        console.log(`Fetched ${results.length} records`);
        return results;
    } catch (error) {
        console.error("Error fetching data:", error);
        return [];
    }
};

export const getCategoryDataSQLlitebyID = async (referenceID = "") => {
    console.log("referenceID", referenceID);
    if (!referenceID || referenceID?.trim() === "") {
        console.error("Invalid reference ID: Reference ID cannot be empty or undefined.");
        return null;
    }
    try {
        const db = await openDatabase();
        let result = null;
        // Try PIB table first
        let res = await db.executeSql(
            `SELECT * FROM td_cat_pib_412 WHERE referenceID = ?`,
            [referenceID?.trim()]
        );
        if (res[0].rows.length > 0) {
            result = res[0].rows.item(0);
            return result;
        }
        // Fallback to suntemple table
        res = await db.executeSql(
            `SELECT * FROM td_cat_suntemple_411 WHERE referenceID = ?`,
            [referenceID?.trim()]
        );
        if (res[0].rows.length > 0) {
            result = res[0].rows.item(0);
        }
        return result;
    } catch (error) {
        console.error(`Error fetching data by ID for referenceID ${referenceID}:`, error);
        return null;
    }
};

export const createPIBTable = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(`
                CREATE TABLE IF NOT EXISTS td_cat_pib_412 (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    referenceID VARCHAR(24) NOT NULL UNIQUE,
                    date TEXT,
                    ministry TEXT,
                    subject TEXT,
                    body TEXT,
                    image_url TEXT
                );
            `);
            console.log("DEBUG: Created td_cat_pib_412 (PIB table)");
        });
    } catch (error) {
        console.log("ERROR: Failed to create PIB table", error);
    }
};

export const deletePIBTable = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(`DROP TABLE IF EXISTS td_cat_pib_412;`);
        });
        await createPIBTable();
        console.log("Table 'td_cat_pib_412' deleted and recreated successfully.");
    } catch (error) {
        console.error("Error deleting PIB table:", error);
    }
};

export const savePIBData = async (dataArray) => {
    if (!dataArray || dataArray.length === 0) {
        console.log('DEBUG: No data to save to PIB table.');
        return;
    }

    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            const placeholders = dataArray.map(() => '(?, ?, ?, ?, ?, ?)').join(',');
            const sql = `INSERT OR REPLACE INTO td_cat_pib_412 (referenceID, date, ministry, subject, body, image_url) VALUES ${placeholders};`;
            
            const values = dataArray.flatMap(item => [
                item._id || item.referenceID || '',
                item.date || '',
                item.ministry || '',
                item.subject || '',
                item.body || '',
                Array.isArray(item.image_url) ? (item.image_url[0] || '') : (item.image_url || '')
            ]);

            await tx.executeSql(sql, values);
        });
        console.log(`DEBUG: Bulk insert/update of ${dataArray.length} records into PIB table completed.`);
    } catch (error) {
        console.log('ERROR: Bulk savePIBData failed', error);
        // Log the first few items to see if there is a data issue
        console.log('ERROR: First 5 items in failed data array:', JSON.stringify(dataArray.slice(0, 5), null, 2));
    }
};

