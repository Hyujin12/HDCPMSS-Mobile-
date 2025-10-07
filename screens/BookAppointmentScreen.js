import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const services = [
  { title: "Dental Checkup", image: require("../assets/images/dental check up.jpg"), description: "A dental checkup is a routine examination that helps identify any potential dental issues early on." },
  { title: "Dental Extraction", image: require("../assets/images/dental extraction.jpg"), description: "Dental extraction is a surgical procedure to remove a tooth from the mouth." },
  { title: "Dental Restoration", image: require("../assets/images/dental restoration.jpg"), description: "Dental restoration restores a tooth’s original shape, function, and appearance." },
  { title: "Dental Surgery", image: require("../assets/images/dental surgery.jpg"), description: "Dental surgery involves procedures like extractions, gum surgeries, and jaw corrections." },
  { title: "Oral Prophylaxis", image: require("../assets/images/oral prophylaxis.jpg"), description: "Oral prophylaxis is a preventive dental cleaning to remove plaque, tartar, and stains." },
  { title: "Orthodontics", image: require("../assets/images/orthodontics.jpg"), description: "Orthodontics involves braces or aligners to straighten teeth and fix bite issues." },
  { title: "Prosthodontics", image: require("../assets/images/prosthodontics.jpg"), description: "Prosthodontics replaces missing teeth with crowns, bridges, dentures, or implants." },
];

const ServicesScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  // Booking form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [description, setDescription] = useState("");

  // Logged-in user info
  const [user, setUser] = useState({ username: "", email: "" });

  // Date & time pickers
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await axios.get("http://192.168.0.101:3000/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser({ username: res.data.username, email: res.data.email });
      setUsername(res.data.username);
      setEmail(res.data.email);
    } catch (err) {
      console.error("Failed to fetch user:", err.message);
    }
  };

  const openModal = (service) => {
    setSelectedService(service);
    setModalVisible(true);
  };

  const submitBooking = async () => {
    if (!phoneNumber) {
      Alert.alert("Error", "Please fill the phone number.");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");

      await axios.post(
        "http://192.168.0.101:3000/api/booked-services",
        {
          serviceName: selectedService.title,
          fullname: username,
          email,
          phone: phoneNumber,
          description,
          date: date.toISOString().split("T")[0],
          time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        { headers: { Authorization: token ? `Bearer ${token}` : "" } }
      );

      Alert.alert("Success", "Your service has been booked!");
      setModalVisible(false);
      setPhoneNumber("");
      setDescription("");
    } catch (err) {
      console.error("Booking Error:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to book service.");
    }
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === "ios");
    setDate(currentDate);
  };

  const onChangeTime = (event, selectedTime) => {
    const currentTime = selectedTime || date;
    setShowTimePicker(Platform.OS === "ios");
    setDate(currentTime);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={item.image} style={styles.image} />
      <View style={styles.cardContent}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
        <TouchableOpacity style={styles.button} onPress={() => openModal(item)}>
          <Text style={styles.buttonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc", padding: 10 }}>
      <FlatList
        data={services}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
      />

      {/* Booking Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <ScrollView contentContainerStyle={styles.modalContainer}>
          <Text style={styles.modalTitle}>Book: {selectedService?.title}</Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={username}
            editable={false} // readonly
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            editable={false} // readonly
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />

          {/* Date Picker */}
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text>📅 Date: {date.toISOString().split("T")[0]}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker value={date} mode="date" display="calendar" onChange={onChangeDate} />
          )}

          {/* Time Picker */}
          <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker(true)}>
            <Text>
              ⏰ Time: {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker value={date} mode="time" is24Hour={false} display="clock" onChange={onChangeTime} />
          )}

          <TextInput
            style={styles.input}
            placeholder="Additional Notes (optional)"
            value={description}
            onChangeText={setDescription}
          />

          <Button title="Submit Booking" onPress={submitBooking} />
          <Button title="Cancel" color="red" onPress={() => setModalVisible(false)} />
        </ScrollView>
      </Modal>
    </View>
  );
};

export default ServicesScreen;

const styles = StyleSheet.create({
  card: { backgroundColor: "#e0f2fe", borderRadius: 15, marginVertical: 10, padding: 10, flexDirection: "row", gap: 10 },
  image: { width: 100, height: 100, borderRadius: 12 },
  cardContent: { flex: 1, justifyContent: "space-between" },
  title: { fontSize: 18, fontWeight: "bold", color: "#1e3a8a" },
  description: { color: "#334155", marginVertical: 5 },
  button: { backgroundColor: "#3b82f6", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, alignSelf: "flex-start" },
  buttonText: { color: "#fff", fontWeight: "bold" },
  modalContainer: { flexGrow: 1, justifyContent: "center", padding: 20, backgroundColor: "#fff" },
  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 15, color: "#1e40af" },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, padding: 12, marginBottom: 15 },
});
