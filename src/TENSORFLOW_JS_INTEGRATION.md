# TensorFlow.js Model Integration Guide

## Step-by-Step Model Integration

### 1. Convert Your Python Model to TensorFlow.js

After training your model using the training guide, convert it to TensorFlow.js format:

```bash
# Install TensorFlow.js converter
pip install tensorflowjs

# Convert your trained model
tensorflowjs_converter \
    --input_format=keras \
    --output_format=tfjs_graph_model \
    --quantize_float16 \
    ./trained_model.h5 \
    ./models/outage_prediction_model/
```

### 2. Model File Structure

Place your converted model files in this exact structure:

```
/models/
├── outage_prediction_model/
│   ├── model.json                    # ← Your converted model architecture
│   ├── group1-shard1of1.bin         # ← Your model weights (may have multiple shards)
│   └── weight_specs.json            # ← Weight specifications
├── preprocessing_params.json         # ← Create this from your training pipeline
├── model_metadata.json              # ← Already created
└── README.md                        # ← Already created
```

### 3. Create Preprocessing Parameters File

Create `/models/preprocessing_params.json` with your actual training parameters:

```json
{
  "weather_scaler": {
    "type": "RobustScaler",
    "parameters": [
      {"median": 18.5, "scale": 12.3},  // temperature
      {"median": 65.0, "scale": 25.0},  // humidity  
      {"median": 8.2, "scale": 6.8},    // wind_speed
      {"median": 12.1, "scale": 8.9},   // wind_gust
      {"median": 0.0, "scale": 2.1},    // precipitation
      {"median": 1013.25, "scale": 15.2}, // pressure
      {"median": 10.0, "scale": 5.0},   // visibility
      {"median": 3.0, "scale": 2.5}     // weather_severity_index
    ]
  },
  "grid_scaler": {
    "type": "StandardScaler", 
    "parameters": [
      {"mean": 68.5, "std": 18.2},      // load_percentage
      {"mean": 60.0, "std": 0.05},      // frequency
      {"mean": 0.95, "std": 0.08},      // voltage_stability
      {"mean": 1.2, "std": 1.8},        // maintenance_events
      {"mean": 0.45, "std": 0.25},      // equipment_age_index
      {"mean": 0.35, "std": 0.22}       // grid_congestion_index
    ]
  },
  "sequence_scaler": {
    "type": "StandardScaler",
    "parameters": [
      {"mean": 18.5, "std": 12.3},      // temperature in sequence
      {"mean": 65.0, "std": 25.0},      // humidity in sequence
      {"mean": 8.2, "std": 6.8},        // wind_speed in sequence
      {"mean": 0.0, "std": 2.1},        // precipitation in sequence
      {"mean": 68.5, "std": 18.2},      // load_percentage in sequence
      {"mean": 60.0, "std": 0.05},      // frequency in sequence
      {"mean": 0.95, "std": 0.08}       // voltage_stability in sequence
    ]
  }
}
```

### 4. Update Package.json Dependencies

Add TensorFlow.js dependencies to your package.json:

```json
{
  "dependencies": {
    "@tensorflow/tfjs": "^4.15.0",
    "@tensorflow/tfjs-react-native": "^0.8.0",
    "@tensorflow/tfjs-platform-react-native": "^0.6.0"
  }
}
```

Install the dependencies:

```bash
npm install @tensorflow/tfjs @tensorflow/tfjs-react-native @tensorflow/tfjs-platform-react-native
```

### 5. Update Metro Config for Model Files

Ensure your `metro.config.js` includes model file extensions:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for model files
config.resolver.assetExts.push(
  'bin',     // TensorFlow.js model weights
  'json',    // Model architecture
  'tflite'   // TensorFlow Lite models (optional)
);

// Disable transform cache for model files
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

module.exports = config;
```

### 6. Initialize TensorFlow.js in Your App

Update your main App.tsx to initialize TensorFlow.js:

```typescript
// Add to the top of App.tsx
import '@tensorflow/tfjs-react-native';

// In your AppContent component, add TensorFlow.js initialization
function AppContent() {
  const { theme, colors } = useTheme();
  const [tfReady, setTfReady] = useState(false);

  useEffect(() => {
    // Initialize TensorFlow.js
    const initTensorFlow = async () => {
      // Import TensorFlow.js
      const tf = await import('@tensorflow/tfjs');
      await tf.ready();
      setTfReady(true);
      console.log('TensorFlow.js initialized');
    };

    initTensorFlow();
  }, []);

  if (!tfReady) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.emergencyPrimary} />
        <Text style={{ color: colors.foreground, marginTop: 16 }}>
          Initializing AI Model...
        </Text>
      </View>
    );
  }

  // Rest of your app...
}
```

### 7. Update MLService to Use Your Model

Replace the mock predictions in `/services/ml/MLService.ts` with actual TensorFlow.js predictions:

```typescript
import * as tf from '@tensorflow/tfjs';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';

class MLService {
  private model: tf.GraphModel | null = null;
  private preprocessing: any = null;
  private modelLoaded = false;

