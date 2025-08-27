import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';

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
}

export interface WeatherForecast {
  hourly: WeatherData[];
  daily: WeatherData[];
}

class WeatherService {
  private readonly API_KEY = '69e2983aee59492cb4a155107252407';
  private readonly BASE_URL = 'https://api.weatherapi.com/v1';
  
  /**
   * Get current weather for user's location
   */
  async getCurrentWeather(): Promise<WeatherData | null> {
    try {
      const location = await this.getUserLocation();
      if (!location) return null;
      
      return await this.getWeatherForLocation(location.latitude, location.longitude);
    } catch (error) {
      console.error('Failed to get current weather:', error);
      return null;
    }
  }

  /**
   * Get weather for specific coordinates
   */
  async getWeatherForLocation(latitude: number, longitude: number): Promise<WeatherData | null> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/current.json?key=${this.API_KEY}&q=${latitude},${longitude}&aqi=no`
      );
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.parseWeatherResponse(data, latitude, longitude);
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      // Fallback to mock data for development
      return this.getMockWeatherData(latitude, longitude);
    }
  }

  /**
   * Get weather forecast
   */
  async getWeatherForecast(latitude: number, longitude: number): Promise<WeatherForecast | null> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/forecast.json?key=${this.API_KEY}&q=${latitude},${longitude}&days=7&aqi=no&alerts=no`
      );
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.parseForecastResponse(data, latitude, longitude);
    } catch (error) {
      console.error('Failed to get weather forecast:', error);
      // Fallback to mock data
      const current = await this.getWeatherForLocation(latitude, longitude);
      if (!current) return null;

      const hourly = Array.from({ length: 24 }, (_, i) => ({
        ...current,
        timestamp: new Date(Date.now() + i * 60 * 60 * 1000),
        temperature: current.temperature + (Math.random() - 0.5) * 10,
        precipitation: Math.random() * 5,
        windSpeed: current.windSpeed + (Math.random() - 0.5) * 10,
      }));

      const daily = Array.from({ length: 7 }, (_, i) => ({
        ...current,
        timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        temperature: current.temperature + (Math.random() - 0.5) * 15,
        precipitation: Math.random() * 10,
        windSpeed: current.windSpeed + (Math.random() - 0.5) * 15,
      }));

      return { hourly, daily };
    }
  }

  /**
   * Get severe weather alerts
   */
  async getWeatherAlerts(latitude: number, longitude: number): Promise<any[]> {
    try {
      // Mock severe weather alerts
      const alerts = [];
      
      // Simulate thunderstorm warning
      if (Math.random() > 0.7) {
        alerts.push({
          id: 'thunderstorm-001',
          title: 'Thunderstorm Warning',
          description: 'Severe thunderstorms expected with strong winds and heavy rain',
          severity: 'moderate',
          start: new Date(),
          end: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
          areas: ['Downtown', 'Mission District'],
        });
      }

      // Simulate high wind warning
      if (Math.random() > 0.8) {
        alerts.push({
          id: 'wind-001',
          title: 'High Wind Warning',
          description: 'Sustained winds 25-35 mph with gusts up to 50 mph',
          severity: 'high',
          start: new Date(),
          end: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
          areas: ['Citywide'],
        });
      }

      return alerts;
    } catch (error) {
      console.error('Failed to get weather alerts:', error);
      return [];
    }
  }

  /**
   * Get historical weather data for ML training
   */
  async getHistoricalWeather(
    latitude: number,
    longitude: number,
    startDate: Date,
    endDate: Date
  ): Promise<WeatherData[]> {
    try {
      // In production, this would call a historical weather API
      // For now, return mock historical data
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return Array.from({ length: days }, (_, i) => {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        return {
          temperature: 15 + Math.sin(i / 30) * 10 + (Math.random() - 0.5) * 5,
          humidity: 50 + Math.random() * 40,
          windSpeed: 5 + Math.random() * 15,
          precipitation: Math.random() > 0.7 ? Math.random() * 20 : 0,
          pressure: 1013 + (Math.random() - 0.5) * 20,
          visibility: 10 + Math.random() * 5,
          cloudCover: Math.random() * 100,
          uvIndex: Math.random() * 10,
          description: 'Clear sky',
          icon: '01d',
          location: {
            latitude,
            longitude,
            city: 'San Francisco',
            region: 'CA',
          },
          timestamp: date,
        };
      });
    } catch (error) {
      console.error('Failed to get historical weather:', error);
      return [];
    }
  }

  // Private methods
  private async getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      // Request permissions on Android; iOS handled by Geolocation.requestAuthorization
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('Location permission denied');
          return null;
        }
      } else {
        if (typeof (Geolocation as any).requestAuthorization === 'function') {
          (Geolocation as any).requestAuthorization();
        }
      }
      const granted = true;
      if (!granted) {
        console.warn('Location permission denied');
        return null;
      }

      const location = await new Promise<any>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          pos => resolve(pos),
          err => reject(err),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
        );
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Failed to get user location:', error);
      return null;
    }
  }

  private getMockWeatherData(latitude: number, longitude: number): WeatherData {
    // Generate realistic mock weather data
    const baseTemp = 20 + Math.sin(Date.now() / (1000 * 60 * 60 * 24)) * 10;
    
    return {
      temperature: baseTemp + (Math.random() - 0.5) * 5,
      humidity: 40 + Math.random() * 40,
      windSpeed: 5 + Math.random() * 15,
      precipitation: Math.random() > 0.8 ? Math.random() * 10 : 0,
      pressure: 1013 + (Math.random() - 0.5) * 15,
      visibility: 8 + Math.random() * 7,
      cloudCover: Math.random() * 100,
      uvIndex: Math.random() * 8,
      description: this.getWeatherDescription(),
      icon: '01d',
      location: {
        latitude,
        longitude,
        city: 'San Francisco',
        region: 'CA',
      },
      timestamp: new Date(),
    };
  }

  private getWeatherDescription(): string {
    const descriptions = [
      'Clear sky',
      'Few clouds',
      'Scattered clouds',
      'Broken clouds',
      'Overcast',
      'Light rain',
      'Moderate rain',
      'Thunderstorm',
    ];
    
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  /**
   * Parse WeatherAPI response
   */
  private parseWeatherResponse(data: any, latitude: number, longitude: number): WeatherData {
    const current = data.current;
    const location = data.location;
    
    return {
      temperature: current.temp_c,
      humidity: current.humidity,
      windSpeed: current.wind_kph / 3.6, // Convert km/h to m/s
      precipitation: current.precip_mm,
      pressure: current.pressure_mb,
      visibility: current.vis_km,
      cloudCover: current.cloud,
      uvIndex: current.uv,
      description: current.condition.text,
      icon: current.condition.icon,
      location: {
        latitude,
        longitude,
        city: location.name,
        region: location.region || location.country,
      },
      timestamp: new Date(current.last_updated_epoch * 1000),
    };
  }

  /**
   * Parse forecast response
   */
  private parseForecastResponse(data: any, latitude: number, longitude: number): WeatherForecast {
    const location = data.location;
    const current = data.current;
    
    const hourly = data.forecast?.forecastday?.[0]?.hour?.map((hour: any) => ({
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
      location: {
        latitude,
        longitude,
        city: location.name,
        region: location.region || location.country,
      },
      timestamp: new Date(hour.time_epoch * 1000),
    })) || [];

    const daily = data.forecast?.forecastday?.map((day: any) => ({
      temperature: day.day.avgtemp_c,
      humidity: day.day.avghumidity,
      windSpeed: day.day.maxwind_kph / 3.6,
      precipitation: day.day.totalprecip_mm,
      pressure: current.pressure_mb,
      visibility: 10, // Default visibility
      cloudCover: day.day.avgtemp_c > 25 ? 20 : 80, // Simple cloud logic
      uvIndex: day.day.uv,
      description: day.day.condition.text,
      icon: day.day.condition.icon,
      location: {
        latitude,
        longitude,
        city: location.name,
        region: location.region || location.country,
      },
      timestamp: new Date(day.date_epoch * 1000),
    })) || [];

    return { hourly, daily };
  }
}

export const weatherService = new WeatherService();
export default WeatherService;