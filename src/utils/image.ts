import { AppError } from '@/types';

/**
 * Обработка фото для карточки запчасти:
 * проверка типа/размера + сжатие на canvas (клиент, без библиотек).
 */

/** Максимальный размер исходного файла. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
/** Максимальная сторона после сжатия, px. */
const MAX_DIMENSION = 1024;
/** Качество JPEG после сжатия. */
const JPEG_QUALITY = 0.75;

/** Валидирует файл и возвращает текст ошибки или null, если файл корректен. */
export function validatePhotoFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Можно загружать только изображения.';
  if (file.size > MAX_PHOTO_BYTES) return 'Файл больше 2 МБ. Выберите фото поменьше.';
  return null;
}

/** Читает файл в data URL. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new AppError('VALIDATION', 'Не удалось прочитать файл изображения.'));
    reader.readAsDataURL(file);
  });
}

/** Сжимает изображение до MAX_DIMENSION и конвертирует в JPEG data URL. */
async function compressDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      let { width, height } = image;
      const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

/** Полный конвейер: валидация → чтение → сжатие. Возвращает data URL. */
export async function processPhotoFile(file: File): Promise<string> {
  const validationError = validatePhotoFile(file);
  if (validationError) throw new AppError('VALIDATION', validationError);
  const dataUrl = await readAsDataUrl(file);
  return compressDataUrl(dataUrl);
}
