#!/usr/bin/env python3
"""
Train outage prediction model from parquet data for StimaSense GitHub workflow.
"""

import argparse
import os
import sys
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import RobustScaler, MinMaxScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import tensorflow as tf
from tensorflow import keras
import tensorflowjs as tfjs

def load_and_preprocess_data(input_path):
    """Load and preprocess the parquet data."""
    print(f"Loading data from {input_path}...")
    
    # Load parquet file
    df = pd.read_parquet(input_path)
    print(f"Loaded {len(df)} records")
    print(f"Available columns: {list(df.columns)}")
    
    # Create datetime features from power_outage_datetime
    df['power_outage_datetime'] = pd.to_datetime(df['power_outage_datetime'])
    df['hour'] = df['power_outage_datetime'].dt.hour
    df['day_of_week'] = df['power_outage_datetime'].dt.dayofweek
    df['month'] = df['power_outage_datetime'].dt.month
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    
    # Create outage target variable (1 if customers_out > 0, 0 otherwise)
    df['outage_occurred'] = (df['customers_out'] > 0).astype(int)
    
    # Use available storm/weather features as proxies
    # MAGNITUDE_IMPUTED represents storm intensity (wind speed proxy)
    # DAMAGE_PROPERTY represents storm severity (weather impact proxy)
    # duration_hours represents storm duration
    
    # Fill missing values with medians
    df['MAGNITUDE_IMPUTED'] = df['MAGNITUDE_IMPUTED'].fillna(df['MAGNITUDE_IMPUTED'].median())
    df['DAMAGE_PROPERTY'] = df['DAMAGE_PROPERTY'].fillna(0)
    df['duration_hours'] = df['duration_hours'].fillna(df['duration_hours'].median())
    df['customers_out'] = df['customers_out'].fillna(0)
    
    # Create weather-like features from available data
    weather_features = [
        'MAGNITUDE_IMPUTED',  # Storm magnitude (wind speed proxy)
        'duration_hours',     # Storm duration (weather persistence proxy) 
        'DAMAGE_PROPERTY',    # Property damage (weather severity proxy)
        'INJURIES_DIRECT',    # Direct injuries (storm impact proxy)
        'customers_out'       # Number of customers affected (grid load proxy)
    ]
    
    # Fill remaining missing values
    for feature in weather_features:
        df[feature] = df[feature].fillna(0)
    
    # Extract temporal features  
    temporal_features = ['hour', 'day_of_week', 'month', 'is_weekend']
    
    # Create feature matrices
    X_weather = df[weather_features].values
    X_temporal = df[temporal_features].values
    
    # Target variable
    y = df['outage_occurred'].values
    
    print(f"Weather features shape: {X_weather.shape}")
    print(f"Temporal features shape: {X_temporal.shape}")
    print(f"Target distribution: {np.bincount(y)}")
    print(f"Weather features used: {weather_features}")
    print(f"Temporal features used: {temporal_features}")
    
    return X_weather, X_temporal, y

def create_model(weather_input_dim, temporal_input_dim):
    """Create neural network model."""
    
    # Weather input branch
    weather_input = keras.Input(shape=(weather_input_dim,), name='weather_input')
    weather_dense = keras.layers.Dense(32, activation='relu')(weather_input)
    weather_dropout = keras.layers.Dropout(0.2)(weather_dense)
    
    # Temporal input branch
    temporal_input = keras.Input(shape=(temporal_input_dim,), name='temporal_input')
    temporal_dense = keras.layers.Dense(16, activation='relu')(temporal_input)
    temporal_dropout = keras.layers.Dropout(0.2)(temporal_dense)
    
    # Combine branches
    combined = keras.layers.concatenate([weather_dropout, temporal_dropout])
    
    # Output layers
    hidden = keras.layers.Dense(32, activation='relu')(combined)
    hidden_dropout = keras.layers.Dropout(0.3)(hidden)
    output = keras.layers.Dense(1, activation='sigmoid')(hidden_dropout)
    
    # Create model
    model = keras.Model(inputs=[weather_input, temporal_input], outputs=output)
    
    model.compile(
        optimizer='adam',
        loss='binary_crossentropy',
        metrics=['accuracy', 'precision', 'recall']
    )
    
    return model

