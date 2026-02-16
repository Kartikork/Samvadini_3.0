import { insertSingleChat } from "../storage/sqllite/chat/ChatListSchema";
import { generateKeys } from "./Encryption";
import { env } from "../config";
import axios from "axios";
import { store } from "../state/store";

export const createNewChat = async (myId, otherId) => {
    const phone = store.getState().auth.userSettings?.durasamparka_sankhya ?? '';
    try {
        const Privacykeys = await generateKeys(1);
        const postData = {
            pathakah_chinha: myId,
            prakara: 'Chat',
            bhagavah: [otherId],
            privacy_keys: Privacykeys,
            timeStamp: new Date().toISOString(),
        };

        const response = await axios.post(`${env.API_BASE_URL}/chat/add-new-chat-request`,
            postData
        );

        if (response.status === 201 || response.data.data) {
            const newChat = response.data.data;
            await insertSingleChat(newChat, false, myId);
            // const pushmessagepayload = {
            //     ekatma_chinha: otherId,
            //     phone_no: phone,
            //     title: myId,
            //     body: "New Chat Request",
            //     datatype: "text",
            //     message_id: "1",
            //     chatId: response.data.data._id,
            // };
            // await axios.post(`${env.API_BASE_URL}chat/send-notification`, pushmessagepayload);
            return {
                chatId: newChat._id
            };;
        }
        return null;
    } catch (error) {
        console.error('Error creating new chat:', error);
        return null;
    }
};

export const createSelfChat = async (data) => {
    try {
        const Privacykeys = await generateKeys(1);
        const postData = {
            pathakah_chinha: data.ekatma_chinha,
            privacy_keys: Privacykeys,
            prakara: 'SelfChat',
            timeStamp: new Date().toISOString(),
            samvada_nama: data.praman_patrika,
            samuha_chitram: data.parichayapatra,
        };

        const response = await axios.post(`${env.API_BASE_URL}/chat/create-self-chat`, postData);

        if (response.status === 201 || response.data.data) {
            const newChat = response.data.data;
            await insertSingleChat(newChat, false, data.ekatma_chinha);

            const navData = {
                chatId: newChat._id
            };

            return navData;
        }
        return null;
    } catch (error) {
        console.error('Error creating new chat:', error);
        return null;
    }
};