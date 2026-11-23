import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type Unsubscribe,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/constants';
import type { Order, CreateOrderData, OrderStatus } from '@/models/order';

export const orderService = {
  async getById(orderId: string): Promise<Order | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.ORDERS, orderId));
    return snap.exists() ? ({ orderId: snap.id, ...snap.data() } as Order) : null;
  },

  async getByBuyer(buyerId: string): Promise<Order[]> {
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where('buyerId', '==', buyerId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ orderId: d.id, ...d.data() } as Order));
  },

  async getByFarmer(farmerId: string): Promise<Order[]> {
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where('farmerId', '==', farmerId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ orderId: d.id, ...d.data() } as Order));
  },

  /**
   * Real-time listener for farmer's incoming orders
   */
  subscribeToFarmerOrders(
    farmerId: string,
    onUpdate: (orders: Order[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where('farmerId', '==', farmerId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    return onSnapshot(q, (snap) => {
      const orders = snap.docs.map((d) => ({ orderId: d.id, ...d.data() } as Order));
      onUpdate(orders);
    });
  },

  async create(data: CreateOrderData): Promise<string> {
    const initialStatus: OrderStatus = 'pending';
    const ref = await addDoc(collection(db, COLLECTIONS.ORDERS), {
      ...data,
      status: initialStatus,
      statusHistory: [{ status: initialStatus, changedAt: Timestamp.now(), changedBy: data.buyerId }],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    changedBy: string,
    note?: string
  ): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
      status,
      statusHistory: arrayUnion({
        status,
        changedAt: Timestamp.now(),
        changedBy,
        ...(note ? { note } : {}),
      }),
      updatedAt: serverTimestamp(),
    });
  },
};
