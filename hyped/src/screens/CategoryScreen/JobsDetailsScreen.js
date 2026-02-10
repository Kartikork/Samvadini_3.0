import { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, Image, ScrollView, Text, Linking, TouchableOpacity, Alert, BackHandler } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { noImage } from '../../assets';
import BottomNavigation from "../../components/BottomNavigation";
import { useAppSelector } from "../../state/hooks";
import { getAppTranslations } from "../../translations";

export function JobsDetailsScreen({ route }) {
    const { item } = route?.params || {};
    const [jobDetails] = useState(item);
    const navigation = useNavigation();
    const lang = useAppSelector(state => state.language.lang);
    const translations = useMemo(() => getAppTranslations(lang), [lang]);

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
                            params: { screen: 'JobScreen' }
                        }],
                    });
                    return true;
                }
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => backHandler.remove();
        }, [navigation])
    );

    const renderJobContent = () => {
        if (jobDetails?.job_title) {
            return (
                <>
                    <Text style={styles.title}>{jobDetails?.job_title?.toUpperCase()}</Text>
                    <View style={styles.companyContainer}>
                        <Image
                            source={noImage}
                            style={styles.companyLogo}
                        />
                        <Text style={styles.companyName}>{jobDetails?.company_name}</Text>
                    </View>
                    <View style={styles.jobInfoContainer}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Location:</Text>
                            <Text style={styles.infoValue}>{jobDetails?.location}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Posted:</Text>
                            <Text style={styles.infoValue}>{jobDetails?.time_posted}</Text>
                        </View>
                    </View>
                </>
            );
        }

        // For Internships
        if (jobDetails.internship_type) {
            return (
                <>
                    <Text style={styles.title}>{jobDetails?.title}</Text>
                    <View style={styles.companyContainer}>
                        {jobDetails?.logo_url ?
                            <Image source={{ uri: jobDetails?.logo_url }} style={styles.companyLogo} /> :
                            <Image source={noImage} style={styles.companyLogo} />
                        }
                        <Text style={styles.companyName}>{jobDetails?.company}</Text>
                    </View>
                    <View style={styles.jobInfoContainer}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Type:</Text>
                            <Text style={styles.infoValue}>{jobDetails?.internship_type}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Interns Required:</Text>
                            <Text style={styles.infoValue}>{jobDetails?.interns}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Qualification:</Text>
                            <Text style={styles.infoValue}>{jobDetails?.qualification}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Specialisation:</Text>
                            <Text style={styles.infoValue}>{jobDetails?.specialisation}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Location:</Text>
                            <Text style={styles.infoValue}>{jobDetails?.state}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Posted Date:</Text>
                            <Text style={styles.infoValue}>{jobDetails?.posted_on}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Last Date:</Text>
                            <Text style={styles.infoValue}>{jobDetails?.last_date}</Text>
                        </View>
                    </View>
                </>
            );
        }

        return (
            <>
                <Text style={styles.title}>{jobDetails?.title}</Text>
                <View style={styles.companyContainer}>
                    {jobDetails?.image_url ?
                        <Image source={{ uri: jobDetails?.image_url }} style={styles.companyLogo} /> :
                        <Image source={noImage} style={styles.companyLogo} />
                    }
                    <Text style={styles.companyName}>
                        {jobDetails?.corporate_organization?.toUpperCase()}
                    </Text>
                </View>
                <View style={styles.jobInfoContainer}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Vacancy:</Text>
                        <Text style={styles.infoValue}>{jobDetails?.interns || jobDetails?.vacancy}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Location:</Text>
                        <Text style={styles.infoValue}>
                            {jobDetails?.location || "any"}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Posted Date:</Text>
                        <Text style={styles.infoValue}>
                            {jobDetails?.posted_on}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Last Date:</Text>
                        <Text style={styles.infoValue}>
                            {jobDetails?.last_date}
                        </Text>
                    </View>
                </View>
                {jobDetails?.hastags && (
                    <View style={styles.tagsContainer}>
                        {jobDetails?.hastags.map((tag, index) => (
                            <Text key={index} style={styles.tag}>{tag}</Text>
                        ))}
                    </View>
                )}
            </>
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.content}>
                {renderJobContent()}

                <View style={styles.descriptionHeaderContainer}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <View style={styles.socialIcons}>
                        <TouchableOpacity
                            style={styles.socialIcon}
                            onPress={() => {
                                const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobDetails.apply_link || jobDetails.apply_url || jobDetails.job_url)}&title=${encodeURIComponent(jobDetails.title || jobDetails.job_title)}`;
                                Linking.openURL(linkedinUrl);
                            }}
                        >
                            <Icon name="linkedin-square" size={24} color="#0077B5" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.socialIcon}
                            onPress={() => {
                                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this opportunity: ${jobDetails.title || jobDetails.job_title}`)}&url=${encodeURIComponent(jobDetails.apply_link || jobDetails.apply_url || jobDetails.job_url)}`;
                                Linking.openURL(twitterUrl);
                            }}
                        >
                            <Icon name="twitter-square" size={24} color="#1DA1F2" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.socialIcon}
                            onPress={() => {
                                const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(jobDetails.apply_link || jobDetails.apply_url || jobDetails.job_url)}`;
                                Linking.openURL(facebookUrl);
                            }}
                        >
                            <Icon name="facebook-square" size={24} color="#4267B2" />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.description}>
                    {jobDetails.description || jobDetails.job_description ||
                        (jobDetails.job_skills && jobDetails.job_profile ? jobDetails.job_profile + ', ' + jobDetails.job_skills : jobDetails.job_skills || jobDetails.job_profile)}
                </Text>

                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                        onPress={() => {
                            const applyLink = jobDetails.apply_link || jobDetails.apply_url || jobDetails.job_url;
                            if (applyLink) {
                                Linking.openURL(applyLink)
                                    .catch((err) => console.error("Failed to open URL:", err));
                            } else {
                                Alert.alert("No application link available");
                            }
                        }}
                    >
                        <LinearGradient
                            colors={['#6462AC', '#028BD3']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.applyButton}
                        >
                            <Text style={styles.applyButtonText}>{translations['applyNow'] || "Apply Now"}</Text>
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
        marginBottom: 20,
        textTransform: "capitalize"
    },
    companyContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    companyLogo: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 12,
    },
    companyName: {
        fontSize: 16,
        color: "#333",
    },
    jobInfoContainer: {
        backgroundColor: "#f5f5f5",
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,

    },
    infoLabel: {
        color: "#666",
        fontSize: 14,
    },
    infoValue: {
        color: "#333",
        fontSize: 14,
        fontWeight: "500",
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 20,
    },
    tag: {
        color: "#777",
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: "#f0f0f0",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    descriptionHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        color: "#444",
        textAlign: "justify",
        marginBottom: 20,
    },
    actionButtonsContainer: {
        marginTop: 20,
        marginBottom: 50,
        alignItems: "center",
    },
    applyButton: {
        backgroundColor: "#0080ff",
        paddingHorizontal: 40,
        paddingVertical: 12,
        borderRadius: 25,
        width: "80%",
    },
    applyButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
        textAlign: "center",
    },
    socialIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    socialIcon: {
        marginLeft: 8,
        padding: 4,
    },
}); 