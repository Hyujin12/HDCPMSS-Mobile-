import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// -------------------------
// Notification handler
// -------------------------
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// -------------------------
// Backend BASE_URL
// -------------------------
const BASE_URL = 'https://hdcpmss-mobile-1.onrender.com';

const HomeScreen = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, completed: 0 });
  const [username, setUsername] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    checkTokenAndFetch();
  }, []);

  // -------------------------
  // Check token & fetch data
  // -------------------------
  const checkTokenAndFetch = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('✅ Retrieved token:', token);

      if (!token) {
        Alert.alert('Session Expired', 'Please log in again.');
        navigation.replace('LoginScreen');
        return;
      }

      await requestNotificationPermissions();
      await fetchAppointments(token);
    } catch (err) {
      console.error('❌ Error in checkTokenAndFetch:', err);
      Alert.alert('Error', 'Something went wrong.');
      navigation.replace('LoginScreen');
    }
  };

  // -------------------------
  // Notification permission
  // -------------------------
  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Enable notifications to receive appointment reminders');
    }
  };

  // -------------------------
  // Generate notifications based on appointments
  // -------------------------
  const generateNotifications = (appointments) => {
    const now = new Date();
    const notifs = [];

    appointments.forEach((apt) => {
      const aptDateTime = new Date(`${apt.date}T${apt.time}`);
      const timeDiff = aptDateTime - now;
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Status change notifications
      if (apt.status.toLowerCase() === 'accepted') {
        notifs.push({
          id: `${apt._id}-accepted`,
          type: 'accepted',
          title: '✅ Appointment Accepted',
          message: `Your appointment for ${apt.serviceName} on ${new Date(apt.date).toLocaleDateString()} at ${apt.time} has been accepted.`,
          time: new Date(apt.updatedAt || apt.createdAt),
          appointmentId: apt._id,
          read: false,
        });
      }

      if (apt.status.toLowerCase() === 'cancelled') {
        notifs.push({
          id: `${apt._id}-cancelled`,
          type: 'cancelled',
          title: '❌ Appointment Cancelled',
          message: `Your appointment for ${apt.serviceName} on ${new Date(apt.date).toLocaleDateString()} has been cancelled.`,
          time: new Date(apt.updatedAt || apt.createdAt),
          appointmentId: apt._id,
          read: false,
        });
      }

      if (apt.status.toLowerCase() === 'rescheduled') {
        notifs.push({
          id: `${apt._id}-rescheduled`,
          type: 'rescheduled',
          title: '🔄 Appointment Rescheduled',
          message: `Your appointment for ${apt.serviceName} has been rescheduled to ${new Date(apt.date).toLocaleDateString()} at ${apt.time}.`,
          time: new Date(apt.updatedAt || apt.createdAt),
          appointmentId: apt._id,
          read: false,
        });
      }

      if (apt.status.toLowerCase() === 'completed') {
        notifs.push({
          id: `${apt._id}-completed`,
          type: 'completed',
          title: '✅ Appointment Completed',
          message: `Your appointment for ${apt.serviceName} has been completed. Tap to view receipt.`,
          time: new Date(apt.updatedAt || apt.createdAt),
          appointmentId: apt._id,
          read: false,
          navigateTo: 'Receipt',
        });
      }

      // Today's appointment
      if (hoursDiff >= 0 && hoursDiff <= 24 && hoursDiff > 1) {
        notifs.push({
          id: `${apt._id}-today`,
          type: 'today',
          title: '📅 Appointment Today',
          message: `You have an appointment for ${apt.serviceName} today at ${apt.time}.`,
          time: new Date(),
          appointmentId: apt._id,
          read: false,
        });
      }

      // 1 hour before
      if (hoursDiff > 0 && hoursDiff <= 1) {
        notifs.push({
          id: `${apt._id}-soon`,
          type: 'soon',
          title: '⏰ Appointment in 1 Hour',
          message: `Your appointment for ${apt.serviceName} is in less than 1 hour at ${apt.time}.`,
          time: new Date(),
          appointmentId: apt._id,
          read: false,
        });
      }

      // Missed appointment
      if (hoursDiff < 0 && hoursDiff > -24 && apt.status.toLowerCase() !== 'completed' && apt.status.toLowerCase() !== 'cancelled') {
        notifs.push({
          id: `${apt._id}-missed`,
          type: 'missed',
          title: '⚠️ Missed Appointment',
          message: `You missed your appointment for ${apt.serviceName} scheduled at ${apt.time} on ${new Date(apt.date).toLocaleDateString()}.`,
          time: new Date(),
          appointmentId: apt._id,
          read: false,
        });
      }
    });

    // Sort by time (newest first)
    notifs.sort((a, b) => b.time - a.time);

    setNotifications(notifs);
    setUnreadCount(notifs.filter(n => !n.read).length);
  };

  // -------------------------
  // Fetch appointments & user info
  // -------------------------
  const fetchAppointments = async (token) => {
    try {
      console.log('🔹 Sending GET request to:', `${BASE_URL}/api/booked-services`);
      console.log('🔹 Request headers:', { Authorization: `Bearer ${token}` });

      const resAppointments = await axios.get(`${BASE_URL}/api/booked-services`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });

      console.log('✅ Appointments response:', resAppointments.data);
      const data = resAppointments.data || [];
      setAppointments(data);

      // Filter upcoming appointments
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcoming = data
        .filter((apt) => {
          const aptDateTime = new Date(`${apt.date}T${apt.time}`);
          return aptDateTime >= today && !['completed', 'cancelled'].includes(apt.status.toLowerCase());
        })
        .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

      setUpcomingAppointments(upcoming);

      // Calculate stats
      const stats = {
        total: data.length,
        pending: data.filter((a) => a.status.toLowerCase() === 'pending').length,
        accepted: data.filter((a) => a.status.toLowerCase() === 'accepted').length,
        completed: data.filter((a) => a.status.toLowerCase() === 'completed').length,
      };
      setStats(stats);

      // Fetch user profile
      try {
        console.log('🔹 Fetching user profile...');
        const resProfile = await axios.get(`${BASE_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });
        console.log('✅ Profile response:', resProfile.data);
        setUsername(resProfile.data.username || 'User');
      } catch (errProfile) {
        console.warn('⚠️ Could not fetch profile, using fallback name:', errProfile.message);
        const fallbackName = data[0]?.fullname || 'User';
        setUsername(fallbackName);
      }

      // Generate notifications
      generateNotifications(data);

      // Schedule notifications
      scheduleNotifications(upcoming);
    } catch (err) {
      if (err.response) {
        console.error('❌ Axios response error:', err.response.status, err.response.data);
      } else if (err.request) {
        console.error('❌ Axios no response:', err.request);
      } else {
        console.error('❌ Axios setup error:', err.message);
      }

      Alert.alert('Error', 'Failed to load appointments or user info');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Schedule notifications
  // -------------------------
  const scheduleNotifications = async (appointments) => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    appointments.forEach(async (apt) => {
      if (!apt.time) return;

      const aptDateTime = new Date(`${apt.date}T${apt.time}`);
      if (isNaN(aptDateTime.getTime())) return;

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

  // -------------------------
  // Mark notification as read
  // -------------------------
  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // -------------------------
  // Mark all as read
  // -------------------------
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // -------------------------
  // UI helpers
  // -------------------------
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

  const getNotificationColor = (type) => {
    switch (type) {
      case 'accepted': return '#E8F5E9';
      case 'cancelled': return '#FFEBEE';
      case 'rescheduled': return '#FFF3E0';
      case 'completed': return '#E1F5FE';
      case 'today': return '#E3F2FD';
      case 'soon': return '#FFF9C4';
      case 'missed': return '#FFEBEE';
      default: return '#F5F5F5';
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3BB5FC" />
        <Text>Loading appointments...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.clinicInfo}>
            <Image
              source={{ uri: 'https://cdn.builder.io/api/v1/image/assets/TEMP/c1ab7d7c29094e060b889853d992af6bbe2eac47?apiKey=b83e627850f647aa94da00dc54b22383' }}
              style={styles.clinicLogo}
            />
            <Text style={styles.clinicName}>Halili's Dental Clinic</Text>
          </View>
          <View style={styles.headerRight}>
            {/* Notification Bell */}
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => setShowNotifications(true)}
            >
              <Text style={styles.bellIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.profileContainer} onPress={() => navigation.navigate('Profile')}>
              <Image
                source={{ uri: 'https://cdn.builder.io/api/v1/image/assets/TEMP/710b09d5dcde3cacc180fc426a3bbdf2b55f80be?apiKey=b83e627850f647aa94da00dc54b22383' }}
                style={styles.profileImage}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Welcome */}
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Hello {username || 'User'}</Text>
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
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('BookAppointment')}>
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionText}>Book</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AllAppointments')}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Services')}>
            <Text style={styles.actionIcon}>🦷</Text>
            <Text style={styles.actionText}>Services</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('History')}>
            <Text style={styles.actionIcon}>📜</Text>
            <Text style={styles.actionText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Appointments */}
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
              <TouchableOpacity style={styles.bookNowButton} onPress={() => navigation.navigate('BookAppointment')}>
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
                    source={{ uri: 'https://cdn.builder.io/api/v1/image/assets/TEMP/60ec4e1dde40618dc2249aa2fb17b66348d392b4?apiKey=b83e627850f647aa94da00dc54b22383' }}
                    style={styles.appointmentIcon}
                  />
                </View>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.appointmentTitle}>{appointment.serviceName}</Text>
                  <Text style={styles.appointmentDay}>
                    📅 {new Date(appointment.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    at {appointment.time}
                  </Text>
                  <Text style={styles.appointmentDate}>👤 Patient: {appointment.fullname}</Text>
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

      {/* Notification Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <View style={styles.modalHeaderRight}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
                    <Text style={styles.markAllText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotifications(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.notificationList}>
              {notifications.length === 0 ? (
                <View style={styles.emptyNotifications}>
                  <Text style={styles.emptyNotificationsIcon}>🔔</Text>
                  <Text style={styles.emptyNotificationsText}>No notifications yet</Text>
                </View>
              ) : (
                notifications.map((notif) => (
                  <TouchableOpacity
                    key={notif.id}
                    style={[
                      styles.notificationItem,
                      { backgroundColor: notif.read ? '#fff' : getNotificationColor(notif.type) }
                    ]}
                    onPress={() => {
                      markAsRead(notif.id);
                      const appointment = appointments.find(a => a._id === notif.appointmentId);
                      setShowNotifications(false);
                      
                      if (notif.navigateTo === 'Receipt') {
                        // Navigate to Receipt screen
                        navigation.navigate('Receipt', { appointment });
                      } else if (appointment) {
                        // Navigate to Appointment Details
                        navigation.navigate('AppointmentDetails', { appointment });
                      }
                    }}
                  >
                    {!notif.read && <View style={styles.unreadDot} />}
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationTitle}>{notif.title}</Text>
                      <Text style={styles.notificationMessage}>{notif.message}</Text>
                      <Text style={styles.notificationTime}>
                        {notif.time.toLocaleDateString()} {notif.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  clinicInfo: { flexDirection: 'row', alignItems: 'center' },
  clinicLogo: { width: 30, height: 30, borderRadius: 15 },
  clinicName: { marginLeft: 10, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  notificationButton: { position: 'relative', padding: 5 },
  bellIcon: { fontSize: 24 },
  badge: { 
    position: 'absolute', 
    top: 0, 
    right: 0, 
    backgroundColor: '#FF3B30', 
    borderRadius: 10, 
    minWidth: 20, 
    height: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  profileContainer: {},
  profileImage: { width: 30, height: 30, borderRadius: 15 },
  welcomeContainer: { marginTop: 20 },
  welcomeText: { fontSize: 24, fontWeight: '700' },
  subtitleContainer: { marginTop: 5 },
  subtitleText: { fontSize: 14, color: '#666' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  statCard: { flex: 1, padding: 15, borderRadius: 12, marginHorizontal: 3, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '700', color: '#333' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 5 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, backgroundColor: '#f9f9f9', borderRadius: 15, padding: 15 },
  actionButton: { alignItems: 'center' },
  actionIcon: { fontSize: 32, marginBottom: 5 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#333' },
  appointmentsSection: { marginTop: 30 },
  appointmentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  seeAllText: { fontSize: 14, color: '#3BB5FC', fontWeight: '600' },
  appointmentCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    backgroundColor: '#fff', 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 10,
    shadowColor: '#000',
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
    backgroundColor: '#E3F2FD', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 15 
  },
  appointmentIcon: { width: 30, height: 30 },
  appointmentInfo: { flex: 1 },
  appointmentTitle: { fontSize: 16, fontWeight: '700', marginBottom: 5 },
  appointmentDay: { fontSize: 13, color: '#555', marginBottom: 3 },
  appointmentDate: { fontSize: 13, color: '#666', marginBottom: 8 },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  emptyState: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
  emptyStateIcon: { fontSize: 64, marginBottom: 10 },
  emptyStateText: { fontSize: 16, color: '#999', marginBottom: 20 },
  bookNowButton: { backgroundColor: '#3BB5FC', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  bookNowText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  tipsSection: { marginTop: 30, marginBottom: 30 },
  tipCard: { backgroundColor: '#FFF9E6', padding: 15, borderRadius: 12, marginTop: 10, borderLeftWidth: 4, borderLeftColor: '#FFD700' },
  tipText: { fontSize: 14, lineHeight: 24, color: '#333' },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  markAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  markAllText: {
    color: '#3BB5FC',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    fontWeight: '400',
  },
  notificationList: {
    padding: 10,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3BB5FC',
    marginRight: 10,
    marginTop: 5,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
    color: '#333',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyNotifications: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyNotificationsIcon: {
    fontSize: 64,
    marginBottom: 10,
  },
  emptyNotificationsText: {
    fontSize: 16,
    color: '#999',
  },
});
export default HomeScreen;