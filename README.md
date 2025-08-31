# StimaSense

A React Native application for intelligent power outage prediction and monitoring using machine learning and real-time data analysis.

## Overview

StimaSense is a comprehensive power monitoring solution that combines artificial intelligence with real-time data to predict and monitor power outages. The application provides users with personalized alerts, outage reporting capabilities, and detailed analytics to help manage power-related issues effectively.

## Features

### Core Functionality
- **AI-Powered Outage Prediction**: Machine learning models analyze weather, grid, and temporal data to predict potential power outages
- **Real-Time Monitoring**: Continuous monitoring of power grid status and environmental conditions
- **Personalized Alerts**: Location-based notifications for planned outages and predicted issues
- **Outage Reporting**: Community-driven outage reporting system with detailed categorization
- **Interactive Maps**: Visual representation of outage locations and affected areas
- **Analytics Dashboard**: Comprehensive analytics and historical data visualization

### Technical Features
- **TensorFlow.js Integration**: On-device machine learning for real-time predictions
- **Supabase Backend**: Scalable cloud database and authentication system
- **Location Services**: GPS-based location detection and reverse geocoding
- **Push Notifications**: Real-time alerts for critical power events
- **Offline Support**: Cached predictions and data for offline functionality
- **Federated Learning**: Continuous model improvement through user feedback

## Technology Stack

### Frontend
- **React Native**: Cross-platform mobile application framework
- **TypeScript**: Type-safe JavaScript development
- **React Navigation**: Navigation and routing system
- **TensorFlow.js**: Machine learning framework for React Native
- **React Native Vector Icons**: Icon library for UI components

### Backend & Services
- **Supabase**: Backend-as-a-Service for database, authentication, and storage
- **PostgreSQL**: Primary database for user data and outage records
- **Supabase Storage**: File storage for ML models and data files
- **React Native Geolocation**: Location services and GPS integration

### Machine Learning
- **TensorFlow.js**: Neural network framework for outage prediction
- **Custom ML Models**: Trained models for weather, grid, and temporal analysis
- **Federated Learning**: Distributed learning system for model improvement
- **Auto Prediction Service**: Automated prediction generation and updates

### Development Tools
- **Metro Bundler**: JavaScript bundler for React Native
- **Android SDK**: Android development tools and emulator
- **Gradle**: Build system for Android applications
- **TypeScript Compiler**: Type checking and compilation

## Installation

### Prerequisites
- Node.js (v16 or higher)
- Java Development Kit (JDK 17)
- Android Studio with Android SDK
- React Native CLI
- Physical Android device or emulator

### Environment Setup

1. **Install Node.js and npm**
   ```bash
   # Download and install Node.js from https://nodejs.org/
   ```

2. **Install Java Development Kit**
   ```bash
   # Download JDK 17 from Oracle or use OpenJDK
   # Set JAVA_HOME environment variable
   ```

3. **Install Android Studio and SDK**
   ```bash
   # Download Android Studio from https://developer.android.com/
   # Install Android SDK Platform-Tools
   # Set ANDROID_HOME environment variable
   ```

4. **Install React Native CLI**
   ```bash
   npm install -g @react-native-community/cli
   ```

### Project Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd StimaSense
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Create .env file with your Supabase credentials
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Configure Android settings**
   ```bash
   # Add Google Maps API key to android/app/src/main/AndroidManifest.xml
   # Configure adb for device connection
   ```

## Configuration

### Supabase Setup
1. Create a Supabase project at https://supabase.com
2. Set up database tables for users, outages, and predictions
3. Configure authentication providers (email, Google OAuth)
4. Set up storage buckets for ML models and data files
5. Configure row-level security policies

### Google Maps API
1. Create a Google Cloud project
2. Enable Maps SDK for Android
3. Generate API key and add to AndroidManifest.xml
4. Configure API key restrictions for security

### ML Model Configuration
1. Upload trained TensorFlow.js models to Supabase Storage
2. Ensure model.json and weight files are in the same directory
3. Configure model URLs in src/config/model.ts
4. Test model loading and prediction functionality

## Usage

### Running the Application

1. **Start Metro bundler**
   ```bash
   npx react-native start --reset-cache --port 8081
   ```

2. **Run on Android device**
   ```bash
   npx react-native run-android
   ```

3. **Enable USB debugging on device**
   - Go to Settings > Developer options
   - Enable USB debugging
   - Connect device via USB

### Development Workflow

1. **Code changes**: Edit TypeScript/JavaScript files
2. **Hot reload**: Changes automatically reflect in the app
3. **Debugging**: Use React Native Debugger or Chrome DevTools
4. **Testing**: Run tests with `npm test`

## Project Structure

