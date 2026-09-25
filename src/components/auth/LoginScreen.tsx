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
import { logger } from '../../observability/logger';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { createAuthStyles } from '../shared/authStyles';
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
        logger.info('auth.login_succeeded');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      logger.error('auth.login_failed', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'stimasense://auth/callback'
        }
      });

      if (error) {
        Alert.alert('Google Login Failed', error.message);
      } else {
        logger.info('auth.google_oauth_started');
        // The OAuth flow will handle the redirect
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      logger.error('auth.google_login_failed', error);
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

  const styles = {
    ...createAuthStyles(colors),
    ...StyleSheet.create({
      cardDescription: {
        fontSize: 16,
        color: colors.mutedForeground,
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
    }),
  };

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
