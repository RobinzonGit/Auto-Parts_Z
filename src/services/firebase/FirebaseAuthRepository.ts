import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile as firebaseUpdateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './config';
import { translateAuthError, toIso } from './helpers';
import type { AuthRepository } from '../repositories/authRepository';
import type {
  LoginInput,
  RegisterInput,
  Role,
  UpdateProfileInput,
  User,
} from '@/types/user';

const USERS = 'users';

async function mapFirebaseUser(fbUser: FirebaseUser): Promise<User> {
  const snap = await getDoc(doc(db, USERS, fbUser.uid));
  const profile = snap.exists() ? snap.data() : {};

  // Роль — обычное поле документа users/{uid}. Не custom claims.
  const role: Role =
    profile.role === 'admin' || profile.role === 'moderator' || profile.role === 'user'
      ? profile.role
      : 'user';

  return {
    id: fbUser.uid,
    email: fbUser.email ?? '',
    name: (profile.name as string) ?? fbUser.displayName ?? '',
    role,
    createdAt: toIso(profile.createdAt) ?? '',
    updatedAt: toIso(profile.updatedAt) ?? '',
  };
}

let cachedUser: User | null = null;
let initialized = false;

function ensureAuthListener(): void {
  if (initialized) return;
  initialized = true;
  onAuthStateChanged(auth, async (fbUser) => {
    cachedUser = fbUser ? await mapFirebaseUser(fbUser).catch(() => null) : null;
  });
}

export class FirebaseAuthRepository implements AuthRepository {
  constructor() {
    ensureAuthListener();
  }

  async register(data: RegisterInput): Promise<User> {
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await firebaseUpdateProfile(cred.user, { displayName: data.name });

      await setDoc(doc(db, USERS, cred.user.uid), {
        email: data.email,
        name: data.name,
        role: 'user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const user = await mapFirebaseUser(cred.user);
      cachedUser = user;
      return user;
    } catch (err) {
      throw new Error(translateAuthError(err));
    }
  }

  async login(data: LoginInput): Promise<User> {
    try {
      const cred = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = await mapFirebaseUser(cred.user);
      cachedUser = user;
      return user;
    } catch (err) {
      throw new Error(translateAuthError(err));
    }
  }

  async logout(): Promise<void> {
    await firebaseSignOut(auth);
    cachedUser = null;
  }

  getCurrentUser(): User | null {
    return cachedUser;
  }

  async updateProfile(userId: string, patch: UpdateProfileInput): Promise<User> {
    const fbUser = auth.currentUser;
    if (!fbUser || fbUser.uid !== userId) throw new Error('Не авторизован');

    await firebaseUpdateProfile(fbUser, { displayName: patch.name });
    await updateDoc(doc(db, USERS, userId), {
      name: patch.name,
      updatedAt: serverTimestamp(),
    });

    const user = await mapFirebaseUser(fbUser);
    cachedUser = user;
    return user;
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const fbUser = auth.currentUser;
    if (!fbUser || fbUser.uid !== userId || !fbUser.email) {
      throw new Error('Не авторизован');
    }
    try {
      const cred = EmailAuthProvider.credential(fbUser.email, oldPassword);
      await reauthenticateWithCredential(fbUser, cred);
      await updatePassword(fbUser, newPassword);
    } catch (err) {
      throw new Error(translateAuthError(err));
    }
  }

  async listUsers(): Promise<User[]> {
    const snap = await getDocs(collection(db, USERS));
    return snap.docs.map((d) => {
      const data = d.data();
      const role: Role =
        data.role === 'admin' || data.role === 'moderator' || data.role === 'user'
          ? data.role
          : 'user';
      return {
        id: d.id,
        email: (data.email as string) ?? '',
        name: (data.name as string) ?? '',
        role,
        createdAt: toIso(data.createdAt) ?? '',
        updatedAt: toIso(data.updatedAt) ?? '',
      };
    });
  }

  /**
   * Смена роли: обновляем документ users/{uid}.
   * Права проверяют правила Firestore — только admin может писать role.
   * Никаких Cloud Functions и custom claims.
   */
  async updateRole(userId: string, role: Role): Promise<void> {
    if (role !== 'user' && role !== 'moderator' && role !== 'admin') {
      throw new Error('Недопустимая роль');
    }
    await updateDoc(doc(db, USERS, userId), {
      role,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Удаление из Firebase Auth требует Admin SDK.
   * Здесь удаляем только документ профиля; для полного удаления
   * позже можно добавить Cloud Function.
   */
  async deleteUser(userId: string): Promise<void> {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, USERS, userId));
  }
}

export async function waitForUser(): Promise<User | null> {
  if (cachedUser) return cachedUser;
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      unsub();
      if (!fbUser) return resolve(null);
      try {
        const u = await mapFirebaseUser(fbUser);
        cachedUser = u;
        resolve(u);
      } catch {
        resolve(null);
      }
    });
  });
}