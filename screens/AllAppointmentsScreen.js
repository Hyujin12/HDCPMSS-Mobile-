import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";

export default function AllAppointmentsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");

  const navigation = useNavigation();

  const BASE_URL = "https://hdcpmss-mobile-1.onrender.com";
  const API_URL = `${BASE_URL}/api/booked-services`;
  const USER_URL = `${BASE_URL}/api/users/profile`;

  // Fetch logged-in user info and bookings
  useEffect(() => {
    const fetchUserAndBookings = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }

        const userRes = await axios.get(USER_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const bookingsRes = await axios.get(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setBookings(bookingsRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        Alert.alert("Error", "Could not fetch data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndBookings();
  }, []);

  const renderStatus = (status) => {
    let color = "#fbbf24";
    if (status === "accepted") color = "#22c55e";
    else if (status === "Completed") color = "#3b82f6";
    else if (status === "cancelled") color = "#ef4444";

    return (
      <View style={[styles.statusBadge, { backgroundColor: color }]}>
        <Text style={styles.statusText}>{status.toUpperCase()}</Text>
      </View>
    );
  };

  const handleEdit = (booking) => {
    setSelectedBooking(booking);
    setSelectedDate(booking.date);
    setPhone(booking.phone || "");
    setDescription(booking.description || "");

    if (booking.time) {
      const [timePart, ampm] = booking.time.split(" ");
      const [hoursStr, minutesStr] = timePart.split(":");
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      setSelectedTime(date);
    } else {
      setSelectedTime(new Date());
    }

    setEditModalVisible(true);
  };

  const handleSaveChanges = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return Alert.alert("Unauthorized", "Please log in again.");

      let hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const minutesStr = minutes < 10 ? "0" + minutes : minutes;
      const timeString = `${hours}:${minutesStr} ${ampm}`;

      await axios.put(
        `${API_URL}/${selectedBooking._id}`,
        { date: selectedDate, time: timeString, phone, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("✅ Success", "Appointment updated successfully!");
      setEditModalVisible(false);

      setBookings((prev) =>
        prev.map((b) =>
          b._id === selectedBooking._id
            ? { ...b, date: selectedDate, time: timeString, phone, description }
            : b
        )
      );
    } catch (error) {
      console.error("Error updating booking:", error);
      Alert.alert("Error", "Could not update booking.");
    }
  };

  const handleCancel = async (id) => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this appointment?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              if (!token) return Alert.alert("Unauthorized", "Please log in again.");

              await axios.put(
                `${API_URL}/${id}`,
                { status: "cancelled" },
                { headers: { Authorization: `Bearer ${token}` } }
              );

              Alert.alert("✅ Cancelled", "Your booking has been cancelled.");
              setBookings((prev) =>
                prev.map((b) => (b._id === id ? { ...b, status: "cancelled" } : b))
              );
            } catch (error) {
              console.error("Error cancelling booking:", error);
              Alert.alert("Error", "Could not cancel booking.");
            }
          },
        },
      ]
    );
  };

  if (loading)
    return <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />;

  if (bookings.length === 0)
    return (
      <View style={styles.empty}>
        <Text style={{ color: "#64748b" }}>No bookings found.</Text>
      </View>
    );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.serviceName}</Text>
            <Text style={styles.detail}>📅 Date: {item.date}</Text>
            <Text style={styles.detail}>⏰ Time: {item.time}</Text>
            <Text style={styles.detail}>👤 Patient: {item.fullname}</Text>
            <Text style={styles.detail}>📞 {item.phone}</Text>
            <Text style={styles.detail}>✉️ {item.email}</Text>
            <Text style={styles.detail}>📝 {item.description || "No notes"}</Text>
            {renderStatus(item.status)}

            {/* ✅ Buttons based on status */}
            {item.status === "Completed" ? (
              <TouchableOpacity
                style={styles.receiptBtn}
                onPress={() => navigation.navigate("Receipt", { booking: item })}
              >
                <Text style={styles.btnText}>View Receipt</Text>
              </TouchableOpacity>
            ) : item.status !== "cancelled" ? (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)}>
                  <Text style={styles.btnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item._id)}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      />

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Appointment</Text>

            <TextInput style={styles.input} value={selectedBooking?.fullname} editable={false} />
            <TextInput style={styles.input} value={selectedBooking?.email} editable={false} keyboardType="email-address" />

            <Calendar
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={{ [selectedDate]: { selected: true, selectedColor: "#3b82f6" } }}
            />

            <TouchableOpacity style={styles.timeBtn} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.timeText}>
                ⏰ {selectedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="default"
                onChange={(event, time) => {
                  setShowTimePicker(false);
                  if (time) setSelectedTime(time);
                }}
              />
            )}

            <TextInput
              placeholder="Contact number"
              style={styles.input}
              value={phone}
              keyboardType="phone-pad"
              onChangeText={setPhone}
            />

            <TextInput
              placeholder="Add a note or description..."
              style={[styles.input, { minHeight: 60 }]}
              multiline
              value={description}
              onChangeText={setDescription}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveChanges}>
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.btnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, backgroundColor: "#f8fafc" },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12, elevation: 3, shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 } },
  title: { fontWeight: "bold", fontSize: 18, marginBottom: 4, color: "#1e3a8a" },
  detail: { color: "#334155", fontSize: 14, marginVertical: 1 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
  statusText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  actions: { flexDirection: "row", marginTop: 10, gap: 10 },
  editBtn: { backgroundColor: "#3b82f6", padding: 8, borderRadius: 6, flex: 1 },
  cancelBtn: { backgroundColor: "#ef4444", padding: 8, borderRadius: 6, flex: 1 },
  receiptBtn: { backgroundColor: "#0ea5e9", padding: 10, borderRadius: 8, marginTop: 10 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContainer: { backgroundColor: "#fff", borderRadius: 12, padding: 16, width: "90%", elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 8, textAlignVertical: "top", marginTop: 10 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  saveBtn: { backgroundColor: "#22c55e", padding: 10, borderRadius: 8, flex: 1, marginRight: 6 },
  closeBtn: { backgroundColor: "#94a3b8", padding: 10, borderRadius: 8, flex: 1, marginLeft: 6 },
  timeBtn: { backgroundColor: "#e2e8f0", padding: 10, borderRadius: 8, marginTop: 10, alignItems: "center" },
  timeText: { fontWeight: "500", color: "#1e3a8a" },
});
