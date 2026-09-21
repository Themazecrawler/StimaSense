/* eslint-env jest */

require('react-native-gesture-handler/jestSetup');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@tensorflow/tfjs-react-native', () => ({}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  wrap: jest.fn(component => component),
  withScope: jest.fn(callback => callback({ setTag: jest.fn(), setContext: jest.fn() })),
}));

jest.mock('react-native-vector-icons/Feather', () => 'Icon');
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: 'MapView',
  Marker: 'Marker',
  Circle: 'Circle',
  PROVIDER_GOOGLE: 'google',
}));

jest.mock('@react-native-community/geolocation', () => {
  const geolocation = {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
    stopObserving: jest.fn(),
    requestAuthorization: jest.fn(),
  };

  return { __esModule: true, default: geolocation, ...geolocation };
});

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    WEATHER_API_KEY: 'test-weather-key',
    GOOGLE_MAPS_API_KEY: 'test-maps-key',
    SENTRY_DSN: '',
    APP_ENVIRONMENT: 'test',
    DEMO_MODE: 'false',
  },
}));