```
StimaSense/
├── android/                 # Android-specific configuration
├── ios/                     # iOS-specific configuration (if applicable)
├── src/
│   ├── components/         # React components
│   │   ├── auth/           # Authentication screens
│   │   ├── onboarding/     # Onboarding flow
│   │   ├── screens/        # Main application screens
│   │   └── ui/             # Reusable UI components
│   ├── contexts/          # React contexts (theme, auth)
│   ├── backend/           # Backend services
│   │   ├── supabase/      # Supabase configuration
│   │   ├── kplc/          # KPLC outage service
│   │   └── background/   # Background task services
│   ├── services/          # Business logic services
│   │   └── ml/            # Machine learning services
│   ├── utils/             # Utility functions
│   ├── config/            # Configuration files
│   └── models/            # ML model files
├── services/              # Core services
│   └── ml/                # ML service implementations
├── App.tsx                # Main application component
├── index.js               # Application entry point
└── package.json           # Dependencies and scripts
```

## Machine Learning Architecture

### Model Structure
- **Multi-input Neural Network**: Processes weather, grid, temporal, and sequence data
- **Input Features**:
  - Weather features (temperature, humidity, wind speed, pressure, visibility)
  - Grid features (load, capacity, reliability, voltage, frequency)
  - Temporal features (hour, day of week, month, weekend flag)
  - Sequence features (24 timesteps of historical data)

### Prediction Pipeline
1. **Data Collection**: Gather real-time weather and grid data
2. **Feature Engineering**: Process and normalize input features
3. **Model Inference**: Run TensorFlow.js model predictions
4. **Post-processing**: Convert predictions to risk levels and time windows
5. **Alert Generation**: Create personalized notifications based on predictions

### Federated Learning
- **Local Training**: User devices contribute to model improvement
- **Privacy-Preserving**: Training data never leaves the device
- **Continuous Learning**: Models improve over time with user feedback
- **Aggregation**: Central server aggregates model updates

## API Reference

### Core Services

#### MLService
```typescript
interface MLService {
  initializeModel(): Promise<boolean>;
  predictOutage(input: OutagePredictionInput): Promise<ModelOutputs>;
  getModelStatus(): ModelStatus;
}
```

#### AutoPredictionService
```typescript
interface AutoPredictionService {
  startAutoPredictions(): Promise<void>;
  getCurrentPrediction(): LivePrediction | null;
  forceUpdate(): Promise<void>;
  getStatus(): AutoPredictionStatus;
}
```

#### KPLCPlannedOutageService
```typescript
interface KPLCPlannedOutageService {
  initialize(url?: string): Promise<void>;
  filterForUserArea(area: string): PlannedOutage[];
  setUserArea(area: string): void;
  getOutages(): PlannedOutage[];
}
```

### Data Models

#### LivePrediction
```typescript
interface LivePrediction {
  id: string;
  timestamp: Date;
  location: { latitude: number; longitude: number; address?: string };
  prediction: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    probability: number;
    confidence: number;
    timeWindow: string;
    factors: { weather: number; grid: number; historical: number };
  };
  environmentalData: EnvironmentalData;
  recommendations: string[];
  nextUpdateAt: Date;
  modelVersion: string;
}
```

#### OutageReport
```typescript
interface OutageReport {
  id: string;
  userId: string;
  location: { latitude: number; longitude: number; address: string };
  outageType: 'planned' | 'unplanned' | 'maintenance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimatedDuration: number;
  timestamp: Date;
  status: 'active' | 'resolved' | 'pending';
}
```

## Deployment

### Production Build
1. **Generate signed APK**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. **Configure ProGuard** (optional)
   - Enable code obfuscation
   - Optimize bundle size
   - Protect sensitive code

3. **Test thoroughly**
   - Test on multiple devices
   - Verify all features work correctly
   - Check performance and memory usage

### App Store Deployment
1. **Create developer account**
2. **Prepare store listing**
3. **Submit for review**
4. **Monitor analytics and feedback**

## Troubleshooting

### Common Issues

#### Metro Bundler Issues
```bash
# Clear Metro cache
npx react-native start --reset-cache

# Kill existing processes
taskkill /f /im node.exe
```

#### Android Build Issues
```bash
# Clean Android build
cd android && ./gradlew clean

# Check Java version
java -version

# Verify environment variables
echo $JAVA_HOME
echo $ANDROID_HOME
```

#### TensorFlow.js Issues
```bash
# Check model loading
# Verify model files exist in Supabase Storage
# Check network connectivity
# Review console logs for detailed error messages
```

#### Location Services Issues
```bash
# Check permissions
# Verify GPS is enabled
# Test with different location providers
# Review timeout settings
```

### Debug Mode
- Enable React Native Debugger
- Use Chrome DevTools for debugging
- Monitor console logs for errors
- Check network requests in Network tab

## Contributing

### Development Guidelines
1. **Code Style**: Follow TypeScript best practices
2. **Testing**: Write unit tests for new features
3. **Documentation**: Update documentation for API changes
4. **Code Review**: Submit pull requests for review

### Branch Strategy
- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature development branches
- `hotfix/*`: Critical bug fixes

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section
- Review the documentation
- Contact the development team

## Acknowledgments

- React Native community for the excellent framework
- Supabase team for the powerful backend platform
- TensorFlow.js team for the ML framework
- All contributors and beta testers
