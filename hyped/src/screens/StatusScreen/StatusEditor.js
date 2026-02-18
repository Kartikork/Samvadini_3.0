import { useState } from "react";
import {
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { getAllContactsUniqueId } from "../../storage/sqllite/authentication/UsersContactsList";
// import { socketService } from "../../services/socketService";
import { env } from "../../config";
import axios from "axios";
import { useAppSelector } from "../../state/hooks";

export default function StatusEditor({ navigation }) {

  const name = useAppSelector(state => state.auth.userSettings?.praman_patrika);
  const photo = useAppSelector(state => state.auth.userSettings?.parichayapatra);
  const uniqueId = useAppSelector(state => state.auth.uniqueId);
  const [statusText, setStatusText] = useState("");
  const [bgIndex, setBgIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const backgrounds = [
    ["#075E54", "#128C7E"],
    ["#0B141A", "#131C21"],
    ["#233329", "#63D471"],
    ["#3E5151", "#DECBA4"],
    ["#4A00E0", "#8E2DE2"],
    ["#FFB300", "#FF8C00"],
  ];

  const handleNextBackground = () => {
    setBgIndex((prev) => (prev + 1) % backgrounds.length);
  };

  const countLines = (text) => text.split("\n").length;

  const handleTextChange = (text) => {
    let finalText = text;
    const alerts = [];

    if (countLines(finalText) > 7) {
      finalText = finalText.split("\n").slice(0, 7).join("\n");
      alerts.push("Status cannot exceed 7 lines.");
    }

    if (finalText.length > 500) {
      finalText = finalText.substring(0, 500);
      alerts.push("Status cannot exceed 500 characters.");
    }

    setStatusText(finalText);

    if (alerts.length && finalText !== text) {
      Alert.alert("Limit exceeded", alerts.join("\n"));
    }
  };

  const postStatus = async () => {
    if (!statusText.trim()) {
      Alert.alert("Empty status", "Please type something to post.");
      return;
    }

    setLoading(true);
    try {
      const myContacts = await getAllContactsUniqueId();
      const payload = {
        pathakah_chinha: uniqueId,
        content: [
          {
            sandesha_prakara: "text",
            content: statusText,
            ukti: "",
            thumbnail: "",
            viewed_by: [],
          },
        ],
        all_contacts: myContacts,
        name: name || "",
        photo: photo || "",
      };
      const response = await axios.post(`${env.API_BASE_URL}/status/add-status`, payload);

      if (response?.status === 200) {
        // await socketService.connect(uniqueId);
        // socketService.channel.push("new_status", {
        //   pathakah_chinha: uniqueId,
        //   data: response.data.inserted,
        //   all_contacts: myContacts,
        // });

        setStatusText("");
        navigation.navigate("StatusScreen");
      } else {
        Alert.alert("Error", "Unable to post status.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to post status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={backgrounds[bgIndex]} style={styles.container}>

      {/* Keyboard-aware editor ONLY */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "position" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        style={styles.editorWrapper}
      >
        <TextInput
          value={statusText}
          onChangeText={handleTextChange}
          placeholder="Type a status"
          placeholderTextColor="#BDBDBD"
          style={styles.input}
          multiline
          textAlign="center"
          textAlignVertical="center"
        />

      </KeyboardAvoidingView>

      {/* Background switch (Aa) */}
      <TouchableOpacity style={styles.changeBtn} onPress={handleNextBackground}>
        <Text style={styles.changeText}>Aa</Text>
      </TouchableOpacity>

      {/* Post button */}
      <TouchableOpacity style={styles.saveBtn} onPress={() => postStatus()}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.postText}>➜</Text>
        )}
      </TouchableOpacity>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  editorWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  input: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "500",
    width: "100%",
  },

  changeBtn: {
    position: "absolute",
    right: 20,
    bottom: 200,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },

  changeText: {
    color: "#fff",
    fontSize: 22,
  },

  saveBtn: {
    position: "absolute",
    right: 20,
    bottom: 140,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#028BD3",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },

  postText: {
    color: "#fff",
    fontSize: 24,
  },
});
