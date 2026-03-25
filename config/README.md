# Конфигурация API

Этот файл содержит все настройки API для приложения Restik.

## Структура

- `config/api-config.js` - Основной файл конфигурации
- Используется во всех модулях приложения

## Как изменить URL API

При деплое на продакшен измените `DIRECTUS_URL` в файле `config/api-config.js`:

```javascript
const API_CONFIG = {
    // Измените этот URL на ваш продакшен Directus
    DIRECTUS_URL: 'https://your-production-directus-url.com',
    
    ENDPOINTS: {
        // Эндпоинты остаются теми же
        MENU_ITEMS: '/items/menu_items',
        TABLES: '/items/tables',
        RESERVATIONS: '/items/reservations',
        USERS: '/users',
        USERS_ME: '/users/me'
    }
};
```

## Использование в коде

```javascript
// В JavaScript файлах
const DIRECTUS_URL = window.API_CONFIG?.DIRECTUS_URL || 'fallback-url';
const MENU_ENDPOINT = window.API_CONFIG?.ENDPOINTS?.MENU_ITEMS || '/items/menu_items';
```

## Преимущества

1. **Централизованное управление** - все URL в одном месте
2. **Быстрое изменение** - достаточно поменять один файл
3. **Fallback** - если конфиг не загрузился, используются значения по умолчанию
4. **Масштабируемость** - легко добавить новые эндпоинты

## Файлы использующие конфиг

- `booking/booking.js`
- `menu/menu.js`
- `profile/profile.js`
- `auth/login.js`
- `auth/register.js`
- `auth-helper.js`
