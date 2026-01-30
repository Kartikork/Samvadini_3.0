import SQLite from 'react-native-sqlite-storage';
SQLite.enablePromise(true);

export const openDatabase = async () => {
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

export const getChatListSyncTime = async () => {
    try {
        const db = await openDatabase();
        const results = await db.executeSql(
            `SELECT updatedAt FROM td_chat_qutubminar_211 ORDER BY updatedAt DESC LIMIT 1;`
        );
        if (results.length > 0 && results[0].rows.length > 0) {
            const latestTime = results[0].rows.item(0).updatedAt || "";
            return latestTime;
        }
        return null;
    } catch (error) {
        console.error('Error fetching chat list sync time:', error);
        throw error;
    }
};

export const getChatMessageSyncTime = async () => {
    try {
        const db = await openDatabase();
        const results = await db.executeSql(
            `SELECT preritam_tithih FROM td_chat_hawamahal_212 ORDER BY preritam_tithih DESC LIMIT 2;`
        );
        if (results.length > 0 && results[0].rows.length > 1) {
            const latestTime = results[0].rows.item(1)?.preritam_tithih || "";
            return latestTime;
        }
        return "";
    } catch (error) {
        console.error('Error fetching chat message sync time:', error);
        throw error;
    }
};

export const getGroupMessageSyncTime = async () => {
    try {
        const db = await openDatabase();
        const results = await db.executeSql(
            `SELECT preritam_tithih FROM td_gchat_redfort_213 ORDER BY preritam_tithih DESC LIMIT 2;`
        );
        if (results.length > 0 && results[0].rows.length > 1) {
            const latestTime = results[0].rows.item(1)?.preritam_tithih || "";
            return latestTime;
        }
        return "";
    } catch (error) {
        console.error('Error fetching group message sync time:', error);
        throw error;
    }
};

export const getChatIds = async (prakara) => {
    try {
        const db = await openDatabase();
        let sqlQuery;
        if (prakara === 'Chat') {
            sqlQuery = `SELECT samvada_chinha FROM td_chat_qutubminar_211 WHERE prakara = 'Chat';`;
        } else {
            sqlQuery = `SELECT samvada_chinha FROM td_chat_qutubminar_211 WHERE prakara != 'Chat';`;
        }
        const results = await db.executeSql(sqlQuery);
        const chatIds = [];
        if (results.length > 0) {
            for (let i = 0; i < results[0].rows.length; i++) {
                chatIds.push(results[0].rows.item(i).samvada_chinha);
            }
        }
        return chatIds;
    } catch (error) {
        console.error('Error fetching chat IDs:', error);
        throw error;
    }
};
