import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

// Custom SweetAlert-like Modal Component
const CustomAlert = ({ visible, type, title, message, onConfirm, onCancel, showCancel = false }) => {
  const [scaleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 8,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, scaleAnim]);

  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle', color: '#10B981', backgroundColor: '#ECFDF5' };
      case 'error':
        return { name: 'close-circle', color: '#EF4444', backgroundColor: '#FEF2F2' };
      case 'warning':
        return { name: 'warning', color: '#F59E0B', backgroundColor: '#FFFBEB' };
      case 'info':
        return { name: 'information-circle', color: '#3B82F6', backgroundColor: '#EFF6FF' };
      default:
        return { name: 'information-circle', color: '#6B7280', backgroundColor: '#F9FAFB' };
    }
  };

  const iconConfig = getIconConfig();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.alertContainer, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.alertIconContainer, { backgroundColor: iconConfig.backgroundColor }]}>
            <Ionicons name={iconConfig.name} size={48} color={iconConfig.color} />
          </View>
          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>
          <View style={styles.alertButtonContainer}>
            {showCancel && (
              <TouchableOpacity style={styles.alertCancelButton} onPress={onCancel}>
                <Text style={styles.alertCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.alertConfirmButton, { backgroundColor: iconConfig.color }]}
              onPress={onConfirm}
            >
              <Text style={styles.alertConfirmButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const LoginScreen = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Alert state
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
    showCancel: false,
  });

  const showAlert = (config) => {
    setAlertConfig({
      visible: true,
      type: config.type || 'info',
      title: config.title || 'Alert',
      message: config.message || '',
      onConfirm: config.onConfirm || (() => hideAlert()),
      onCancel: config.onCancel || (() => hideAlert()),
      showCancel: config.showCancel || false,
    });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  }, [errors]);

  const validateForm = () => {
    const newErrors = {};
    const { email, password } = formData;
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Please enter a valid email';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
  if (!validateForm()) {
    showAlert({ type: 'error', title: 'Validation Error', message: 'Please fix the errors in the form.' });
    return;
  }

  setIsLoading(true);
  try {
    const response = await axios.post(
      'http://192.168.0.101:3000/api/users/login',
      { email: formData.email.trim().toLowerCase(), password: formData.password },
      { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
    );

    const { token, user } = response.data;
    if (!token) throw new Error('No token received from server');

    // Save token and user info
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('userId', user.id);
    await AsyncStorage.setItem('userEmail', user.email);

    // ✅ Log the token to verify it is stored
    const storedToken = await AsyncStorage.getItem('token');
    console.log('Token in storage:', storedToken);  // <-- check if it prints

    showAlert({
      type: 'success',
      title: 'Login Successful!',
      message: 'Welcome back! Redirecting to your dashboard...',
      onConfirm: () => {
        hideAlert();
        navigation.replace('HomeScreen');
      },
    });
    } catch (error) {
      console.error('Login error:', error);
      const serverMessage = error.response?.data?.error || error.response?.data?.message;
      if (serverMessage === 'Please verify your email first') {
        showAlert({
          type: 'warning',
          title: 'Email Verification Required',
          message: 'Your account needs to be verified. Go to verification page?',
          showCancel: true,
          onConfirm: () => {
            hideAlert();
            const userId = error.response?.data?.userId;
            navigation.navigate('Verify', { userId, email: formData.email.trim().toLowerCase(), fromLogin: true });
          },
          onCancel: () => hideAlert(),
        });
      } else if (serverMessage === 'Invalid email or password') {
        showAlert({ type: 'error', title: 'Login Failed', message: 'Incorrect email or password.' });
      } else if (error.response?.status === 404) {
        showAlert({ type: 'error', title: 'Account Not Found', message: 'No account found with this email.' });
      } else if (error.code === 'ECONNABORTED') {
        showAlert({ type: 'error', title: 'Timeout', message: 'Request timed out. Check your internet.' });
      } else {
        showAlert({ type: 'error', title: 'Network Error', message: 'Cannot connect to server.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => navigation.navigate('Register');

  const handleForgotPassword = () => showAlert({
    type: 'info',
    title: 'Forgot Password',
    message: 'Please contact the clinic to reset your password.',
  });

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image source={require('../assets/halili logo.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={styles.clinicName}>Halili's Dental Clinic</Text>
            <Text style={styles.tagline}>Sa Halili Ikaw Mapapangiti</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Welcome Back!</Text>
            <Text style={styles.subtitleText}>Sign in to your account</Text>

            <InputField
              label="Email"
              value={formData.email}
              onChangeText={value => handleInputChange('email', value)}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
            />

            <InputField
              label="Password"
              value={formData.password}
              onChangeText={value => handleInputChange('password', value)}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              error={errors.password}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
                </TouchableOpacity>
              }
            />

            <TouchableOpacity onPress={handleForgotPassword} disabled={isLoading}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <ActionButton
              title={isLoading ? 'Signing In...' : 'Sign In'}
              onPress={handleLogin}
              disabled={isLoading}
              loading={isLoading}
            />

            <View style={styles.registerSection}>
              <Text style={styles.registerPrompt}>Don't have an account?</Text>
              <TouchableOpacity onPress={handleRegister} disabled={isLoading}>
                <Text style={styles.registerButtonText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
        showCancel={alertConfig.showCancel}
      />
    </KeyboardAvoidingView>
  );
};

// Enhanced InputField Component
const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  style,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  error,
  rightIcon,
  maxLength,
}) => (
  <View style={[styles.inputWrapper, style]}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputContainer, error && styles.inputError]}>
      <TextInput
        style={[styles.input, rightIcon && styles.inputWithIcon]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(0, 0, 0, 0.4)"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        maxLength={maxLength}
      />
      {rightIcon}
    </View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

// Enhanced ActionButton Component
const ActionButton = ({
  title,
  onPress,
  style,
  textStyle,
  variant = 'primary',
  disabled = false,
  loading = false,
}) => {
  const buttonStyle = [
    variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
    disabled && styles.buttonDisabled,
    style,
  ];
  const buttonTextStyle = [
    variant === 'primary' ? styles.primaryButtonText : styles.secondaryButtonText,
    disabled && styles.buttonTextDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={buttonTextStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

// Styles (same as your original)
const styles = StyleSheet.create({
  keyboardView: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContainer: { flexGrow: 1, paddingBottom: 20 },
  container: { marginLeft: 'auto', marginRight: 'auto', maxWidth: 480, width: '100%', paddingTop: Platform.OS === 'ios' ? 80 : 60, paddingHorizontal: 20, alignItems: 'stretch' },
  header: { alignItems: 'center', marginBottom: 40 },
  logoContainer: { backgroundColor: '#fff', borderRadius: 50, padding: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  logo: { width: 80, height: 80 },
  clinicName: { fontSize: 28, fontWeight: '800', marginTop: 16, color: '#1a1a1a', fontFamily: 'Nunito', textAlign: 'center' },
  tagline: { fontSize: 14, fontWeight: '400', marginTop: 4, color: '#666', fontFamily: 'Nunito', textAlign: 'center' },
  formContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 },
  welcomeText: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 8, fontFamily: 'Nunito' },
  subtitleText: { fontSize: 16, fontWeight: '400', color: '#666', textAlign: 'center', marginBottom: 24, fontFamily: 'Nunito' },
  inputWrapper: { width: '100%', marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', fontFamily: 'Nunito', marginBottom: 8 },
  inputContainer: { borderRadius: 12, borderColor: '#e1e5e9', borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 16 : 12, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center' },
  inputError: { borderColor: '#ff4757', backgroundColor: '#fff5f5' },
  input: { flex: 1, fontSize: 16, fontWeight: '400', color: '#1a1a1a', fontFamily: 'Nunito', paddingVertical: 0 },
  inputWithIcon: { paddingRight: 8 },
  errorText: { fontSize: 12, color: '#ff4757', fontFamily: 'Nunito', marginTop: 4, marginLeft: 4 },
  forgotPasswordText: { fontSize: 14, fontWeight: '500', color: '#048E04', fontFamily: 'Nunito', marginTop: 8 },
  primaryButton: { backgroundColor: '#048E04', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', marginTop: 16, shadowColor: '#048E04', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: 'Nunito' },
  buttonDisabled: { backgroundColor: '#ccc', shadowOpacity: 0, elevation: 0 },
  buttonTextDisabled: { color: '#999' },
  registerSection: { alignItems: 'center', marginTop: 24 },
  registerPrompt: { fontSize: 14, fontWeight: '400', color: '#666', fontFamily: 'Nunito', marginBottom: 8 },
  registerButtonText: { fontSize: 16, fontWeight: '600', color: '#048E04', fontFamily: 'Nunito' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  alertContainer: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center', minWidth: screenWidth * 0.8, maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
  alertIconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  alertTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 12, fontFamily: 'Nunito' },
  alertMessage: { fontSize: 16, fontWeight: '400', color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 24, fontFamily: 'Nunito' },
  alertButtonContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, width: '100%' },
  alertConfirmButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, minWidth: 100, alignItems: 'center' },
  alertConfirmButtonText: { fontSize: 16, fontWeight: '600', color: '#fff', fontFamily: 'Nunito' },
  alertCancelButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: '#f1f5f9', minWidth: 100, alignItems: 'center' },
  alertCancelButtonText: { fontSize: 16, fontWeight: '600', color: '#64748b', fontFamily: 'Nunito' },
});

export default LoginScreen;
