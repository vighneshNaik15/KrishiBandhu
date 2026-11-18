'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  deleteUser,
  signOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import type { User, UserRole, CreateUserData } from '@/models/user';
import { COLLECTIONS } from '@/lib/constants';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AuthState {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  clearError: () => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  district?: string;
  state?: string;
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    userProfile: null,
    loading: true,
    error: null,
  });
  const authStateRevision = useRef(0);
  const registrationInProgress = useRef(false);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const revision = ++authStateRevision.current;
      if (!firebaseUser) {
        setState({ firebaseUser: null, userProfile: null, loading: false, error: null });
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));
        if (revision !== authStateRevision.current) return;
        const userProfile = userDoc.exists() ? (userDoc.data() as User) : null;
        setState({
          firebaseUser,
          userProfile,
          loading: false,
          error: userDoc.exists() || registrationInProgress.current
            ? null
            : 'Your Firebase account exists, but its KrishiBandhu profile is missing. Check Firestore rules or ask an administrator to repair the profile.',
        });
      } catch (err) {
        if (revision !== authStateRevision.current) return;
        console.error('Failed to fetch user profile:', err);
        setState({
          firebaseUser,
          userProfile: null,
          loading: false,
          error: getProfileLoadErrorMessage(err),
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // ── Auth methods ─────────────────────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<void> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will update state
    } catch (err: unknown) {
      const message = getFirebaseErrorMessage(err);
      setState((s) => ({ ...s, loading: false, error: message }));
      throw new Error(message);
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    let createdAuthUser: FirebaseUser | null = null;
    let profileBatchCommitted = false;

    try {
      if (data.role === 'farmer' && (!data.district || !data.state)) {
        throw new Error('District and state are required to create a farmer profile.');
      }

      registrationInProgress.current = true;
      const { user: firebaseUser } = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      createdAuthUser = firebaseUser;

      const userData: CreateUserData = {
        uid: firebaseUser.uid,
        name: data.name,
        email: data.email,
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        role: data.role,
      };

      const batch = writeBatch(db);
      batch.set(doc(db, COLLECTIONS.USERS, firebaseUser.uid), {
        ...userData,
        isActive: true,
        isVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (data.role === 'farmer') {
        batch.set(doc(db, COLLECTIONS.FARMER_PROFILES, firebaseUser.uid), {
          userId: firebaseUser.uid,
          farmerId: firebaseUser.uid,
          displayName: data.name,
          phone: data.phone ?? '',
          district: data.district,
          state: data.state,
          isVerified: false,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      profileBatchCommitted = true;

      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));
      if (!userDoc.exists()) {
        throw new Error('Your account was created, but its Firestore profile could not be found. Check the published Firestore rules.');
      }

      authStateRevision.current += 1;
      registrationInProgress.current = false;
      setState({
        firebaseUser,
        userProfile: userDoc.data() as User,
        loading: false,
        error: null,
      });
    } catch (err: unknown) {
      registrationInProgress.current = false;
      let message = err instanceof Error && !('code' in err)
        ? err.message
        : getFirebaseErrorMessage(err);

      if (createdAuthUser && !profileBatchCommitted) {
        try {
          await deleteUser(createdAuthUser);
        } catch {
          message += ' The account could not be rolled back; check Firebase Authentication before retrying.';
        }
      }

      if (profileBatchCommitted) {
        authStateRevision.current += 1;
      }
      setState((s) => ({ ...s, loading: false, error: message }));
      throw new Error(message);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (err: unknown) {
      console.error('Logout error:', err);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: unknown) {
      const message = getFirebaseErrorMessage(err);
      throw new Error(message);
    }
  };

  const refreshUserProfile = async (): Promise<void> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('You must be signed in to refresh your profile.');
    }

    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, currentUser.uid));
    if (!userDoc.exists()) {
      throw new Error('Your account profile could not be found.');
    }

    setState((s) => ({ ...s, userProfile: userDoc.data() as User }));
  };

  const clearError = () => setState((s) => ({ ...s, error: null }));

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, resetPassword, refreshUserProfile, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getFirebaseErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'string') {
    const code = err.code;
    const messages: Record<string, string> = {
      'auth/user-not-found': 'No account found with this email address.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/invalid-credential': 'Incorrect email or password.',
      'auth/operation-not-allowed': 'Email/password registration is disabled. Enable Email/Password in Firebase Authentication settings.',
      'auth/admin-restricted-operation': 'Firebase is restricting account creation. Enable Email/Password registration in Firebase Authentication settings.',
      'auth/invalid-api-key': 'Firebase rejected the API key. Check the Firebase web app configuration in .env.local and restart Next.js.',
      'permission-denied': 'Firestore denied the account/profile write. Confirm a Firestore database exists and its rules allow an authenticated user to create their own user and profile documents.',
      'firestore/permission-denied': 'Firestore denied the account/profile write. Confirm a Firestore database exists and its rules allow an authenticated user to create their own user and profile documents.',
      'unavailable': 'Firebase is temporarily unavailable. Check your connection and try again.',
      'failed-precondition': 'Firebase is not ready for this operation. Confirm Firestore is initialized and configured.',
    };
    return messages[code] ?? `Firebase could not complete registration (${code}). Check Firebase Authentication and Firestore configuration.`;
  }
  return 'An unexpected error occurred. Please try again.';
}

function getProfileLoadErrorMessage(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    typeof err.code === 'string' &&
    (err.code === 'permission-denied' || err.code === 'firestore/permission-denied')
  ) {
    return 'You are signed in, but Firestore denied access to your profile. Confirm the rules are published and allow you to read your own users/{uid} document.';
  }
  return 'You are signed in, but your profile could not be loaded. Please try again.';
}
