// screens/VerifyScreen.js
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const VerifyScreen = () => {
  const [code, setCode] = useState('');
  const navigation = useNavigation();
  const route = useRoute();
  const { userId } = route.params;

  const handleVerify = async () => {
  if (!code || code.length !== 6) {
    Alert.alert('Invalid Code', 'Please enter a valid 6-digit code.');
    return;
  }

  try {
    const res = await axios.post('https://hdcpmss-mobile-1.onrender.com/api/users/verify', {
      userId,
      code,
    });

    Alert.alert('Success', res.data.message);
    navigation.navigate('Login');
  } catch (error) {
    console.error(error.response?.data || error.message);
    Alert.alert('Error', error.response?.data?.message || 'Verification failed');
  }
};


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.instructions}>
        Enter the 6-digit verification code sent to your email.
      </Text>

      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="Enter code"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />

      <TouchableOpacity style={styles.button} onPress={handleVerify}>
        <Text style={styles.buttonText}>Verify</Text>
      </TouchableOpacity>
    </View>
  );
};

export default VerifyScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  instructions: { fontSize: 16, marginBottom: 20, textAlign: 'center' },
  input: {
    width: '60%',
    borderBottomWidth: 1,
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    width: '60%',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16 },
});
