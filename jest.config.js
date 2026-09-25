module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-gesture-handler)/)',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'services/**/*.ts',
    'src/backend/**/*.ts',
    'src/config/**/*.ts',
    'src/observability/**/*.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 45,
      functions: 55,
      lines: 58,
      statements: 55,
    },
    'services/ml/AutoPredictionService.ts': {
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'services/ml/ModelFeedbackService.ts': {
      functions: 50,
      lines: 50,
      statements: 50,
    },
    'services/ml/TensorFlowMLService.ts': {
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/backend/weather/WeatherService.ts': {
      functions: 30,
      lines: 40,
      statements: 40,
    },
    'src/backend/kplc/KPLCPlannedOutageService.ts': {
      functions: 40,
      lines: 50,
      statements: 50,
    },
  },
};
