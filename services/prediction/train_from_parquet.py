#!/usr/bin/env python3
"""
Train outage prediction model from parquet data for StimaSense GitHub workflow.
"""

import argparse
import hashlib
import os
import sys
import json
import random
from datetime import datetime, timezone
import pandas as pd
import numpy as np

WEATHER_FEATURES = [
    'MAGNITUDE_IMPUTED',
    'duration_hours',
    'DAMAGE_PROPERTY',
    'INJURIES_DIRECT',
    'DAMAGE_CROPS',
]
TEMPORAL_FEATURES = ['hour', 'day_of_week', 'month', 'is_weekend']


def sha256_file(path, chunk_size=1024 * 1024):
    digest = hashlib.sha256()
    with open(path, 'rb') as source:
        for chunk in iter(lambda: source.read(chunk_size), b''):
            digest.update(chunk)
    return digest.hexdigest()


def configure_reproducibility(seed):
    """Seed Python, NumPy, and TensorFlow and request deterministic operations."""
    os.environ['PYTHONHASHSEED'] = str(seed)
    os.environ['TF_DETERMINISTIC_OPS'] = '1'
    random.seed(seed)
    np.random.seed(seed)

    import tensorflow as tf

    tf.keras.utils.set_random_seed(seed)
    try:
        tf.config.experimental.enable_op_determinism()
    except (AttributeError, RuntimeError):
        # Older TensorFlow builds may not expose deterministic-op configuration.
        pass

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
    
    # Fill missing values with medians
    df['MAGNITUDE_IMPUTED'] = df['MAGNITUDE_IMPUTED'].fillna(df['MAGNITUDE_IMPUTED'].median())
    df['DAMAGE_PROPERTY'] = df['DAMAGE_PROPERTY'].fillna(0)
    df['DAMAGE_CROPS'] = df['DAMAGE_CROPS'].fillna(0)
    df['duration_hours'] = df['duration_hours'].fillna(df['duration_hours'].median())
    df['customers_out'] = df['customers_out'].fillna(0)

    # Fill remaining missing values
    for feature in WEATHER_FEATURES:
        df[feature] = df[feature].fillna(0)

    # Create feature matrices
    X_weather = df[WEATHER_FEATURES].values
    X_temporal = df[TEMPORAL_FEATURES].values
    
    # Target variable
    y = df['outage_occurred'].values
    
    print(f"Weather features shape: {X_weather.shape}")
    print(f"Temporal features shape: {X_temporal.shape}")
    print(f"Target distribution: {np.bincount(y)}")
    print(f"Weather features used: {WEATHER_FEATURES}")
    print(f"Temporal features used: {TEMPORAL_FEATURES}")
    
    return X_weather, X_temporal, y

def create_model(weather_input_dim, temporal_input_dim):
    """Create neural network model."""
    from tensorflow import keras
    
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

def train_model(X_weather, X_temporal, y, seed, epochs, batch_size, test_size):
    """Train the model."""
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import RobustScaler, MinMaxScaler

    print("Preparing data for training...")
    
    # Split data
    X_weather_train, X_weather_test, X_temporal_train, X_temporal_test, y_train, y_test = train_test_split(
        X_weather, X_temporal, y, test_size=test_size, random_state=seed, stratify=y
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
        epochs=epochs,
        batch_size=batch_size,
        validation_split=0.2,
        shuffle=True,
        verbose=1
    )
    
    # Evaluate model
    print("Evaluating model...")
    predictions = model.predict([X_weather_test_scaled, X_temporal_test_scaled])
    y_pred = (predictions > 0.5).astype(int).flatten()
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    loss = float(model.evaluate(
        [X_weather_test_scaled, X_temporal_test_scaled],
        y_test,
        verbose=0,
    )[0])

    baseline = RandomForestClassifier(
        n_estimators=100,
        class_weight='balanced',
        n_jobs=1,
        random_state=seed,
    )
    baseline_train = np.concatenate([X_weather_train_scaled, X_temporal_train_scaled], axis=1)
    baseline_test = np.concatenate([X_weather_test_scaled, X_temporal_test_scaled], axis=1)
    baseline.fit(baseline_train, y_train)
    baseline_predictions = baseline.predict(baseline_test)
    baseline_metrics = {
        'accuracy': float(accuracy_score(y_test, baseline_predictions)),
        'precision': float(precision_score(y_test, baseline_predictions, zero_division=0)),
        'recall': float(recall_score(y_test, baseline_predictions, zero_division=0)),
        'f1_score': float(f1_score(y_test, baseline_predictions, zero_division=0)),
    }
    
    print(f"Model Performance:")
    print(f"Accuracy: {accuracy:.3f}")
    print(f"Precision: {precision:.3f}")
    print(f"Recall: {recall:.3f}")
    print(f"F1 Score: {f1:.3f}")
    print(f"Loss: {loss:.3f}")
    print(f"Random forest baseline F1: {baseline_metrics['f1_score']:.3f}")
    
    return model, weather_scaler, temporal_scaler, {
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1),
        'loss': loss,
        'baseline': baseline_metrics,
        'epochs': epochs,
        'batch_size': batch_size,
        'test_size': test_size,
        'final_training_loss': float(history.history['loss'][-1]),
        'final_validation_loss': float(history.history['val_loss'][-1]),
    }

