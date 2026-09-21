import Config from 'react-native-config';
import {
  getRequiredEnvironmentVariable,
  MissingEnvironmentVariableError,
} from '../../src/config/environment';

describe('environment configuration', () => {
  const originalWeatherApiKey = Config.WEATHER_API_KEY;

  afterEach(() => {
    Config.WEATHER_API_KEY = originalWeatherApiKey;
  });

  it('returns a trimmed required value', () => {
    Config.WEATHER_API_KEY = '  weather-key  ';

    expect(getRequiredEnvironmentVariable('WEATHER_API_KEY')).toBe('weather-key');
  });

  it('throws a typed error when a required value is missing', () => {
    Config.WEATHER_API_KEY = '   ';

    expect(() => getRequiredEnvironmentVariable('WEATHER_API_KEY')).toThrow(
      MissingEnvironmentVariableError,
    );
  });
});
