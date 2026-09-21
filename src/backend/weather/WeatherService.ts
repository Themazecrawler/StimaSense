import Geolocation from '@react-native-community/geolocation';

import { environment } from '../../config/environment';
import { logger } from '../../observability/logger';

interface GeolocationResponse {
  coords: { latitude: number; longitude: number };
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  pressure: number;
  visibility: number;
  cloudCover: number;
  uvIndex: number;
  description: string;
  icon: string;
  location: {
    latitude: number;
    longitude: number;
    city: string;
    region: string;
  };
  timestamp: Date;
  fetchedAt: Date;
  source: 'weatherapi';
}

export interface WeatherForecast {
  hourly: WeatherData[];
  daily: WeatherData[];
}

export class InvalidCoordinatesError extends Error {
  constructor() {
    super('Coordinates must be finite and within valid latitude/longitude ranges');
    this.name = 'InvalidCoordinatesError';
  }
}

class WeatherService {
  private readonly BASE_URL = 'https://api.weatherapi.com/v1';
  private readonly REQUEST_TIMEOUT_MS = 10_000;

  async getCurrentWeather(): Promise<WeatherData | null> {
    const location = await this.getUserLocation();
    if (!location) return null;
    return this.getWeatherForLocation(location.latitude, location.longitude);
  }

  async getWeatherForLocation(latitude: number, longitude: number): Promise<WeatherData | null> {
    try {
      this.validateCoordinates(latitude, longitude);
      const data = await this.request(
        `/current.json?key=${environment.weatherApiKey}&q=${latitude},${longitude}&aqi=no`,
      );
      return this.parseWeatherResponse(data, latitude, longitude);
    } catch (error) {
      logger.error('weather.current_unavailable', error, { provider: 'weatherapi' });
      return null;
    }
  }

  async getWeatherForecast(latitude: number, longitude: number): Promise<WeatherForecast | null> {
    try {
      this.validateCoordinates(latitude, longitude);
      const data = await this.request(
        `/forecast.json?key=${environment.weatherApiKey}&q=${latitude},${longitude}&days=7&aqi=no&alerts=no`,
      );
      return this.parseForecastResponse(data, latitude, longitude);
    } catch (error) {
      logger.error('weather.forecast_unavailable', error, { provider: 'weatherapi' });
      return null;
    }
  }

  async getWeatherAlerts(_latitude: number, _longitude: number): Promise<never[]> {
    logger.info('weather.alerts_not_configured');
    return [];
  }

  async getHistoricalWeather(
    _latitude: number,
    _longitude: number,
    _startDate: Date,
    _endDate: Date,
  ): Promise<never[]> {
    logger.info('weather.history_not_configured');
    return [];
  }

  private async request(path: string): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.BASE_URL}${path}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Weather API returned HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const location = await new Promise<GeolocationResponse>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
        );
      });
      return { latitude: location.coords.latitude, longitude: location.coords.longitude };
    } catch (error) {
      logger.warn('location.current_unavailable', {
        reason: error instanceof Error ? error.name : 'geolocation_error',
      });
      return null;
    }
  }

  private validateCoordinates(latitude: number, longitude: number): void {
    if (
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
    ) {
      throw new InvalidCoordinatesError();
    }
  }

  private parseWeatherResponse(data: any, latitude: number, longitude: number): WeatherData {
    const current = data.current;
    const location = data.location;
    const fetchedAt = new Date();
    return {
      temperature: current.temp_c,
      humidity: current.humidity,
      windSpeed: current.wind_kph / 3.6,
      precipitation: current.precip_mm,
      pressure: current.pressure_mb,
      visibility: current.vis_km,
      cloudCover: current.cloud,
      uvIndex: current.uv,
      description: current.condition.text,
      icon: current.condition.icon,
      location: { latitude, longitude, city: location.name, region: location.region || location.country },
      timestamp: new Date(current.last_updated_epoch * 1000),
      fetchedAt,
      source: 'weatherapi',
    };
  }

  private parseForecastResponse(data: any, latitude: number, longitude: number): WeatherForecast {
    const location = data.location;
    const fetchedAt = new Date();
    const commonLocation = { latitude, longitude, city: location.name, region: location.region || location.country };
    const hourly = (data.forecast?.forecastday?.[0]?.hour || []).map((hour: any): WeatherData => ({
      temperature: hour.temp_c,
      humidity: hour.humidity,
      windSpeed: hour.wind_kph / 3.6,
      precipitation: hour.precip_mm,
      pressure: hour.pressure_mb,
      visibility: hour.vis_km,
      cloudCover: hour.cloud,
      uvIndex: hour.uv,
      description: hour.condition.text,
      icon: hour.condition.icon,
      location: commonLocation,
      timestamp: new Date(hour.time_epoch * 1000),
      fetchedAt,
      source: 'weatherapi',
    }));
    const daily = (data.forecast?.forecastday || []).map((day: any): WeatherData => ({
      temperature: day.day.avgtemp_c,
      humidity: day.day.avghumidity,
      windSpeed: day.day.maxwind_kph / 3.6,
      precipitation: day.day.totalprecip_mm,
      pressure: data.current.pressure_mb,
      visibility: day.day.avgvis_km,
      cloudCover: day.day.daily_chance_of_rain,
      uvIndex: day.day.uv,
      description: day.day.condition.text,
      icon: day.day.condition.icon,
      location: commonLocation,
      timestamp: new Date(day.date_epoch * 1000),
      fetchedAt,
      source: 'weatherapi',
    }));
    return { hourly, daily };
  }
}

export const weatherService = new WeatherService();
export default WeatherService;