  async initializeModel(): Promise<boolean> {
    try {
      console.log('Loading ML model...');
      
      // Load model from app bundle
      const modelUrl = bundleResourceIO(
        require('../../models/outage_prediction_model/model.json'),
        require('../../models/outage_prediction_model/group1-shard1of1.bin')
      );
      
      this.model = await tf.loadGraphModel(modelUrl);
      
      // Load preprocessing parameters
      this.preprocessing = require('../../models/preprocessing_params.json');
      
      this.modelLoaded = true;
      console.log('ML model loaded successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to load ML model:', error);
      this.modelLoaded = false;
      return false;
    }
  }

  async predictOutage(input: OutagePredictionInput): Promise<OutagePredictionResult> {
    if (!this.modelLoaded || !this.model) {
      await this.initializeModel();
    }

    try {
      // Preprocess inputs using your actual preprocessing parameters
      const processedInput = this.preprocessInput(input);
      
      // Create input tensors
      const weatherTensor = tf.tensor2d([processedInput.weather]);
      const gridTensor = tf.tensor2d([processedInput.grid]);
      const temporalTensor = tf.tensor2d([processedInput.temporal]);
      const sequenceTensor = tf.tensor3d([processedInput.sequence]);
      
      // Make prediction
      const prediction = this.model.predict({
        weather_features: weatherTensor,
        grid_features: gridTensor,
        temporal_features: temporalTensor,
        sequence_features: sequenceTensor
      }) as { [key: string]: tf.Tensor };
      
      // Extract results
      const probabilityData = await prediction['outage_probability'].data();
      const severityData = await prediction['severity'].data();
      const timeWindowData = await prediction['time_window'].data();
      
      // Clean up tensors
      weatherTensor.dispose();
      gridTensor.dispose();
      temporalTensor.dispose();
      sequenceTensor.dispose();
      Object.values(prediction).forEach(tensor => tensor.dispose());
      
      // Process results
      const probability = probabilityData[0];
      const confidence = this.calculateModelConfidence(probability, severityData);
      const riskLevel = this.determineRiskLevel(probability);
      const timeWindow = this.interpretTimeWindow(timeWindowData);
      
      return {
        probability,
        confidence,
        riskLevel,
        timeWindow,
        factors: this.calculateFactorContributions(processedInput),
        recommendations: this.generateRecommendations(riskLevel, input)
      };
      
    } catch (error) {
      console.error('Prediction failed:', error);
      throw new Error('Failed to generate outage prediction');
    }
  }

  private preprocessInput(input: OutagePredictionInput) {
    // Apply your actual preprocessing logic here
    const weatherFeatures = [
      input.temperature,
      input.humidity, 
      input.windSpeed,
      input.windSpeed * 1.3, // Approximate wind gust
      input.precipitation,
      1013.25, // Default pressure
      10.0,    // Default visibility
      this.calculateWeatherSeverity(input) // Your custom severity index
    ];

    const gridFeatures = [
      input.gridLoad,
      60.0,  // Default frequency
      0.95,  // Default voltage stability
      0,     // Default maintenance events
      0.5,   // Default equipment age
      input.gridLoad > 80 ? 0.7 : 0.3 // Congestion based on load
    ];

    const temporalFeatures = [
      Math.sin(2 * Math.PI * input.timeOfDay / 24),
      Math.cos(2 * Math.PI * input.timeOfDay / 24), 
      input.dayOfWeek / 6.0,
      input.season / 4.0
    ];

    // Create 24-hour sequence (you'll need historical data for this)
    const sequenceFeatures = this.createSequenceFeatures(weatherFeatures, gridFeatures);

    // Apply preprocessing scalers
    return {
      weather: this.applyRobustScaler(weatherFeatures, this.preprocessing.weather_scaler),
      grid: this.applyStandardScaler(gridFeatures, this.preprocessing.grid_scaler),
      temporal: temporalFeatures, // Already normalized
      sequence: sequenceFeatures.map(seq => 
        this.applyStandardScaler(seq, this.preprocessing.sequence_scaler)
      )
    };
  }

  private applyRobustScaler(features: number[], scalerParams: any): number[] {
    return features.map((value, idx) => {
      const { median, scale } = scalerParams.parameters[idx];
      return (value - median) / scale;
    });
  }

  private applyStandardScaler(features: number[], scalerParams: any): number[] {
    return features.map((value, idx) => {
      const { mean, std } = scalerParams.parameters[idx % scalerParams.parameters.length];
      return (value - mean) / std;
    });
  }

  private calculateWeatherSeverity(input: OutagePredictionInput): number {
    let severity = 0;
    
    // Wind contribution (0-4 points)
    if (input.windSpeed > 25) severity += 4;
    else if (input.windSpeed > 20) severity += 3;
    else if (input.windSpeed > 15) severity += 2;
    else if (input.windSpeed > 10) severity += 1;
    
    // Precipitation contribution (0-3 points)
    if (input.precipitation > 20) severity += 3;
    else if (input.precipitation > 10) severity += 2;
    else if (input.precipitation > 5) severity += 1;
    
    // Temperature extremes (0-2 points)
    if (input.temperature < -10 || input.temperature > 40) severity += 2;
    else if (input.temperature < 0 || input.temperature > 35) severity += 1;
    
    return Math.min(severity, 10);
  }

