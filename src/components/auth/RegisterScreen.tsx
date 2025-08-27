import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { supabase } from '../../services/supabase/SupabaseService';

export function RegisterScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Create user account
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: `${formData.firstName} ${formData.lastName}`,
            first_name: formData.firstName,
            last_name: formData.lastName,
          }
        }
      });

      if (error) {
        Alert.alert('Registration Failed', error.message);
      } else if (data.user) {
        console.log('User registered:', data.user.email);
        Alert.alert(
          'Registration Successful', 
          'Please check your email to verify your account before logging in.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login' as never) }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'stimasense://auth/callback'
        }
      });

      if (error) {
        Alert.alert('Google Registration Failed', error.message);
      } else {
        console.log('Google OAuth initiated');
        // The OAuth flow will handle the redirect
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Google registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 32,
    },
    logoGradient: {
      width: 80,
      height: 80,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    logoText: {
      fontSize: 28,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 8,
    },
    logoSubtext: {
      fontSize: 16,
      color: colors.mutedForeground,
    },
    card: {
      marginBottom: 24,
    },
    cardHeader: {
      alignItems: 'center',
      paddingBottom: 16,
    },
    cardTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 8,
    },
    cardDescription: {
      fontSize: 16,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    googleButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    googleButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.foreground,
      marginLeft: 8,
    },
    separator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    separatorLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    separatorText: {
      fontSize: 12,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      paddingHorizontal: 16,
      backgroundColor: colors.background,
    },
    nameRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    nameInput: {
      flex: 1,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputWrapper: {
      position: 'relative',
    },
    input: {
      paddingLeft: 44,
      paddingRight: 44,
    },
    inputWithoutIcon: {
      paddingLeft: 16,
      paddingRight: 16,
    },
    inputIcon: {
      position: 'absolute',
      left: 12,
      top: 14,
    },
    passwordToggle: {
      position: 'absolute',
      right: 12,
      top: 14,
    },
    gradientButton: {
      borderRadius: 8,
      marginBottom: 16,
      minHeight: 48,
    },
    gradientButtonInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    gradientButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
    agreementText: {
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 24,
    },
    agreementLink: {
      color: colors.emergencyPrimary,
      fontWeight: '500',
    },
    loginContainer: {
      alignItems: 'center',
    },
    loginText: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
    loginLink: {
      fontSize: 14,
      color: colors.emergencyPrimary,
      fontWeight: '500',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Logo */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[colors.emergencyPrimary, colors.emergencySecondary]}
            style={styles.logoGradient}
          >
            <Icon name="zap" size={40} color="#ffffff" />
          </LinearGradient>
          <Text style={styles.logoText}>StimaSense</Text>
          <Text style={styles.logoSubtext}>Smart Power Monitoring</Text>
        </View>

        <Card style={styles.card}>
          <CardHeader style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Create Account</Text>
            <Text style={styles.cardDescription}>Join thousands of users monitoring power</Text>
          </CardHeader>
          <CardContent>
            {/* Google Sign-Up */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleRegister}
              activeOpacity={0.7}
            >
              <Icon name="chrome" size={20} color={colors.foreground} />
              <Text style={styles.googleButtonText}>Sign up with Google</Text>
            </TouchableOpacity>

            {/* Separator */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>Or create with email</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Name Inputs */}
            <View style={styles.nameRow}>
              <View style={styles.nameInput}>
                <Input
                  placeholder="First name"
                  value={formData.firstName}
                  onChangeText={(text) => updateFormData('firstName', text)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  style={styles.inputWithoutIcon}
                />
              </View>
              <View style={styles.nameInput}>
                <Input
                  placeholder="Last name"
                  value={formData.lastName}
                  onChangeText={(text) => updateFormData('lastName', text)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  style={styles.inputWithoutIcon}
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Icon
                  name="mail"
                  size={16}
                  color={colors.mutedForeground}
                  style={styles.inputIcon}
                />
                <Input
                  style={styles.input}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChangeText={(text) => updateFormData('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Icon
                  name="lock"
                  size={16}
                  color={colors.mutedForeground}
                  style={styles.inputIcon}
                />
                <Input
                  style={styles.input}
                  placeholder="Create password"
                  value={formData.password}
                  onChangeText={(text) => updateFormData('password', text)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Icon
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={16}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Icon
                  name="lock"
                  size={16}
                  color={colors.mutedForeground}
                  style={styles.inputIcon}
                />
                <Input
                  style={styles.input}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChangeText={(text) => updateFormData('confirmPassword', text)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Icon
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={16}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Create Account Button */}
            <LinearGradient
              colors={[colors.emergencyPrimary, colors.emergencySecondary]}
              style={styles.gradientButton}
            >
              <TouchableOpacity
                style={styles.gradientButtonInner}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.gradientButtonText}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </LinearGradient>

            {/* Agreement Text */}
            <Text style={styles.agreementText}>
              By creating an account, you agree to our{' '}
              <Text style={styles.agreementLink}>Terms of Service</Text> and{' '}
              <Text style={styles.agreementLink}>Privacy Policy</Text>
            </Text>
          </CardContent>
        </Card>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>
            Already have an account?{' '}
            <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
              <Text style={styles.loginLink}>Sign in</Text>
            </TouchableOpacity>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}