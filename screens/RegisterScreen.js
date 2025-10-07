import { Ionicons } from '@expo/vector-icons'; // or react-native-vector-icons
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
  View
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

const RegisterScreen = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const validateForm = () => {
    const newErrors = {};
    const { username, email, mobileNumber, password, confirmPassword } = formData;

    // Username validation
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Mobile number validation
    if (!mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
    } else if (mobileNumber.length < 10) {
      newErrors.mobileNumber = 'Mobile number must be at least 10 digits';
    } else if (mobileNumber.length > 15) {
      newErrors.mobileNumber = 'Mobile number cannot exceed 15 digits';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      showAlert({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fix the errors in the form before proceeding.',
      });
      return;
    }

    setIsLoading(true);
    const { username, email, mobileNumber, password } = formData;

    try {
      const response = await axios.post(
        'http://192.168.0.101:3000/api/users/register',
        {
          username: username.trim(),
          email: email.trim().toLowerCase(),
          mobileNumber: mobileNumber.trim(),
          password,
        },
        {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Registration successful:', response.data);

      if (response.data.userId) {
        showAlert({
          type: 'success',
          title: 'Registration Successful!',
          message: 'A verification email has been sent to your email address. Please check your inbox and follow the instructions to verify your account.',
          onConfirm: () => {
            hideAlert();
            navigation.navigate('Verify', { 
              userId: response.data.userId,
              email: email.trim().toLowerCase() 
            });
          },
        });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      let errorTitle = 'Registration Failed';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 409) {
        errorMessage = 'An account with this username or email already exists. Please use different credentials or sign in instead.';
        errorTitle = 'Account Already Exists';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'The request took too long to complete. Please check your internet connection and try again.';
        errorTitle = 'Connection Timeout';
      } else if (!error.response) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
        errorTitle = 'Network Error';
      }

      showAlert({
        type: 'error',
        title: errorTitle,
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/halili logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.clinicName}>Halili's Dental Clinic</Text>
            <Text style={styles.tagline}>Sa Halili Ikaw Mapapangiti</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <InputField
              label="Username"
              value={formData.username}
              onChangeText={(value) => handleInputChange('username', value)}
              placeholder="Enter username"
              error={errors.username}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <InputField
              label="Email"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
              style={styles.fieldSpacing}
            />

            <InputField
              label="Mobile Number"
              value={formData.mobileNumber}
              onChangeText={(value) => {
                const sanitizedValue = value.replace(/[^0-9]/g, '');
                if (sanitizedValue.length <= 15) {
                  handleInputChange('mobileNumber', sanitizedValue);
                }
              }}
              placeholder="Enter mobile number"
              keyboardType="numeric"
              error={errors.mobileNumber}
              style={styles.fieldSpacing}
              maxLength={15}
            />

            <InputField
              label="Password"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              placeholder="Enter password"
              secureTextEntry={!showPassword}
              error={errors.password}
              style={styles.fieldSpacing}
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              }
            />

            <InputField
              label="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange('confirmPassword', value)}
              placeholder="Confirm password"
              secureTextEntry={!showConfirmPassword}
              error={errors.confirmPassword}
              style={styles.fieldSpacing}
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              }
            />

            <ActionButton
              title={isLoading ? 'Creating Account...' : 'Register'}
              onPress={handleRegister}
              variant="primary"
              style={styles.registerButton}
              disabled={isLoading}
              loading={isLoading}
            />

            <View style={styles.loginSection}>
              <Text style={styles.loginPrompt}>Already have an account?</Text>
              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                style={styles.loginButton}
              >
                <Text style={styles.loginButtonText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Custom Alert Modal */}
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

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    marginLeft: 'auto',
    marginRight: 'auto',
    maxWidth: 480,
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    alignItems: 'stretch',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    backgroundColor: '#fff',
    borderRadius: 50,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logo: {
    width: 80,
    height: 80,
  },
  clinicName: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 16,
    color: '#1a1a1a',
    fontFamily: 'Nunito',
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
    color: '#666',
    fontFamily: 'Nunito',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    fontFamily: 'Nunito',
    marginBottom: 8,
  },
  inputContainer: {
    borderRadius: 12,
    borderColor: '#e1e5e9',
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputError: {
    borderColor: '#ff4757',
    backgroundColor: '#fff5f5',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: '#1a1a1a',
    fontFamily: 'Nunito',
    paddingVertical: 0,
  },
  inputWithIcon: {
    paddingRight: 8,
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ff4757',
    fontFamily: 'Nunito',
    marginTop: 4,
    marginLeft: 4,
  },
  fieldSpacing: {
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: '#048E04',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#048E04',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Nunito',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonTextDisabled: {
    color: '#999',
  },
  loginSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  loginPrompt: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
    fontFamily: 'Nunito',
    marginBottom: 8,
  },
  loginButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#048E04',
    fontFamily: 'Nunito',
  },
  // Custom Alert Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  alertContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    minWidth: screenWidth * 0.8,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  alertIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Nunito',
  },
  alertMessage: {
    fontSize: 16,
    fontWeight: '400',
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    fontFamily: 'Nunito',
  },
  alertButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  alertConfirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  alertConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Nunito',
  },
  alertCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    minWidth: 100,
    alignItems: 'center',
  },
  alertCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Nunito',
  },
});

export default RegisterScreen;