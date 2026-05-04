'use client';

import { useEffect } from 'react';

/**
 * Компонент для подключения Яндекс.Метрики
 *
 * Инструкция по установке:
 * 1. Зарегистрируйтесь в Яндекс.Метрике: https://metrika.yandex.ru/
 * 2. Создайте новый счетчик
 * 3. Получите номер счетчика и замените YANDEX_METRIКА_ID в .env.local
 * 4. Настройте цели и события в Яндекс.Метрике
 */

// Номер счетчика из переменных окружения или заглушка
const METRIKA_ID = Number(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID || 0);

export function YandexMetrica() {
  useEffect(() => {
    if (!METRIKA_ID) {
      console.warn('[YandexMetrica] NEXT_PUBLIC_YANDEX_METRIKA_ID не настроен');
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://mc.yandex.ru/metrika/tag.js';
    script.onload = () => {
      if (typeof window.ym !== 'function') return;
      window.ym(METRIKA_ID, 'init', {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: true,
        trackHash: true,
      });
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return null;
}

/**
 * Хук для отправки событий в Яндекс.Метрику
 *
 * Пример использования:
 * ```tsx
 * const { ym } = useYandexMetrica();
 *
 * const handleGoal = () => {
 *   ym('reachGoal', 'goal_name', { target_id: 123 });
 * };
 * ```
 */
export function useYandexMetrica() {
  const ym = (method: string, ...args: unknown[]) => {
    if (typeof window !== 'undefined' && typeof window.ym === 'function' && METRIKA_ID) {
      window.ym(METRIKA_ID, method, ...args);
    } else if (method === 'reachGoal') {
      console.warn('[YandexMetrica] Метод reachGoal не найден. Проверьте подключение Метрики.');
    }
  };

  return { ym };
}

// Расширяем глобальный интерфейс Window
declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void;
  }
}
