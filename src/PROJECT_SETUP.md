# StimaSense React Native Setup Guide

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (v18 or later)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g @expo/cli`
- **EAS CLI**: `npm install -g eas-cli`
- **React Native development environment** (for native builds)

## ML Model Integration

### 1. Model File Placement

Place your trained ML model in the appropriate directory:

```
/models/
├── outage_prediction_model.json          # TensorFlow.js model
├── outage_prediction_model.bin           # Model weights
├── model_metadata.json                   # Model info and preprocessing params
└── README.md                            # Model documentation
```

### 2. Model Format Support

StimaSense supports multiple ML model formats:

- **TensorFlow.js** (recommended for on-device inference)
- **ONNX** (cross-platform)
- **PyTorch Mobile** (if using PyTorch)
- **REST API** (for server-side inference)

### 3. TensorFlow.js Integration

If using TensorFlow.js, install the required packages:

```bash
npm install @tensorflow/tfjs @tensorflow/tfjs-react-native
npm install @tensorflow/tfjs-platform-react-native
```

Update your ML Service to load the actual model:

```typescript
// In services/ml/MLService.ts
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

async initializeModel(): Promise<boolean> {
  try {
    await tf.ready();
    this.model = await tf.loadLayersModel('path/to/your/model.json');
    this.modelLoaded = true;
    return true;
  } catch (error) {
    console.error('Failed to load ML model:', error);
    return false;
  }
}
```

## Installation

1. **Clone and Install Dependencies**
```bash
git clone <your-repo-url>
cd stima-sense
npm install
```

2. **Install iOS Dependencies** (Mac only)
```bash
cd ios && pod install && cd ..
```

3. **Set Up Environment Variables**
Create a `.env` file in the root directory:

```env
# Weather API
OPENWEATHER_API_KEY=your_openweather_api_key

# Google Maps
GOOGLE_MAPS_API_KEY_IOS=your_google_maps_ios_key
GOOGLE_MAPS_API_KEY_ANDROID=your_google_maps_android_key

# Grid/Utility APIs
GRID_API_KEY=your_grid_api_key
UTILITY_API_ENDPOINT=https://api.your-utility.com

# ML Model Configuration
ML_MODEL_ENDPOINT=https://your-ml-api.com
ML_MODEL_VERSION=1.0.0

# Analytics (optional)
ANALYTICS_API_KEY=your_analytics_key

# Push Notifications
EXPO_PUSH_TOKEN=your_expo_push_token
```

## Development

### 1. Start Development Server

```bash
# Start Expo development server
npm start

# Start for iOS
npm run ios

# Start for Android
npm run android
```

### 2. Model Development Workflow

1. **Train your model** using historical data
2. **Export to TensorFlow.js** format
3. **Test model locally** using the MLService
4. **Validate predictions** against known outcomes
5. **Deploy model** to production

### 3. Testing ML Predictions

```bash
# Run ML service tests
npm run test:ml

# Test with sample data
npm run test:predictions
```

## API Keys and Services Setup

### 1. Weather Data

- **OpenWeatherMap**: Sign up at https://openweathermap.org/api
- **Alternative**: WeatherAPI, AccuWeather, or NOAA APIs

### 2. Maps Integration

- **Google Maps**: Get API keys from Google Cloud Console
- Enable required APIs: Maps SDK, Geocoding, Places

### 3. Grid/Utility Data

You'll need to integrate with:
- **Utility company APIs** (if available)
- **Grid monitoring services**
- **Government energy APIs** (e.g., EIA.gov)

### 4. Push Notifications

- **Expo Push Notifications**: Built-in with Expo
- **Firebase Cloud Messaging**: For enhanced features

## Production Deployment

### 1. Build Configuration

```bash
# Build for development
eas build --profile development

# Build for preview
eas build --profile preview

# Build for production
eas build --profile production
```

### 2. App Store Deployment

```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

### 3. Environment-Specific Configuration

Update `app.json` with your specific configuration:

```json
{
  "expo": {
    "name": "StimaSense",
    "extra": {
      "mlModelVersion": "1.0.0",
      "apiEndpoints": {
        "weather": "https://api.openweathermap.org",
        "grid": "https://your-grid-api.com",
        "ml": "https://your-ml-api.com"
      }
    }
  }
}
```

## ML Model Performance Monitoring

### 1. Prediction Accuracy Tracking

The app automatically tracks:
- **Prediction accuracy** vs actual outcomes
- **User feedback** on prediction usefulness
- **Model performance** metrics

### 2. Continuous Learning

Set up feedback loops:
- **User reports** improve model accuracy
- **Real outage data** updates training datasets
- **Performance metrics** guide model improvements

### 3. A/B Testing

Test different model versions:
- **Champion/Challenger** model comparison
- **Gradual rollout** of new model versions
- **Performance monitoring** during transitions

## Security Considerations

### 1. API Key Security

- Store API keys securely (environment variables)
- Use different keys for development/production
- Implement API key rotation

### 2. User Data Privacy

- **Location data**: Only collect when necessary
- **Prediction history**: Local storage with user consent
- **Analytics**: Anonymize user data

### 3. Model Security

- **Model files**: Protect from reverse engineering
- **API endpoints**: Implement rate limiting
- **Data transmission**: Use HTTPS/TLS

## Performance Optimization

### 1. Model Optimization

- **Model quantization** for smaller size
- **Batch predictions** for efficiency
- **Caching strategies** for frequent requests

### 2. App Performance

- **Lazy loading** of screens and components
- **Background tasks** for data fetching
- **Offline support** with cached predictions

### 3. Battery Optimization

- **Efficient location tracking**
- **Smart notification scheduling**
- **Background app refresh** optimization

## Troubleshooting

### Common Issues

1. **Model Loading Errors**
   - Check model file paths
   - Verify TensorFlow.js compatibility
   - Test with sample data

2. **Location Permission Issues**
   - Update Info.plist (iOS) and AndroidManifest.xml
   - Handle permission denials gracefully

3. **API Rate Limiting**
   - Implement request throttling
   - Use caching to reduce API calls
   - Consider API key rotation

### Debug Mode

Enable debug logging:

```typescript
// In development
if (__DEV__) {
  console.log('ML prediction:', prediction);
  console.log('Context data:', context);
}
```

## Support and Documentation

- **ML Model Documentation**: `/models/README.md`
- **API Documentation**: Available at your API endpoints
- **User Guide**: In-app help sections
- **Developer Guide**: This document

## Contributing

1. Fork the repository
2. Create a feature branch
3. Test ML model changes thoroughly
4. Submit pull request with model performance metrics

---

For additional support, contact the development team or check the project documentation.