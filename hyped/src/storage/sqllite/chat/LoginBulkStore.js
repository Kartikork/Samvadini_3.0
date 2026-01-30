import SQLite from 'react-native-sqlite-storage';
import { getEncryptionKey } from './Participants';
import { downloadFile } from '../../helper/Helper';
import { decryptMessage } from '../../helper/Encryption';
import { getRandomLayout } from '../../../helper/MessageLayout';
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

const parseReactionMap = value => {
    if (!value) {
        return {};
    }

    if (typeof value === 'object') {
        return value;
    }

    try {
        const parsed = JSON.parse(value);
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (_err) {
        return {};
    }
};

const serializeReactionMap = value => {
    if (!value || typeof value !== 'object' || Object.keys(value).length === 0) {
        return null;
    }

    try {
        return JSON.stringify(value);
    } catch (error) {
        console.warn('serializeReactionMap failed:', error?.message || error);
        return null;
    }
};

export const AllChatListInsert = async (
    chatDataArray,
    isPhoneNumberHidden,
    myId
) => {
    try {
        const db = await openDatabase();
        const results = [];
        const errors = [];

        for (const chatData of chatDataArray) {
            try {
                const result = await db.transaction(async (tx) => {
                    try {
                        const samvada_chinha_id = await insertOrUpdateChat(tx, chatData, myId);
                        await insertOrUpdateParticipants(
                            samvada_chinha_id,
                            chatData,
                            isPhoneNumberHidden,
                            myId
                        );
                        return { success: true, chatId: chatData._id, samvada_chinha_id };
                    } catch (error) {
                        console.error(`Error processing chat ${chatData._id}:`, error);
                        throw error;
                    }
                });
                results.push(result);
            } catch (error) {
                console.error(`Failed to process chat ${chatData._id}:`, error);
                errors.push({ chatId: chatData._id, error: error.message });
            }
        }
        if (errors.length > 0) {
            console.warn("Some chats failed to process:", errors);
        }
        return { results, errors };
    } catch (error) {
        console.error("Critical error in insertOrUpdateChatList:", error);
        throw error;
    }
};

const insertOrUpdateChat = (tx, chatData, myId) => {
    return new Promise((resolve, reject) => {
        const roomName = chatData.is_private_room
            ? chatData.user_chat_names?.[myId] || ''
            : null;

        const participantsStr = JSON.stringify(chatData.prayoktaramnishkasaya || []);
        const prasaranamStr = JSON.stringify(chatData.prasaranam || []);

        tx.executeSql(
            `INSERT OR REPLACE INTO td_chat_qutubminar_211 (
                samvada_chinha, pathakah_chinha, prakara, myId,
                laghu_sthapitam_upayogakartarah, sangrahita_upayogakartarah,
                samuha_chitram, samvada_nama, samuhavarnanam,
                prayoktaramnishkasaya, samvadaspashtah,
                is_private_room, expires_at, room_code, private_room_name,
                sandesh_ghatita, prasaranam, vargah, linga,
                vayah_min, vayah_max, onlyAdminsCanMessage, guptata, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                chatData._id,
                chatData.pathakah_chinha,
                chatData.prakara,
                myId,
                0,
                0,
                chatData.samuha_chitram,
                chatData.samvada_nama,
                chatData.samuhavarnanam || '',
                participantsStr,
                chatData.samvadaspashtah || 0,
                chatData.is_private_room ? 1 : 0,
                chatData.expires_at || 0,
                chatData.room_code || null,
                roomName,
                chatData.sandesh_ghatita || "Off",
                prasaranamStr,
                chatData.vargah || 'All',
                chatData.linga || 'All',
                chatData.vayah_min || 0,
                chatData.vayah_max || 100,
                chatData.onlyAdminsCanMessage ? 1 : 0,
                chatData.guptata || 'Public',
                chatData.createdAt || new Date().toISOString(),
                chatData.updatedAt || new Date().toISOString()
            ],
            (_, result) => resolve(result.insertId),
            (_, error) => reject(error)
        );
    });
};

const insertOrUpdateParticipants = async (samvada_chinha_id, chatData) => {
    try {
        const db = await openDatabase();
        const participants = Array.isArray(chatData?.samuha_suchana)
            ? chatData.samuha_suchana
            : [];

        if (participants.length === 0) return;

        const runQuery = (query, values, errMsg) =>
            new Promise((resolve, reject) => {
                db.transaction(tx => {
                    tx.executeSql(
                        query,
                        values,
                        () => resolve(),
                        (_, error) => {
                            console.error(errMsg, error);
                            reject(error);
                        }
                    );
                });
            });

        for (const p of participants) {
            const insertValues = [
                samvada_chinha_id,
                p.uniqueId,
                p.privateKey || null,
                p.publicKey || null,
                p.status || 'Member',
                p.participantName || '',
                p.participantPhoto || '',
                chatData.addedBy || null,
                chatData.removedBy || null,
                // p.isActive ? 1 : 0,
                1,
                p.is_registered ? 1 : 0,
                p.durasamparka_sankhya || null,
                p.hidePhoneNumber ? 1 : 0,
                p.role || 'Member',
                p.isCreatorExit ? 1 : 0,
                p.joinedAt || null,
                p.removedAt || null,
                p.janma_tithi || null,
                p.linga || null,
            ];

            await runQuery(
                `INSERT OR REPLACE INTO td_chat_bhagwah_211 (
                    samvada_chinha_id, ekatma_chinha, privateKey, publicKey, status,
                    praman_patrika, parichayapatra, yahyojitah, yahniskasitah,
                    sakriyamastiva, is_registered, durasamparka_sankhya,
                    hidePhoneNumber, bhumika, nirmatanirgatahastiva,
                    joinedAt, removedAt, janma_tithi, linga
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                insertValues,
                `Error inserting participant ${p.uniqueId}:`
            );
        }
    } catch (error) {
        console.error("Error inserting participants:", error);
    }
};

export const AllBulkGroupMessages = async (records) => {
    try {
        const db = await openDatabase();
        const self = await getEncryptionKey();
        const nowISO = new Date().toISOString();

        const batchSize = 100;
        const batches = [];
        for (let i = 0; i < records.length; i += batchSize) {
            batches.push(records.slice(i, i + batchSize));
        }

        let totalProcessed = 0;

        const safeString = (v) => {
            if (v === null || v === undefined) return null;
            if (typeof v === "string") return v;
            try { return JSON.stringify(v); }
            catch { return String(v); }
        };

        for (const batch of batches) {

            const processed = await Promise.all(
                batch.map(async (data) => {

                    if (!data.refrenceId || !data.samvada_chinha || !data.pathakah_chinha)
                        return null;

                    const validPrakara = [
                        "text", "link", "sos", "contact",
                        "video_call", "audio_call", "system_event",
                        "location", "live_location",
                    ];

                    const validPrakaraEncrypt = [
                        "text", "link", "sos", "contact",
                        "location", "live_location", "multiple/media",
                    ];

                    let vishayahValue = data.vishayah;

                    if (!validPrakara.includes(data.sandesha_prakara)) {
                        try {
                            const raw = typeof data.vishayah === "string" ? data.vishayah : "";
                            const [fileUri, fileName, fileSize] = raw.split("|||");

                            const localFilePath = await downloadFile(
                                fileUri, fileName || data.refrenceId, fileSize, data.sandesha_prakara
                            );

                            if (localFilePath)
                                vishayahValue = localFilePath;

                        } catch (e) {
                            console.error("Group File download error:", data.refrenceId, e);
                            return null;
                        }
                    }

                    if (validPrakaraEncrypt.includes(data.sandesha_prakara)) {
                        try {
                            vishayahValue = await decryptMessage(vishayahValue, self?.privateKey);
                        } catch (e) { }
                    }

                    const reactionRaw = data.reaction ?? null;
                    const hasReaction = reactionRaw !== null && reactionRaw !== "";

                    let reaction_updated_at = null;
                    if (hasReaction) {
                        try {
                            reaction_updated_at = data.reaction_updated_at
                                ? new Date(data.reaction_updated_at).toISOString()
                                : nowISO;
                        } catch { reaction_updated_at = nowISO; }
                    }

                    return {
                        ...data,
                        vishayahValue,
                        createdAt: data.createdAt || nowISO,
                        updatedAt: data.updatedAt || nowISO,
                        layout: getRandomLayout(),
                        reaction: hasReaction ? reactionRaw : null,
                        reaction_by: hasReaction ? data.reaction_by : null,
                        reaction_updated_at,
                        reaction_details: safeString(data.reaction_details),
                        reaction_summary: safeString(data.reaction_summary),
                        smaranam: safeString(data.smaranam),
                        samvada_spashtam: safeString(data.samvada_spashtam),
                    };
                })
            );

            const valid = processed.filter(Boolean);
            if (valid.length === 0) continue;

            await new Promise((resolve, reject) => {
                db.transaction((tx) => {

                    valid.forEach((d) => {
                        tx.executeSql(
                            `
                            INSERT OR REPLACE INTO td_gchat_redfort_213 (
                                samvada_chinha, refrenceId, pathakah_chinha, vishayah,
                                sandesha_prakara, anuvadata_sandesham, avastha, ukti,
                                samvada_spashtam, nirastah, sthapitam_sandesham,
                                preritam_tithih, pratisandeshah, kimFwdSandesha,
                                sampaditam, reaction, reaction_by, reaction_updated_at,
                                reaction_details, reaction_summary, smaranam,
                                layout, createdAt, updatedAt
                            )
                            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                            `,
                            [
                                d.samvada_chinha,
                                d.refrenceId,
                                d.pathakah_chinha,
                                d.vishayahValue || "",
                                d.sandesha_prakara || "text",
                                d.anuvadata_sandesham ? 1 : 0,
                                "read",
                                d.ukti || "",
                                d.samvada_spashtam,
                                d.nirastah ? 1 : 0,
                                d.sthapitam_sandesham || null,
                                d.preritam_tithih || nowISO,
                                d.pratisandeshah || "",
                                d.kimFwdSandesha ? 1 : 0,
                                d.sampaditam ? 1 : 0,
                                d.reaction,
                                d.reaction_by,
                                d.reaction_updated_at,
                                d.reaction_details,
                                d.reaction_summary,
                                d.smaranam,
                                d.layout,
                                d.createdAt,
                                d.updatedAt,
                            ]
                        );
                    });

                }, reject, resolve);
            });

            totalProcessed += valid.length;
        }

        console.log("Group messages inserted:", totalProcessed);
        return true;

    } catch (err) {
        console.error("AllBulkGroupMessages ERROR:", err);
        return false;
    }
};

export const AllBulkChatMessages = async (records) => {
    try {
        const db = await openDatabase();
        const self = await getEncryptionKey();
        const nowUTC = new Date().toISOString();

        const safeString = (v) => {
            if (v === null || v === undefined) return null;
            if (typeof v === "string") return v;
            try { return JSON.stringify(v); }
            catch { return String(v); }
        };

        const batchSize = 100;
        const batches = [];
        for (let i = 0; i < records.length; i += batchSize)
            batches.push(records.slice(i, i + batchSize));

        let totalProcessed = 0;

        for (const batch of batches) {

            const processed = await Promise.all(
                batch.map(async (data) => {

                    if (!data.refrenceId || !data.samvada_chinha || !data.pathakah_chinha)
                        return null;

                    const validPrakara = [
                        "text", "Planner", "link", "sos",
                        "location", "live_location", "contact",
                        "video_call", "audio_call",
                    ];

                    const validEncrypt = [
                        "text", "link", "sos", "location", "live_location", "multiple/media",
                    ];

                    let vishayahValue = data.vishayah;

                    if (!validPrakara.includes(data.sandesha_prakara)) {
                        try {
                            const raw = typeof data.vishayah === "string" ? data.vishayah : "";
                            const [fileUri, fileName, fileSize] = raw.split("|||");

                            const localPath = await downloadFile(
                                fileUri, fileName || data.refrenceId, fileSize, data.sandesha_prakara
                            );

                            if (localPath) vishayahValue = localPath;

                        } catch (err) {
                            console.error("File download error:", data.refrenceId, err);
                            return null;
                        }
                    }

                    if (validEncrypt.includes(data.sandesha_prakara)) {
                        try {
                            vishayahValue = await decryptMessage(vishayahValue, self?.privateKey);
                        } catch { }
                    }

                    return {
                        ...data,
                        vishayahValue,
                        createdAt: data.createdAt || nowUTC,
                        updatedAt: data.updatedAt || nowUTC,
                        last_disappear_check: nowUTC,
                        reaction_details: safeString(data.reaction_details),
                        reaction_summary: safeString(data.reaction_summary),
                        layout: getRandomLayout(),
                    };
                })
            );

            const valid = processed.filter(Boolean);
            if (valid.length === 0) continue;

            await new Promise((resolve, reject) => {
                db.transaction((tx) => {

                    valid.forEach((d) => {
                        tx.executeSql(
                            `
                            INSERT OR REPLACE INTO td_chat_hawamahal_212 (
                                samvada_chinha, refrenceId, pathakah_chinha, vishayah,
                                sandesha_prakara, anuvadata_sandesham, avastha, ukti,
                                samvada_spashtam, kimTaritaSandesha, nirastah,
                                sthapitam_sandesham, preritam_tithih, pratisandeshah,
                                kimFwdSandesha, sampaditam, reaction, reaction_by,
                                reaction_updated_at, reaction_details, reaction_summary,
                                createdAt, updatedAt, is_disappearing, disappear_at,
                                layout, prasaranamId, last_disappear_check
                            )
                            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                            `,
                            [
                                d.samvada_chinha,
                                d.refrenceId,
                                d.pathakah_chinha,
                                d.vishayahValue || "",
                                d.sandesha_prakara || "text",
                                d.anuvadata_sandesham ? 1 : 0,
                                "read",
                                d.ukti || "",
                                d.samvada_spashtam ? 1 : 0,
                                0,
                                d.nirastah ? 1 : 0,
                                d.sthapitam_sandesham || null,
                                d.preritam_tithih || null,
                                d.pratisandeshah || "",
                                d.kimFwdSandesha ? 1 : 0,
                                d.sampaditam ? 1 : 0,
                                d.reaction,
                                d.reaction_by,
                                d.reaction_updated_at,
                                d.reaction_details,
                                d.reaction_summary,
                                d.createdAt,
                                d.updatedAt,
                                d.is_disappearing ? 1 : 0,
                                safeString(d.disappear_at),
                                d.layout,
                                safeString(d.prasaranamId),
                                d.last_disappear_check,
                            ]
                        );
                    });

                }, reject, resolve);
            });

            totalProcessed += valid.length;
        }

        console.log("Chat messages inserted:", totalProcessed);
        return true;

    } catch (err) {
        console.error("Bulk Insert Error:", err);
        return false;
    }
};

export const allMarkAsRead = async (myId) => {
    try {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            db.transaction(
                (tx) => {
                    tx.executeSql(
                        `UPDATE td_gchat_redfort_213 
                        SET avastha = "read" 
                        WHERE pathakah_chinha != ? AND avastha != 'read'`,
                        [myId]
                    );

                    tx.executeSql(
                        `UPDATE td_chat_hawamahal_212
                        SET avastha = "read" 
                        WHERE pathakah_chinha != ? AND avastha != 'read'`,
                        [myId]
                    );
                },

                (error) => {
                    console.error("Error marking all as read:", error);
                    reject(error);
                },

                () => {
                    resolve("success");
                }
            );
        });
    } catch (error) {
        console.error("allMarkAsRead error:", error);
        throw error;
    }
};
