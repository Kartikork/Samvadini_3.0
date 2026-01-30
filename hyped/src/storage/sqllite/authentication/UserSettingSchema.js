import SQLite from "react-native-sqlite-storage";
import { COUNTRIES as countries } from '../../../components/shared/CountryPicker';
import AsyncStorage from "@react-native-async-storage/async-storage";

SQLite.enablePromise(true);

const openDatabase = async () => {
    try {
        return await SQLite.openDatabase({ name: "td_delhi_10.db", location: "default" });
    } catch (error) {
        console.error("Error opening database:", error);
        throw error;
    }
};

export const userSettingCreateTables = async () => {
    try {
        const db = await openDatabase();

        db.transaction(tx => {
            tx.executeSql(
                `CREATE TABLE IF NOT EXISTS td_charminar_112 (
                    ekatma_chinha VARCHAR(30) PRIMARY KEY,
                    token TEXT,
                    praman_patrika VARCHAR(100),
                    parichayapatra TEXT,
                    desha_suchaka_koda VARCHAR(5) DEFAULT '+91',
                    durasamparka_sankhya INTEGER NOT NULL UNIQUE,
                    durasamparka_gopaniya INTEGER DEFAULT 0,
                    svasthya_sthiti VARCHAR(200),
                    antima_drishtigata DATETIME,
                    parichit_bahirbhuta TEXT DEFAULT '[]',
                    samparka_yuktam INTEGER DEFAULT 0,
                    dhwani VARCHAR(5) DEFAULT 'en',
                    sandesha_ghatita VARCHAR(20) DEFAULT 'off',
                    rodhita_upayogakartarah TEXT DEFAULT '[]',
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    pravesha_pramanam TEXT,
                    janma_tithi TEXT,
                    linga VARCHAR(10),
                    upayogakarta_nama VARCHAR(30) UNIQUE
                );`,
                [],
                () => console.log("td_charminar_112 table created successfully"),
                (_, error) => console.error("Error creating td_charminar_112 table:", error)
            );

            tx.executeSql(
                `CREATE TRIGGER IF NOT EXISTS update_td_charminar_112
                AFTER UPDATE ON td_charminar_112
                FOR EACH ROW
                BEGIN
                    UPDATE td_charminar_112 SET updatedAt = CURRENT_TIMESTAMP WHERE ekatma_chinha = OLD.ekatma_chinha;
                END;`,
                [],
                null,
                (_, error) => console.error("Error creating trigger update_td_charminar_112:", error)
            );

            tx.executeSql(
                `CREATE INDEX IF NOT EXISTS idx_durasamparka_sankhya ON td_charminar_112(durasamparka_sankhya);`,
                [],
                null,
                (_, error) => console.error("Error creating index idx_durasamparka_sankhya:", error)
            );
        });
    } catch (error) {
        console.error("Error creating table:", error);
    }
};

