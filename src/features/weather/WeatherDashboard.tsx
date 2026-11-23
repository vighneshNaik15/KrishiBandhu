'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  MapPin,
  Search,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { farmService } from '@/services/farmService';
import { weatherService } from '@/services/weatherService';
import type { Farm } from '@/models/farm';
import type { WeatherForecast, WeatherLocation } from '@/models/weather';
import { getWeatherAdvisories, getWeatherCondition } from '@/utils/weather';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';

interface WeatherSelection {
  label: string;
  latitude: number;
  longitude: number;
  source: 'farm' | 'search';
  farmId?: string;
}

interface FarmLoadState {
  farmerId: string;
  farms: Farm[];
  loading: boolean;
  error: string | null;
}

interface ForecastLoadState {
  key: string;
  data: WeatherForecast | null;
  error: string | null;
}

function getFarmAddress(farm: Farm): string {
  return [farm.village, farm.taluka, farm.district, farm.state]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(', ');
}

function getFarmCoordinates(farm: Farm): { latitude: number; longitude: number } | null {
  const latitude = farm.coordinates?.latitude;
  const longitude = farm.coordinates?.longitude;
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}

function getFarmLoadError(error: unknown): string {
  return `${getFirebaseLoadErrorMessage(error, 'Your farm locations')} You can still search for a location.`;
}

function getLocationLabel(location: WeatherLocation): string {
  const parts = [location.name, location.admin1, location.country].filter(
    (part): part is string => Boolean(part?.trim())
  );
  return parts.filter((part, index) =>
    parts.findIndex((candidate) => candidate.toLocaleLowerCase() === part.toLocaleLowerCase()) === index
  ).join(', ');
}

