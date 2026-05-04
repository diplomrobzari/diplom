# Стандарты кнопок для проекта НаСтарте

## Основные стили кнопок

### 1. Primary (Главные действия)
**Использование**: Основные действия (отправить, сохранить, записаться, зарегистрироваться)
```tsx
className="bg-[#D4FF00] text-[#1E3A8A] px-6 py-3 rounded-xl font-bold uppercase tracking-wide hover:shadow-lg hover:shadow-[#D4FF00]/30 transition-all"
```

### 2. Secondary (Вторичные действия)
**Использование**: Дополнительные действия (включить 2FA, внести результаты)
```tsx
className="bg-[#1E3A8A] text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wide hover:bg-[#0F1F4A] transition-colors"
```

### 3. Danger (Опасные действия)
**Использование**: Удаление, отключение
```tsx
className="bg-red-600 text-white px-4 py-3 rounded-xl font-bold uppercase tracking-wide hover:bg-red-700 transition-colors"
```

### 4. Tertiary (Отмена/назад)
**Использование**: Отмена, назад, нейтральные действия
```tsx
className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
```

## Размеры кнопок

### Большие (основные действия)
```tsx
className="px-8 py-4 ..."  // Для главных CTA
```

### Средние (стандартные)
```tsx
className="px-6 py-3 ..."  // Для большинства кнопок
```

### Малые (компактные)
```tsx
className="px-4 py-2 ..."  // Для таблиц, списков
```

### Мини (в таблицах)
```tsx
className="px-3 py-1 ..."  // Для действий в строках таблиц
```

## Состояния

### Disabled
```tsx
className="... disabled:opacity-50 disabled:cursor-not-allowed"
```

### Loading
```tsx
className="... opacity-50"
// Текст: "Сохранение..." или "..."
```

## Примеры использования

### Форма (Primary + Tertiary)
```tsx
<div className="flex gap-3">
  <button type="submit" className="flex-1 bg-[#D4FF00] text-[#1E3A8A] ...">
    Сохранить
  </button>
  <button type="button" className="bg-gray-100 text-gray-700 ...">
    Отмена
  </button>
</div>
```

### Карточка (Secondary + Danger)
```tsx
<div className="flex gap-2">
  <button className="bg-[#1E3A8A] text-white ...">
    Редактировать
  </button>
  <button className="bg-red-600 text-white ...">
    Удалить
  </button>
</div>
```

### Переключатель (активный/неактивный)
```tsx
className={isActive 
  ? "bg-[#D4FF00] text-[#1E3A8A] shadow-lg shadow-[#D4FF00]/30" 
  : "bg-gray-100 text-gray-700 hover:bg-gray-200"}
```

## Цветовая палитра

- **Primary yellow**: `#D4FF00` (неоновый жёлтый)
- **Primary blue**: `#1E3A8A` (тёмно-синий)
- **Danger**: `red-600` (#DC2626)
- **Neutral**: `gray-100` (#F3F4F6)

## Округление

- **xl**: `rounded-xl` (стандарт для большинства кнопок)
- **full**: `rounded-full` (для кнопок в Header)
- **lg**: `rounded-lg` (для малых кнопок)

## Шрифты

- **bold**: `font-bold` (для Primary и Danger)
- **semibold**: `font-semibold` (для Tertiary)
- **uppercase**: `uppercase tracking-wide` (для всех)