export const insertOrUpdateUserSettings = async (token, user) => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            tx.executeSql(
                `SELECT * FROM td_charminar_112 WHERE durasamparka_sankhya = ?;`,
                [user.durasamparka_sankhya],
                (tx, results) => {
                    const rows = results.rows.length;

                    if (rows > 0) {
                        tx.executeSql(
                            `UPDATE td_charminar_112 
                            SET token = ?, 
                                praman_patrika = ?, 
                                ekatma_chinha = ?, 
                                desha_suchaka_koda = ?, 
                                parichayapatra = ?,
                                durasamparka_gopaniya = ?, 
                                antima_drishtigata = ?, 
                                parichit_bahirbhuta = ?, 
                                samparka_yuktam = ?, 
                                dhwani = ?, 
                                sandesha_ghatita = ?, 
                                rodhita_upayogakartarah = ?,
                                pravesha_pramanam = ?,
                                janma_tithi = ?,
                                linga = ?,
                                upayogakarta_nama = ?
                            WHERE durasamparka_sankhya = ?;`,
                            [
                                token,
                                user.praman_patrika || null,
                                user.ekatma_chinha,
                                user.desha_suchaka_koda || '+91',
                                user.parichayapatra || null,
                                user.durasamparka_gopaniya || 0,
                                user.antima_drishtigata || null,
                                user.parichit_bahirbhuta || '[]',
                                user.samparka_yuktam || 0,
                                user.dhwani || 'en',
                                user.sandesha_ghatita || 'off',
                                user.rodhita_upayogakartarah || '[]',
                                user.pravesha_pramanam || token,
                                user.janma_tithi || null,
                                user.linga || null,
                                user.upayogakarta_nama || null,
                                user.durasamparka_sankhya
                            ],
                            (tx, result) => {
                                console.log("Record updated successfully. Rows affected:", result.rowsAffected);
                            },
                            (tx, error) => {
                                console.error("Error updating record:", error);
                            }
                        );
                    } else {
                        tx.executeSql(
                            `INSERT INTO td_charminar_112 
                                (token,
                                praman_patrika,
                                ekatma_chinha,
                                parichayapatra,
                                durasamparka_sankhya,
                                desha_suchaka_koda,
                                durasamparka_gopaniya,
                                antima_drishtigata,
                                parichit_bahirbhuta,
                                samparka_yuktam,
                                dhwani,
                                sandesha_ghatita,
                                rodhita_upayogakartarah,
                                pravesha_pramanam,
                                janma_tithi,
                                linga,
                                upayogakarta_nama)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                            [
                                token,
                                user.praman_patrika || null,
                                user.ekatma_chinha,
                                user.parichayapatra || null,
                                user.durasamparka_sankhya,
                                user.desha_suchaka_koda,
                                user.durasamparka_gopaniya || 0,
                                user.antima_drishtigata || null,
                                user.parichit_bahirbhuta || '[]',
                                user.samparka_yuktam || 0,
                                user.dhwani || 'en',
                                user.sandesha_ghatita || 'off',
                                user.rodhita_upayogakartarah || '[]',
                                user.pravesha_pramanam || token,
                                user.janma_tithi || null,
                                user.linga || null,
                                user.upayogakarta_nama || null
                            ],
                            (tx, result) => {
                                console.log("Record inserted successfully. Insert ID:", result.insertId);
                            },
                            (tx, error) => {
                                console.error("Error inserting record:", error);
                            }
                        );
                    }
                },
                (tx, error) => {
                    console.error("Error executing SELECT query:", error);
                }
            );
        });
    } catch (error) {
        console.error("Error in insertOrUpdateUserSettings:", error);
    }
};

export const userSettingDeleteTables = async () => {
    try {
        const db = await openDatabase();
        await db.transaction(async (tx) => {
            await tx.executeSql(`DROP TABLE IF EXISTS td_charminar_112;`);
        });

        console.log("Table td_charminar_112 deleted successfully.");
    } catch (error) {
        console.error("Error deleting td_charminar_112 table:", error);
    }
};

export const getUserSettingById = async (ekatma_chinha) => {
    try {
        const db = await openDatabase();
        let result = null;

        await new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT * FROM td_charminar_112 WHERE ekatma_chinha = ?;`,
                    [ekatma_chinha],
                    (tx, queryResult) => {
                        if (queryResult.rows.length > 0) {
                            result = queryResult.rows.item(0);
                        }
                        resolve();
                    },
                    (tx, error) => {
                        console.error("Query failed2:", error);
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

export const getNameAndPhoto = async (durasamparka_sankhya) => {
    try {
        const db = await openDatabase();

        return await new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT * FROM td_charminar_112 WHERE durasamparka_sankhya = ?;`,
                    [durasamparka_sankhya],
                    (tx, queryResult) => {
                        if (queryResult.rows.length > 0) {
                            resolve(queryResult.rows.item(0));
                        } else {
                            console.log('No user found with durasamparka_sankhya:', durasamparka_sankhya);
                            resolve(null);
                        }
                    },
                    (tx, error) => {
                        console.error('Query failed3:', error);
                        reject(error);
                    }
                );
            });
        });
    } catch (error) {
        console.error('Error fetching name and photo by durasamparka_sankhya:', error);
        throw error;
    }
};

export const updateProfile = async (data) => {
    try {
        const { uniqueId, updates } = data;
        const db = await openDatabase();

        const updateEntries = Object.entries(updates)
            .map(([key, value]) => `${key} = ?`)
            .join(", ");

        const values = [...Object.values(updates), uniqueId];

        await db.transaction(async (tx) => {
            await tx.executeSql(
                `UPDATE td_charminar_112 
                SET ${updateEntries}, updatedAt = CURRENT_TIMESTAMP 
                WHERE ekatma_chinha = ?;`,
                values
            );
        });

        if (updates?.parichayapatra) {
            try {
                await db.transaction(tx => {
                    tx.executeSql(
                        `UPDATE td_chat_qutubminar_211
                        SET samuha_chitram = ?, updatedAt = CURRENT_TIMESTAMP
                        WHERE pathakah_chinha = ? AND prakara = ?;`,
                        [updates.parichayapatra, uniqueId, 'SelfChat']
                    );
                });
            } catch (error) {
                console.error('Failed to update self chat photo:', error);
            }
        }

        console.log("Profile updated successfully");
    } catch (error) {
        console.error("Error updating profile:", error);
    }
};

// Function to get authentication data from SQLite
export const getAuthenticationDataFromSQLite = async () => {
    try {
        const db = await openDatabase();
        let result = null;

        await new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT * FROM td_charminar_112 WHERE pravesha_pramanam IS NOT NULL AND pravesha_pramanam != '' ORDER BY updatedAt DESC LIMIT 1;`,
                    [],
                    (tx, queryResult) => {
                        if (queryResult.rows.length > 0) {
                            result = queryResult.rows.item(0);
                        }
                        resolve();
                    },
                    (tx, error) => {
                        console.error("Query failed4:", error);
                        reject(error);
                    }
                );
            });
        });

        return result;
    } catch (error) {
        console.error("Error fetching authentication data from SQLite:", error);
        return null;
    }
};

