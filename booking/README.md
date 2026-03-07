# Инструкция по настройке бронирования (Booking) для Restik

## 1. Установка Directus

Если у вас еще не установлен Directus, выполните:

```bash
# Глобальная установка
npm install -g directus

# Создание нового проекта
npx create-directus-project my-directus

# Запуск
cd my-directus
npx directus start
```

## 2. Настройка коллекции bookings

### Создание коллекции

1. Зайдите в админ-панель Directus (обычно http://localhost:8055)
2. Перейдите в Settings → Data Model
3. Нажмите "+" для создания новой коллекции
4. Назовите коллекцию `bookings`

### Поля коллекции

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| user_id | M2O → directus_users | Нет | Кто забронировал (опционально для гостей) |
| date | Date | Да | Дата визита |
| time | Time | Да | Время визита |
| guests | Integer | Да | Количество гостей (1-20) |
| table_id | M2O → tables | Нет | Выбранный стол (опционально) |
| status | Select | Да | pending / confirmed / cancelled / completed |
| notes | Textarea | Нет | Пожелания (аллергии, повод) |
| phone | String | Нет | Контактный телефон |

### Настройка поля status

Для поля status выберите тип "Select" и добавьте опции:
- `pending` - Ожидает подтверждения (по умолчанию)
- `confirmed` - Подтверждено
- `cancelled` - Отменено
- `completed` - Завершено

### Настройка поля guests

Для поля guests выберите тип "Integer" и установите:
- Min: 1
- Max: 20

## 3. Коллекция tables (опционально)

### Поля

| Поле | Тип | Описание |
|------|-----|----------|
| name | String | "Стол у окна", "VIP-зона" |
| capacity | Integer | Макс. количество гостей |
| location | Select | indoor / terrace / vip |
| is_active | Boolean | Доступен для бронирования |

## 4. Настройка прав доступа

### Роль: Public (неавторизованные)

Перейдите в Settings → Roles & Permissions → Public
Найдите коллекцию bookings
Установите права:
- Read: ❌
- Create: ❌
- Update: ❌
- Delete: ❌

### Роль: User (авторизованные)

Перейдите в Settings → Roles & Permissions → User
Найдите коллекцию bookings
Установите права:
- Read: ✅ (фильтр: user_id = $CURRENT_USER)
- Create: ✅
- Update: ✅ (фильтр: user_id = $CURRENT_USER AND status = pending)
- Delete: ✅ (фильтр: user_id = $CURRENT_USER AND status = pending)

## 5. Настройка CORS (если необходимо)

Если фронтенд находится на другом домене/порту:

Перейдите в Settings → Project Settings → CORS
Добавьте URL вашего фронтенда:
- Для локальной разработки: http://localhost:5500
- Для продакшена: https://restik-frontend.vercel.app

Установите галочки:
- ✅ GET
- ✅ POST
- ✅ PUT
- ✅ DELETE
- ✅ PATCH

## 6. Проверка API

Проверьте создание брони через консоль:

```bash
# Создание брони (гость)
curl -X POST http://localhost:8055/items/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-12-31",
    "time": "19:00",
    "guests": 4,
    "phone": "+79991234567",
    "status": "pending"
  }'
```

Должен вернуть JSON с созданной бронью.

## 7. Настройка фронтенда

В файле booking/booking.js убедитесь, что указан правильный URL:

```javascript
const DIRECTUS_URL = 'http://localhost:8055'; // Ваш URL Directus
```

### Ключевые функции

| Функция | Описание |
|---------|----------|
| createBooking(bookingData) | Создание новой брони |
| getAvailableTables(date, guests) | Получение свободных столов |
| getUserBookings(userId) | Загрузка бронирований пользователя |
| cancelBooking(bookingId) | Отмена брони (если статус = pending) |
| isValidBookingDate(date, time) | Валидация даты (нельзя в прошлом) |

## 8. Тестирование

1. Запустите Directus: `npx directus start`
2. Откройте booking/booking.html в браузере
3. Заполните форму бронирования
4. Проверьте создание брони в админке (статус = pending)
5. Авторизуйтесь → проверьте отображение брони в профиле
6. Попробуйте отменить бронь (должно работать только для pending)

## 9. Возможные проблемы

### Бронь не создаётся
- Проверьте, что все обязательные поля заполнены
- Убедитесь, что у роли есть права Create на bookings
- Проверьте валидацию на фронте (дата, количество гостей)

### Не показываются доступные столы
- Убедитесь, что у столов установлен is_active = true
- Проверьте права Read на коллекцию tables

### Пользователь видит чужие бронирования
- Добавьте фильтр user_id = $CURRENT_USER в запрос
- Проверьте настройки прав в Directus

## 10. Продвинутые функции

### Уведомления о статусе брони
Настройте Directus Flows для отправки письма при изменении статуса:
- Триггер: bookings → status updated
- Действие: Send Email → user.email

### Календарь с блокировкой занятых слотов
Добавьте запрос занятых времён на дату:

```bash
?filter[date][_eq]=2026-12-31&filter[status][_in]=pending,confirmed&fields=time
```

### Офлайн-доступ к броням
Добавьте PWA-функционал для сохранения последних бронирований в localStorage.

Эта инструкция поможет настроить систему бронирования для Restik.
