import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc, runTransaction,

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
import type { Product } from '@/models/product';
import type { Order, OrderStatus } from '@/models/order';

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

  async request(buyer: { uid: string; name: string }, product: Product, quantity: number) {
    if (!Number.isFinite(quantity) || quantity < product.minimumOrderQuantity || quantity > product.quantityAvailable) {
      throw new Error('Choose a quantity within the available range.');
    }
    const previous = await getDocs(query(collection(db, COLLECTIONS.ORDERS),
      where('buyerId', '==', buyer.uid), where('productId', '==', product.productId)));
    if (previous.docs.some(order => order.data().status === 'pending')) return;
    // Order documents are immutable in identity and cannot be deleted. Tabs racing to
    // create the next request for the same buyer/product therefore select the same ID.
    const bytes = new TextEncoder().encode(JSON.stringify([buyer.uid, product.productId, previous.size]));
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const id = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
    await setDoc(doc(db, COLLECTIONS.ORDERS, id), {
      buyerId: buyer.uid, buyerName: buyer.name, farmerId: product.farmerId,
      farmerUserId: product.farmerUserId, farmerName: product.farmerName,
      productId: product.productId, productName: product.name, productUnit: product.unit,
      quantity, unitPrice: product.price, totalAmount: product.price * quantity,
      requestVersion: 1, status: 'pending', statusHistory: [],
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  },

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    changedBy: string,
    note?: string
  ): Promise<void> {
    const ref = doc(db, COLLECTIONS.ORDERS, orderId);
    await runTransaction(db, async transaction => {
      const order = (await transaction.get(ref)).data();
      if (!order) throw new Error('Order unavailable.');
      if (status === 'accepted' && order.requestVersion === 1) {
        const productRef = doc(db, COLLECTIONS.PRODUCTS, order.productId);
        const product = (await transaction.get(productRef)).data();
        if (order.status !== 'pending' || product?.status !== 'active' ||
            product.quantityAvailable < order.quantity) throw new Error('Insufficient stock or request already processed.');
        transaction.update(productRef, { quantityAvailable: product.quantityAvailable - order.quantity,
          lastAcceptedOrderId: orderId, updatedAt: serverTimestamp() });
      }
      transaction.update(ref, {
        status,
        statusHistory: arrayUnion({
          status,
          changedAt: Timestamp.now(),
          changedBy,
          ...(note ? { note } : {}),
        }),
        updatedAt: serverTimestamp(),
      });
    });
  },
};
