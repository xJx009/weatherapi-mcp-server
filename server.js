#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// WeatherAPI.com MCP Server
class WeatherApiServer {
  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY;
    this.baseUrl = 'https://api.weatherapi.com/v1';
    
    if (!this.apiKey) {
      throw new Error('WEATHER_API_KEY environment variable is required');
    }

    this.server = new Server(
      {
        name: 'weatherapi-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_current_weather',
            description: 'Get current weather for a location',
            inputSchema: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: 'Location (city name, coordinates, etc.)',
                },
                aqi: {
                  type: 'string',
                  description: 'Include air quality data (yes/no)',
                  enum: ['yes', 'no'],
                  default: 'no',
                },
              },
              required: ['location'],
            },
          },
          {
            name: 'get_weather_forecast',
            description: 'Get weather forecast for a location',
            inputSchema: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: 'Location (city name, coordinates, etc.)',
                },
                days: {
                  type: 'number',
                  description: 'Number of days (1-14)',
                  minimum: 1,
                  maximum: 14,
                  default: 3,
                },
                aqi: {
                  type: 'string',
                  description: 'Include air quality data (yes/no)',
                  enum: ['yes', 'no'],
                  default: 'no',
                },
                alerts: {
                  type: 'string',
                  description: 'Include weather alerts (yes/no)',
                  enum: ['yes', 'no'],
                  default: 'no',
                },
              },
              required: ['location'],
            },
          },
          {
            name: 'get_weather_history',
            description: 'Get historical weather data',
            inputSchema: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: 'Location (city name, coordinates, etc.)',
                },
                date: {
                  type: 'string',
                  description: 'Date in YYYY-MM-DD format',
                },
              },
              required: ['location', 'date'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_current_weather':
            return await this.getCurrentWeather(args);
          case 'get_weather_forecast':
            return await this.getWeatherForecast(args);
          case 'get_weather_history':
            return await this.getWeatherHistory(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error calling tool ${name}: ${error.message}`
        );
      }
    });
  }

  async getCurrentWeather(args) {
    const { location, aqi = 'no' } = args;
    
    const url = `${this.baseUrl}/current.json?key=${this.apiKey}&q=${encodeURIComponent(location)}&aqi=${aqi}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch current weather');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatCurrentWeather(data),
        },
      ],
    };
  }

  async getWeatherForecast(args) {
    const { location, days = 3, aqi = 'no', alerts = 'no' } = args;
    
    const url = `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${encodeURIComponent(location)}&days=${days}&aqi=${aqi}&alerts=${alerts}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch weather forecast');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatWeatherForecast(data),
        },
      ],
    };
  }

  async getWeatherHistory(args) {
    const { location, date } = args;
    
    const url = `${this.baseUrl}/history.json?key=${this.apiKey}&q=${encodeURIComponent(location)}&dt=${date}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch weather history');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatWeatherHistory(data),
        },
      ],
    };
  }

  formatCurrentWeather(data) {
    const { location, current } = data;
    
    let result = `🌍 **${location.name}, ${location.country}**\n`;
    result += `📍 ${location.region} (${location.lat}, ${location.lon})\n`;
    result += `🕐 Local time: ${location.localtime}\n\n`;
    
    result += `🌡️ **Current Weather:**\n`;
    result += `• Temperature: ${current.temp_c}°C (${current.temp_f}°F)\n`;
    result += `• Feels like: ${current.feelslike_c}°C (${current.feelslike_f}°F)\n`;
    result += `• Condition: ${current.condition.text}\n`;
    result += `• Humidity: ${current.humidity}%\n`;
    result += `• Wind: ${current.wind_kph} km/h (${current.wind_mph} mph) ${current.wind_dir}\n`;
    result += `• Pressure: ${current.pressure_mb} mb\n`;
    result += `• Visibility: ${current.vis_km} km\n`;
    result += `• UV Index: ${current.uv}\n`;
    
    if (data.current.air_quality) {
      result += `\n🏭 **Air Quality:**\n`;
      const aqi = data.current.air_quality;
      result += `• CO: ${aqi.co} μg/m³\n`;
      result += `• NO2: ${aqi.no2} μg/m³\n`;
      result += `• O3: ${aqi.o3} μg/m³\n`;
      result += `• PM2.5: ${aqi.pm2_5} μg/m³\n`;
      result += `• PM10: ${aqi.pm10} μg/m³\n`;
    }
    
    return result;
  }

  formatWeatherForecast(data) {
    const { location, forecast } = data;
    
    let result = `🌍 **${location.name}, ${location.country}**\n`;
    result += `📍 ${location.region}\n\n`;
    
    result += `📅 **Weather Forecast:**\n\n`;
    
    forecast.forecastday.forEach((day, index) => {
      const { date, day: dayData, hour } = day;
      result += `**${date}** (${index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : new Date(date).toLocaleDateString('en-US', { weekday: 'long' })})\n`;
      result += `• High: ${dayData.maxtemp_c}°C (${dayData.maxtemp_f}°F)\n`;
      result += `• Low: ${dayData.mintemp_c}°C (${dayData.mintemp_f}°F)\n`;
      result += `• Condition: ${dayData.condition.text}\n`;
      result += `• Chance of rain: ${dayData.daily_chance_of_rain}%\n`;
      result += `• Max wind: ${dayData.maxwind_kph} km/h\n`;
      result += `• Avg humidity: ${dayData.avghumidity}%\n\n`;
    });
    
    if (data.alerts && data.alerts.alert.length > 0) {
      result += `⚠️ **Weather Alerts:**\n`;
      data.alerts.alert.forEach(alert => {
        result += `• ${alert.headline}\n`;
        result += `  ${alert.desc}\n\n`;
      });
    }
    
    return result;
  }

  formatWeatherHistory(data) {
    const { location, forecast } = data;
    const dayData = forecast.forecastday[0];
    
    let result = `🌍 **${location.name}, ${location.country}**\n`;
    result += `📍 ${location.region}\n`;
    result += `📅 Historical weather for ${dayData.date}\n\n`;
    
    result += `🌡️ **Temperature:**\n`;
    result += `• Max: ${dayData.day.maxtemp_c}°C (${dayData.day.maxtemp_f}°F)\n`;
    result += `• Min: ${dayData.day.mintemp_c}°C (${dayData.day.mintemp_f}°F)\n`;
    result += `• Avg: ${dayData.day.avgtemp_c}°C (${dayData.day.avgtemp_f}°F)\n\n`;
    
    result += `🌤️ **Conditions:**\n`;
    result += `• ${dayData.day.condition.text}\n`;
    result += `• Max wind: ${dayData.day.maxwind_kph} km/h\n`;
    result += `• Total precipitation: ${dayData.day.totalprecip_mm} mm\n`;
    result += `• Avg humidity: ${dayData.day.avghumidity}%\n`;
    result += `• UV Index: ${dayData.day.uv}\n`;
    
    return result;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('WeatherAPI MCP server running on stdio');
  }
}

// Start the server
const server = new WeatherApiServer();
server.run().catch(console.error);