def train_model(X_weather, X_temporal, y):
    """Train the model."""
    print("Preparing data for training...")
    
    # Split data
    X_weather_train, X_weather_test, X_temporal_train, X_temporal_test, y_train, y_test = train_test_split(
        X_weather, X_temporal, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Scale features
    weather_scaler = RobustScaler()
    temporal_scaler = MinMaxScaler()
    
    X_weather_train_scaled = weather_scaler.fit_transform(X_weather_train)
    X_weather_test_scaled = weather_scaler.transform(X_weather_test)
    
    X_temporal_train_scaled = temporal_scaler.fit_transform(X_temporal_train)
    X_temporal_test_scaled = temporal_scaler.transform(X_temporal_test)
    
    # Create model
    model = create_model(X_weather.shape[1], X_temporal.shape[1])
    
    print("Training model...")
    
    # Train model
    history = model.fit(
        [X_weather_train_scaled, X_temporal_train_scaled], y_train,
        epochs=50,
        batch_size=32,
        validation_split=0.2,
        verbose=1
    )
    
    # Evaluate model
    print("Evaluating model...")
    predictions = model.predict([X_weather_test_scaled, X_temporal_test_scaled])
    y_pred = (predictions > 0.5).astype(int).flatten()
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    
    print(f"Model Performance:")
    print(f"Accuracy: {accuracy:.3f}")
    print(f"Precision: {precision:.3f}")
    print(f"Recall: {recall:.3f}")
    print(f"F1 Score: {f1:.3f}")
    
    return model, weather_scaler, temporal_scaler, {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1_score': f1
    }

def save_model_and_artifacts(model, weather_scaler, temporal_scaler, metrics, output_dir):
    """Save model and preprocessing artifacts."""
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Convert to TensorFlow.js format
    print(f"Converting model to TensorFlow.js format...")
    model_dir = os.path.join(output_dir, 'outage_prediction_model')
    tfjs.converters.save_keras_model(model, model_dir)
    
    # Save preprocessing parameters
    preprocessing_params = {
        'weather_scaler': {
            'type': 'RobustScaler',
            'parameters': [
                {
                    'median': float(weather_scaler.center_[i]),
                    'scale': float(weather_scaler.scale_[i])
                }
                for i in range(len(weather_scaler.center_))
            ]
        },
        'temporal_scaler': {
            'type': 'MinMaxScaler',
            'parameters': {
                f'feature_{i}': {
                    'min': float(temporal_scaler.data_min_[i]),
                    'max': float(temporal_scaler.data_max_[i])
                }
                for i in range(len(temporal_scaler.data_min_))
            }
        }
    }
    
    with open(os.path.join(output_dir, 'preprocessing_params.json'), 'w') as f:
        json.dump(preprocessing_params, f, indent=2)
    
    # Save model metadata
    metadata = {
        'model_version': '1.0.0',
        'created_at': pd.Timestamp.now().isoformat(),
        'framework': 'TensorFlow.js',
        'performance': metrics,
        'input_features': {
            'weather_features': ['MAGNITUDE_IMPUTED', 'duration_hours', 'DAMAGE_PROPERTY', 'INJURIES_DIRECT', 'customers_out'],
            'temporal_features': ['hour', 'day_of_week', 'month', 'is_weekend']
        },
        'preprocessing': {
            'weather_scaling': 'RobustScaler',
            'temporal_scaling': 'MinMaxScaler'
        },
        'data_source': 'storm_and_outage_merged_2014_2023.parquet',
        'feature_mapping': {
            'MAGNITUDE_IMPUTED': 'Storm magnitude (wind speed proxy)',
            'duration_hours': 'Storm duration (weather persistence proxy)',
            'DAMAGE_PROPERTY': 'Property damage (weather severity proxy)',
            'INJURIES_DIRECT': 'Direct injuries (storm impact proxy)',
            'customers_out': 'Number of customers affected (grid load proxy)'
        }
    }
    
    with open(os.path.join(output_dir, 'model_metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"Model and artifacts saved to {output_dir}")
    print(f"- TensorFlow.js model: {model_dir}")
    print(f"- Preprocessing params: {os.path.join(output_dir, 'preprocessing_params.json')}")
    print(f"- Model metadata: {os.path.join(output_dir, 'model_metadata.json')}")

def main():
    parser = argparse.ArgumentParser(description='Train outage prediction model')
    parser.add_argument('--input', required=True, help='Path to input parquet file')
    parser.add_argument('--output', required=True, help='Output directory for model artifacts')
    
    args = parser.parse_args()
    
    try:
        # Load and preprocess data
        X_weather, X_temporal, y = load_and_preprocess_data(args.input)
        
        # Train model
        model, weather_scaler, temporal_scaler, metrics = train_model(X_weather, X_temporal, y)
        
        # Save artifacts
        save_model_and_artifacts(model, weather_scaler, temporal_scaler, metrics, args.output)
        
        print("Training completed successfully!")
        
    except Exception as e:
        print(f"Training failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()