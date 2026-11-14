import type { AuthRepository } from './repositories/authRepository';
import type { ComponentRepository } from './repositories/componentRepository';
import type { RequestRepository } from './repositories/requestRepository';
import { LocalAuthRepository } from './repositories/localAuthRepository'; import { LocalComponentRepository } from './repositories/localComponentRepository';
import { LocalRequestRepository } from './repositories/localRequestRepository';
import { FirebaseAuthRepository } from './firebase/FirebaseAuthRepository';
import { FirebaseComponentRepository } from './firebase/FirebaseComponentRepository';
import { FirebaseRequestRepository } from './firebase/FirebaseRequestRepository';
import { ensureSeed } from './seed';

/**
 * ЕДИНАЯ ТОЧКА ВЫБОРА РЕАЛИЗАЦИЙ ХРАНИЛИЩА.
 * Весь UI получает репозитории отсюда, поэтому переход на Firebase выполняется
 * заменой реализаций только в этом файле (см. README «Переход на Firebase»).
 */
export interface Repositories {
  auth: AuthRepository;
  components: ComponentRepository;
  requests: RequestRepository;
}

// export const repositories: Repositories = {
//   auth: new LocalAuthRepository(),
//   components: new LocalComponentRepository(),
//   requests: new LocalRequestRepository(),
// };
export const repositories: Repositories = {
  auth: new FirebaseAuthRepository(),
  components: new FirebaseComponentRepository(),
  requests: new FirebaseRequestRepository(),
};

/** Инициализация хранилища: создаёт демонстрационные данные при первом запуске. */
export function initStorage(): void {
  ensureSeed();
}
