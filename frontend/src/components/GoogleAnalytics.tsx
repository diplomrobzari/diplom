'use client';

import { useEffect } from 'react';

/**
 * Компонент для подключения Google Analytics 4
 *
 * Инструкция по установке:
 * 1. Создайте аккаунт в Google Analytics: https://analytics.google.com/
 * 2. Создайте ресурс и поток данных для веб-сайта
 * 3. Получите измерительный ID и добавьте в NEXT_PUBLIC_GA_MEASUREMENT_ID
 * 4. Настройте события и конверсии в GA4
 */

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
type GtagArg = string | Date | Record<string, unknown> | undefined;

export function GoogleAnalytics() {
  useEffect(() => {
    if (!MEASUREMENT_ID) {
      console.warn('[GoogleAnalytics] NEXT_PUBLIC_GA_MEASUREMENT_ID не настроен');
      return;
    }

    // Создаем скрипт Google Analytics
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Инициализируем gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: GtagArg[]) {
      window.dataLayer?.push(args);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', MEASUREMENT_ID, {
      send_page_view: true,
    });

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return null;
}

/**
 * Хук для отправки событий в Google Analytics
 * 
 * Пример использования:
 * ```tsx
 * const { ga } = useGoogleAnalytics();
 * 
 * const handleEvent = () => {
 *   ga('event', 'button_click', {
 *     event_category: 'engagement',
 *     event_label: 'CTA Button',
 *     value: 1
 *   });
 * };
 * ```
 */
export function useGoogleAnalytics() {
  const ga = (event: string, params?: Record<string, unknown>) => {
    if (window.gtag) {
      window.gtag('event', event, params);
    }
  };

  return { ga };
}

// Расширяем глобальный интерфейс Window
declare global {
  interface Window {
    dataLayer?: GtagArg[][];
    gtag?: (...args: GtagArg[]) => void;
  }
}
