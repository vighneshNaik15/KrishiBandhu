import {
  GeocodingLocationsResponseSchema,
  WeatherApiErrorSchema,
  WeatherForecastSchema,
  type WeatherForecast,
  type WeatherLocation,
} from '@/models/weather';

async function getResponseBody(response: Response): Promise<unknown> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('The weather service returned an invalid response.');
  }

  if (!response.ok) {
    const apiError = WeatherApiErrorSchema.safeParse(body);
    throw new Error(
      apiError.success
        ? apiError.data.error
        : `The weather request failed (${response.status}).`
    );
  }

  return body;
}

function getNetworkError(error: unknown, signal?: AbortSignal): never {
  if (signal?.aborted) {
    throw error;
  }
  throw new Error('Could not connect to the weather service. Check your connection and try again.');
}

export const weatherService = {
  async searchLocations(query: string, signal?: AbortSignal): Promise<WeatherLocation[]> {
    const params = new URLSearchParams({ q: query });
    let response: Response;
    try {
      response = await fetch(`/api/weather/geocode?${params}`, { signal });
    } catch (error: unknown) {
      getNetworkError(error, signal);
    }

    const body = await getResponseBody(response);
    const result = GeocodingLocationsResponseSchema.safeParse(body);
    if (!result.success) {
      throw new Error('The location service returned invalid data. Please try again.');
    }
    return result.data.locations;
  },

  async getForecast(
    latitude: number,
    longitude: number,
    signal?: AbortSignal
  ): Promise<WeatherForecast> {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
    });
    let response: Response;
    try {
      response = await fetch(`/api/weather/forecast?${params}`, { signal });
    } catch (error: unknown) {
      getNetworkError(error, signal);
    }

    const body = await getResponseBody(response);
    const result = WeatherForecastSchema.safeParse(body);
    if (!result.success) {
      throw new Error('The weather service returned invalid data. Please try again.');
    }
    return result.data;
  },
};
