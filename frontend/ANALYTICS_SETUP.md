# Инструкция по настройке аналитики для платформы "НаСтарте"

## 1. Яндекс.Метрика

### Регистрация и создание счетчика

1. Перейдите на [Яндекс.Метрику](https://metrika.yandex.ru/)
2. Войдите под своим Яндекс.аккаунтом
3. Нажмите "Добавить счетчик"
4. Заполните информацию о сайте:
   - **Имя**: НаСтарте.ru
   - **Сайт**: https://nastarte.ru
   - **Часовой пояс**: Москва
   - **Валюта**: RUB

### Настройка счетчика

Включите следующие опции:
- ✅ Вебвизор
- ✅ Карта ссылок
- ✅ Отслеживание ссылок
- ✅ Точный учет отказов
- ✅ Атрибуция по последнему не прямому переходу

### Установка на сайт

1. После создания скопируйте номер счетчика
2. Откройте файл `frontend/.env.local`
3. Добавьте номер счетчика в переменную `NEXT_PUBLIC_YANDEX_METRIKA_ID`:
   ```
   NEXT_PUBLIC_YANDEX_METRIKA_ID=12345678
   ```
4. Перезапустите frontend после изменения переменных

### Настройка целей

Рекомендуемые цели для платформы:
1. **Регистрация пользователя**
   - Тип: JavaScript-событие
   - Идентификатор: `registration_complete`

2. **Создание объявления**
   - Тип: JavaScript-событие
   - Идентификатор: `competition_created`

3. **Запись на соревнование**
   - Тип: JavaScript-событие
   - Идентификатор: `competition_registered`

4. **Просмотр страницы соревнования**
   - Тип: JavaScript-событие
   - Идентификатор: `competition_viewed`

### Пример отправки целей

```typescript
import { useYandexMetrica } from '../components/YandexMetrica';

function MyComponent() {
  const { ym } = useYandexMetrica();

  const handleRegister = async () => {
    await apiFetch('/competitions/1/register', { method: 'POST' });
    ym('reachGoal', 'competition_registered', {
      competition_id: 1,
      value: 1
    });
  };

  return <button onClick={handleRegister}>Зарегистрироваться</button>;
}
```

---

## 2. Google Analytics 4

### Создание аккаунта

1. Перейдите на [Google Analytics](https://analytics.google.com/)
2. Войдите под своим Google.аккаунтом
3. Нажмите "Начать измерение"
4. Создайте аккаунт и ресурс

### Настройка потока данных

1. Выберите тип потока: **Веб**
2. Введите URL сайта: `nastarte.ru`
3. Название потока: `Основной сайт`
4. Скопируйте измерительный ID (начинается с `G-`)

### Установка на сайт

1. Откройте файл `frontend/.env.local`
2. Добавьте измерительный ID в переменную `NEXT_PUBLIC_GA_MEASUREMENT_ID`:
   ```
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-1234567890
   ```
3. Перезапустите frontend после изменения переменных

### Настройка событий

Рекомендуемые события:
1. **registration** — завершение регистрации
2. **login** — вход пользователя
3. **create_competition** — создание объявления
4. **join_competition** — запись на соревнование
5. **view_competition** — просмотр страницы соревнования
6. **search** — поиск по каталогу

### Пример отправки событий

```typescript
import { useGoogleAnalytics } from '../components/GoogleAnalytics';

function MyComponent() {
  const { ga } = useGoogleAnalytics();

  const handleCreate = async () => {
    await apiFetch('/competitions', { method: 'POST', body: data });
    ga('event', 'create_competition', {
      event_category: 'engagement',
      event_label: 'Competition Created',
      value: 1
    });
  };

  return <button onClick={handleCreate}>Создать</button>;
}
```

---

## 3. Google Tag Manager (рекомендуется)

### Преимущества GTM

- Управление всеми тегами из одного интерфейса
- Отладка без изменения кода
- Встроенные шаблоны для популярных сервисов
- Контроль версий конфигураций

### Установка GTM

1. Создайте аккаунт на [Google Tag Manager](https://tagmanager.google.com/)
2. Создайте контейнер для сайта
3. Скопируйте код контейнера
4. Добавьте код в `layout.tsx`:

```typescript
// В head секцию
<script
  dangerouslySetInnerHTML={{
    __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true,j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-XXXXXXX');`
  }}
/>

// После открывающего тега body
<noscript>
  <iframe
    src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
    height="0"
    width="0"
    style={{ display: 'none', visibility: 'hidden' }}
  />
</noscript>
```

---

## 4. Проверка работы аналитики

### Яндекс.Метрика

1. Откройте сайт в режиме инкогнито
2. Перейдите в Яндекс.Метрику → Отчеты → Стандартные → Посещаемость
3. Проверьте, что визиты отображаются (задержка 1-2 минуты)
4. Используйте "Мониторинг" для проверки в реальном времени

### Google Analytics

1. Откройте сайт в режиме инкогнито
2. Перейдите в GA4 → Отчеты → В реальном времени
3. Проверьте активность пользователей
4. Проверьте отправку событий

### Инструменты отладки

- **Yandex Metrica Debugger** — расширение для Chrome
- **Google Analytics Debugger** — расширение для Chrome
- **Google Tag Assistant** — проверка тегов Google

---

## 5. Конфиденциальность и GDPR

### Уведомление о cookie

Добавьте баннер с согласием на использование cookie:

```typescript
// Компонент CookieBanner
export function CookieBanner() {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    setAccepted(true);
    localStorage.setItem('cookie_consent', 'true');
    // Инициализация аналитики после согласия
  };

  if (accepted) return null;

  return (
    <div className="cookie-banner">
      <p>Мы используем cookie для улучшения работы сайта...</p>
      <button onClick={handleAccept}>Принять</button>
    </div>
  );
}
```

### Политика конфиденциальности

Создайте страницу `/privacy` с информацией:
- Какие данные собираются
- Для каких целей
- Как хранятся
- Права пользователя

---

## 6. Рекомендуемые метрики для отслеживания

### Верхнеуровневые метрики

- **LTV (Lifetime Value)** — общая ценность пользователя
- **MAU (Monthly Active Users)** — месячная активная аудитория
- **ROI (Return on Investment)** — окупаемость инвестиций
- **CAC (Customer Acquisition Cost)** — стоимость привлечения

### Низкоуровневые метрики

- **Конверсия регистрации** — посетители → зарегистрированные
- **Конверсия создания объявления** — зарегистрированные → создатели
- **Среднее время на сайте**
- **Глубина просмотра**
- **Показатель отказов**

### Метрики для соревнований

- Количество просмотров объявления
- Количество записей на соревнование
- Конверсия просмотра в запись
- Среднее количество участников

---

## 7. Отчеты и дашборды

### Рекомендуемые отчеты в Яндекс.Метрике

1. **Источники трафика**
   - Поисковые системы
   - Социальные сети
   - Прямые заходы

2. **Поведение пользователей**
   - Глубина просмотра
   - Время на сайте
   - Карта кликов

3. **Конверсии**
   - Цели по регистрации
   - Цели по созданию объявлений
   - Цели по записи на соревнования

### Рекомендуемые отчеты в Google Analytics

1. **Acquisition** → Traffic acquisition
2. **Engagement** → Events
3. **Engagement** → Pages and screens
4. **Monetization** → Ecommerce purchases (если есть платные функции)

---

## 8. Интеграция с другими сервисами

### Яндекс.Вебмастер

1. Добавьте сайт в [Яндекс.Вебмастер](https://webmaster.yandex.ru/)
2. Подтвердите права на сайт
3. Свяжите с Яндекс.Метрикой
4. Настройте индексацию страниц

### Google Search Console

1. Добавьте сайт в [Google Search Console](https://search.google.com/search-console)
2. Подтвердите права на сайт
3. Свяжите с Google Analytics
4. Отслеживайте позиции в поиске

---

## Чек-лист после настройки

- [ ] Номер счетчика Яндекс.Метрики добавлен в NEXT_PUBLIC_YANDEX_METRIKA_ID
- [ ] Измерительный ID Google Analytics добавлен в NEXT_PUBLIC_GA_MEASUREMENT_ID
- [ ] Файл .env.local создан и настроен
- [ ] Цели настроены в Яндекс.Метрике
- [ ] События настроены в Google Analytics
- [ ] Проверена отправка данных в реальном времени
- [ ] Настроен баннер cookie (при необходимости)
- [ ] Сайт добавлен в Яндекс.Вебмастер
- [ ] Сайт добавлен в Google Search Console
- [ ] Созданы дашборды для отслеживания метрик
