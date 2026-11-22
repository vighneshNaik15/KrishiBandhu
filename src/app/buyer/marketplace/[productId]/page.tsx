import Feature from '@/features/shared-navigation/ProductDetail';
import { ROUTES } from '@/lib/constants';

export default function Page() {
  return <Feature marketplace={ROUTES.BUYER_MARKETPLACE} />;
}
