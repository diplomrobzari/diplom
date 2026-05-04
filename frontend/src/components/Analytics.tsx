'use client';

import { YandexMetrica } from './YandexMetrica';
import { GoogleAnalytics } from './GoogleAnalytics';

/**
 * Компонент для подключения всех систем аналитики
 * 
 * Использование: добавьте <Analytics /> в корень layout.tsx
 */
export function Analytics() {
  return (
    <>
      <YandexMetrica />
      <GoogleAnalytics />
    </>
  );
}
