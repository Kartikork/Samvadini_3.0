import {
    View, Text, FlatList, Image, TouchableOpacity,
    StyleSheet, Modal, TextInput, Dimensions, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon2 from 'react-native-vector-icons/MaterialCommunityIcons';
import Video from 'react-native-video';
const { width, height } = Dimensions.get("window");

const StatusPreviewModal = ({
    visible, selectedMedia, currentIndex, setCurrentIndex,
    caption, setCaption, onClose, onDelete, onUpload, loading,
}) => {
    const currentMedia = selectedMedia.length > 0 ? selectedMedia[currentIndex] : null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalBarRow}>
                    <View style={styles.modalBar} />
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Icon2 name="close" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.previewMediaContainer}>
                    {currentMedia && currentMedia.type === 'image' && (
                        <Image
                            source={{ uri: currentMedia.content }}
                            style={styles.previewMedia}
                            resizeMode="cover"
                        />
                    )}
                    {currentMedia && currentMedia.type === 'video' && (
                        <Video
                            source={{ uri: currentMedia.content }}
                            style={styles.previewMedia}
                            resizeMode="cover"
                            paused={false}
                            controls
                            key={currentMedia.content}
                        />
                    )}
                </View>

                <View style={styles.thumbsRow}>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(currentIndex)}>
                        <Icon2 name="delete-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                    <FlatList
                        data={selectedMedia}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(_, idx) => "thumb-" + idx}
                        contentContainerStyle={styles.thumbsContainer}
                        renderItem={({ item, index }) => (
                            <TouchableOpacity onPress={() => setCurrentIndex(index)}>
                                {item.type === "video" ? (
                                    <View>
                                        <Video
                                            source={{ uri: item.content }}
                                            style={[
                                                styles.thumbImage,
                                                currentIndex === index && styles.selectedThumb,
                                            ]}
                                            paused={true}
                                            muted
                                            resizeMode="cover"
                                        />
                                        <View style={styles.playIconOverlay}>
                                            <Icon2 name="play-circle" size={20} color="#fff" />
                                        </View>
                                    </View>
                                ) : (
                                    <Image
                                        source={{ uri: item.content }}
                                        style={[
                                            styles.thumbImage,
                                            currentIndex === index && styles.selectedThumb,
                                        ]}
                                    />
                                )}
                            </TouchableOpacity>
                        )}
                    />
                </View>

                {/* Caption Input */}
                <View style={styles.captionContainer}>
                    <TextInput
                        style={styles.captionInput}
                        placeholder="Add a caption..."
                        placeholderTextColor="#9CA3AF"
                        value={caption}
                        onChangeText={setCaption}
                        maxLength={120}
                    />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                        <Text style={styles.actionBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onUpload}>
                        <LinearGradient
                            colors={['#6462AC', '#028BD3']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.uploadBtn}
                        >
                            <Text style={styles.actionBtnText}>Upload</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#028BD3" />
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: '#181920ee',
        justifyContent: 'flex-end',
    },
    modalBarRow: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
        position: "relative"
    },
    modalBar: {
        width: 50,
        height: 5,
        borderRadius: 3,
        backgroundColor: "#282828",
        marginBottom: 14
    },
    closeBtn: {
        position: "absolute",
        left: 20,
        top: -6,
        padding: 4,
        zIndex: 2
    },
    previewMediaContainer: {
        width: "90%",
        alignSelf: "center",
        backgroundColor: "#232328",
        borderRadius: 20,
        shadowColor: "#000",
        shadowOpacity: 0.13,
        shadowRadius: 9,
        elevation: 8,
        marginTop: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    previewMedia: {
        width: width * 0.9,
        height: height * 0.630,
        borderRadius: 16,
        backgroundColor: '#222',
    },
    deleteBtn: {
        backgroundColor: "#EB5757",
        borderRadius: 18,
        width: 36,
        height: 36,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 10
    },
    thumbsRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 18,
        marginBottom: 12,
        minHeight: 50,
    },
    thumbsContainer: {
        alignItems: "center"
    },
    thumbImage: {
        width: 44,
        height: 44,
        borderRadius: 8,
        marginHorizontal: 7
    },
    selectedThumb: {
        borderWidth: 3,
        borderColor: "#028BD3"
    },
    playIconOverlay: {
        position: "absolute",
        left: 8,
        top: 8,
        backgroundColor: "rgba(0,0,0,0.35)",
        borderRadius: 10,
        padding: 1
    },
    captionContainer: {
        width: "90%",
        alignSelf: "center",
        backgroundColor: "#232328",
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 11,
        marginBottom: 18,
        marginTop: 2,
        flexDirection: "row",
        alignItems: "center"
    },
    captionInput: {
        color: "#fff",
        fontSize: 16,
        flex: 1
    },
    actionButtonsRow: {
        width: "90%",
        flexDirection: "row",
        alignSelf: "center",
        marginBottom: 22,
        justifyContent: "space-between"
    },
    cancelBtn: {
        backgroundColor: "#f04",
        paddingVertical: 2,
        borderRadius: 30,
        marginRight: 8,
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 4,
        height: 36
    },
    uploadBtn: {
        flex: 1,
        backgroundColor: "#20C55F",
        paddingVertical: 2,
        borderRadius: 30,
        marginLeft: 8,
        alignItems: "center",
        paddingHorizontal: 20,
        height: 36
    },
    actionBtnText: {
        color: "#fff",
        fontSize: 14,
        paddingTop: 5
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(25,25,25,0.88)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100
    }
});

export default StatusPreviewModal;
