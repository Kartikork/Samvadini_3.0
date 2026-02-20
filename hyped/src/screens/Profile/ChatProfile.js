import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    Switch,
    Pressable,
    Dimensions,
    Alert,
    Platform,
    ToastAndroid, Clipboard
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon2 from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Ionicon2 from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { fetchChatBySamvadaChinha } from '../../storage/sqllite/chat/ChatListSchema';
import { FetchChatMedia } from '../../storage/sqllite/chat/ChatMessageSchema';
import Video from 'react-native-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { env } from '../../config';
import { useAppSelector } from '../../state/hooks';
import { getAppTranslations } from '../../translations';
import { userIcon } from '../../assets';
// import MyModal from './DisplayProfileModal';
// import { MediaViewer } from '../../components/MediaViewer';
const { width } = Dimensions.get('window');

const ChatProfile = () => {
    const [showDropdown, setShowDropdown] = React.useState(false);
    const navigation = useNavigation();
    const lang = useAppSelector(state => state.language.lang);
    const activeChat = useAppSelector(state => state.activeChat);
    const translations = useMemo(() => getAppTranslations(lang), [lang]);
    const chatId = activeChat.chatId;
    const username = activeChat.username;
    const userPhoto = activeChat.avatar + env.SAS_KEY;
    const otherUserId = activeChat.otherUserId;
    const hidePhoneNumber = Boolean(activeChat.hidePhoneNumber);
    const RequeststatusOther = activeChat.request || "";
    const otherUserPhoneNumber = activeChat.otherUserPhoneNumber;
    const [mediaList, setMediaList] = useState([]);
    const [mediaTotalCount, setMediaTotalCount] = useState(0);
    // const [selectedMedia, setSelectedMedia] = useState([]);
    // const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
    const [muteNotification, setMuteNotification] = useState(false);
    const [galleryMediaVisibility, setGalleryMediaVisibility] = useState(false);
    // const [displayProfileModal, setDisplayProfileModal] = useState(false);

    const isRequestSent = (RequeststatusOther === 'MsgSent') || (RequeststatusOther === 'Pending');


    const actionButtonsData = [
        {
            icon: 'chatbubble-outline',
            text: translations?.Message || 'Message',
        },
        ...(isRequestSent ? [] : [
            {
                icon: 'call-outline',
                text: translations?.Call,
            },
            {
                icon: 'videocam-outline',
                text: translations?.Video,
            }
        ]),
        {
            icon: 'search',
            text: translations?.Search,
        },
    ];

    // const fetchData = async () => {
    //     try {
    //         const result = await fetchChatBySamvadaChinha(chatId);
    //         if (result && result.length > 0) {
    //             const Localprayoktaramnishkasaya = result[0].prayoktaramnishkasaya;
    //             setBlocalBlockId(Localprayoktaramnishkasaya);
    //         }
    //     } catch (error) {
    //         console.error('Error fetching chat data:', error);
    //     }
    // };

    // useFocusEffect(
    //     useCallback(() => {
    //         // fetchData();
    //         return () => { };
    //     }, [chatId, otherUserId]),
    // );

    useEffect(() => {
        const fetchMediaData = async () => {
            const chatMediaData = await FetchChatMedia(chatId);
            const data = chatMediaData.messages;
            const mediaOnly = data.filter(item =>
                item.sandesha_prakara.startsWith("image") ||
                item.sandesha_prakara.startsWith("video") ||
                item.sandesha_prakara.startsWith("audio")
            );

            if (mediaOnly.length > 0) {
                setMediaList(mediaOnly);
                setMediaTotalCount(chatMediaData.totalMediaCount || 0);
            } else {
                setMediaList([]);
                setMediaTotalCount(0);
            }
        };
        fetchMediaData();
    }, [chatId]);

    const formatPhoneNumber = (phoneNumber, shouldHide) => {
        if (!phoneNumber) return '';

        if (shouldHide) {
            return '*'.repeat(10);
        }

        const cleaned = phoneNumber.toString().replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
        }
        return phoneNumber;
    };

    const resolveType = (item) => {
        if (item.type) return item.type;
        const sp = item.sandesha_prakara || "";

        if (sp.startsWith("image/")) return "image";
        if (sp.startsWith("video/")) return "video";
        if (sp.startsWith("audio/")) return "audio";
        const ext = item.vishayah?.split(".").pop()?.toLowerCase();
        if (["mp4", "mov", "mkv", "avi"].includes(ext)) return "video";
        if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";

        return "unknown";
    };

    return (
        <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
            <ScrollView style={styles.container}>
                <View style={styles.profilehead}>
                    <View style={styles.profileHeader}>
                        <TouchableOpacity
                            onPress={() => setDisplayProfileModal(true)}
                            activeOpacity={0.7}>
                            <Image source={userPhoto ? { uri: userPhoto } : userIcon}
                                style={styles.profilePicture}
                            />
                        </TouchableOpacity>
                        <Text style={styles.profileName}>
                            {username || 'User Name'}
                        </Text>
                        {otherUserPhoneNumber && (
                            <TouchableOpacity onLongPress={() => {
                                const formatted = formatPhoneNumber(otherUserPhoneNumber, hidePhoneNumber);
                                Clipboard.setString(formatted);
                                if (Platform.OS === 'android') {
                                    ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
                                } else {
                                    Alert.alert('Copied', 'Phone number copied to clipboard');
                                }
                            }}>
                                <Text style={[styles.profileStatus, { fontSize: 14, marginBottom: 4 }]}>
                                    {formatPhoneNumber(otherUserPhoneNumber, hidePhoneNumber)}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity style={styles.backBtn}>
                        {/* <Icon2 name="dots-vertical" size={24} color="#212121" /> */}
                    </TouchableOpacity>
                </View>
                <View style={styles.actionButtons}>
                    {actionButtonsData.map((button, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.actionButton}
                            onPress={button.onPress}>
                            <Ionicons name={button.icon} size={24} color="#0c88d2" />
                            <Text style={styles.actionButtonText}>
                                {button.text}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Media Section */}
                <View style={styles.mediaSection}>
                    <TouchableOpacity
                        style={styles.mediaTitleRow}
                        onPress={() =>
                            navigation.navigate('MediaDocsScreen', { chatId, type: 'Chat' })
                        }>
                        <Text style={styles.sectionTitle}>
                            {translations?.mediaLinkDocs ?? 'Media, Links, Docs'}
                        </Text>
                        <View style={styles.mediaCountRow}>
                            <Text style={styles.mediaCount}>
                                {mediaTotalCount || ''}
                            </Text>
                            <Icon name="chevron-right" size={24} color="#666" />
                        </View>
                    </TouchableOpacity>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.mediaScrollContainer}
                    >
                        {mediaList?.map((item, index) => {
                            const type = resolveType(item);
                            const source = item.thumbnail ? { uri: item.thumbnail } : { uri: item.vishayah.split('|||')[0] };
                            return (
                                <TouchableOpacity
                                    key={`${type}-${index}`}
                                // onPress={() => {
                                //     const cleanUri = item.vishayah?.includes('|||')
                                //         ? item.vishayah.split('|||')[0]
                                //         : item.vishayah;

                                //     setSelectedMedia([
                                //         {
                                //             type: type,
                                //             uri: cleanUri,
                                //         },
                                //     ]);
                                //     setMediaViewerVisible(true);
                                // }}
                                >
                                    {type === "audio" ? (
                                        <Ionicon2 name="headset" size={50} color="#fe651d" />

                                    ) : type === "image" ? (
                                        <Image
                                            style={styles.scrollImages}
                                            source={source}
                                        />

                                    ) : type === "video" ? (
                                        <Video
                                            style={styles.scrollImages}
                                            paused
                                            source={{
                                                uri: item.vishayah.startsWith("file://")
                                                    ? item.vishayah
                                                    : `file://${item.vishayah}`,
                                            }}
                                        />

                                    ) : null}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Settings Section */}
                <View style={styles.settingsSection}>
                    <TouchableOpacity style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="notifications-outline" size={24} color="#666" />
                            <View>
                                <Text style={styles.settingText}>{translations?.MuteNotifications}</Text>
                                <Text style={styles.settingSubtext}>{translations?.off ?? "off"}</Text>
                            </View>
                        </View>
                        <Switch
                            value={muteNotification}
                            onValueChange={() => setMuteNotification(!muteNotification)}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingRow}
                    // onPress={handleMediaVisibilityPress}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="images-outline" size={24} color="#666" />
                            <View>
                                <Text style={styles.settingText}>{translations.MediaVisibility ?? "Media Visibility"}</Text>
                                <Text style={styles.settingSubtext}>
                                    {galleryMediaVisibility ? (translations.AutoSaveEnabled ?? "Auto Save Enabled") : (translations.AutoSaveDisabled ?? "Auto Save Disabled")}
                                </Text>
                            </View>
                        </View>
                        <Icon name="chevron-right" size={24} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* Encryption Notice */}
                <View style={styles.encryptionSection}>
                    <Icon2 name="lock" size={20} color="#666" />
                    <Text style={styles.encryptionText}>
                        {translations?.EncryptedMessage}
                    </Text>
                </View>
                <View style={styles.dangerSection}>
                    <TouchableOpacity style={styles.dangerRow}>
                        <Icon name="block" size={24} color="#FF0000" />
                        <Text style={styles.dangerText}>
                            Block
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.dangerRow}
                        onPress={() => {
                            navigation.navigate('Grievance', {
                                selectedContact: {
                                    durasamparka_sankhya: '',
                                    ekatma_chinha: otherUserId,
                                    praman_patrika: username,
                                    parichayapatra: userPhoto,
                                    chatId: chatId,
                                },
                            });
                        }}>
                        <Icon name="thumb-down" size={24} color="#FF0000" />
                        <Text style={styles.dangerText}>
                            {translations?.Report ?? 'Report'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Add Dropdown Menu */}
                {
                    showDropdown && (
                        <>
                            <Pressable
                                style={styles.overlay}
                                onPress={() => setShowDropdown(false)}
                            />
                            <View style={styles.dropdownMenu}>
                                <TouchableOpacity
                                    style={styles.dropdownItem}
                                    onPress={() => {
                                        navigation.navigate('ChatProfile');
                                        setShowDropdown(false);
                                    }}>
                                    <Text style={styles.dropdownText}>
                                        {translations?.ViewContact}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.dropdownItem}>
                                    <Text style={styles.dropdownText}>
                                        {translations?.mediaLinkDocs}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.dropdownItem}>
                                    <Text style={styles.dropdownText}>
                                        {translations?.Search}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.dropdownItem}>
                                    <Text style={styles.dropdownText}>
                                        {translations?.MuteNotifications}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.dropdownItem}>
                                    <Text style={styles.dropdownText}>
                                        {translations?.disappearingMessages}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.dropdownItem}>
                                    <Text style={styles.dropdownText}>
                                        {translations?.Wallpaper}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.dropdownItem, styles.dropdownItemLast]}>
                                    <Text style={styles.dropdownText}>
                                        {translations?.viewMore}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )
                }
            </ScrollView >
            {/* 
            <MyModal
                modalVisible={displayProfileModal}
                setModalVisible={setDisplayProfileModal}
                item={{
                    prakara: 'Chat',
                    contact_photo: userPhoto,
                }}
            />
            <MediaViewer
                visible={mediaViewerVisible}
                onClose={() => setMediaViewerVisible(false)}
                mediaItems={selectedMedia}
                initialIndex={0}
            /> */}
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    profileHeader: {
        alignItems: 'center',
        backgroundColor: '#fff'
    },
    profilePicture: {
        width: width * 0.3,
        height: width * 0.3,
        borderRadius: (width * 0.3) / 2,
        marginBottom: 10,
    },
    profileName: {
        fontSize: width * 0.06,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    profileStatus: {
        fontSize: width * 0.04,
        color: '#666',
    },
    infoContainer: {
        backgroundColor: '#fff',
        marginTop: 10,
    },
    section: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    sectionLabel: {
        fontSize: 14,
        color: '#075E54',
        marginBottom: 5,
    },
    mediaSection: {
        backgroundColor: '#fff',
        marginTop: 10,
        padding: 15,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    mainImgMwdia: {
        marginBottom: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingBottom: 15,
        position: 'relative',
    },
    scrollImages: {
        marginHorizontal: 3,
        width: 70,
        height: 70,
        borderRadius: 8,
    },
    optionText: {
        fontSize: 16,
        color: '#333',
    },
    border: {
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        paddingTop: 15,
    },
    blockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingLeft: 10,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    profileImageContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    changePhotoText: {
        color: '#00B5FF',
        marginTop: 10,
        fontSize: 13,
        fontWeight: '600',
    },
    mediaTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    mediaCountRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mediaCount: {
        color: '#666',
        marginRight: 5,
    },
    settingsSection: {
        backgroundColor: '#fff',
        marginTop: 10,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingText: {
        marginLeft: 15,
        fontSize: 16,
        color: '#1a1a1a',
    },
    settingSubtext: {
        marginLeft: 15,
        fontSize: 14,
        color: '#666',
    },
    encryptionSection: {
        backgroundColor: '#fff',
        marginTop: 10,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    encryptionText: {
        fontSize: 12,
        color: '#666',
        marginLeft: 10,
        flex: 1,
    },
    dangerSection: {
        backgroundColor: '#fff',
        marginTop: 10,
    },
    dangerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dangerText: {
        marginLeft: 15,
        fontSize: 16,
        color: '#FF0000',
    },
    mediaScrollContainer: {
        paddingVertical: 10,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingBottom: 15,
    },
    actionButton: {
        alignItems: 'center',
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        minWidth: 80,
        marginHorizontal: 5,
    },
    actionButtonText: {
        marginTop: 5,
        fontSize: 12,
        color: '#555',
    },
    profilehead: {
        paddingVertical: 20,
        alignItems: "center",
    },
    menuContainer: {
        position: 'relative',
        zIndex: 2,
    },

    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.1)',
        zIndex: 100,
    },

    dropdownMenu: {
        position: 'absolute',
        top: 50,
        right: 10,
        backgroundColor: 'white',
        borderRadius: 4,
        minWidth: 180,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 1000,
    },

    dropdownItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },

    dropdownItemLast: {
        borderBottomWidth: 0,
    },

    dropdownText: {
        fontSize: 13,
        color: '#212121',
    },

    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        width: '85%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 10,
    },
    modalSubText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    modalOption: {
        paddingVertical: 12,
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalOptionText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 15,
    },
    selectedOptionText: {
        color: '#0080ff',
        fontWeight: 'bold',
    },
    optionButton: {
        marginHorizontal: 3,
        borderWidth: 1,
        borderColor: '#ccc',
        height: 72,
        width: 67,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalHeader: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
        textAlign: 'center',
    },
});

export default ChatProfile;