import { useEffect, useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, FlatList, Image, Dimensions, Modal, Alert, Linking, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import ImageViewer from 'react-native-image-zoom-viewer';
import { FetchChatMedia } from '../../../storage/sqllite/chat/ChatMessageSchema';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FileViewer from 'react-native-file-viewer';
import { formatDatewithTime } from '../../../helper/DateFormate';
import { MediaViewer } from '../../../components/MediaViewer';
import { FetchGroupMedia } from '../../../storage/sqllite/chat/GroupMessageSchema';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../../state/hooks';
import { getAppTranslations } from '../../../translations';
import { locationIcons } from '../../../assets';
const Tab = createMaterialTopTabNavigator();
const { width } = Dimensions.get('window');

function MediaTabContent({ mediaList }) {
    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const lang = useAppSelector(state => state.language.lang);
    const translations = useMemo(() => getAppTranslations(lang), [lang]);
    const [selectedMedia, setSelectedMedia] = useState([]);
    const [mediaViewerVisible, setMediaViewerVisible] = useState(false);

    const resolveType = (item) => {
        if (item.type) return item.type;

        const sp = item.sandesha_prakara || "";

        if (sp.startsWith("image/")) return "image";
        if (sp.startsWith("video/")) return "video";
        if (sp.startsWith("audio/")) return "audio";

        const ext = item.vishayah?.split(".").pop()?.toLowerCase();
        if (["mp4", "mov", "avi", "mkv"].includes(ext)) return "video";
        if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";

        return "unknown";
    };

    const mediaItems = mediaList?.length
        ? mediaList.map((item) => {
            const type = resolveType(item);

            const url = item.thumbnail ? item.thumbnail : item.vishayah.split('|||')[0];

            return {
                id: item.id || null,
                type,
                url,
                date: new Date(item.preritam_tithih),
            };
        })
        : [];

    const groupMediaByDate = (items) => {
        const today = new Date();
        const groups = {};

        items.forEach((item) => {
            const d1 = new Date(item.date.getFullYear(), item.date.getMonth(), item.date.getDate());
            const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            const diffDays = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));

            let groupKey =
                diffDays === 0
                    ? translations?.Today
                    : diffDays === 1
                        ? translations?.Yesterday
                        : diffDays <= 7
                            ? translations?.ThisWeek
                            : "Older";

            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(item);
        });

        return groups;
    };

    const groupedMedia = groupMediaByDate(mediaItems);


    const getAllImages = () => {
        const arr = [];
        Object.values(groupedMedia).forEach((group) => {
            group.forEach((item) => {
                if (item.type === "image") {
                    arr.push({ url: item.url }); // <-- fixed
                }
            });
        });
        return arr;
    };

    const renderMediaGroup = ({ item }) => (
        <View style={styles.mediaGroup}>
            <Text style={styles.mediaGroupHeader}>{item.title}</Text>

            <View style={styles.mediaGridContainer}>
                {item.data.map((mediaItem, index) => (
                    <TouchableOpacity
                        key={`${mediaItem.type}-${index}`}
                        style={styles.mediaItem}
                        onPress={() => {
                            const cleanUri = mediaItem.url?.includes('|||')
                                ? mediaItem.url.split('|||')[0]
                                : mediaItem.url;

                            setSelectedMedia([
                                {
                                    type: mediaItem.type,
                                    uri: cleanUri,
                                },
                            ]);

                            setMediaViewerVisible(true);
                        }}
                    >
                        {mediaItem.type === "image" && mediaItem.url ? (
                            <Image
                                source={{ uri: mediaItem.url }}
                                style={styles.mediaImage}
                            />
                        ) : mediaItem.type === "video" && mediaItem.url ? (
                            <>
                                <Video
                                    source={{ uri: mediaItem.url }}
                                    paused={true}
                                    style={styles.mediaImage}
                                />
                                <Icon
                                    name="play-circle-outline"
                                    size={28}
                                    color="#fff"
                                    style={styles.playIcon}
                                />
                            </>
                        ) : mediaItem.type === "audio" ? (
                            <View style={styles.playIconContainer}>
                                <Icon name="headset" size={40} color="#fe651d" />
                            </View>
                        ) : mediaItem.type === "location" ? (
                            <Image source={{ uri: mediaItem.url }} style={styles.mediaImage} />
                        ) : null}
                    </TouchableOpacity>
                ))}
            </View>

            <MediaViewer
                visible={mediaViewerVisible}
                onClose={() => setMediaViewerVisible(false)}
                mediaItems={selectedMedia}
                initialIndex={0}
            />
        </View>
    );

    const groupsArray = Object.entries(groupedMedia).map(([title, data]) => ({
        title,
        data,
    }));

    return (
        <View style={styles.container}>
            <FlatList
                data={groupsArray}
                renderItem={renderMediaGroup}
                keyExtractor={(item, index) => `${item.title}-${index}`}
                showsVerticalScrollIndicator={false}
            />

            <Modal
                visible={isImageViewerVisible}
                transparent
                onRequestClose={() => setIsImageViewerVisible(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setIsImageViewerVisible(false)}
                    >
                        <Icon name="close" size={28} color="#fff" />
                    </TouchableOpacity>

                    <ImageViewer
                        imageUrls={getAllImages()}
                        index={currentImageIndex}
                        enableSwipeDown
                        onSwipeDown={() => setIsImageViewerVisible(false)}
                        backgroundColor="rgba(0,0,0,0.9)"
                    />
                </SafeAreaView>
            </Modal>
        </View>
    );
}

