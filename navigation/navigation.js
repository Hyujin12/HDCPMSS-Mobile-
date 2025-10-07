import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import AboutScreen from '../screens/AboutScreen';
import HomeScreen from '../screens/HomeScreen';
import LogInScreen from '../screens/index'; // double-check if this should be "LoginScreen.js"
import RegScreen from '../screens/RegisterScreen';
import VerifyScreen from '../screens/VerifyScreen';

import AllAppointmentsScreen from '../screens/AllAppointmentsScreen';
import AppointmentDetailsScreen from '../screens/AppointmentDetailsScreen';
import BookAppointmentScreen from '../screens/BookAppointmentScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ServicesScreen from '../screens/ServicesScreen';

const Stack = createStackNavigator();

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Register"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Register" component={RegScreen} />
        <Stack.Screen name="Login" component={LogInScreen} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen name="Verify" component={VerifyScreen} />

        {/* Needed screens for HomeScreen */}
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
        <Stack.Screen name="AllAppointments" component={AllAppointmentsScreen} />
        <Stack.Screen name="Services" component={ServicesScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="AppointmentDetails" component={AppointmentDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
