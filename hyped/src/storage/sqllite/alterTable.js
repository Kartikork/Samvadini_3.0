import { openDatabase } from './chat/ChatListSchema';

// Main function
export async function alterTables(actions) {
  const db = await openDatabase();

  for (const action of actions) {
    const { tableName, columns } = action;
    if (!tableName || !Array.isArray(columns) || columns.length === 0) {
      throw new Error('Missing tableName or columns array');
    }

    for (const col of columns) {
      const { columnName, columnType, defaultValue, notNull } = col;
      if (!columnName || !columnType) {
        throw new Error('Missing columnName or columnType');
      }

      // Check if column already exists
      const exists = await columnExists(tableName, columnName);
      if (exists) {
        console.log(`Column ${columnName} already exists in ${tableName}, skipping`);
        continue;
      }

      let sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`;
      if (notNull) {
        sql += ' NOT NULL';
      }
      if (defaultValue !== undefined) {
        sql += ` DEFAULT ${typeof defaultValue === 'string' ? `'${defaultValue}'` : defaultValue}`;
      }

      await new Promise((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            sql,
            [],
            () => {
              console.log(`✅ Added column ${columnName} to ${tableName}`);
              resolve();
            },
            (_, error) => {
              // Ignore "duplicate column" errors
              if (error.message && error.message.includes('duplicate column')) {
                console.log(`Column ${columnName} already exists in ${tableName}`);
                resolve();
              } else {
                console.error(`Failed to add column ${columnName} to ${tableName}:`, error);
                reject(error);
              }
            }
          );
        });
      });
    }
  }
}

// Just for test
export async function columnExists(tableName, columnName) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `PRAGMA table_info(${tableName});`,
        [],
        (__, result) => {
          const rows = result.rows;
          const columns = rows._array || Array.from({ length: rows.length }, (_, i) => rows.item(i));
          resolve(columns.some(col => col.name === columnName));
        },
        (__, error) => {
          console.error(`SQLite error:`, error);
          reject(error);
        }
      );
    });
  });
}

export const testAddColumn = async () => {
  try {
    await alterTables([
      {
        tableName: 'td_chat_qutubminar_211',
        columns: [
          { columnName: 'is_private_room', columnType: 'INTEGER', defaultValue: 0 },
          { columnName: 'is_emergency', columnType: 'INTEGER', defaultValue: 0 },
          { columnName: 'expires_at', columnType: 'INTEGER', defaultValue: 0 },
          { columnName: 'room_code', columnType: 'VARCHAR(20)' },
          { columnName: 'private_room_name', columnType: 'VARCHAR(20)' },
          { columnName: 'emergency_reltive', columnType: 'VARCHAR(50)' },
          { columnName: 'sandesh_ghatita', columnType: 'VARCHAR(50)', defaultValue: 'off' },
          { columnName: 'vargah', columnType: 'Varchar(50)', defaultValue: 'All' },
          { columnName: 'linga', columnType: 'Varchar(50)', defaultValue: 'All' },
          { columnName: 'vayah_min', columnType: 'INTEGER', defaultValue: 0 },
          { columnName: 'vayah_max', columnType: 'INTEGER', defaultValue: 0 },
          { columnName: 'onlyAdminsCanMessage', columnType: 'INTEGER', defaultValue: 0 },
          { columnName: 'guptata', columnType: 'Varchar(50)', defaultValue: 'Public' },
          { columnName: 'is_pinned', columnType: 'INTEGER', defaultValue: 0 },
        ],
      },
      {
        tableName: 'td_chat_hawamahal_212',
        columns: [
          { columnName: 'is_disappearing', columnType: 'INTEGER', defaultValue: 0 },
          { columnName: 'disappear_at', columnType: 'DATETIME' },
          { columnName: 'last_disappear_check', columnType: 'VARCHAR(50)' },
          { columnName: 'layout', columnType: 'VARCHAR(10)' },
          { columnName: 'reaction', columnType: 'TEXT' },
          { columnName: 'reaction_by', columnType: 'VARCHAR(40)' },
          { columnName: 'reaction_updated_at', columnType: 'DATETIME' },
          { columnName: 'reaction_details', columnType: 'TEXT' },
          { columnName: 'reaction_summary', columnType: 'TEXT' },
        ],
      },
      {
        tableName: 'td_chat_bhagwah_211',
        columns: [
          { columnName: 'is_registered', columnType: 'INTEGER', defaultValue: 1 },
          { columnName: 'inviteSent', columnType: 'INTEGER', defaultValue: 0 },
          { columnName: 'durasamparka_sankhya', columnType: 'INTEGER', defaultValue: null },
        ],
      },
      {
        tableName: 'td_charminar_112',
        columns: [
          { columnName: 'pravesha_pramanam', columnType: 'TEXT' },
          { columnName: 'janma_tithi', columnType: 'TEXT' },
          { columnName: 'linga', columnType: 'VARCHAR(10)' },
          { columnName: 'upayogakarta_nama', columnType: 'VARCHAR(30)' },
        ],
      },
      {
        tableName: 'td_gchat_redfort_213',
        columns: [
          { columnName: 'layout', columnType: 'VARCHAR(10)' },
          { columnName: 'reaction', columnType: 'TEXT' },
          { columnName: 'reaction_by', columnType: 'VARCHAR(40)' },
          { columnName: 'reaction_updated_at', columnType: 'DATETIME' },
          { columnName: 'reaction_details', columnType: 'TEXT' },
          { columnName: 'reaction_summary', columnType: 'TEXT' },
        ],
      },
      {
        tableName: 'td_fort_113',
        columns: [
          { columnName: 'upayogakarta_nama', columnType: 'Varchar(50)', defaultValue: null },
          { columnName: 'chatId', columnType: 'Varchar(50)', defaultValue: null },
          { columnName: 'janma_tithi', columnType: 'Varchar(50)', defaultValue: null },
          { columnName: 'linga', columnType: 'Varchar(10)', defaultValue: null },
        ],
      },
    ]);
  } catch (error) {
    console.error('❌ Failed to add columns:', error);
  }
};

(async () => {
  try {
    const exists = await columnExists('td_chat_hawamahal_212', 'another_col');
    if (exists) {
      console.log('Column exists!');
    } else {
      console.log('Column does not exist.');
    }
  } catch (error) {
    console.error('Error checking column existence:', error);
  }
})();
