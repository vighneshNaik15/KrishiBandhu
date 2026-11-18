import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS, PRODUCTS_PER_PAGE } from '@/lib/constants';
import type { Product, CreateProductData, ProductCategory, ProductStatus } from '@/models/product';

export interface ProductFilters {
  category?: ProductCategory;
  district?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export const productService = {
  async getById(productId: string): Promise<Product | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.PRODUCTS, productId));
    return snap.exists() ? ({ productId: snap.id, ...snap.data() } as Product) : null;
  },

  async getByFarmer(farmerId: string): Promise<Product[]> {
    const q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where('farmerId', '==', farmerId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ productId: d.id, ...d.data() } as Product));
  },

  /**
   * Get marketplace listings (active products only)
   * Uses simple compound queries compatible with Firestore's index limits.
   */
  async getMarketplace(
    filters: ProductFilters = {},
    after?: QueryDocumentSnapshot<DocumentData>
  ): Promise<{
    products: Product[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
  }> {
    let q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where('status', '==', 'active' as ProductStatus),
      orderBy('createdAt', 'desc'),
      limit(PRODUCTS_PER_PAGE + 1)
    );

    if (filters.category) {
      q = query(
        collection(db, COLLECTIONS.PRODUCTS),
        where('status', '==', 'active' as ProductStatus),
        where('category', '==', filters.category),
        orderBy('createdAt', 'desc'),
        limit(PRODUCTS_PER_PAGE + 1)
      );
    }

    if (after) {
      q = query(q, startAfter(after));
    }

    const snap = await getDocs(q);
    const pageDocs = snap.docs.slice(0, PRODUCTS_PER_PAGE);
    const products = pageDocs.map((d) => ({ productId: d.id, ...d.data() } as Product));
    const lastDoc = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;
    return { products, lastDoc, hasMore: snap.docs.length > PRODUCTS_PER_PAGE };
  },

  async create(data: CreateProductData): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTIONS.PRODUCTS), {
      ...data,
      status: 'active' as ProductStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  async update(productId: string, data: Partial<Product>): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.PRODUCTS, productId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  async updateStatus(productId: string, status: ProductStatus): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.PRODUCTS, productId), {
      status,
      updatedAt: serverTimestamp(),
    });
  },
};
