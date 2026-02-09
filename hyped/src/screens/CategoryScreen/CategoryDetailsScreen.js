import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Image, ScrollView, Linking, TouchableOpacity, BackHandler, Text, Alert } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { getCategoryDataSQLlitebyID } from "../../storage/sqllite/categoryData/CategoryDataSchema";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
// import TextToVoiceIconWrapper from "../../components/TextToVoiceIconWrapper";
// import BottomNavigation from "../../components/BottomNavigation";
import axios from "axios";
import { noImage } from "../../assets";
import BottomNavigation from "../../components/BottomNavigation";
import { formatChatDate } from "../../helper/DateFormate";

export function CategoryDetailsScreen({ route }) {
    const { id } = route?.params || {};
    const [article, setArticle] = useState();
    const [loading, setLoading] = useState(false);
    const lang = 'en';
    const navigation = useNavigation();
    const [isTitleSpoken, setIsTitleSpoken] = useState(false);
    const titleVoiceRef = React.useRef();
    const descriptionVoiceRef = React.useRef();

    // Handle back button press
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (navigation.canGoBack()) {
                    navigation.goBack();
                    return true;
                } else {
                    navigation.reset({
                        index: 0,
                        routes: [{
                            name: 'Dashboard',
                            params: { screen: 'Category', params: { id: 'Hot Trends', name: 'hotTrends' } }
                        }],
                    });
                    return true;
                }
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => backHandler.remove();
        }, [navigation])
    );

    useEffect(() => {
        getArticleData(id);
    }, [lang, id]);

    useEffect(() => {
        // Auto play title on mount
        if (!isTitleSpoken && article?.title) {
            setIsTitleSpoken(true);
            setTimeout(() => {
                titleVoiceRef.current?.play && titleVoiceRef.current.play();
            }, 500);
        }
    }, [article?.title, isTitleSpoken]);

    const getArticleData = async (id) => {
        try {
            setLoading(true);
            // Check network connectivity
            const netInfoState = await NetInfo.fetch();

            if (netInfoState.isConnected) {
                // If internet is available, fetch from API
                const formData = { lang, id: id };
                // const response = await axiosConn("post", "api/category/get-category-by-id", formData);
                const response = await axios.post(`https://qasamvadini.aicte-india.org/api/category/get-category-by-id`, formData);
                if (response.status === 200) {
                    setArticle(response.data.data);
                } else {
                    console.warn("No data available for the given ID.");
                }
            } else {
                // If no internet, fetch from local storage
                const localData = await getCategoryDataSQLlitebyID(id);
                if (localData) {
                    setArticle(localData);
                } else {
                    console.warn("No local data available for the given ID.");
                }
            }
        } catch (error) {
            console.error("Error fetching article:", error);
        } finally {
            setLoading(false);
        }
    };

    // Determine if this is a PIB record
    const isPIB = !!article?.subject;

    return (
        <View style={styles.container}>
            <ScrollView style={styles.content}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.title}>{isPIB ? article?.subject : article?.title || ''}</Text>
                    {/* <TextToVoiceIconWrapper
                        ref={titleVoiceRef}
                        text={isPIB ? article?.subject : article?.title || ''}
                        lang={lang}
                    /> */}
                </View>

                <View style={styles.headerContainer}>
                    <Text style={styles.dateText}>{formatChatDate(isPIB ? article?.date : article?.publish_date)}</Text>
                    <View style={styles.socialButtons}>
                        <TouchableOpacity style={styles.socialButton}>
                            <Image
                                source={noImage}
                                // source={require("../../assets/bookmark-icon.png")}
                                style={styles.socialIcon}
                            />
                        </TouchableOpacity>
                        {/* Add other social buttons similarly */}
                    </View>
                </View>

                {article?.image_url ?
                    <Image
                        source={{ uri: article.image_url }}
                        style={styles.newsImage}
                    /> :
                    <Image
                        source={noImage}
                        style={styles.newsImage}
                    />
                }

                {/* Content Section with Dynamic TextToVoiceIconWrapper Positioning */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <Text style={styles.newsContent}>{isPIB ? article?.body : article?.summary || ''}</Text>
                    {/* <TextToVoiceIconWrapper
                        ref={descriptionVoiceRef}
                        text={isPIB ? article?.body : article?.summary || ''}
                        lang={lang}
                        style={{ marginLeft: 8 }}
                    /> */}
                </View>

                {/* PIB-specific: Ministry */}
                {isPIB && article?.ministry && (
                    <Text style={styles.ministry}>{article.ministry}</Text>
                )}

                <View style={styles.viewMoreContainer}>
                    <TouchableOpacity
                        onPress={() => {
                            if (article?.article_url) {
                                Linking.openURL(article?.article_url).catch((err) =>
                                    console.error("Failed to open URL:", err)
                                );
                            } else {
                                Alert.alert("No URL provided");
                            }
                        }}>
                        <LinearGradient
                            colors={['#6462AC', '#028BD3']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.send}
                        >
                            <Text style={styles.viewMoreText}>View More</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>
            <BottomNavigation />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 16,
        marginTop: 16,
    },
    title: {
        fontSize: 24,
        color: "#212121",
        marginBottom: 10,
    },
    headerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    dateText: {
        color: "#888",
    },
    socialButtons: {
        flexDirection: "row",
    },
    socialButton: {
        padding: 8,
    },
    socialIcon: {
        width: 24,
        height: 24,
    },
    newsImage: {
        width: "100%",
        height: 200,
        resizeMode: "cover",
        marginBottom: 16,
        borderRadius: 10,
    },
    newsContent: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: "justify",
        color: "#333",
    },
    viewMoreContainer: {
        alignItems: "center",
        marginTop: 20,
        marginBottom: 50,
    },
    send: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 30,
    },
    viewMoreText: {
        color: "#fff",
        fontSize: 16,
    },
    ministry: {
        fontSize: 18,
        color: "#555",
        marginTop: 10,
        marginBottom: 15,
    },
});