def save_model_and_artifacts(
    model,
    weather_scaler,
    temporal_scaler,
    metrics,
    output_dir,
    input_path,
    seed,
):
    """Save model and preprocessing artifacts."""
    import tensorflowjs as tfjs
    
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

    metrics_artifact = {
        **metrics,
        'seed': seed,
        'input_file': os.path.basename(input_path),
        'input_sha256': sha256_file(input_path),
    }
    with open(os.path.join(output_dir, 'metrics.json'), 'w') as f:
        json.dump(metrics_artifact, f, indent=2)
    
    # Save model metadata
    metadata = {
        'model_version': '1.0.0',
        'created_at': datetime.now(timezone.utc).isoformat(),
        'framework': 'TensorFlow.js',
        'performance': metrics_artifact,
        'input_features': {
            'weather_features': WEATHER_FEATURES,
            'temporal_features': TEMPORAL_FEATURES,
        },
        'preprocessing': {
            'weather_scaling': 'RobustScaler',
            'temporal_scaling': 'MinMaxScaler'
        },
        'data_source': os.path.basename(input_path),
        'data_sha256': metrics_artifact['input_sha256'],
        'seed': seed,
        'feature_mapping': {
            'MAGNITUDE_IMPUTED': 'Storm magnitude (wind speed proxy)',
            'duration_hours': 'Storm duration (weather persistence proxy)',
            'DAMAGE_PROPERTY': 'Property damage (weather severity proxy)',
            'INJURIES_DIRECT': 'Direct injuries (storm impact proxy)',
            'DAMAGE_CROPS': 'Crop damage (weather severity proxy)'
        }
    }
    
    with open(os.path.join(output_dir, 'model_metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"Model and artifacts saved to {output_dir}")
    print(f"- TensorFlow.js model: {model_dir}")
    print(f"- Preprocessing params: {os.path.join(output_dir, 'preprocessing_params.json')}")
    print(f"- Model metadata: {os.path.join(output_dir, 'model_metadata.json')}")
    print(f"- Metrics: {os.path.join(output_dir, 'metrics.json')}")

def parse_args(argv=None):
    parser = argparse.ArgumentParser(description='Train outage prediction model')
    parser.add_argument('--input', required=True, help='Path to input parquet file')
    parser.add_argument('--output', required=True, help='Output directory for model artifacts')
    parser.add_argument('--seed', type=int, default=42, help='Random seed (default: 42)')
    parser.add_argument('--epochs', type=int, default=50, help='Training epochs (default: 50)')
    parser.add_argument('--batch-size', type=int, default=32, help='Training batch size (default: 32)')
    parser.add_argument('--test-size', type=float, default=0.2, help='Test fraction (default: 0.2)')
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)

    try:
        if args.epochs < 1:
            raise ValueError('--epochs must be at least 1')
        if args.batch_size < 1:
            raise ValueError('--batch-size must be at least 1')
        if not 0 < args.test_size < 1:
            raise ValueError('--test-size must be between 0 and 1')

        configure_reproducibility(args.seed)
        print(f"Training configuration: seed={args.seed}, epochs={args.epochs}, "
              f"batch_size={args.batch_size}, test_size={args.test_size}")

        # Load and preprocess data
        X_weather, X_temporal, y = load_and_preprocess_data(args.input)

        # Train model
        model, weather_scaler, temporal_scaler, metrics = train_model(
            X_weather,
            X_temporal,
            y,
            seed=args.seed,
            epochs=args.epochs,
            batch_size=args.batch_size,
            test_size=args.test_size,
        )
        metrics['dataset_rows'] = int(len(y))
        metrics['positive_labels'] = int(np.sum(y))
        metrics['positive_label_rate'] = float(np.mean(y))

        # Save artifacts
        save_model_and_artifacts(
            model,
            weather_scaler,
            temporal_scaler,
            metrics,
            args.output,
            args.input,
            args.seed,
        )

        print("Training completed successfully!")

    except Exception as e:
        print(f"Training failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
