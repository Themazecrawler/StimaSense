/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: () => null,
  }),
}));
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: () => null,
  }),
}));
jest.mock('../src/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#fff',
      card: '#fff',
      foreground: '#000',
      border: '#ddd',
      mutedForeground: '#666',
      emergencyPrimary: '#f60',
      emergencyDanger: '#d00',
      emergencyWarning: '#f90',
    },
  }),
}));
jest.mock('../src/components/auth/LoginScreen', () => ({ LoginScreen: () => null }));
jest.mock('../src/components/auth/RegisterScreen', () => ({ RegisterScreen: () => null }));
jest.mock('../src/components/onboarding/OnboardingScreens', () => ({
  OnboardingScreens: () => null,
}));
jest.mock('../src/components/screens/DashboardScreen', () => ({
  DashboardScreen: () => null,
}));
jest.mock('../src/components/screens/MapScreen', () => ({ MapScreen: () => null }));
jest.mock('../src/components/screens/AnalyticsScreen', () => ({
  AnalyticsScreen: () => null,
}));
jest.mock('../src/components/screens/ProfileScreen', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../src/components/screens/AlertsScreen', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../src/components/screens/ReportOutageScreen', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/backend/supabase/SupabaseService', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));
jest.mock('../src/utils/geocoding', () => ({
  reverseGeocodeToAreaText: jest.fn().mockResolvedValue(null),
}));

test('renders correctly', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    await Promise.resolve();
  });

  expect(renderer!.root).toBeDefined();

  ReactTestRenderer.act(() => renderer!.unmount());
});
