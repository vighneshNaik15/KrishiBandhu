'use client';

import { useAuth } from '@/features/auth/AuthContext';
import { WeatherDashboard } from '@/features/weather/WeatherDashboard';

export default function FarmerWeatherPage() {
  const { userProfile } = useAuth();
  return <WeatherDashboard key={userProfile?.uid ?? 'loading'} />;
}
