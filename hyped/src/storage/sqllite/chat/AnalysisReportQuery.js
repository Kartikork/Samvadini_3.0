import SQLite from 'react-native-sqlite-storage';
SQLite.enablePromise(true);

const openDatabase = async () => {
    try {
        return await SQLite.openDatabase({
            name: 'td_delhi_10.db',
            location: 'default',
        });
    } catch (error) {
        console.error('Error opening database:', error);
        throw error;
    }
};

export const getTopCount = async (uniqueId) => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                const results = {
                    totalActiveMembers: 0,
                    totalCalls: 0,
                    numberOfDays: null,
                    totalMessages: 0
                };

                tx.executeSql(
                    `SELECT COUNT(1) as total_active FROM td_fort_113 WHERE samvadini_patrika_samarthah = 1;`,
                    [],
                    (_, res1) => {
                        results.totalActiveMembers = res1.rows.length > 0 ? res1.rows.item(0).total_active || 0 : 0;

                        tx.executeSql(
                            `SELECT COUNT(1) as total_calls FROM td_call_gatewayofindia_311;`,
                            [],
                            (_, res2) => {
                                results.totalCalls = res2.rows.length > 0 ? res2.rows.item(0).total_calls || 0 : 0;

                                tx.executeSql(
                                    `SELECT createdAt FROM td_tajmahal_111 WHERE ekatma_chinha = ? LIMIT 1`,
                                    [uniqueId],
                                    (_, res3) => {
                                        results.numberOfDays = res3.rows.length > 0 ? res3.rows.item(0).createdAt : null;

                                        tx.executeSql(
                                            `SELECT COALESCE((SELECT COUNT(1) FROM td_chat_hawamahal_212), 0) + 
                                                    COALESCE((SELECT COUNT(1) FROM td_gchat_redfort_213), 0) AS total_messages;`,
                                            [],
                                            (_, res4) => {
                                                results.totalMessages = res4.rows.length > 0 ? res4.rows.item(0).total_messages || 0 : 0;
                                                resolve(results);
                                            },
                                            (_, error) => {
                                                console.error('Query 4 failed:', error);
                                                results.totalMessages = 0;
                                                resolve(results); // Resolve with default
                                            }
                                        );
                                    },
                                    (_, error) => {
                                        console.error('Query 3 failed:', error);
                                        results.numberOfDays = null;
                                        resolve(results); // Resolve with default
                                    }
                                );
                            },
                            (_, error) => {
                                console.error('Query 2 failed:', error);
                                results.totalCalls = 0;
                                resolve(results); // Resolve with default
                            }
                        );
                    },
                    (_, error) => {
                        console.error('Query 1 failed:', error);
                        results.totalActiveMembers = 0;
                        resolve(results); // Resolve with default
                    }
                );
            }, (txErr) => {
                console.error('Transaction error:', txErr);
                reject(txErr);
            });
        });
    } catch (error) {
        console.error('Database error:', error);
        return {
            totalActiveMembers: 0,
            totalCalls: 0,
            numberOfDays: null,
            totalMessages: 0
        }; // Fallback at top level
    }
};

export const getMembersMessage = async (uniqueId) => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                const results = { messagesByMembers: [] };
                tx.executeSql(
                    `WITH chat_count AS (
                        SELECT COUNT(tch.anuvadata_id) AS total_cnt, samvada_chinha
                        FROM td_chat_hawamahal_212 tch
                        GROUP BY samvada_chinha
                        ),
                        group_count AS (
                        SELECT COUNT(anuvadata_id) AS total_num, samvada_chinha
                        FROM td_gchat_redfort_213
                        GROUP BY samvada_chinha
                        )

                        SELECT
                        tcq.samvada_chinha,
                        tcq.prakara,
                        CASE
                            WHEN tcq.prakara = 'Chat' THEN COALESCE(tf.praman_patrika, tcb.praman_patrika, 'Unknown Contact')
                            ELSE tcq.samvada_nama
                        END AS contact_name,

                        CASE
                            WHEN tcq.prakara = 'Chat' THEN chat_count.total_cnt
                            ELSE group_count.total_num
                        END AS message_count

                        FROM td_chat_qutubminar_211 tcq
                        LEFT JOIN td_chat_bhagwah_211 tcb ON tcb.samvada_chinha_id = tcq.samvada_chinha_id AND tcb.ekatma_chinha != ?
                        LEFT JOIN td_fort_113 tf ON tf.ekatma_chinha = tcb.ekatma_chinha
                        LEFT JOIN chat_count ON chat_count.samvada_chinha = tcq.samvada_chinha
                        LEFT JOIN group_count ON group_count.samvada_chinha = tcq.samvada_chinha
                        group by tcq.samvada_chinha_id
                        ORDER BY message_count DESC LIMIT 3;`,
                    [uniqueId],
                    (_, res5) => {
                        results.messagesByMembers = res5.rows.length > 0
                            ? Array.from({ length: res5.rows.length }, (_, i) => res5.rows.item(i))
                            : [];
                        resolve(results);
                    },
                    (_, error) => {
                        console.error('Query 5 failed:', error);
                        results.messagesByMembers = [];
                        resolve(results); // Resolve with default
                    }
                );
            }, (txErr) => {
                console.error('Transaction error:', txErr);
                reject(txErr);
            });
        });
    } catch (error) {
        console.error('Database error:', error);
        return { messagesByMembers: [] }; // Fallback at top level
    }
};

