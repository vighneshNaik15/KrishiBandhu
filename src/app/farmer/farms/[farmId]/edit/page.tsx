'use client';

import { useParams } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import FarmForm from '@/features/farms/FarmForm';
import { useFarmWorkspace } from '@/features/farms/FarmWorkspace';

export default function EditFarmPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const { farms, ready, online, syncing } = useFarmWorkspace();
  const farm = farms.find(farm => farm.farmId === farmId);
  if (!farm && (!ready || syncing)) return <p role="status">Loading farm?</p>;
  if (!farm) return <Alert variant="warning">{online ? 'Farm not found.' : 'This farm is unavailable offline.'}</Alert>;
  return <FarmForm key={farmId} farm={farm} />;
}
