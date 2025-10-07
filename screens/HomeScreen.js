import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const HomeScreen = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, completed: 0 });
  const [username, setUsername] = useState('');

  useEffect(() => {
    checkTokenAndFetch();
  }, []);

  // Check token first
  const checkTokenAndFetch = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('Token in storage:', token);

      if (!token) {
        Alert.alert('Session Expired', 'Please log in again.');
        navigation.replace('LoginScreen'); // Redirect to login
        return;
      }

      // Token exists, fetch appointments & user info
      requestNotificationPermissions();
      fetchAppointments(token);

    } catch (err) {
      console.error('Error checking token:', err);
      Alert.alert('Error', 'Something went wrong.');
      navigation.replace('LoginScreen');
    }
  };

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Enable notifications to receive appointment reminders');
    }
  };

  const fetchAppointments = async (token) => {
  try {
    // 1️⃣ Fetch all booked services
    const resAppointments = await axios.get("http://192.168.0.101:3000/api/booked-services", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = resAppointments.data || [];
    setAppointments(data);

    // 2️⃣ Filter upcoming appointments (not cancelled or completed)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = data.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate >= today && apt.status.toLowerCase() !== 'completed' && apt.status.toLowerCase() !== 'cancelled';
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    setUpcomingAppointments(upcoming);

    // 3️⃣ Calculate stats
    const stats = {
      total: data.length,
      pending: data.filter(a => a.status.toLowerCase() === 'pending').length,
      accepted: data.filter(a => a.status.toLowerCase() === 'accepted').length,
      completed: data.filter(a => a.status.toLowerCase() === 'completed').length,
    };
    setStats(stats);

    // 4️⃣ Fetch user profile (username)
    try {
      const resProfile = await axios.get("http://192.168.0.101:3000/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsername(resProfile.data.username || "User");
    } catch (profileErr) {
      console.warn("Failed to fetch profile, using fallback:", profileErr.message);
      const fallbackName = data[0]?.fullname || "User";
      setUsername(fallbackName);
    }

    // 5️⃣ Schedule notifications for valid times
    await Notifications.cancelAllScheduledNotificationsAsync();

    upcoming.forEach(async (apt) => {
      if (!apt.time || apt.time.toLowerCase() === "invalid date") return;

      const aptDateTime = new Date(`${apt.date}T${apt.time}`);
      const now = new Date();

      // 1 day before
      const oneDayBefore = new Date(aptDateTime.getTime() - 24 * 60 * 60 * 1000);
      if (oneDayBefore > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📅 Appointment Reminder',
            body: `Tomorrow: ${apt.serviceName} at ${apt.time}`,
            data: { appointmentId: apt._id },
          },
          trigger: oneDayBefore,
        });
      }

      // 1 hour before
      const oneHourBefore = new Date(aptDateTime.getTime() - 60 * 60 * 1000);
      if (oneHourBefore > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ Appointment Soon!',
            body: `${apt.serviceName} in 1 hour at ${apt.time}`,
            data: { appointmentId: apt._id },
          },
          trigger: oneHourBefore,
        });
      }
    });

  } catch (err) {
    console.error("❌ Failed to fetch appointments or username:", err.message);
    Alert.alert("Error", "Failed to load appointments or user info");
  } finally {
    setLoading(false);
  }
};


  const scheduleNotifications = async (appointments) => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    appointments.forEach(async (apt) => {
      const aptDateTime = new Date(`${apt.date}T${apt.time}`);
      const now = new Date();
      
      const oneDayBefore = new Date(aptDateTime.getTime() - 24 * 60 * 60 * 1000);
      if (oneDayBefore > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📅 Appointment Reminder',
            body: `Tomorrow: ${apt.serviceName} at ${apt.time}`,
            data: { appointmentId: apt._id },
          },
          trigger: oneDayBefore,
        });
      }
      
      const oneHourBefore = new Date(aptDateTime.getTime() - 60 * 60 * 1000);
      if (oneHourBefore > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ Appointment Soon!',
            body: `${apt.serviceName} in 1 hour at ${apt.time}`,
            data: { appointmentId: apt._id },
          },
          trigger: oneHourBefore,
        });
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'accepted': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'completed': return '#2196F3';
      case 'cancelled': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'accepted': return '✓';
      case 'pending': return '⏳';
      case 'completed': return '✓';
      case 'cancelled': return '✗';
      default: return '•';
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3BB5FC" />
        <Text>Loading appointments...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.clinicInfo}>
          <Image
            source={{ uri: "https://cdn.builder.io/api/v1/image/assets/TEMP/c1ab7d7c29094e060b889853d992af6bbe2eac47?apiKey=b83e627850f647aa94da00dc54b22383" }}
            style={styles.clinicLogo}
          />
          <Text style={styles.clinicName}>Halili's Dental Clinic</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileContainer}
          onPress={() => navigation.navigate('Profile')}
        >
          <Image
            source={{ uri: "https://cdn.builder.io/api/v1/image/assets/TEMP/710b09d5dcde3cacc180fc426a3bbdf2b55f80be?apiKey=b83e627850f647aa94da00dc54b22383" }}
            style={styles.profileImage}
          />
        </TouchableOpacity>
      </View>

      {/* Welcome */}
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>Hello {username || "User"}</Text>
      </View>
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitleText}>Let's Start A Day With a Smile</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
          <Text style={styles.statNumber}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
          <Text style={styles.statNumber}>{stats.accepted}</Text>
          <Text style={styles.statLabel}>Accepted</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}>
          <Text style={styles.statNumber}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('BookAppointment')}
        >
          <Text style={styles.actionIcon}>📅</Text>
          <Text style={styles.actionText}>Book</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('AllAppointments')}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Services')}
        >
          <Text style={styles.actionIcon}>🦷</Text>
          <Text style={styles.actionText}>Services</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('History')}
        >
          <Text style={styles.actionIcon}>📜</Text>
          <Text style={styles.actionText}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Next Appointments */}
      <View style={styles.appointmentsSection}>
        <View style={styles.appointmentsHeader}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AllAppointments')}>
            <Text style={styles.seeAllText}>See All →</Text>
          </TouchableOpacity>
        </View>

        {upcomingAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📅</Text>
            <Text style={styles.emptyStateText}>No upcoming appointments</Text>
            <TouchableOpacity 
              style={styles.bookNowButton}
              onPress={() => navigation.navigate('BookAppointment')}
            >
              <Text style={styles.bookNowText}>Book Appointment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          upcomingAppointments.slice(0, 3).map((appointment, index) => (
            <TouchableOpacity
              key={appointment._id}
              style={[styles.appointmentCard, index > 0 && styles.appointmentSpacing]}
              onPress={() => navigation.navigate('AppointmentDetails', { appointment })}
            >
              <View style={styles.appointmentIconContainer}>
                <Image
                  source={{ uri: "https://cdn.builder.io/api/v1/image/assets/TEMP/60ec4e1dde40618dc2249aa2fb17b66348d392b4?apiKey=b83e627850f647aa94da00dc54b22383" }}
                  style={styles.appointmentIcon}
                />
              </View>
              <View style={styles.appointmentInfo}>
                <Text style={styles.appointmentTitle}>{appointment.serviceName}</Text>
                <Text style={styles.appointmentDay}>
                  📅 {new Date(appointment.date).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })} at {appointment.time}
                </Text>
                <Text style={styles.appointmentDate}>
                  👤 Patient: {appointment.fullname}
                </Text>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
                    <Text style={styles.statusText}>
                      {getStatusIcon(appointment.status)} {appointment.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Tips Section */}
      <View style={styles.tipsSection}>
        <Text style={styles.sectionTitle}>Dental Care Tips 💡</Text>
        <View style={styles.tipCard}>
          <Text style={styles.tipText}>
            • Brush twice daily for 2 minutes{'\n'}
            • Floss at least once a day{'\n'}
            • Visit your dentist every 6 months{'\n'}
            • Limit sugary foods and drinks
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  headerContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  clinicInfo: { flexDirection: "row", alignItems: "center" },
  clinicLogo: { width: 30, height: 30, borderRadius: 15 },
  clinicName: { marginLeft: 10, fontWeight: "700" },
  profileContainer: {},
  profileImage: { width: 30, height: 30, borderRadius: 15 },
  welcomeContainer: { marginTop: 20 },
  welcomeText: { fontSize: 24, fontWeight: "700" },
  subtitleContainer: { marginTop: 5 },
  subtitleText: { fontSize: 14, color: "#666" },
  statsContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  statCard: { flex: 1, padding: 15, borderRadius: 12, marginHorizontal: 3, alignItems: "center" },
  statNumber: { fontSize: 24, fontWeight: "700", color: "#333" },
  statLabel: { fontSize: 12, color: "#666", marginTop: 5 },
  actionsContainer: { flexDirection: "row", justifyContent: "space-around", marginTop: 20, backgroundColor: "#f9f9f9", borderRadius: 15, padding: 15 },
  actionButton: { alignItems: "center" },
  actionIcon: { fontSize: 32, marginBottom: 5 },
  actionText: { fontSize: 12, fontWeight: "600", color: "#333" },
  appointmentsSection: { marginTop: 30 },
  appointmentsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  seeAllText: { fontSize: 14, color: "#3BB5FC", fontWeight: "600" },
  appointmentCard: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 15, 
    backgroundColor: "#fff", 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  appointmentSpacing: { marginTop: 10 },
  appointmentIconContainer: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: "#E3F2FD", 
    justifyContent: "center", 
    alignItems: "center",
    marginRight: 15 
  },
  appointmentIcon: { width: 30, height: 30 },
  appointmentInfo: { flex: 1 },
  appointmentTitle: { fontSize: 16, fontWeight: "700", marginBottom: 5 },
  appointmentDay: { fontSize: 13, color: "#555", marginBottom: 3 },
  appointmentDate: { fontSize: 13, color: "#666", marginBottom: 8 },
  statusContainer: { flexDirection: "row", alignItems: "center" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  emptyState: { alignItems: "center", marginTop: 40, marginBottom: 20 },
  emptyStateIcon: { fontSize: 64, marginBottom: 10 },
  emptyStateText: { fontSize: 16, color: "#999", marginBottom: 20 },
  bookNowButton: { backgroundColor: "#3BB5FC", paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  bookNowText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  tipsSection: { marginTop: 30, marginBottom: 30 },
  tipCard: { backgroundColor: "#FFF9E6", padding: 15, borderRadius: 12, marginTop: 10, borderLeftWidth: 4, borderLeftColor: "#FFD700" },
  tipText: { fontSize: 14, lineHeight: 24, color: "#333" },
});

export default HomeScreen;
