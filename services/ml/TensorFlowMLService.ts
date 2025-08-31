import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';

interface ModelInputs {
  weatherFeatures: number[]; // [temperature, humidity, wind_speed, pressure, visibility]
  temporalFeatures: number[]; // [hour, day_of_week, month, is_weekend]
}

interface ModelOutputs {
  outageProbability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

export class TensorFlowMLService {
  private model: tf.LayersModel | null = null;
  private preprocessing: any = null;
  private metadata: any = null;
  private isLoaded = false;

  async initializeModel(): Promise<boolean> {
    try {
      console.log('Initializing TensorFlow.js...');
      
      // Initialize TensorFlow.js platform
      await tf.ready();
      
      console.log('Loading trained model...');
      
      // Load model from bundle (for production) or URL (for development)
      if (__DEV__) {
        this.model = await tf.loadLayersModel('http://localhost:8081/models/outage_prediction_model/model.json');
      } else {
        const modelHandler = bundleResourceIO(
          require('../../src/models/outage_prediction_model/model.json'),
          require('../../src/models/outage_prediction_model/group1-shard1of1.bin')
        );
        // Use type assertion to resolve compatibility issues
        this.model = await tf.loadLayersModel(modelHandler as any);
      }
      
      // Load preprocessing parameters and metadata
      const preprocessingUrl = __DEV__
        ? 'http://localhost:8081/models/preprocessing_params.json'
        : require('../../src/models/preprocessing_params.json');
        
      const metadataUrl = __DEV__
        ? 'http://localhost:8081/models/model_metadata.json'
        : require('../../src/models/model_metadata.json');
        
      if (typeof preprocessingUrl === 'string') {
        const [preprocessingResponse, metadataResponse] = await Promise.all([
          fetch(preprocessingUrl),
          fetch(metadataUrl)
        ]);
        this.preprocessing = await preprocessingResponse.json();
        this.metadata = await metadataResponse.json();
      } else {
        this.preprocessing = preprocessingUrl;
        this.metadata = metadataUrl;
      }
      
      this.isLoaded = true;
      console.log('Model loaded successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to load model:', error);
      return false;
    }
  }

  async predict(inputs: ModelInputs): Promise<ModelOutputs> {
    if (!this.isLoaded || !this.model) {
      throw new Error('Model not loaded');
    }

    try {
      // Preprocess inputs
      const processedInputs = this.preprocessInputs(inputs);
      
      // Create tensors - combine weather and temporal features
      const combinedFeatures = [...processedInputs.weather, ...processedInputs.temporal];
      const inputTensor = tf.tensor2d([combinedFeatures]);
      
      // Make prediction
      const prediction = this.model.predict(inputTensor) as tf.Tensor;
      
      // Extract output (assuming single output for binary classification)
      const predictionData = await prediction.data();
      const outageProbability = predictionData[0];
      
      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();
      
      // Determine risk level based on probability
      const riskLevel = this.determineRiskLevel(outageProbability);
      
      // Process outputs
      const result: ModelOutputs = {
        outageProbability,
        riskLevel,
        confidence: this.calculateConfidence(outageProbability)
      };
      
      return result;
    } catch (error) {
      console.error('Prediction failed:', error);
      throw error;
    }
  }

  private preprocessInputs(inputs: ModelInputs) {
    // Apply the same preprocessing as during training
    const { weatherFeatures, temporalFeatures } = inputs;
    
    // Apply scalers using the actual generated parameters
    const processedWeather = this.applyRobustScaler(weatherFeatures, this.preprocessing.weather_scaler.parameters);
    const processedTemporal = this.applyMinMaxScaler(temporalFeatures, this.preprocessing.temporal_scaler.parameters);
    
    return {
      weather: processedWeather,
      temporal: processedTemporal
    };
  }

  private applyRobustScaler(features: number[], scalerParams: any): number[] {
    return features.map((value, idx) => {
      const { median, scale } = scalerParams[idx];
      return (value - median) / scale;
    });
  }

  private applyStandardScaler(features: number[], scalerParams: any): number[] {
    return features.map((value, idx) => {
      const { mean, std } = scalerParams[idx];
      return (value - mean) / std;
    });
  }

  private applyMinMaxScaler(features: number[], scalerParams: any): number[] {
    return features.map((value, idx) => {
      const featureName = Object.keys(scalerParams)[idx];
      const { min, max } = scalerParams[featureName];
      return (value - min) / (max - min);
    });
  }

  private applySequenceScaling(sequence: number[], scalerParams: any): number[] {
    // Apply same scaling as used for sequence features during training
    return sequence.map((value, idx) => {
      const { mean, std } = scalerParams[idx % scalerParams.length];
      return (value - mean) / std;
    });
  }

  private determineRiskLevel(probability: number): 'low' | 'medium' | 'high' | 'critical' {
    if (probability < 0.25) return 'low';
    if (probability < 0.5) return 'medium';
    if (probability < 0.75) return 'high';
    return 'critical';
  }

  private calculateConfidence(probability: number): number {
    // Calculate confidence based on prediction certainty
    // Higher confidence when probability is further from 0.5 (uncertain)
    return Math.abs(probability - 0.5) * 2;
  }

  getModelInfo() {
    return {
      isLoaded: this.isLoaded,
      modelSize: this.model ? this.model.getWeights().reduce((size, weight) => size + weight.size, 0) : 0,
      version: '1.0.0'
    };
  }
}

// Export singleton
export const tensorflowMLService = new TensorFlowMLService();