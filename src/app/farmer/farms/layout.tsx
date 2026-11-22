import { FarmWorkspace } from '@/features/farms/FarmWorkspace';
import { FarmSyncStatus } from '@/features/farms/FarmSyncStatus';

export default function FarmsLayout({ children }: { children: React.ReactNode }) {
  return <FarmWorkspace><FarmSyncStatus />{children}</FarmWorkspace>;
}
