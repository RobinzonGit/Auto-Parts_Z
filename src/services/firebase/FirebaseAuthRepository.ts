import { getRoleFromUser, translateAuthError, cleanForFirestore } from './helpers';
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
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './config';
//import { getRoleFromUser, translateAuthError } from './helpers';
import type { AuthRepository } from '../repositories/authRepository';
import type {
  LoginInput,
  RegisterInput,
  Role,
  UpdateProfileInput,
  User,
} from '@/types/user';

const USERS = 'users';

/** Маппинг Firebase User + Firestore-документа в доменный User. */
async function mapFirebaseUser(fbUser: FirebaseUser): Promise<User> {
  const snap = await getDoc(doc(db, USERS, fbUser.uid));
  const profile = snap.exists() ? snap.data() : {};
  const claimRole = await getRoleFromUser(fbUser);
  const role: Role = claimRole ?? (profile.role as Role) ?? 'user';

  return {
    id: fbUser.uid,
    email: fbUser.email ?? '',
    name: profile.name ?? fbUser.displayName ?? '',
    role,
  } as User;
}

/**
 * Кэш текущего пользователя — нужен для СИНХРОННОГО getCurrentUser().
 * onAuthStateChanged асинхронный, а интерфейс требует синхронного чтения.
 */
let cachedUser: User | null = null;
let initialized = false;

function ensureAuthListener(): void {
  if (initialized) return;
  initialized = true;

  onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      cachedUser = null;
      return;
    }
    try {
      cachedUser = await mapFirebaseUser(fbUser);
    } catch (err) {
      console.error('auth state mapping failed:', err);
      cachedUser = null;
    }
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

      // await setDoc(doc(db, USERS, cred.user.uid), {
      //   email: data.email,
      //   name: data.name,
      //   role: 'user',
      //   createdAt: serverTimestamp(),
      // });
      await setDoc(doc(db, USERS, cred.user.uid), cleanForFirestore({
        email: data.email,
        name: data.name,
        role: 'user',
        createdAt: serverTimestamp(),
      }));

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
    // Возвращаем последнее известное значение. На первом рендере после
    // перезагрузки оно может быть null, пока onAuthStateChanged не отработает.
    // Если в UI есть ожидание — можно добавить подписку через `subscribe`
    // (см. примечание ниже).
    return cachedUser;
  }

  async updateProfile(userId: string, patch: UpdateProfileInput): Promise<User> {
    const fbUser = auth.currentUser;
    if (!fbUser || fbUser.uid !== userId) throw new Error('Не авторизован');

    if (patch.name !== undefined) {
      await firebaseUpdateProfile(fbUser, { displayName: patch.name });
    }

    // email в MVP не редактируется, но если patch.email есть — игнорируем
    // или добавьте verifyBeforeUpdateEmail, если это требуется.
    const firestorePatch: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (patch.name !== undefined) firestorePatch.name = patch.name;

    //await updateDoc(doc(db, USERS, userId), firestorePatch);
    await updateDoc(doc(db, USERS, userId), cleanForFirestore(firestorePatch));

    const user = await mapFirebaseUser(fbUser);
    cachedUser = user;
    return user;
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
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
      return {
        id: d.id,
        email: data.email ?? '',
        name: data.name ?? '',
        role: (data.role as Role) ?? 'user',
      } as User;
    });
  }

  /**
   * Назначение роли. Custom claims нельзя установить из браузера —
   * нужна Cloud Function с Admin SDK. Ниже каркас под callable-функцию.
   * До её развёртывания метод бросает ошибку, чтобы это не выглядело
   * «сработавшим», хотя права не изменились.
   */
  async updateRole(userId: string, role: Role): Promise<void> {
    // const { getFunctions, httpsCallable } = await import('firebase/functions');
    // const fns = getFunctions();
    // await httpsCallable(fns, 'setUserRole')({ uid: userId, role });
    throw new Error(
      `updateRole(${userId}, ${role}) требует Cloud Function с Admin SDK ` +
        '(custom claims нельзя менять с клиента).'
    );
  }

  async deleteUser(userId: string): Promise<void> {
    // const { getFunctions, httpsCallable } = await import('firebase/functions');
    // await httpsCallable(getFunctions(), 'deleteUser')({ uid: userId });
    // Ниже — только удаление документа профиля; удаление из Firebase Auth
    // доступно только через Admin SDK.
    await deleteDoc(doc(db, USERS, userId));
    throw new Error(
      'Пользователь удалён из Firestore, но не из Firebase Auth — ' +
        'для полного удаления нужна Cloud Function.'
    );
  }
}

/**
 * Дополнительный (не входящий в интерфейс) метод для асинхронного
 * восстановления сессии. Полезно вызвать на старте приложения,
 * чтобы дождаться загрузки пользователя до рендера защищённых маршрутов.
 *
 * Использование:
 *   const authRepo = repositories.auth as FirebaseAuthRepository;
 *   await authRepo.waitForUser();
 */
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