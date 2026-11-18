import { z } from 'zod';

const nullableNumber = z.number().finite().nullable();
const optionalNullableNumber = nullableNumber.optional();
const optionalNumericSeries = z.array(optionalNullableNumber).optional();
const optionalWeatherCode = z.number().int().nullable().optional();
const optionalWeatherCodeSeries = z.array(optionalWeatherCode).optional();

export const WeatherLocationSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  admin1: z.string().optional(),
  admin2: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().optional(),
  timezone: z.string().optional(),
});

export const GeocodingLocationsResponseSchema = z.object({
  locations: z.array(WeatherLocationSchema),
});

export const OpenMeteoGeocodingResponseSchema = z.object({
  results: z.array(z.object({
    id: z.number().int().optional(),
    name: z.string().min(1),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    admin1: z.string().optional(),
    admin2: z.string().optional(),
    country: z.string().optional(),
    country_code: z.string().optional(),
    timezone: z.string().optional(),
  })).optional(),
});

export const WeatherForecastSchema = z.object({
  timezone: z.string().min(1),
  current: z.object({
    time: z.string().min(1),
    temperatureC: nullableNumber,
    apparentTemperatureC: nullableNumber,
    humidityPercent: nullableNumber,
    windSpeedKmh: nullableNumber,
    precipitationMm: nullableNumber,
    weatherCode: z.number().int().nullable(),
  }),
  daily: z.array(z.object({
    date: z.string().min(1),
    minTemperatureC: nullableNumber,
    maxTemperatureC: nullableNumber,
    precipitationMm: nullableNumber,
    precipitationProbability: nullableNumber,
    weatherCode: z.number().int().nullable(),
  })),
});

export const OpenMeteoForecastResponseSchema = z.object({
  timezone: z.string().min(1),
  current: z.object({
    time: z.string().min(1),
    temperature_2m: optionalNullableNumber,
    apparent_temperature: optionalNullableNumber,
    relative_humidity_2m: optionalNullableNumber,
    wind_speed_10m: optionalNullableNumber,
    precipitation: optionalNullableNumber,
    weather_code: optionalWeatherCode,
  }),
  daily: z.object({
    time: z.array(z.string().min(1)),
    temperature_2m_min: optionalNumericSeries,
    temperature_2m_max: optionalNumericSeries,
    precipitation_sum: optionalNumericSeries,
    precipitation_probability_max: optionalNumericSeries,
    weather_code: optionalWeatherCodeSeries,
  }),
});

export const WeatherApiErrorSchema = z.object({
  error: z.string().min(1),
});

export type WeatherLocation = z.infer<typeof WeatherLocationSchema>;
export type WeatherForecast = z.infer<typeof WeatherForecastSchema>;
