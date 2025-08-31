import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  Text,
  Linking,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Feather';

// Initialize TensorFlow.js for React Native
import '@tensorflow/tfjs-react-native';

// Import screens
import { LoginScreen } from './src/components/auth/LoginScreen';
import { RegisterScreen } from './src/components/auth/RegisterScreen';
import { OnboardingScreens } from './src/components/onboarding/OnboardingScreens';
import { DashboardScreen } from './src/components/screens/DashboardScreen';
import { MapScreen } from './src/components/screens/MapScreen';
import { AnalyticsScreen } from './src/components/screens/AnalyticsScreen';
import ProfileScreen from './src/components/screens/ProfileScreen';
import AlertsScreen from './src/components/screens/AlertsScreen';
import ReportOutageScreen from './src/components/screens/ReportOutageScreen';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

// Import services
import { mlService } from './services/ml/MLService';
import { supabase } from './src/backend/supabase/SupabaseService';
import { kplcPlannedOutageService } from './src/backend/kplc/KPLCPlannedOutageService';
import { OUTAGES_URL } from './src/config/outages';
import Geolocation from '@react-native-community/geolocation';
import { reverseGeocodeToAreaText } from './src/utils/geocoding';
import { federatedLearningService } from './services/ml/FederatedLearningService';
import { modelFeedbackService } from './services/ml/ModelFeedbackService';
import { autoPredictionService } from './services/ml/AutoPredictionService';
import { backgroundTaskService } from './src/backend/background/BackgroundTaskService';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const AuthStack = createStackNavigator();

// Auth Stack Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="Onboarding" component={OnboardingScreens} />
    </AuthStack.Navigator>
  );
}

// Main Tab Navigator
function MainTabNavigator() {
  const { colors } = useTheme();
  const navigation = useNavigation();

  // No wrapper needed - screens handle their own navigation

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'home';
              break;
            case 'Map':
              iconName = 'map';
              break;
            case 'Analytics':
              iconName = 'bar-chart-2';
              break;
            case 'Alerts':
              iconName = 'bell';
              break;
            case 'Profile':
              iconName = 'user';
              break;
            default:
              iconName = 'home';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.emergencyPrimary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 85 : 65,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
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

// Enhanced Splash Screen with Detailed Loading Stages
function SplashScreen({ loadingStage }: { loadingStage: string }) {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.splashContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.logoContainer, { backgroundColor: colors.emergencyPrimary }]}>
        <Icon name="zap" size={40} color="#ffffff" />
      </View>
      <Text style={[styles.appName, { color: colors.foreground }]}>StimaSense</Text>
      <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
        Smart Power Monitoring with AI
      </Text>
      <ActivityIndicator 
        size="large" 
        color={colors.emergencyPrimary} 
        style={{ marginTop: 20 }} 
      />
      <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
        {loadingStage}
      </Text>
    </View>
  );
}

// Mock screens for remaining functionality
function PredictionsScreen() {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.mockScreen, { backgroundColor: colors.background }]}>
      <Icon name="trending-up" size={48} color={colors.emergencyPrimary} />
      <Text style={[styles.mockTitle, { color: colors.foreground }]}>AI Predictions</Text>
      <Text style={[styles.mockDescription, { color: colors.mutedForeground }]}>
        Advanced ML predictions with continuous learning
      </Text>
    </View>
  );
}

function OutageDetailsScreen() {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.mockScreen, { backgroundColor: colors.background }]}>
      <Icon name="info" size={48} color={colors.emergencyPrimary} />
      <Text style={[styles.mockTitle, { color: colors.foreground }]}>Outage Details</Text>
      <Text style={[styles.mockDescription, { color: colors.mutedForeground }]}>
        Detailed outage analysis and community reports
      </Text>
    </View>
  );
}