function WeatherIcon({ code, className }: { code: number | null; className: string }) {
  if (code === 0) return <Sun className={className} aria-hidden />;
  if (code === 1 || code === 2) return <CloudSun className={className} aria-hidden />;
  if (code === 45 || code === 48 || code === 3) return <Cloud className={className} aria-hidden />;
  if (code !== null && [51, 53, 55, 56, 57].includes(code)) {
    return <CloudDrizzle className={className} aria-hidden />;
  }
  if (code !== null && [61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return <CloudRain className={className} aria-hidden />;
  }
  if (code !== null && [71, 73, 75, 77, 85, 86].includes(code)) {
    return <CloudSnow className={className} aria-hidden />;
  }
  if (code !== null && [95, 96, 99].includes(code)) {
    return <CloudLightning className={className} aria-hidden />;
  }
  return <Cloud className={className} aria-hidden />;
}

function formatNumber(value: number | null, unit: string, digits = 0): string {
  return value === null ? 'Unavailable' : `${value.toFixed(digits)} ${unit}`;
}

function formatForecastDate(date: string): string {
  const parsedDate = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return date;
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(parsedDate);
}

function formatObservationTime(time: string): string {
  return time.length >= 16 ? time.slice(11, 16) : time;
}

export function WeatherDashboard() {
  const { userProfile } = useAuth();
  const farmerId = userProfile?.uid ?? '';
  const [farmState, setFarmState] = useState<FarmLoadState>({
    farmerId: '',
    farms: [],
    loading: true,
    error: null,
  });
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<WeatherSelection | null>(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<WeatherLocation[]>([]);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(null);
  const [locationSearchMessage, setLocationSearchMessage] = useState<string | null>(null);
  const [searchingLocations, setSearchingLocations] = useState(false);
  const [forecastLoad, setForecastLoad] = useState<ForecastLoadState>({
    key: '',
    data: null,
    error: null,
  });
  const searchController = useRef<AbortController | null>(null);
  const locationSearchStarted = useRef(false);

  const farmStateIsCurrent = farmState.farmerId === farmerId;
  const farms = farmStateIsCurrent ? farmState.farms : [];
  const farmsLoading = !farmerId || !farmStateIsCurrent || farmState.loading;
  const farmError = farmStateIsCurrent ? farmState.error : null;
  const selectedFarm = farms.find((farm) => farm.farmId === selectedFarmId) ?? null;
  const forecastKey = selectedLocation
    ? `${selectedLocation.latitude},${selectedLocation.longitude},${selectedLocation.source},${selectedLocation.farmId ?? ''},${selectedLocation.label}`
    : '';
  const forecastIsCurrent = Boolean(selectedLocation) && forecastLoad.key === forecastKey;
  const forecast = forecastIsCurrent ? forecastLoad.data : null;
  const forecastLoading = Boolean(selectedLocation) && !forecastIsCurrent;
  const forecastError = forecastIsCurrent ? forecastLoad.error : null;

  useEffect(() => {
    if (!farmerId) return;

    let active = true;
    farmService.getByFarmer(farmerId)
      .then((loadedFarms) => {
        if (!active) return;
        const defaultFarm = loadedFarms.find((farm) => getFarmCoordinates(farm)) ?? loadedFarms[0];
        setFarmState({ farmerId, farms: loadedFarms, loading: false, error: null });
        if (!defaultFarm) return;

        setSelectedFarmId(defaultFarm.farmId);
        if (locationSearchStarted.current) return;
        setLocationQuery(getFarmAddress(defaultFarm));
        const coordinates = getFarmCoordinates(defaultFarm);
        setSelectedLocation(coordinates
          ? {
              label: getFarmAddress(defaultFarm) || defaultFarm.name,
              ...coordinates,
              source: 'farm',
              farmId: defaultFarm.farmId,
            }
          : null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setFarmState({
          farmerId,
          farms: [],
          loading: false,
          error: getFarmLoadError(error),
        });
      });

    return () => { active = false; };
  }, [farmerId]);

  useEffect(() => () => searchController.current?.abort(), []);

  useEffect(() => {
    if (!selectedLocation) {
      return;
    }

    const controller = new AbortController();
    const key = `${selectedLocation.latitude},${selectedLocation.longitude},${selectedLocation.source},${selectedLocation.farmId ?? ''},${selectedLocation.label}`;
    weatherService.getForecast(
      selectedLocation.latitude,
      selectedLocation.longitude,
      controller.signal
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setForecastLoad({ key, data, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setForecastLoad({
            key,
            data: null,
            error: error instanceof Error
              ? error.message
              : 'Weather data could not be loaded. Please try again.',
          });
        }
      });

    return () => controller.abort();
  }, [selectedLocation]);

  const handleFarmChange = (farmId: string) => {
    const farm = farms.find((item) => item.farmId === farmId);
    if (!farm) return;

    searchController.current?.abort();
    setSearchingLocations(false);
    setSelectedFarmId(farmId);
    setLocationQuery(getFarmAddress(farm));
    setLocationResults([]);
    setLocationSearchError(null);
    setLocationSearchMessage(null);
    const coordinates = getFarmCoordinates(farm);
    setSelectedLocation(coordinates
      ? {
          label: getFarmAddress(farm) || farm.name,
          ...coordinates,
          source: 'farm',
          farmId: farm.farmId,
        }
      : null);
  };

  const handleLocationSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    locationSearchStarted.current = true;
    const query = locationQuery.trim();
    if (query.length < 2) {
      setLocationSearchError('Enter at least 2 characters to search for a location.');
      setLocationResults([]);
      setLocationSearchMessage(null);
      return;
    }

    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    setSearchingLocations(true);
    setLocationSearchError(null);
    setLocationSearchMessage(null);
    setLocationResults([]);

    try {
      const results = await weatherService.searchLocations(query, controller.signal);
      if (controller.signal.aborted) return;
      setLocationResults(results);
      if (results.length === 0) {
        setLocationSearchMessage('No matching locations in India found. Try a nearby town or district.');
      }
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        setLocationSearchError(error instanceof Error
          ? error.message
          : 'Location search failed. Please try again.');
      }
    } finally {
      if (!controller.signal.aborted) setSearchingLocations(false);
    }
  };

  const chooseSearchResult = (location: WeatherLocation) => {
    searchController.current?.abort();
    setSearchingLocations(false);
    setSelectedLocation({
      label: getLocationLabel(location),
      latitude: location.latitude,
      longitude: location.longitude,
      source: 'search',
    });
    setLocationQuery(getLocationLabel(location));
    setLocationResults([]);
    setLocationSearchError(null);
    setLocationSearchMessage(null);
  };

  const useSelectedFarmLocation = () => {
    if (!selectedFarm) return;
    const coordinates = getFarmCoordinates(selectedFarm);
    if (!coordinates) return;
    setSelectedLocation({
      label: getFarmAddress(selectedFarm) || selectedFarm.name,
      ...coordinates,
      source: 'farm',
      farmId: selectedFarm.farmId,
    });
    setLocationQuery(getFarmAddress(selectedFarm));
    setLocationResults([]);
  };

  const farmOptions = farms.map((farm) => ({
    value: farm.farmId,
    label: `${farm.name} — ${getFarmAddress(farm) || 'Location not provided'}`,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold font-heading text-neutral-900">Farm Weather</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Current conditions, a 7-day forecast, and general weather-aware farm planning notes.
        </p>
      </header>

      {farmError && <Alert variant="error">{farmError}</Alert>}

      <Card>
        <div className="space-y-4">
          {farms.length > 0 && (
            <Select
              label="Registered farm"
              options={farmOptions}
              value={selectedFarmId}
              onChange={(event) => handleFarmChange(event.target.value)}
              disabled={farmsLoading}
              hint="A saved farm coordinate is used automatically when available."
            />
          )}

          <form onSubmit={handleLocationSearch} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
            <Input
              label="Search or change weather location"
              placeholder="Search an Indian village, town, district, or city"
              leftIcon={<Search className="w-4 h-4" aria-hidden />}
              value={locationQuery}
              onChange={(event) => {
                locationSearchStarted.current = true;
                setLocationQuery(event.target.value);
              }}
              disabled={searchingLocations}
              hint="Results are limited to India. Selecting one changes this weather view only; it does not update your saved farm."
            />
            <Button
              type="submit"
              isLoading={searchingLocations}
              leftIcon={<MapPin className="w-4 h-4" aria-hidden />}
            >
              Search location
            </Button>
          </form>

          {locationSearchError && <Alert variant="error">{locationSearchError}</Alert>}
          {locationSearchMessage && <p className="text-sm text-neutral-600" role="status">{locationSearchMessage}</p>}

          {locationResults.length > 0 && (
            <div className="space-y-2" aria-label="Location search results">
              <p className="text-sm font-medium text-neutral-700">Choose a location</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {locationResults.map((location, index) => {
                  const label = getLocationLabel(location);
                  return (
                    <button
                      key={location.id ?? `${location.latitude}-${location.longitude}-${index}`}
                      type="button"
                      onClick={() => chooseSearchResult(location)}
                      className="flex items-start gap-3 rounded-lg border border-neutral-200 p-3 text-left hover:border-primary-400 hover:bg-primary-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      <MapPin className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" aria-hidden />
                      <span>
                        <span className="block text-sm font-medium text-neutral-800">{label}</span>
                        {location.admin2 && (
                          <span className="block text-xs text-neutral-500">{location.admin2}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedFarm && !getFarmCoordinates(selectedFarm) && !selectedLocation && (
            <Alert variant="info">
              This farm does not have saved GPS coordinates. Search for its village or district and choose a result to view local weather.
            </Alert>
          )}
          {farms.length === 0 && !farmsLoading && !farmError && (
            <Alert variant="info">
              No farms are registered yet. Search for any location to view weather.
            </Alert>
          )}

          {selectedLocation?.source === 'search' &&
            selectedFarm &&
            getFarmCoordinates(selectedFarm) && (
              <Button type="button" variant="secondary" size="sm" onClick={useSelectedFarmLocation}>
                Use saved farm location
              </Button>
            )}
        </div>
      </Card>

      {forecastError && <Alert variant="error">{forecastError}</Alert>}

      {farmsLoading || forecastLoading ? (
        <div className="space-y-4" aria-label="Loading weather">
          <div className="h-48 rounded-xl bg-neutral-100 animate-pulse" />
          <div className="h-40 rounded-xl bg-neutral-100 animate-pulse" />
        </div>
      ) : forecast ? (
        <>
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-primary-600" aria-hidden />
                  <h2 className="text-lg font-semibold text-neutral-900">{selectedLocation?.label}</h2>
                </div>
                <Badge variant={selectedLocation?.source === 'farm' ? 'success' : 'info'}>
                  {selectedLocation?.source === 'farm' ? 'Registered farm location' : 'Search location'}
                </Badge>
                <p className="text-xs text-neutral-500 mt-2">
                  Updated {formatObservationTime(forecast.current.time)} local time ({forecast.timezone})
                </p>
              </div>
              <div className="flex items-center gap-4">
                <WeatherIcon code={forecast.current.weatherCode} className="w-14 h-14 text-primary-600" />
                <div>
                  <p className="text-4xl font-bold text-neutral-900">
                    {forecast.current.temperatureC === null
                      ? '—'
                      : `${Math.round(forecast.current.temperatureC)}°C`}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {getWeatherCondition(forecast.current.weatherCode)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <WeatherStat
              icon={<Droplets className="w-4 h-4 text-primary-600" aria-hidden />}
              label="Humidity"
              value={formatNumber(forecast.current.humidityPercent, '%')}
            />
            <WeatherStat
              icon={<Wind className="w-4 h-4 text-primary-600" aria-hidden />}
              label="Wind speed"
              value={formatNumber(forecast.current.windSpeedKmh, 'km/h', 1)}
            />
            <WeatherStat
              icon={<Thermometer className="w-4 h-4 text-primary-600" aria-hidden />}
              label="Feels like"
              value={formatNumber(forecast.current.apparentTemperatureC, '°C', 1)}
            />
            <WeatherStat
              icon={<CloudRain className="w-4 h-4 text-primary-600" aria-hidden />}
              label="Rain now"
              value={formatNumber(forecast.current.precipitationMm, 'mm', 1)}
            />
          </div>

          <section aria-labelledby="seven-day-forecast">
            <div className="flex items-end justify-between gap-3 mb-3">
              <div>
                <h2 id="seven-day-forecast" className="text-lg font-semibold text-neutral-900">7-day forecast</h2>
                <p className="text-xs text-neutral-500">Daily highs, lows, rainfall, and chance of precipitation.</p>
              </div>
              <span className="text-xs text-neutral-500">Source: Open-Meteo</span>
            </div>
            {forecast.daily.length === 0 ? (
              <Alert variant="info">A daily forecast is not available for this location right now.</Alert>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                {forecast.daily.map((day) => {
                  return (
                    <Card key={day.date} padding="sm" className="text-center">
                      <p className="text-xs font-medium text-neutral-600">{formatForecastDate(day.date)}</p>
                      <WeatherIcon code={day.weatherCode} className="w-6 h-6 text-primary-600 mx-auto my-2" />
                      <p className="text-xs text-neutral-500 min-h-8">{getWeatherCondition(day.weatherCode)}</p>
                      <p className="text-sm font-semibold text-neutral-900 mt-2">
                        {formatNumber(day.maxTemperatureC, '°', 0)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Low {formatNumber(day.minTemperatureC, '°', 0)}
                      </p>
                      <div className="border-t border-neutral-100 mt-3 pt-2 space-y-1">
                        <p className="text-xs text-blue-700">
                          Rain {formatNumber(day.precipitationMm, 'mm', 1)}
                        </p>
                        <p className="text-xs text-neutral-500">
                          Chance {formatNumber(day.precipitationProbability, '%')}
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section aria-labelledby="weather-advisories">
            <div className="mb-3">
              <h2 id="weather-advisories" className="text-lg font-semibold text-neutral-900">Weather-aware farm planning</h2>
              <p className="text-xs text-neutral-500">
                General information based on this forecast—not guaranteed or crop-specific recommendations.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {getWeatherAdvisories(forecast).map((advisory) => (
                <div
                  key={advisory.title}
                  className={[
                    'rounded-xl border p-4',
                    advisory.severity === 'warning'
                      ? 'border-accent-200 bg-accent-50/60'
                      : 'border-neutral-200 bg-white',
                  ].join(' ')}
                >
                  <h3 className="text-sm font-semibold text-neutral-800">{advisory.title}</h3>
                  <p className="text-sm text-neutral-600 mt-1">{advisory.message}</p>
                </div>
              ))}
            </div>
          </section>

          <p className="text-xs text-neutral-500">
            Weather data provided by Open-Meteo. Forecasts can change; check official local alerts and field conditions before making farm decisions.
          </p>
        </>
      ) : !forecastError && selectedLocation ? (
        <Alert variant="info">Weather data is not available for this location right now.</Alert>
      ) : !selectedLocation && !farmsLoading ? (
        <Card>
          <div className="flex items-start gap-3 text-sm text-neutral-600">
            <MapPin className="w-5 h-5 text-primary-600 shrink-0" aria-hidden />
            <p>
              {selectedFarm
                ? `Search and select a location for ${selectedFarm.name} to load its weather.`
                : 'Choose a farm with saved coordinates or search for a location to view the forecast.'}
            </p>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function WeatherStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card padding="sm">
      <div className="flex items-center gap-2 text-neutral-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-semibold text-neutral-900 mt-2">{value}</p>
    </Card>
  );
}
