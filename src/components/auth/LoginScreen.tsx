import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { supabase } from '../../backend/supabase/SupabaseService';

export function LoginScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('Login Failed', error.message);
      } else if (data.user) {
        console.log('User logged in:', data.user.email);
        navigation.navigate('Onboarding' as never);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'stimasense://auth/callback'
        }
      });

      if (error) {
        Alert.alert('Google Login Failed', error.message);
      } else {
        console.log('Google OAuth initiated');
        // The OAuth flow will handle the redirect
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Google login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      if (!email) {
        Alert.alert('Forgot Password', 'Enter your email above, then tap Forgot password again.');
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'stimasense://auth/callback',
      });
      if (error) {
        Alert.alert('Reset Failed', error.message);
      } else {
        Alert.alert('Check your email', 'We sent a password reset link.');
      }
    } catch (e: any) {
      Alert.alert('Reset Failed', e?.message || 'Unexpected error');
    }
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
    inputContainer: {
      marginBottom: 16,
    },
    inputWrapper: {
      position: 'relative',
    },
    input: {
      backgroundColor: colors.input,
      borderRadius: 8,
      paddingVertical: 12,
      paddingLeft: 44,
      paddingRight: 44,
      fontSize: 16,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 48,
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
    forgotPassword: {
      alignItems: 'center',
      marginBottom: 24,
    },
    forgotPasswordText: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
    signupContainer: {
      alignItems: 'center',
    },
    signupText: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
    signupLink: {
      fontSize: 14,
      color: colors.emergencyPrimary,
      fontWeight: '500',
    },
    googleIconContainer: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#4285F4', // Google's official blue color
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    googleIcon: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#ffffff',
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
          <Text style={styles.logoSubtext}>Stay ahead of power outages</Text>
        </View>

        <Card style={styles.card}>
          <CardHeader style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardDescription}>Sign in to your account</Text>
          </CardHeader>
          <CardContent>
            {/* Google Sign-In */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              activeOpacity={0.7}
            >
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIcon}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Separator */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>Or continue with</Text>
              <View style={styles.separatorLine} />
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
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
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
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
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

            {/* Sign In Button */}
            <LinearGradient
              colors={[colors.emergencyPrimary, colors.emergencySecondary]}
              style={styles.gradientButton}
            >
              <TouchableOpacity
                style={styles.gradientButtonInner}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.gradientButtonText}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </LinearGradient>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
            </TouchableOpacity>
          </CardContent>
        </Card>

        {/* Sign Up Link */}
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>
            Don't have an account?{' '}
            <TouchableOpacity onPress={() => navigation.navigate('Register' as never)}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}