  private createSequenceFeatures(weatherFeatures: number[], gridFeatures: number[]): number[][] {
    // Create 24-hour sequence (simplified - in production, use actual historical data)
    const sequence = [];
    const combinedFeatures = [...weatherFeatures.slice(0, 4), ...gridFeatures.slice(0, 3)];
    
    for (let i = 0; i < 24; i++) {
      // Add some variation to simulate historical data
      const variation = combinedFeatures.map(val => val + (Math.random() - 0.5) * val * 0.1);
      sequence.push(variation);
    }
    
    return sequence;
  }

  private calculateModelConfidence(probability: number, severityData: ArrayLike<number>): number {
    // Calculate confidence based on prediction certainty
    const probabilityConfidence = Math.abs(probability - 0.5) * 2;
    const maxSeverity = Math.max(...Array.from(severityData));
    return (probabilityConfidence + maxSeverity) / 2;
  }

  private determineRiskLevel(probability: number): 'low' | 'medium' | 'high' | 'critical' {
    if (probability < 0.2) return 'low';
    if (probability < 0.5) return 'medium';
    if (probability < 0.8) return 'high';
    return 'critical';
  }

  private interpretTimeWindow(timeWindowData: ArrayLike<number>): string {
    const maxIndex = Array.from(timeWindowData).indexOf(Math.max(...timeWindowData));
    const timeWindows = ['1 hour', '2 hours', '3 hours', '4 hours', '5 hours', '6 hours'];
    return `next ${timeWindows[maxIndex]}`;
  }

  private calculateFactorContributions(processedInput: any) {
    // Simplified factor calculation - in production, use SHAP values or similar
    const weatherRisk = Math.max(...processedInput.weather.map(Math.abs)) / 3;
    const gridRisk = Math.max(...processedInput.grid.map(Math.abs)) / 3;
    const historicalRisk = 0.3; // Default
    
    return {
      weather: Math.min(weatherRisk, 1),
      grid: Math.min(gridRisk, 1),
      historical: historicalRisk
    };
  }

  private generateRecommendations(riskLevel: string, input: OutagePredictionInput): string[] {
    const recommendations: string[] = [];
    
    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push('Charge all devices to 100%');
      recommendations.push('Prepare emergency supplies');
      recommendations.push('Consider backup power options');
    }
    
    if (input.windSpeed > 15) {
      recommendations.push('Secure outdoor equipment');
    }
    
    if (input.precipitation > 5) {
      recommendations.push('Avoid unnecessary electrical use');
    }
    
    if (input.gridLoad > 85) {
      recommendations.push('Reduce non-essential power consumption');
    }
    
    return recommendations;
  }
}
```

### 8. Test Your Model Integration

Create a test script to verify your model works:

```typescript
// test_model.ts
import { mlService } from '../services/ml/MLService';

async function testModel() {
  console.log('Testing ML model integration...');
  
  // Initialize model
  const initialized = await mlService.initializeModel();
  if (!initialized) {
    console.error('Failed to initialize model');
    return;
  }
  
  // Test prediction
  const testInput = {
    temperature: 25.0,
    humidity: 70.0,
    windSpeed: 12.0,
    precipitation: 2.0,
    historicalOutages: 1,
    gridLoad: 75.0,
    timeOfDay: 14.5,
    dayOfWeek: 2,
    season: 2,
    location: {
      latitude: 37.7749,
      longitude: -122.4194
    }
  };
  
  try {
    const prediction = await mlService.predictOutage(testInput);
    console.log('Prediction successful:', prediction);
  } catch (error) {
    console.error('Prediction failed:', error);
  }
}

// Run test
testModel();
```

### 9. Bundle Size Optimization

To keep your app bundle size manageable:

1. **Use quantized models** (already included in conversion)
2. **Enable Hermes** for better JavaScript performance
3. **Use code splitting** for the ML module

```javascript
// app.json - Enable Hermes
{
  "expo": {
    "jsEngine": "hermes",
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "enableProguardInReleaseBuilds": true,
            "enableShrinkResourcesInReleaseBuilds": true
          }
        }
      ]
    ]
  }
}
```

### 10. Production Deployment Checklist

Before deploying to production:

- [ ] Model files are correctly placed in `/models/` directory
- [ ] Preprocessing parameters match your training pipeline
- [ ] Model loads successfully on both iOS and Android
- [ ] Predictions are reasonable and match expected ranges
- [ ] Performance is acceptable (< 2 seconds for prediction)
- [ ] Memory usage is within limits (< 100MB)
- [ ] Error handling is robust
- [ ] Offline support works correctly

### Troubleshooting Common Issues

1. **Model not loading**: Check file paths and ensure all model files are included in the bundle
2. **Preprocessing errors**: Verify your preprocessing parameters match training
3. **Memory issues**: Use model quantization and dispose tensors properly
4. **Performance problems**: Consider using TensorFlow Lite for better mobile performance
5. **Bundle size too large**: Use model quantization and code splitting

Following this guide, your trained ML model will be fully integrated into the StimaSense React Native app and ready for production use!