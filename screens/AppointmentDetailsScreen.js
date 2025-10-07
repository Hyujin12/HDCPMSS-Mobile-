// screens/AppointmentDetailsScreen.js
import { Text, View } from 'react-native';

export default function AppointmentDetailsScreen({ route }) {
  const { appointment } = route.params || {};
  return (
    <View>
      <Text>Appointment Details</Text>
      {appointment && (
        <>
          <Text>Service: {appointment.serviceName}</Text>
          <Text>Date: {appointment.date}</Text>
          <Text>Time: {appointment.time}</Text>
          <Text>Patient: {appointment.fullname}</Text>
          <Text>Status: {appointment.status}</Text>
        </>
      )}
    </View>
  );
}
