import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import type { ComponentStatus, CreateRequestInput } from '@/types';
import { loadDb, saveDb, type StoredComponent, type StoredUser } from '@/services/storage/localDb';
import { calcPrice } from '@/utils/calc';
import { logger } from '@/utils/logger';

/**
 * Демонстрационные данные. Создаются один раз — только если база пуста.
 * Пароли: bcrypt-хэши, в коде присутствуют лишь исходные значения для сидирования.
 */

const BCRYPT_ROUNDS = 10;

interface SeedUser {
  email: string;
  name: string;
  role: StoredUser['role'];
  password: string;
}

const SEED_USERS: SeedUser[] = [
  { email: 'admin@autoparts.local', name: 'Главный администратор', role: 'admin', password: 'Admin123!' },
  { email: 'moderator@autoparts.local', name: 'Старший кладовщик', role: 'moderator', password: 'Moder123!' },
  { email: 'user@autoparts.local', name: 'Иван Петров', role: 'user', password: 'User123!' },
];

interface SeedComponent {
  name: string;
  article: string;
  purchasePrice: number;
  markupPercent: number;
  warehouseCell: string;
  quantity: number;
  note?: string;
  status?: ComponentStatus;
}

const SEED_COMPONENTS: SeedComponent[] = [
  { name: 'Колодки тормозные передние', article: 'BP-4521', purchasePrice: 1850, markupPercent: 30, warehouseCell: 'A-01-02', quantity: 14, note: 'Подходят для Toyota Camry 2015–2020' },
  { name: 'Фильтр масляный', article: 'OF-310', purchasePrice: 420, markupPercent: 35, warehouseCell: 'A-02-01', quantity: 40 },
  { name: 'Фильтр воздушный', article: 'AF-118', purchasePrice: 640, markupPercent: 30, warehouseCell: 'A-02-04', quantity: 22 },
  { name: 'Свеча зажигания', article: 'SP-7741', purchasePrice: 310, markupPercent: 40, warehouseCell: 'B-01-03', quantity: 60 },
  { name: 'Амортизатор передний правый', article: 'SH-2207-R', purchasePrice: 4900, markupPercent: 25, warehouseCell: 'C-03-01', quantity: 6, note: 'Газомасляный' },
  { name: 'Ремень ГРМ', article: 'TB-1553', purchasePrice: 2150, markupPercent: 28, warehouseCell: 'B-02-05', quantity: 9 },
  { name: 'Подшипник ступицы передний', article: 'WB-8830', purchasePrice: 1560, markupPercent: 32, warehouseCell: 'C-01-04', quantity: 11 },
  { name: 'Радиатор охлаждения', article: 'RD-4402', purchasePrice: 6300, markupPercent: 20, warehouseCell: 'D-01-01', quantity: 0, status: 'out_of_stock' },
  { name: 'Лямбда-зонд', article: 'O2-9917', purchasePrice: 3400, markupPercent: 27, warehouseCell: 'D-02-02', quantity: 7 },
  { name: 'Диск сцепления', article: 'CL-2050', purchasePrice: 5100, markupPercent: 22, warehouseCell: 'D-03-03', quantity: 2, status: 'archived', note: 'Снят с продажи' },
];

/** Создаёт демонстрационные данные, если пользователей ещё нет. */
export function ensureSeed(): void {
  const db = loadDb();
  if (db.users.length > 0) return;

  const now = new Date().toISOString();

  for (const seed of SEED_USERS) {
    db.users.push({
      id: uuidv4(),
      email: seed.email,
      name: seed.name,
      role: seed.role,
      createdAt: now,
      updatedAt: now,
      passwordHash: bcrypt.hashSync(seed.password, BCRYPT_ROUNDS),
    });
  }

  const componentIds: string[] = [];
  for (const seed of SEED_COMPONENTS) {
    const id = uuidv4();
    componentIds.push(id);
    const record: StoredComponent = {
      id,
      name: seed.name,
      article: seed.article,
      purchasePrice: seed.purchasePrice,
      markupPercent: seed.markupPercent,
      price: calcPrice(seed.purchasePrice, seed.markupPercent),
      warehouseCell: seed.warehouseCell,
      quantity: seed.quantity,
      note: seed.note,
      status: seed.status ?? 'active',
      createdAt: now,
      updatedAt: now,
      hasPhoto: false,
    };
    db.components.push(record);
  }

  const user = db.users.find((u) => u.role === 'user');
  if (user) {
    const requests: Array<{ componentIndex: number; input: Omit<CreateRequestInput, 'componentId'>; status: 'new' | 'in_progress' | 'completed' }> = [
      { componentIndex: 0, input: { quantity: 2, comment: 'Для Toyota Camry 2018, нужен срочно' }, status: 'new' },
      { componentIndex: 1, input: { quantity: 4, comment: 'Плановая закупка на месяц' }, status: 'in_progress' },
      { componentIndex: 4, input: { quantity: 1 }, status: 'completed' },
    ];
    for (const item of requests) {
      const componentId = componentIds[item.componentIndex];
      const component = db.components.find((c) => c.id === componentId);
      if (!component) continue;
      db.requests.push({
        id: uuidv4(),
        componentId: component.id,
        componentName: component.name,
        componentArticle: component.article,
        userId: user.id,
        userName: user.name,
        quantity: item.input.quantity,
        comment: item.input.comment,
        status: item.status,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  saveDb();
  logger.info('seed', 'Созданы демонстрационные данные (3 пользователя, 10 запчастей, 3 запроса)');
}
