import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/constants';
import type { User, CreateUserData } from '@/models/user';

export const userService = {
  /**
   * Fetch a user document by UID
   */
  async getById(uid: string): Promise<User | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
    return snap.exists() ? (snap.data() as User) : null;
  },

  /**
   * Create a new user document in Firestore
   */
  async create(data: CreateUserData): Promise<void> {
    await setDoc(doc(db, COLLECTIONS.USERS, data.uid), {
      ...data,
      isActive: true,
      isVerified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Update partial user fields
   */
  async update(uid: string, data: Partial<User>): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Soft-delete: set isActive = false
   */
  async deactivate(uid: string): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Admin: list all users (paginated)
   */
  async listAll(pageLimit = 50): Promise<User[]> {
    const q = query(
      collection(db, COLLECTIONS.USERS),
      orderBy('createdAt', 'desc'),
      limit(pageLimit)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as User);
  },

  /**
   * Admin: list users by role
   */
  async listByRole(role: User['role'], pageLimit = 50): Promise<User[]> {
    const q = query(
      collection(db, COLLECTIONS.USERS),
      where('role', '==', role),
      orderBy('createdAt', 'desc'),
      limit(pageLimit)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as User);
  },
};
