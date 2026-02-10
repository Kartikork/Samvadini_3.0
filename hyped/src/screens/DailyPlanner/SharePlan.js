import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    PanResponder,
    Animated,
    Dimensions,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from "react-native-vector-icons/MaterialIcons"
import { getAllChatLists } from '../../sqllite/chat/ChatListSchema';
import { insertChatMessage } from '../../sqllite/chat/ChatMessageSchema';
import { socketService } from '../../services/socketService';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import { env } from '../../config';
import { generateUID } from '../../helper/DateFormate';
import { groupIcons, userIcon } from '../../assets';
import useHardwareBackHandler from '../../helper/UseHardwareBackHandler';

export default function SharePlan({ route }) {
    const { selectedMessages, curUserUid } = route.params;
    const navigation = useNavigation();
    const [contacts, setContacts] = useState([]);
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const SLIDER_WIDTH = Dimensions.get('window').width - 40;
    const THUMB_SIZE = 48;
    const [thumbX] = useState(new Animated.Value(0));
    const [swiped, setSwiped] = useState(false);
    useHardwareBackHandler("DailyPlanner");

    useEffect(() => {
        if (!loading) {
            Animated.timing(thumbX, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }).start();
            setSwiped(false);
        }
    }, [loading, selectedContacts]);

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => !loading && selectedContacts.length > 0,
        onMoveShouldSetPanResponder: () => !loading && selectedContacts.length > 0,
        onPanResponderMove: (e, gestureState) => {
            if (loading) return;
            let newX = Math.max(0, Math.min(gestureState.dx, SLIDER_WIDTH - THUMB_SIZE));
            thumbX.setValue(newX);
        },
        onPanResponderRelease: (e, gestureState) => {
            if (loading) return;
            if (gestureState.dx > SLIDER_WIDTH - THUMB_SIZE - 10) {
                setSwiped(true);
                handleSend(selectedContacts);
            } else {
                Animated.timing(thumbX, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: false,
                }).start();
            }
        },
    });

    const handleContactSelect = (contact) => {
        setSelectedContacts((prev) => {
            const isSelected = prev.some(
                (selected) => selected.samvada_chinha === contact.samvada_chinha
            );

            if (isSelected) {
                return prev?.filter(
                    (selected) => selected.samvada_chinha !== contact.samvada_chinha
                );
            } else {
                return [...prev, contact];
            }
        });
    };

    const handleSend = async (contacts) => {
        if (loading) return;
        setLoading(true);
        try {
            await socketService.connect(curUserUid);

            const contactPromises = contacts.map(async (contact) => {
                const { samvada_chinha, otherUserId, samvada_nama } = contact;
                const messagePromises = selectedMessages.map(async (message) => {
                    const vishayah = JSON.stringify(message);
                    const currectTime = new Date().toISOString();
                    const refrenceId = generateUID();

                    const messagePayload = {
                        samvada_chinha,
                        pathakah_chinha: curUserUid,
                        vishayah,
                        sandesha_prakara: "Planner",
                        preritam_tithih: currectTime,
                        anuvadata_sandesham: false,
                        refrenceId,
                        pratisandeshah: '',
                        kimFwdSandesha: false,
                        nirastah: 0,
                        ukti: '',
                        avastha: 'sent',
                    };
                    const shareCount = { planId: message._id, planType: message.type, uniqueId: curUserUid, sharedWith: otherUserId, sharewithName: samvada_nama };
                    try {
                        await insertChatMessage(messagePayload);
                        await socketService.sendMessage(messagePayload);
                        const endpoint = 'api/chat/send-message';
                        await axiosConn('post', endpoint, messagePayload);
                        await axios.post(`${env.Market_Place_API_URL}reminder/share-plan`, shareCount, {
                            headers: { 'Content-Type': 'application/json' },
                        });
                    } catch (error) {
                        console.error(`Error processing message ${refrenceId}:`, error.message);
                        throw error;
                    }
                });

                return Promise.allSettled(messagePromises);
            });

            const results = await Promise.allSettled(contactPromises);

            let allSuccessful = true;
            results.forEach((contactResult, contactIndex) => {
                if (contactResult.status === 'rejected') {
                    console.error(`Contact ${contactIndex} failed:`, contactResult.reason);
                    allSuccessful = false;
                } else {
                    contactResult.value.forEach((msgResult, msgIndex) => {
                        if (msgResult.status === 'rejected') {
                            console.error(`Message ${msgIndex} for contact ${contactIndex} failed:`, msgResult.reason);
                            allSuccessful = false;
                        }
                    });
                }
            });

            if (allSuccessful) {
                Alert.alert('Messages forwarded successfully!');
            }
            navigation.goBack();
        } catch (error) {
            console.error('Error in handleSend:', error.message);
            Alert.alert('Network error');
        } finally {
            setLoading(false);
        }
    };

    const fetchLocalChatList = useCallback(async (id) => {
        try {
            const result = await getAllChatLists(id);
            if (result && result.length > 0) {
                const filteredResult = result.filter(item => item.is_private_room === 0 && item.prakara === "Chat" && item.contact_name !== "");

                const formattedData = filteredResult.map(item => ({
                    bhagavah: item.bhagavah ? JSON.parse(item.bhagavah) : [],
                    samvada_chinha: item.samvada_chinha,
                    prakara: item.prakara,
                    samuha_chitram: item.contact_photo,
                    samvada_nama: item.contact_name,
                    otherUserId: item.contact_uniqueId
                }));

                setContacts(formattedData);
            } else {
                setContacts([]);
            }
        } catch (error) {
            console.log('Error fetching local chat list:', error);
            setContacts([]);
        }
    }, []);

    useEffect(() => {
        fetchLocalChatList(curUserUid);
    }, [fetchLocalChatList]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back-ios-new" size={20} color="#555" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Share To</Text>
            </View>
            <FlatList
                data={contacts}
                keyExtractor={(item) => item.samvada_chinha}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.contactItem,
                            selectedContacts.some(selected => selected.samvada_chinha === item.samvada_chinha) && styles.selectedContact
                        ]}
                        onPress={() => handleContactSelect(item)}
                    >
                        <Image source={item?.samuha_chitram ? { uri: item?.samuha_chitram + env.SAS_KEY } : item?.prakara === 'Group' ? groupIcons : userIcon} style={styles.avatar} />
                        <Text style={styles.contactName}>{item.samvada_nama || 'Group'}</Text>

                        {selectedContacts.some(selected => selected.samvada_chinha === item.samvada_chinha) && (
                            <Icon name="check" size={20} color="#0080ff" />
                        )}
                    </TouchableOpacity>
                )
                }
                contentContainerStyle={styles.listContainer}
            />

            {selectedContacts.length > 0 && (
                <View style={styles.swipeContainer} pointerEvents={loading ? 'none' : 'auto'}>
                    <LinearGradient
                        colors={['#6462AC', '#028BD3']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.swipeTrack}
                    >
                        <Text style={styles.swipeText}>{loading ? 'Forwarding...' : swiped ? 'Forwarding...' : 'Swipe to Forward'}</Text>
                        <Animated.View
                            style={[
                                styles.swipeThumb,
                                {
                                    transform: [{ translateX: thumbX }],
                                    backgroundColor: '#fff',
                                    borderColor: '#01d5f5',
                                    opacity: loading ? 0.7 : 1,
                                },
                            ]}
                            {...(!loading ? panResponder.panHandlers : {})}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#01d5f5" />
                            ) : (
                                <Icon name="send" size={24} color="#01d5f5" />
                            )}
                        </Animated.View>
                    </LinearGradient>
                </View>
            )}
            {loading && (
                <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 999,
                }}>
                    <ActivityIndicator size="large" color="#0080ff" />
                </View>
            )}
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#fff',
    },
    headerTitle: {
        color: '#212121',
        fontSize: 20,
        marginLeft: 15,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 10,
        borderRadius: 25,
        paddingHorizontal: 15,
        elevation: 3,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#000',
    },
    listContainer: {
        padding: 10,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 15,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    contactName: {
        flex: 1,
        marginLeft: 15,
        fontSize: 16,
        color: '#000',
    },
    sendIcon: {
        marginLeft: 10,
    },
    sendButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#0080ff',
        borderRadius: 30,
        padding: 10,
    },
    selectedContact: {
        backgroundColor: '#e0f7fa',
    },
    swipeContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 20,
        alignItems: 'center',
        zIndex: 100,
    },
    swipeTrack: {
        width: Dimensions.get('window').width - 40,
        height: 48,
        borderRadius: 30,
        justifyContent: 'center',
        backgroundColor: 'transparent',
        overflow: 'hidden',
    },
    swipeText: {
        position: 'absolute',
        left: 0,
        right: 0,
        textAlign: 'center',
        color: '#fff',
        fontSize: 16,
        zIndex: 1,
    },
    swipeThumb: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        zIndex: 2,
        borderWidth: 2,
        borderColor: '#01d5f5',
    },
});