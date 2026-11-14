import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { User as FirebaseUser } from 'firebase/auth';
import { storage } from './config';
import type { Role } from '@/types/user';

export async function uploadPhoto(
  path: string,
  source: File | Blob | string
): Promise<string> {
  let blob: Blob;
  if (typeof source === 'string') {
    const res = await fetch(source);
    blob = await res.blob();
  } else {
    blob = source;
  }
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(storageRef);
}

export async function tryDeletePhoto(path: string): Promise<void> {
  try {
    await deleteObject(ref(storage, path));
  } catch {
    // фото не было — нормально
  }
}

export async function getRoleFromUser(fbUser: FirebaseUser): Promise<Role> {
  const token = await fbUser.getIdTokenResult();
  const role = token.claims.role;
  if (role === 'admin' || role === 'moderator' || role === 'user') return role;
  return 'user';
}

export function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function isFirebaseError(err: unknown): err is { code: string; message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
  );
}

/** Firestore Timestamp / Date / string → ISO-строка (или undefined). */
export function toIso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && 'toDate' in value) {
    try {
      const d = (value as { toDate: () => Date }).toDate();
      return d instanceof Date ? d.toISOString() : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function translateAuthError(err: unknown): string {
  if (!isFirebaseError(err)) return err instanceof Error ? err.message : 'Неизвестная ошибка';
  const map: Record<string, string> = {
    'auth/invalid-email': 'Некорректный email',
    'auth/user-not-found': 'Пользователь не найден',
    'auth/wrong-password': 'Неверный пароль',
    'auth/invalid-credential': 'Неверный email или пароль',
    'auth/email-already-in-use': 'Email уже зарегистрирован',
    'auth/weak-password': 'Слишком слабый пароль (минимум 6 символов)',
    'auth/requires-recent-login': 'Для смены пароля нужно перезайти в систему.',
    'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже.',
    'permission-denied': 'Недостаточно прав (проверьте правила Firestore).',
  };
  return map[err.code] ?? err.message;
}