export const getUserData = async () => {
    try {
        const db = await openDatabase();
        const getCountryNameByDialCode = (dialCode) => {
            if (!dialCode) return null;
            const country = countries.find((c) => c.dialCode === dialCode);
            return country ? country.name : null;
        };
        let result = null;

        await new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT * FROM td_charminar_112 
           WHERE pravesha_pramanam IS NOT NULL 
             AND pravesha_pramanam != '' 
           ORDER BY updatedAt DESC 
           LIMIT 1;`,
                    [],
                    (tx, queryResult) => {
                        if (queryResult.rows.length > 0) {
                            result = queryResult.rows.item(0);
                        }
                        resolve();
                    },
                    (tx, error) => {
                        console.error("Query failed5:", error);
                        reject(error);
                    }
                );
            });
        });

        if (!result) return null;
        const calculateAge = (dobString) => {
            if (!dobString) return null;
            const dob = new Date(dobString);
            const today = new Date();
            let age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            const dayDiff = today.getDate() - dob.getDate();
            if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
                age--;
            }
            return age;
        };

        const transformed = {
            age: calculateAge(result.janma_tithi),
            gender: result.linga,
            firstName: result.praman_patrika,
            phoneNumber: result.durasamparka_sankhya,
            userId: result.ekatma_chinha,
            sourceLanguage: result.dhwani,
            profilePic: result.parichayapatra,
            country: getCountryNameByDialCode(result.desha_suchaka_koda),
        };

        return transformed;
    } catch (error) {
        console.error("Error fetching authentication data from SQLite:", error);
        return null;
    }
};

// Function to restore authentication data to AsyncStorage
export const restoreAuthenticationData = async () => {
    try {
        const authData = await getAuthenticationDataFromSQLite();
        if (authData) {
            await AsyncStorage.setItem('userToken', authData.pravesha_pramanam);
            await AsyncStorage.setItem('uniqueId', authData.ekatma_chinha);
            await AsyncStorage.setItem('isRegister', 'true');
            await AsyncStorage.setItem('Logout', 'false');
            await AsyncStorage.setItem('userName', authData.praman_patrika || '');
            await AsyncStorage.setItem('userProfilePhoto', authData.parichayapatra || '');
            if (authData.upayogakarta_nama) {
                await AsyncStorage.setItem('uniqueUsername', authData.upayogakarta_nama);
            }
            console.log('Authentication data restored from SQLite');
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error restoring authentication data:", error);
        return false;
    }
};
