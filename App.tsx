import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import * as Sentry from '@sentry/react-native';

import { LoginScreen } from './src/components/auth/LoginScreen';
import { RegisterScreen } from './src/components/auth/RegisterScreen';
import { OnboardingScreens } from './src/components/onboarding/OnboardingScreens';
import { AnalyticsScreen } from './src/components/screens/AnalyticsScreen';
import AlertsScreen from './src/components/screens/AlertsScreen';
import { DashboardScreen } from './src/components/screens/DashboardScreen';
import { MapScreen } from './src/components/screens/MapScreen';
import ProfileScreen from './src/components/screens/ProfileScreen';
import ReportOutageScreen from './src/components/screens/ReportOutageScreen';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { supabase } from './src/backend/supabase/SupabaseService';
import { logger } from './src/observability/logger';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const AuthStack = createStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Dashboard: 'home', Map: 'map', Analytics: 'bar-chart-2', Alerts: 'bell', Profile: 'user',
          };
          return <Icon name={icons[route.name] || 'home'} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.emergencyPrimary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 85 : 65,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function SplashScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <Icon name="zap" size={44} color={colors.emergencyPrimary} />
      <Text style={[styles.title, { color: colors.foreground }]}>StimaSense</Text>
      <ActivityIndicator color={colors.emergencyPrimary} />
      <Text style={[styles.body, { color: colors.mutedForeground }]}>Checking your account…</Text>
    </View>
  );
}

function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen name="Report" component={ReportOutageScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadAuthState = async () => {
      try {
        const [{ data, error }, onboarded] = await Promise.all([
          supabase.auth.getSession(),
          AsyncStorage.getItem('isOnboarded'),
        ]);
        if (error) throw error;
        if (!mounted) return;
        setIsAuthenticated(Boolean(data.session));
        setIsOnboarded(onboarded === 'true');
        logger.info('auth.status_checked', {
          authenticated: Boolean(data.session),
          onboarded: onboarded === 'true',
        });
      } catch (error) {
        logger.error('auth.status_check_failed', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadAuthState();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setIsAuthenticated(Boolean(session));
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url?.startsWith('stimasense://auth/callback')) return;
      try {
        const code = new URL(url).searchParams.get('code');
        if (!code) return;
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        setIsAuthenticated(true);
      } catch (error) {
        logger.error('auth.deep_link_failed', error);
      }
    };

    const subscription = Linking.addEventListener('url', event => handleUrl(event.url));
    Linking.getInitialURL().then(handleUrl).catch(error => logger.error('auth.initial_url_failed', error));
    return () => subscription.remove();
  }, []);

  if (isLoading) return <SplashScreen />;
  if (!isAuthenticated) return <AuthNavigator />;
  if (!isOnboarded) return <OnboardingScreens onComplete={() => setIsOnboarded(true)} />;
  return <MainNavigator />;
}

function AppContent() {
  const { colors, theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <NavigationContainer
        theme={{
          dark: theme === 'dark',
          colors: {
            primary: colors.emergencyPrimary,
            background: colors.background,
            card: colors.card,
            text: colors.foreground,
            border: colors.border,
            notification: colors.emergencyDanger,
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '900' },
          },
        }}
      >
        <AppNavigator />
      </NavigationContainer>
    </View>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(App);

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 30, fontWeight: '700', marginVertical: 14 },
  body: { fontSize: 14, marginTop: 12 },
});