function OfflineScreen() {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.mockScreen, { backgroundColor: colors.background }]}>
      <Icon name="wifi-off" size={48} color={colors.emergencyWarning} />
      <Text style={[styles.mockTitle, { color: colors.foreground }]}>Offline Mode</Text>
      <Text style={[styles.mockDescription, { color: colors.mutedForeground }]}>
        Using cached predictions and offline data
      </Text>
    </View>
  );
}

// Main App Stack Navigator
function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState('Initializing StimaSense...');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Starting StimaSense initialization...');
      
      // Stage 1: Check authentication
      setLoadingStage('Checking your account...');
      await checkAuthStatus();
      await sleep(800);
      
      // Stage 2: Initialize TensorFlow.js
      setLoadingStage('Loading AI engine...');
      await initializeTensorFlow();
      await sleep(1000);
      
      // Stage 3: Initialize ML services
      setLoadingStage('Setting up prediction models...');
      await initializeMLServices();
      await sleep(800);
      
      // Stage 4: Initialize autonomous prediction system
      setLoadingStage('Starting live predictions...');
      await initializeAutoPredictions();
      await sleep(1000);
      
      // Stage 5: Initialize federated learning
      setLoadingStage('Preparing continuous learning...');
      await initializeFederatedLearning();
      await sleep(800);
      
      // Stage 6: Start background services
      setLoadingStage('Starting background services...');
      await initializeBackgroundServices();
      await sleep(600);
      
      setLoadingStage('Ready! Welcome to StimaSense');
      await sleep(800);
      
      console.log('✅ StimaSense initialization completed successfully');
      
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      setLoadingStage('Initialization failed - starting anyway...');
      await sleep(2000);
    } finally {
      setIsLoading(false);
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const checkAuthStatus = async () => {
    try {
      const [authStatus, onboardStatus] = await Promise.all([
        AsyncStorage.getItem('isAuthenticated'),
        AsyncStorage.getItem('isOnboarded'),
      ]);
      
      setIsAuthenticated(authStatus === 'true');
      setIsOnboarded(onboardStatus === 'true');
      
      console.log('📱 Auth status checked:', { 
        authenticated: authStatus === 'true', 
        onboarded: onboardStatus === 'true' 
      });
    } catch (error) {
      console.error('❌ Error checking auth status:', error);
      // Default to false for safety
      setIsAuthenticated(false);
      setIsOnboarded(false);
    }
  };

  const initializeTensorFlow = async () => {
    try {
      console.log('🧠 TensorFlow.js will be initialized by ML services when needed...');
      // TensorFlow.js initialization is now handled by TensorFlowMLService
      // This prevents conflicts and ensures proper initialization order
    } catch (error) {
      console.warn('⚠️ TensorFlow.js initialization warning:', error);
      // Continue without TensorFlow.js - app will use fallback predictions
    }
  };

  // Handle deep links for Supabase OAuth/Reset flows
  useEffect(() => {
    const handler = async (urlStr: string) => {
      try {
        if (!urlStr) return;
        if (!urlStr.startsWith('stimasense://auth/callback')) return;
        const url = new URL(urlStr);
        const code = url.searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            await AsyncStorage.setItem('isAuthenticated', 'true');
            setIsAuthenticated(true);
            // Optional: mark onboarded to get past auth quickly
            await AsyncStorage.setItem('isOnboarded', 'true');
            setIsOnboarded(true);
          }
        }
      } catch (e) {
        console.warn('Deep link handling failed:', e);
      }
    };

    const sub = Linking.addEventListener('url', (evt) => handler(evt.url));
    // Handle app cold-start via deep link
    Linking.getInitialURL().then((u) => { if (u) handler(u); });
    return () => {
      // @ts-ignore RN new API returns subscription object with remove()
      sub?.remove?.();
    };
  }, []);

  const initializeMLServices = async () => {
    try {
      console.log('🤖 Initializing ML services...');
      
      // Initialize the main ML service
      const mlInitialized = await mlService.initializeModel();
      
      if (!mlInitialized) {
        console.warn('⚠️ ML model initialization failed - using fallback predictions');
        // Set a flag to indicate fallback mode
        await AsyncStorage.setItem('ml_fallback_mode', 'true');
      } else {
        console.log('✅ ML model initialized successfully');
        console.log('ml model ready for predictions');
        await AsyncStorage.setItem('ml_fallback_mode', 'false');
      }
      
    } catch (error) {
      console.warn('⚠️ ML service initialization error:', error);
      // Ensure fallback mode is enabled
      await AsyncStorage.setItem('ml_fallback_mode', 'true');
    }
  };

  const initializeAutoPredictions = async () => {
    try {
      console.log('🔄 Starting autonomous prediction system...');
      
      // Start the auto prediction service
      await autoPredictionService.startAutoPredictions();
      
      const status = autoPredictionService.getStatus();
      console.log('✅ Auto predictions started:', status);
      
      // Generate initial prediction if none exists
      const currentPrediction = autoPredictionService.getCurrentPrediction();
      if (!currentPrediction) {
        console.log('🎯 Generating initial prediction...');
        await autoPredictionService.forceUpdate();
      }
      
    } catch (error) {
      console.error('❌ Auto prediction initialization failed:', error);
    }
  };

  const initializeFederatedLearning = async () => {
    try {
      console.log('🧠 Initializing federated learning...');
      
      // Get training data statistics
      const trainingStats = await federatedLearningService.getTrainingDataStats();
      console.log('📊 Training data stats:', trainingStats);
      
      // Start automatic training data collection after a delay
      setTimeout(() => {
        console.log('📥 Starting automatic training data collection...');
        federatedLearningService.collectAutomaticTrainingData();
      }, 10000); // Start after 10 seconds to not block app startup
      
      console.log('✅ Federated learning service initialized');
      
    } catch (error) {
      console.warn('⚠️ Federated learning initialization error:', error);
    }
  };

  const initializeBackgroundServices = async () => {
    try {
      console.log('⚙️ Starting background services...');
      
      // Background services are initialized automatically
      // Just need to verify they're running
      const taskStatuses = await backgroundTaskService.getAllTaskStatuses();
      const enabledTasks = taskStatuses.filter(task => task.enabled);
      
      console.log('✅ Background services started:', {
        totalTasks: taskStatuses.length,
        enabledTasks: enabledTasks.length,
      });

      // Initialize KPLC planned outages from remote JSON if provided
      if (OUTAGES_URL) {
        await kplcPlannedOutageService.initialize(OUTAGES_URL);
      } else {
        // fallback bundled JSON
        await kplcPlannedOutageService.initialize();
      }

      // Attempt to personalize by device location
      Geolocation.requestAuthorization?.();
      Geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const areaText = await reverseGeocodeToAreaText(latitude, longitude);
          if (areaText) {
            kplcPlannedOutageService.setUserArea(areaText);
            const matches = kplcPlannedOutageService.filterForUserArea(areaText);
            // Optionally, notify top N immediately on first launch
            // (we rely on service new-items notifications later)
            console.log('📍 User area resolved to:', areaText, 'matches:', matches.length);
          }
        },
        (err) => {
          console.log('Location unavailable:', err?.message || err);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
      
    } catch (error) {
      console.warn('⚠️ Background services initialization error:', error);
    }
  };

  if (isLoading) {
    return <SplashScreen loadingStage={loadingStage} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated || !isOnboarded ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen 
            name="Report" 
            component={ReportOutageScreen}
            options={{ 
              presentation: 'modal',
              gestureEnabled: true,
              cardOverlayEnabled: true,
            }}
          />
          <Stack.Screen 
            name="PredictionsModal" 
            component={PredictionsScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen name="OutageDetails" component={OutageDetailsScreen} />
          <Stack.Screen name="Offline" component={OfflineScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

// Main App Component
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppContent() {
  const { theme, colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={false}
      />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.8,
  },
  mockScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mockTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  mockDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});