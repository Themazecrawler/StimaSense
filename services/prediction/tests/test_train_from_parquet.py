import unittest
from unittest.mock import patch

import numpy as np
import pandas as pd

from services.prediction import train_from_parquet


class TrainFromParquetTests(unittest.TestCase):
    def test_preprocessing_keeps_target_out_of_model_features(self):
        frame = pd.DataFrame({
            'power_outage_datetime': pd.to_datetime([
                '2024-01-01T08:00:00',
                '2024-01-02T12:00:00',
                '2024-01-06T18:00:00',
                '2024-01-07T23:00:00',
            ]),
            'customers_out': [0, 500, 0, 250],
            'MAGNITUDE_IMPUTED': [10.0, 20.0, np.nan, 40.0],
            'duration_hours': [2.0, 4.0, 6.0, np.nan],
            'DAMAGE_PROPERTY': [100.0, 200.0, 0.0, 50.0],
            'INJURIES_DIRECT': [0.0, 1.0, 0.0, 2.0],
            'DAMAGE_CROPS': [5.0, 10.0, np.nan, 0.0],
        })

        with patch.object(pd, 'read_parquet', return_value=frame):
            weather, temporal, target = train_from_parquet.load_and_preprocess_data('input.parquet')

        self.assertEqual(weather.shape, (4, 5))
        self.assertEqual(temporal.shape, (4, 4))
        np.testing.assert_array_equal(target, np.array([0, 1, 0, 1]))
        self.assertNotIn('customers_out', train_from_parquet.WEATHER_FEATURES)
        np.testing.assert_array_equal(weather[0], np.array([10.0, 2.0, 100.0, 0.0, 5.0]))

    def test_training_arguments_have_reproducible_defaults(self):
        args = train_from_parquet.parse_args([
            '--input', 'input.parquet',
            '--output', 'models',
        ])

        self.assertEqual(args.seed, 42)
        self.assertEqual(args.epochs, 50)
        self.assertEqual(args.batch_size, 32)
        self.assertEqual(args.test_size, 0.2)


if __name__ == '__main__':
    unittest.main()
