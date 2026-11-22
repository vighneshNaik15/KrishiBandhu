'use client';

import { useParams, useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { FarmDetail } from '@/features/farms/FarmDetail';
import { useFarmWorkspace } from '@/features/farms/FarmWorkspace';
import { ROUTES } from '@/lib/constants';

export default function FarmDetailPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const router = useRouter();
  const { farms, ready, online, syncing } = useFarmWorkspace();
  const farm = farms.find(farm => farm.farmId === farmId);
  if (!farm && (!ready || syncing)) return <p role="status">Loading farm?</p>;
  if (!farm) return <Alert variant="warning">{online ? 'Farm not found.' : 'This farm is unavailable offline.'}</Alert>;
  return <FarmDetail farm={farm} onBack={() => router.push(ROUTES.FARMER_FARMS)}
    onEdit={() => router.push(`${ROUTES.FARMER_FARMS}/${farmId}/edit`)} />;
}
