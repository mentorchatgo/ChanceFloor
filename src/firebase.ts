import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Sign-in error:', error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-out error:', error);
  }
};

export const updateUserName = async (newName: string) => {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await updateProfile(user, { displayName: newName });
    const docRef = doc(db, 'leaderboard', user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      await setDoc(docRef, { displayName: newName }, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'leaderboard/' + user.uid);
  }
};

export const saveHighScore = async (score: number) => {
  const user = auth.currentUser;
  if (!user) return;

  const docRef = doc(db, 'leaderboard', user.uid);
  try {
    const docSnap = await getDoc(docRef);
    let currentHighScore = 0;
    if (docSnap.exists()) {
      currentHighScore = docSnap.data().score || 0;
    }
    
    if (score > currentHighScore) {
      await setDoc(docRef, {
        userId: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Unknown',
        score: score,
        updatedAt: Date.now()
      }, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'leaderboard/' + user.uid);
  }
};

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
}

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  try {
    const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(10));
    const querySnapshot = await getDocs(q);
    const results: LeaderboardEntry[] = [];
    querySnapshot.forEach((doc) => {
      results.push(doc.data() as LeaderboardEntry);
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'leaderboard');
    return [];
  }
};
