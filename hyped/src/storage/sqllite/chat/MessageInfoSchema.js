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

export const createMessageInfoTable = async () => {
  try {
    const db = await openDatabase();
    db.transaction((tx) => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS td_chat_msg_info_211 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ekatma_chinha VARCHAR(30),
          refrenceId VARCHAR(30),
          samvada_chinha VARCHAR(30),
          pathakah_chinha VARCHAR(20),
          delivered_At DATETIME,
          read_At DATETIME
        );`,
        [],
        () => console.log("Table td_chat_msg_info_211 created successfully"),
        (_, error) => console.error("Error creating table:", error)
      );

      const indexes = [
        { name: "idx_ekatma_chinha", column: "ekatma_chinha" },
        { name: "idx_refrenceId", column: "refrenceId" },
        { name: "idx_pathakah_chinha", column: "pathakah_chinha" }
      ];

      indexes.forEach(({ name, column }) => {
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS ${name} ON td_chat_msg_info_211 (${column});`,
          [],
          () => console.log(`Index ${name} created successfully`),
          (_, error) => console.error(`Error creating index ${name}:`, error)
        );
      });
    });
  } catch (error) {
    console.error("Error while creating 'td_chat_msg_info_211' table:", error);
  }
};

export const deleteMessageInfoTable = async () => {
  try {
    const db = await openDatabase();
    await db.transaction(async tx => {
      await tx.executeSql(`DROP TABLE IF EXISTS td_chat_msg_info_211;`);
    });
    console.log('Table td_chat_msg_info_211 deleted successfully.');
  } catch (error) {
    console.error('Error deleting td_chat_msg_info_211 table:', error);
  }
};

export const insertorUpdateMessageInfo = async (messages = []) => {
  try {
    const db = await openDatabase();

    db.transaction((tx) => {
      messages.forEach((msg) => {
        const { ekatma_chinha, refrenceId, samvada_chinha, pathakah_chinha, delivered_At, read_At } = msg;

        tx.executeSql(
          `SELECT * FROM td_chat_msg_info_211 WHERE refrenceId = ? AND ekatma_chinha = ?`,
          [refrenceId, ekatma_chinha],
          (_, { rows }) => {
            if (rows.length > 0) {
              // Build dynamic SET clause to avoid overwriting when values are missing
              const setClauses = [];
              const params = [];
              if (delivered_At !== undefined && delivered_At !== null) {
                setClauses.push('delivered_At = ?');
                params.push(delivered_At);
              }
              if (read_At !== undefined && read_At !== null) {
                setClauses.push('read_At = ?');
                params.push(read_At);
              }

              if (setClauses.length > 0) {
                const updateQuery = `UPDATE td_chat_msg_info_211 SET ${setClauses.join(', ')} WHERE refrenceId = ? AND ekatma_chinha = ?`;
                params.push(refrenceId, ekatma_chinha);

                tx.executeSql(
                  updateQuery,
                  params,
                  (_, result) => {
                    if (result.rowsAffected > 0) {
                      // console.log("Record updated successfully");
                    }
                  },
                  (_, error) => {
                    console.error("Update error:", error);
                    return false; // Return false to indicate actual error
                  }
                );
              }
            } else {
              tx.executeSql(
                `INSERT INTO td_chat_msg_info_211 (
                  ekatma_chinha, refrenceId, samvada_chinha, pathakah_chinha, delivered_At, read_At
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  ekatma_chinha,
                  refrenceId,
                  samvada_chinha,
                  pathakah_chinha,
                  delivered_At,
                  read_At
                ],
                (_, result) => {
                  if (result.insertId) {
                    console.log("Record inserted successfully");
                  }
                },
                (_, error) => {
                  console.error("Insert error:", error);
                  return false; // Return false to indicate actual error
                }
              );
            }
          },
          (_, error) => {
            console.error("Select error:", error);
            return false; // Return false to indicate actual error
          }
        );
      });
    });
  } catch (error) {
    console.error("Transaction error:", error);
  }
};

export const getMessageInfo = async (refrenceId) => {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT distinct
            case when tf.ekatma_chinha is null then tcb.parichayapatra else tf.parichayapatra end as parichayapatra,
            case when tf.ekatma_chinha is null then tcb.praman_patrika else tf.praman_patrika end as praman_patrika,
            tcm.read_At,
            tcm.ekatma_chinha,
            tcm.delivered_At
            from td_chat_msg_info_211 tcm
            LEFT JOIN td_fort_113 tf on tf.ekatma_chinha = tcm.ekatma_chinha
            left join td_chat_bhagwah_211 tcb on tcb.ekatma_chinha = tcm.ekatma_chinha
            where refrenceId = ?;`,
          [refrenceId],
          (_, { rows }) => {
            const results = [];
            for (let i = 0; i < rows.length; i++) {
              results.push(rows.item(i));
            }
            resolve(results);
          },
          (_, error) => {
            console.error("Query error:", error);
            reject(error);
            return true;
          }
        );
      });
    });
  } catch (error) {
    console.error("DB error:", error);
    throw error;
  }
};

export const insertMessageInfoForParticipants = async (
  refrenceId,
  chatId,
  curUserUid,
  samvada_chinha_id
) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO td_chat_msg_info_211 
            (refrenceId, ekatma_chinha, samvada_chinha, pathakah_chinha, delivered_At, read_At)
           SELECT
             ? AS refrenceId,
             ekatma_chinha,
             ? AS samvada_chinha,
             ? AS pathakah_chinha,
             NULL AS delivered_At,
             NULL AS read_At
           FROM td_chat_bhagwah_211
           WHERE samvada_chinha_id = ?
            AND ekatma_chinha != ?;`,
          [refrenceId, chatId, curUserUid, samvada_chinha_id, curUserUid],
          (_, result) => {
            console.log("Inserted message info for all participants:", result.rowsAffected);
            resolve(result.rowsAffected);
          },
          (_, error) => {
            console.error("Insert failed:", error);
            reject(error);
          }
        );
      });
    });
  } catch (err) {
    console.error("Error in insertMessageInfoForParticipants:", err);
    return 0;
  }
};


// export const updateMessageInfo = (refrenceId, ekatma_chinha) => {
//   const currentTime = new Date().toISOString();

//   return new Promise((resolve, reject) => {
//     db.transaction(tx => {
//       tx.executeSql(
//         `UPDATE td_chat_msg_info_211
//          SET delivered_At = ?, read_At = ?
//          WHERE refrenceId = ? AND ekatma_chinha = ?`,
//         [currentTime, currentTime, refrenceId, ekatma_chinha],
//         (tx, results) => {
//           if (results.rowsAffected > 0) {
//             resolve(true);
//           } else {
//             resolve(false);
//           }
//         },
//         error => {
//           console.error("Update error:", error);
//           reject(error);
//         }
//       );
//     });
//   });
// };