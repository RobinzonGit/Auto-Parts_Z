import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query as fsQuery,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './config';
import { getRoleFromUser, toIso } from './helpers';
import type { RequestRepository } from '../repositories/requestRepository';
import type {
  CreateRequestInput,
  PurchaseRequest,
  RequestListQuery,
  RequestStatus,
} from '@/types/request';

const COLLECTION = 'requests';

function mapRequest(id: string, data: Record<string, unknown>): PurchaseRequest {
  return {
    id,
    userId: (data.userId as string) ?? '',
    userName: (data.userName as string) ?? '',
    componentId: (data.componentId as string) ?? '',
    componentName: (data.componentName as string) ?? '',
    componentArticle: (data.componentArticle as string) ?? '',
    quantity: Number(data.quantity ?? 1),
    status: data.status as RequestStatus,
    note: (data.note as string) ?? '',
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  } as PurchaseRequest;
}

async function currentRole(): Promise<'user' | 'moderator' | 'admin'> {
  const u = auth.currentUser;
  if (!u) return 'user';
  return getRoleFromUser(u);
}

export class FirebaseRequestRepository implements RequestRepository {
  async list(query?: RequestListQuery): Promise<PurchaseRequest[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('Не авторизован');

    const role = await currentRole();
    const isStaff = role === 'moderator' || role === 'admin';

    const col = collection(db, COLLECTION);

    let snap;
    if (isStaff && !query?.userId) {
      snap = await getDocs(col);
    } else {
      const uid = isStaff ? query!.userId! : user.uid;
      snap = await getDocs(fsQuery(col, where('userId', '==', uid)));
    }

    let items = snap.docs.map((d) =>
      mapRequest(d.id, d.data() as Record<string, unknown>)
    );

    if (query?.status) {
      items = items.filter((r) => r.status === query.status);
    }

    items.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return items;
  }

  async create(data: CreateRequestInput): Promise<PurchaseRequest> {
    const user = auth.currentUser;
    if (!user) throw new Error('Не авторизован');

    // Денормализация: тянем имя пользователя и артикул запчасти,
    // чтобы PurchaseRequest содержал обязательные поля.
    const [userSnap, componentSnap] = await Promise.all([
      getDoc(doc(db, 'users', user.uid)),
      getDoc(doc(db, 'components', data.componentId)),
    ]);

    const userName = (userSnap.data()?.name as string) ?? user.displayName ?? '';
    const componentData = componentSnap.data() as
      | Record<string, unknown>
      | undefined;
    const componentName =
      (componentData?.name as string) ?? (data as { componentName?: string }).componentName ?? '';
    const componentArticle = (componentData?.article as string) ?? '';

    const newRef = doc(collection(db, COLLECTION));
    const payload: Record<string, unknown> = {
      ...data,
      userId: user.uid,
      userName,
      componentName,
      componentArticle,
      status: 'new' as RequestStatus, // поправьте на стартовый статус из вашего домена
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(newRef, payload);

    const created = await getDoc(newRef);
    if (!created.exists()) throw new Error('Не удалось прочитать созданный запрос');
    return mapRequest(created.id, created.data() as Record<string, unknown>);
  }

  async updateStatus(id: string, status: RequestStatus): Promise<void> {
    const role = await currentRole();
    if (role !== 'moderator' && role !== 'admin') {
      throw new Error('Недостаточно прав для смены статуса');
    }
    await updateDoc(doc(db, COLLECTION, id), {
      status,
      updatedAt: serverTimestamp(),
    });
  }

  async delete(id: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Не авторизован');

    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Запрос не найден');

    const role = await currentRole();
    const isAdmin = role === 'admin';
    const data = snap.data() as Record<string, unknown>;
    const isOwner = data.userId === user.uid;

    if (!isAdmin && !isOwner) throw new Error('Нельзя удалить чужой запрос');

    await deleteDoc(ref);
  }
}