// Links Tab Component
function LinksTabContent({ linkList }) {


    const renderLinkItem = ({ item }) => (
        <View style={styles.linkItemContainer}>
            <Text style={styles.linkMeta}>{item.vishayah}</Text>
            <Text style={styles.linkMeta}>{formatDatewithTime(item.preritam_tithih)}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={linkList}
                renderItem={renderLinkItem}
                keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
                style={styles.linksList}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

// Docs Tab Component
function DocsTabContent({ applicationList }) {
    const docs = applicationList && applicationList.length > 0
        ? applicationList.map(item => {
            const raw = item.vishayah || '';
            const parts = raw.split('|||');
            const fileUri = parts[0] || '';
            const fileNameFromParts = parts[1] || fileUri.split('/').pop() || '';
            const fileName = decodeURIComponent(fileNameFromParts).replace(/%20/g, ' ').replace(/\s{2,}/g, ' ').trim();
            const fileSize = parts[2] || '';

            return {
                id: item?.id,
                type: item.sandesha_prakara,
                date: item.preritam_tithih,
                name: fileName,
                rawVishayah: raw,
                fileUri,
                fileSize,
            };
        })
        : [];

    const getDocIcon = (mimeType) => {
        if (typeof mimeType !== "string" || !mimeType.startsWith("application/")) {
            return 'file-document-outline';
        }

        switch (mimeType) {
            case 'application/pdf':
                return 'file-pdf-box';
            case 'application/msword':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return 'file-word-box';
            case 'application/vnd.ms-excel':
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                return 'file-excel-box';
            case 'application/vnd.ms-powerpoint':
            case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
                return 'file-powerpoint-box';
            case 'application/zip':
            case 'application/x-rar-compressed':
                return 'folder-zip';
            default:
                return 'file-document-outline';
        }
    };

    const renderDocItem = ({ item }) => {
        const fileUri = item.fileUri || (item.rawVishayah && item.rawVishayah.split('|||')[0]) || '';
        const fileName = item.name || (item.rawVishayah && item.rawVishayah.split('|||')[1]) || (fileUri.split('/').pop() || '');
        const fileSizeStr = item.fileSize || (item.rawVishayah && item.rawVishayah.split('|||')[2]) || '0';
        const sizeInBytes = parseInt(fileSizeStr, 10) || 0;
        const sizeInKB = sizeInBytes / 1000;
        const formattedFileSize = sizeInKB >= 1000 ? `${(sizeInKB / 1024).toFixed(2)} MB` : `${sizeInKB.toFixed(2)} KB`;

        return (
            <TouchableOpacity
                style={styles.docItem}
                onPress={async () => {
                    try {
                        if (fileUri) {
                            await FileViewer.open(fileUri, {
                                showOpenWithDialog: true,
                                showAppsSuggestions: true,
                            });
                        }
                    } catch (error) {
                        console.error('Error downloading or opening file:', error);
                    }
                }}
            >
                <View style={styles.docIcon}>
                    <MaterialCommunityIcons name={getDocIcon(item.type)} size={40} color="#075e54" />
                </View>
                <View style={styles.docContent}>
                    <Text style={styles.docName} numberOfLines={1}>{fileName}</Text>
                    <Text style={styles.docName} numberOfLines={1}>{formattedFileSize}</Text>
                    <Text style={styles.linkMeta}>{formatDatewithTime(item.date)}</Text>
                </View>
            </TouchableOpacity>
        );
    };
    return (
        <View style={styles.container}>
            <FlatList
                data={docs}
                renderItem={renderDocItem}
                keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
                style={styles.docsList}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

// Locations Tab Component
function LocationsTabContent({ locationList }) {
    const renderLocationItem = ({ item }) => {
        let data = {};
        try {
            data = JSON.parse(item.vishayah) || {};
        } catch (e) {
            console.error('❌ [Location] Failed to parse location data:', e);
            data = {};
        }

        const renderLocationThumbnail = () => (
            <Image
                style={{ width: 200, height: 100, borderRadius: 8 }}
                source={locationIcons}
            />
        );

        const handleLocationPress = () => {
            const locationUrl = data.locationUrl;
            if (locationUrl) {
                Linking.openURL(locationUrl).catch(() =>
                    Alert.alert('Error', 'Failed to open the URL.')
                );
            } else {
                Alert.alert('Error', 'Invalid location URL.');
            }
        };

        return (
            <TouchableOpacity onPress={handleLocationPress} style={{ marginVertical: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {renderLocationThumbnail()}
                </View>
                <View style={styles.linkContent}>
                    <Text style={styles.linkMeta}>{formatDatewithTime(item.preritam_tithih)}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.locationContainer}>
            <FlatList
                data={locationList}
                renderItem={renderLocationItem}
                keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
                style={[styles.linksList, { maxWidth: '50%' }]}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

// Contacts Tab Component
function ContactsTabContent({ contactList, lang = "en" }) {
    const nav = useNavigation();

    const renderContactsItem = ({ item, index }) => {
        let contacts = [];
        try {
            contacts = JSON.parse(item?.vishayah) || [];
        } catch (error) {
            console.warn("Invalid contact JSON:", error);
        }

        const contactCount = contacts.length;
        const shouldShowViewMore = contactCount > 1;
        const primaryContact = contacts[0] || {};

        const displayName = primaryContact?.name?.trim() || '';
        const originalName = primaryContact?.originalName?.trim() || '';
        const translatedLanguageCodeRaw = primaryContact?.translatedLang;
        const translatedLanguageCode =
            typeof translatedLanguageCodeRaw === 'string'
                ? translatedLanguageCodeRaw.toLowerCase()
                : '';

        const speechLanguage = translatedLanguageCode || lang;
        const additionalContacts = contactCount - 1;

        const baseNameForSpeech = displayName || originalName;
        const speechText = baseNameForSpeech
            ? shouldShowViewMore
                ? `${baseNameForSpeech}${additionalContacts > 0
                    ? `, plus ${additionalContacts} other contact${additionalContacts > 1 ? 's' : ''}`
                    : ''
                }`
                : baseNameForSpeech
            : '';

        return (
            <TouchableOpacity
                key={`${item?.id || index}`}
                style={styles.contactMessageContainer}
                onPress={() =>
                    nav.navigate('AddContact', {
                        sharedContacts: contacts,
                    })
                }>

                <View style={styles.contactItem}>
                    <View style={styles.contactAvatar}>
                        <Icon name="person" size={34} color="#9dceff" />
                    </View>

                    <View style={styles.contactInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.contactName}>
                                {originalName && originalName.length > 23
                                    ? `${originalName.substring(0, 20)}...`
                                    : originalName || 'Unknown'}

                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', }}  >
                                <Text style={[styles.contactName, { marginHorizontal: 6 }]}>
                                    {shouldShowViewMore &&
                                        ` + ${contactCount - 1}`}
                                </Text>
                                {shouldShowViewMore && (
                                    <TouchableOpacity
                                        style={styles.viewMoreButton}
                                        onPress={() =>
                                            nav.navigate('AddContact', {
                                                sharedContacts: contacts,
                                            })
                                        }>
                                        <Text style={styles.viewMoreText}>View All</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <View style={styles.linkContent}>
                            <Text style={styles.contactNumber}>
                                {primaryContact?.number || ''}
                            </Text>
                            <Text style={styles.linkMeta}>{formatDatewithTime(item.preritam_tithih)}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { padding: 10 }]}>
            <FlatList
                data={contactList}
                renderItem={renderContactsItem}
                keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
                style={styles.linksList}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

export default function MediaDocsScreen({ route }) {
    const { chatId, type } = route.params;
    const [mediaList, setMediaList] = useState([]);
    const [locationList, setLocationList] = useState([]);
    const [contactList, setContactList] = useState([]);
    const [applicationList, setApplicationList] = useState([]);
    const [linkList, setLinkList] = useState([]);
    const lang = useAppSelector(state => state.language.lang);
    const translations = useMemo(() => getAppTranslations(lang), [lang]);

    useEffect(() => {
        const fetchData = async () => {
            let applicationData = [];
            let linkData = [];
            let mediaData = [];
            let contactData = [];
            let locationData = [];

            let uniqueId = await AsyncStorage.getItem("uniqueId");
            let chatMediaData = [];

            if (type === "Chat") {
                chatMediaData = await FetchChatMedia(chatId, uniqueId, "all");
            } else {
                chatMediaData = await FetchGroupMedia(chatId, uniqueId, "all");
            }
            chatMediaData?.messages.forEach((item) => {
                const messType = item.sandesha_prakara;

                if (messType.startsWith("application/")) {
                    applicationData.push(item);
                } else if (messType === "link") {
                    linkData.push(item);
                } else if (messType === "contact") {
                    contactData.push(item);
                } else if (messType === "location" || messType === "live_location") {
                    locationData.push(item);
                } else {
                    mediaData.push(item);
                }
            });

            setApplicationList(applicationData);
            setLinkList(linkData);
            setMediaList(mediaData);
            setContactList(contactData);
            setLocationList(locationData);
        };

        fetchData();
    }, [chatId, type]);

    return (
        <View style={{ flex: 1 }}>
            <Tab.Navigator
                screenOptions={{
                    tabBarStyle: styles.tabBar,
                    tabBarIndicatorStyle: styles.tabIndicator,
                    tabBarLabelStyle: styles.tabLabel,
                    tabBarActiveTintColor: '#01d5f5',
                    tabBarInactiveTintColor: '#666',
                    tabBarScrollEnabled: true,
                    tabBarItemStyle: { width: width / 4, paddingHorizontal: 0 },
                }}
            >
                <Tab.Screen
                    name="MediaTab"
                    children={() => <MediaTabContent mediaList={mediaList} />}
                    options={{
                        tabBarLabel: translations?.Media || 'MEDIA',
                    }}
                />
                <Tab.Screen
                    name="LinksTab"
                    children={() => <LinksTabContent linkList={linkList} />}
                    options={{
                        tabBarLabel: translations?.Links || 'LINKS',
                    }}
                />
                <Tab.Screen
                    name="DocsTab"
                    children={() => <DocsTabContent applicationList={applicationList} />}
                    options={{
                        tabBarLabel: translations?.Docs || 'DOCUMENTS',
                    }}
                />
                <Tab.Screen
                    name="LocationsTab"
                    children={() => <LocationsTabContent locationList={locationList} />}
                    options={{
                        tabBarLabel: 'Locations',
                    }}
                />
                <Tab.Screen
                    name="ContactsTab"
                    children={() => <ContactsTabContent contactList={contactList} />}
                    options={{
                        tabBarLabel: translations?.Contacts || 'CONTACTS',
                    }}
                />
            </Tab.Navigator>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    locationContainer: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 10,
    },
    tabBar: {
        backgroundColor: '#fff',
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tabIndicator: {
        backgroundColor: '#01d5f5',
        height: 2,
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        flexWrap: 'nowrap',
        textAlign: 'center',
    },
    mediaList: {
        padding: 1,
    },
    mediaItem: {
        width: width * 0.30,
        height: width * 0.30,
        margin: 4,
        position: 'relative',
    },
    mediaImage: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
    },
    playIconContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgb(148, 148, 148)',
    },
    mediaDate: {
        position: 'absolute',
        bottom: 5,
        left: 5,
        color: '#fff',
        fontSize: 12,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    linksList: {
        flex: 1,
    },
    linkItem: {
        flexDirection: 'row',
        padding: 15,
        borderBottomWidth: 1,
        alignItems: "center",
        borderBottomColor: '#f0f0f0',
        paddingVertical: 7,
        width: "90%"
    },
    linkIcon: {
        width: 40,
        height: 40,
        borderRadius: 25,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    linkItemContainer: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    linkContent: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    linkTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
    },
    linkUrl: {
        fontSize: 14,
        color: '#0080ff',
        marginTop: 2,
        flexWrap: 'wrap',
        maxWidth: '100%',
    },
    linkMeta: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        position: 'absolute',
        right: 100,
    },
    docsList: {
        flex: 1,
    },
    docItem: {
        flexDirection: 'row',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
    },
    docIcon: {
        marginRight: 15,
    },
    docContent: {
        flex: 1,
    },
    docName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
    },
    docMeta: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    mediaGroup: {
        marginBottom: 20,
    },
    mediaGroupHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        padding: 10,
        backgroundColor: '#f5f5f5',
    },
    mediaGridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 1,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 15,
        zIndex: 1000,
        padding: 5,
    },
    imageCounter: {
        position: 'absolute',
        top: 40,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 8,
        borderRadius: 15,
        zIndex: 1000,
    },
    imageCounterText: {
        color: '#fff',
        fontSize: 14,
    },
    contactMessageContainer: {
        padding: 10,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    contactMessageTitle: {
        fontWeight: 'bold',
        color: '#2093ee',
        marginBottom: 5,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    contactAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ddd',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contactInfo: {
        marginLeft: 10,
        flex: 1,
    },
    contactName: {
        color: '#555',
        fontSize: 14,
        maxWidth: '85%',
        // use numberOfLines on Text to handle overflow
    },
    contactNumber: {
        color: '#666',
        fontSize: 16,
    },
    viewMoreButton: {

        alignSelf: 'flex-start',
    },
    viewMoreText: {
        color: '#0080ff',
        fontSize: 12,
        fontWeight: '500',
        alignSelf: 'center',
    },
});
