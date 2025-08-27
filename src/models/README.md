# ML Models Directory

This directory contains the machine learning models used by StimaSense for power outage prediction.

## Directory Structure

```
/models/
├── outage_prediction_model.json          # TensorFlow.js model architecture
├── outage_prediction_model.bin           # Model weights and parameters
├── model_metadata.json                   # Model metadata and preprocessing info
├── preprocessing/
│   ├── feature_scaler.json              # Feature scaling parameters
│   ├── encoder_mappings.json            # Categorical encodings
│   └── normalization_params.json        # Data normalization parameters
├── validation/
│   ├── test_data.json                   # Sample test data
│   ├── performance_metrics.json         # Model performance on test set
│   └── confusion_matrix.json           # Classification performance
└── versions/
    ├── v1.0.0/                         # Previous model versions
    ├── v1.1.0/
    └── current -> v1.2.0/              # Symlink to current version
```

## Model Specifications

### Current Model: v1.2.0

- **Type**: Neural Network (Dense layers)
- **Framework**: TensorFlow 2.x
- **Input Features**: 11 numerical features
- **Output**: Probability of outage in next 6 hours
- **Training Data**: 50,000 samples from 2020-2024
- **Accuracy**: 92.3% on validation set
- **F1 Score**: 0.89

### Input Features

1. **temperature** (°C): -20 to 50
2. **humidity** (%): 0 to 100
3. **wind_speed** (m/s): 0 to 50
4. **precipitation** (mm): 0 to 100
5. **historical_outages** (count): 0 to 20
6. **grid_load** (%): 0 to 100
7. **time_of_day** (hours): 0 to 24
8. **day_of_week** (0-6): 0=Sunday, 6=Saturday
9. **season** (1-4): 1=Winter, 2=Spring, 3=Summer, 4=Fall
10. **latitude** (normalized): -1 to 1
11. **longitude** (normalized): -1 to 1

### Output

- **probability**: Float 0-1, probability of outage
- **confidence**: Float 0-1, model confidence in prediction

## Data Preprocessing

### Feature Scaling

All numerical features are scaled using MinMax normalization:

```
scaled_value = (value - min_value) / (max_value - min_value)
```

Scaling parameters are stored in `preprocessing/feature_scaler.json`.

### Categorical Encoding

- **day_of_week**: 0-6 (already numerical)
- **season**: 1-4 (already numerical)
- **weather_conditions**: One-hot encoded (if used)

## Model Performance

### Validation Metrics (v1.2.0)

- **Accuracy**: 92.3%
- **Precision**: 0.91
- **Recall**: 0.87
- **F1-Score**: 0.89
- **AUC-ROC**: 0.94

### Performance by Risk Level

- **Low Risk** (0-0.2): 98.1% accuracy
- **Medium Risk** (0.2-0.5): 90.4% accuracy
- **High Risk** (0.5-0.8): 85.2% accuracy
- **Critical Risk** (0.8-1.0): 79.8% accuracy

### Performance by Time Window

- **1 hour**: 95.1% accuracy
- **3 hours**: 92.3% accuracy
- **6 hours**: 88.7% accuracy
- **12 hours**: 84.2% accuracy

## Model Training

### Training Data Sources

1. **Historical Outage Reports**: Utility company data (2020-2024)
2. **Weather Data**: NOAA/OpenWeatherMap historical records
3. **Grid Load Data**: Regional transmission operator data
4. **User Reports**: Crowd-sourced outage reports from app

### Training Process

1. **Data Collection**: Gather 50K+ labeled samples
2. **Feature Engineering**: Create derived features
3. **Data Preprocessing**: Scale and normalize features
4. **Model Architecture**: 3-layer neural network
5. **Training**: 100 epochs with early stopping
6. **Validation**: 80/10/10 train/validation/test split
7. **Hyperparameter Tuning**: Grid search optimization

### Model Architecture

```
Input Layer (11 features)
    ↓
Dense Layer (64 neurons, ReLU)
    ↓
Dropout (0.3)
    ↓
Dense Layer (32 neurons, ReLU)
    ↓
Dropout (0.3)
    ↓
Dense Layer (16 neurons, ReLU)
    ↓
Output Layer (1 neuron, Sigmoid)
```

## Model Deployment

### Export to TensorFlow.js

```python
# Convert TensorFlow model to TensorFlow.js
import tensorflowjs as tfjs

# Save model in TensorFlow.js format
tfjs.converters.save_keras_model(model, './outage_prediction_model')
```

### Model Loading in React Native

```typescript
import * as tf from '@tensorflow/tfjs';

const model = await tf.loadLayersModel('./models/outage_prediction_model.json');
```

## Model Updates

### Version History

- **v1.0.0** (Initial): 87.2% accuracy, basic features
- **v1.1.0** (Weather): 90.1% accuracy, added weather features
- **v1.2.0** (Current): 92.3% accuracy, improved architecture

### Update Process

1. **Retrain**: Use latest data (monthly)
2. **Validate**: Test against holdout dataset
3. **A/B Test**: Deploy to subset of users
4. **Monitor**: Track performance metrics
5. **Rollout**: Full deployment if successful

## Testing

### Unit Tests

```bash
# Test model loading
npm run test:model-loading

# Test prediction accuracy
npm run test:prediction-accuracy

# Test preprocessing
npm run test:preprocessing
```

### Integration Tests

```bash
# Test end-to-end prediction flow
npm run test:prediction-flow

# Test with live data
npm run test:live-data
```

## Monitoring

### Production Metrics

- **Prediction Latency**: < 100ms target
- **Memory Usage**: < 50MB model size
- **Battery Impact**: Minimal background processing
- **User Feedback**: Accuracy ratings

### Performance Alerts

- Accuracy drops below 85%
- Prediction latency exceeds 200ms
- Model loading failures
- High false positive/negative rates

## Troubleshooting

### Common Issues

1. **Model Not Loading**
   - Check file paths
   - Verify TensorFlow.js version compatibility
   - Ensure model files are not corrupted

2. **Poor Predictions**
   - Check input data quality
   - Verify preprocessing steps
   - Compare with validation metrics

3. **High Latency**
   - Optimize model size
   - Use batch predictions
   - Cache frequent predictions

### Debug Mode

Enable detailed logging:

```typescript
// Enable TensorFlow.js debug mode
tf.ENV.set('DEBUG', true);
```

## Future Improvements

### Planned Features

- **Real-time Learning**: Update model with user feedback
- **Multi-region Models**: Region-specific prediction models
- **Ensemble Methods**: Combine multiple model predictions
- **Deep Learning**: Advanced architectures (LSTM, Transformers)

### Research Areas

- **Weather Pattern Recognition**: Advanced weather feature extraction
- **Grid Topology**: Include power grid structure data
- **Social Media**: Integrate social media outage reports
- **Satellite Data**: Use satellite imagery for infrastructure monitoring

## Contact

For model-related questions or issues:
- **ML Engineer**: ml-team@stimasense.com
- **Data Science Lead**: data-science@stimasense.com
- **Technical Support**: support@stimasense.com