import Config from 'react-native-config';
import WeatherService from '../../../src/backend/weather/WeatherService';

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
}));

describe('WeatherService', () => {
  const originalWeatherApiKey = Config.WEATHER_API_KEY;

  afterEach(() => {
    Config.WEATHER_API_KEY = originalWeatherApiKey;
    jest.restoreAllMocks();
  });

  it('reads the WeatherAPI key from runtime configuration', async () => {
    Config.WEATHER_API_KEY = 'runtime-weather-key';
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          temp_c: 24,
          humidity: 60,
          wind_kph: 18,
          precip_mm: 0,
          pressure_mb: 1012,
          vis_km: 10,
          cloud: 20,
          uv: 5,
          condition: { text: 'Clear', icon: '//cdn.weatherapi.com/clear.png' },
          last_updated_epoch: 1_700_000_000,
        },
        location: { name: 'Nairobi', region: 'Nairobi County', country: 'Kenya' },
      }),
    } as Response);

    const weather = await new WeatherService().getWeatherForLocation(-1.2864, 36.8172);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('key=runtime-weather-key'),
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(weather?.location.city).toBe('Nairobi');
    expect(weather).toMatchObject({ source: 'weatherapi' });
  });

  it('does not call the API when the WeatherAPI key is missing', async () => {
    Config.WEATHER_API_KEY = '';
    const fetchSpy = jest.spyOn(global, 'fetch');
    const weather = await new WeatherService().getWeatherForLocation(-1.2864, 36.8172);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(weather).toBeNull();
  });

  it('rejects invalid coordinates without calling the provider', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const weather = await new WeatherService().getWeatherForLocation(100, 36.8172);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(weather).toBeNull();
  });

  it('returns unavailable instead of fabricating a forecast after provider failure', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));
    const forecast = await new WeatherService().getWeatherForecast(-1.2864, 36.8172);
    expect(forecast).toBeNull();
  });

  it('does not manufacture weather alerts', async () => {
    await expect(new WeatherService().getWeatherAlerts(-1.2864, 36.8172)).resolves.toEqual([]);
  });
});