export const getcountByMonth = async (uniqueId) => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                const results = { messagesByMonth: [] };
                tx.executeSql(
                    `SELECT month, SUM(count) AS total_count
                     FROM (
                         SELECT strftime('%m', createdAt) AS month, COUNT(*) AS count
                         FROM td_chat_hawamahal_212
                         WHERE strftime('%Y', createdAt) = strftime('%Y', 'now')
                         GROUP BY month
                         UNION ALL
                         SELECT strftime('%m', createdAt) AS month, COUNT(*) AS count
                         FROM td_gchat_redfort_213
                         WHERE strftime('%Y', createdAt) = strftime('%Y', 'now')
                         GROUP BY month
                     ) AS monthly_counts
                     GROUP BY month
                     ORDER BY month;`,
                    [],
                    (_, res6) => {
                        results.messagesByMonth = res6.rows.length > 0
                            ? Array.from({ length: res6.rows.length }, (_, i) => res6.rows.item(i))
                            : [];
                        resolve(results);
                    },
                    (_, error) => {
                        console.error('Query 6 failed:', error);
                        results.messagesByMonth = [];
                        resolve(results); // Resolve with default
                    }
                );
            }, (txErr) => {
                console.error('Transaction error:', txErr);
                reject(txErr);
            });
        });
    } catch (error) {
        console.error('Database error:', error);
        return { messagesByMonth: [] }; // Fallback at top level
    }
};

export const getcountByYear = async () => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                const results = { messagesByYear: [] };
                tx.executeSql(
                    `SELECT year, SUM(count) AS total_count
                     FROM (
                         SELECT strftime('%Y', createdAt) AS year, COUNT(*) AS count
                         FROM td_chat_hawamahal_212
                         GROUP BY year
                         UNION ALL
                         SELECT strftime('%Y', createdAt) AS year, COUNT(*) AS count
                         FROM td_gchat_redfort_213
                         GROUP BY year
                     ) AS yearly_counts
                     GROUP BY year
                     ORDER BY year;`,
                    [],
                    (_, res7) => {
                        results.messagesByYear = res7.rows.length > 0
                            ? Array.from({ length: res7.rows.length }, (_, i) => res7.rows.item(i))
                            : [];
                        resolve(results);
                    },
                    (_, error) => {
                        console.error('Query 7 failed:', error);
                        results.messagesByYear = [];
                        resolve(results); // Resolve with default
                    }
                );
            }, (txErr) => {
                console.error('Transaction error:', txErr);
                reject(txErr);
            });
        });
    } catch (error) {
        console.error('Database error:', error);
        return { messagesByYear: [] }; // Fallback at top level
    }
};

export const getCommonWords = async () => {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    `SELECT vishayah
                     FROM td_chat_hawamahal_212
                     WHERE nirastah = 0 AND sandesha_prakara = 'text' AND is_disappearing = 0
                     UNION ALL
                     SELECT vishayah
                     FROM td_gchat_redfort_213
                     WHERE nirastah = 0 AND sandesha_prakara = 'text'`,
                    [],
                    (_, { rows }) => {
                        const stopWords = new Set(['the', 'and', 'to', 'of', 'in', 'a', 'is', 'that', 'for', 'on']);
                        const wordFreq = {};

                        for (let i = 0; i < rows.length; i++) {
                            const message = rows.item(i).vishayah || '';
                            const words = message
                                .toLowerCase()
                                .split(/\s+/)
                                .filter(word =>
                                    word.length > 1 &&
                                    !stopWords.has(word) &&
                                    !/^[0-9]+$/.test(word)
                                );

                            words.forEach(word => {
                                wordFreq[word] = (wordFreq[word] || 0) + 1;
                            });
                        }

                        const commonWords = Object.entries(wordFreq)
                            .sort(([, aFreq], [, bFreq]) => bFreq - aFreq)
                            .slice(0, 30)
                            .map(([word]) => word);

                        resolve(commonWords);
                    },
                    (_, error) => {
                        reject(error);
                    }
                );
            }, (txErr) => {
                reject(txErr);
            });
        });
    } catch (error) {
        console.error('Database error:', error);
        return { commonWords: [] };
    }
};