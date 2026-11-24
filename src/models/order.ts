import { Timestamp } from 'firebase/firestore';

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'packed'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  packed: 'Packed',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export interface DeliveryAddress {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  changedAt: Timestamp;
  changedBy: string;
  note?: string;
}

export interface Order {
  orderId: string;

  // Buyer (denormalized)
  buyerId: string;
  buyerName: string;
  buyerPhone?: string;

  // Farmer (denormalized)
  farmerId: string;
  farmerUserId: string;
  farmerName: string;

  // Product snapshot (at time of order)
  productId: string;
  productName: string;
  productUnit: string;

  // Financials
  quantity: number;
  unitPrice: number;
  totalAmount: number;

  // Delivery
  deliveryAddress?: DeliveryAddress;

  // Order lifecycle
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];

  // Notes
  buyerNote?: string;
  farmerNote?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateOrderData {
  buyerId: string;
  buyerName: string;
  buyerPhone?: string;
  farmerId: string;
  farmerUserId: string;
  farmerName: string;
  productId: string;
  productName: string;
  productUnit: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  deliveryAddress?: DeliveryAddress;
  buyerNote?: string;
}
