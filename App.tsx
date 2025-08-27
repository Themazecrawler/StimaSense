import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import { DashboardScreen } from './src/components/screens/DashboardScreen';
import { MapScreen } from './src/components/screens/MapScreen';
import { AnalyticsScreen } from './src/components/screens/AnalyticsScreen';
import { AlertsScreen } from './src/components/screens/AlertsScreen';
import { ProfileScreen } from './src/components/screens/ProfileScreen';
import { ReportOutageScreen } from './src/components/screens/ReportOutageScreen';

export type RootStackParamList = {
  Dashboard: undefined;
  Map: undefined;
  Analytics: undefined;
  Alerts: undefined;
  Profile: undefined;
  Report: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Dashboard" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Map" component={MapScreen} />
          <Stack.Screen name="Analytics" component={AnalyticsScreen} />
          <Stack.Screen name="Alerts">
            {() => <AlertsScreen onNavigate={() => {}} />}
          </Stack.Screen>
          <Stack.Screen name="Profile">
            {() => (
              <ProfileScreen onNavigate={() => {}} onToggleTheme={() => {}} isDark={isDarkMode} />
            )}
          </Stack.Screen>
          <Stack.Screen name="Report" component={ReportOutageScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
