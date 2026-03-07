# Инструкция по настройке профиля (Profile) для Restik

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

## 2. Настройка коллекции directus_users для профиля

### Обязательные поля

| Поле | Тип | Видимость | Редактирование |
|------|-----|-----------|----------------|
| email | String | ✅ Чтение | ❌ (только через админа) |
| first_name | String | ✅ | ✅ |
| last_name | String | ✅ | ✅ |
| phone | String | ✅ | ✅ |
| avatar | File | ✅ | ✅ |

### Настройка прав для роли User

Перейдите в Settings → Roles & Permissions → User
Найдите коллекцию directus_users

**Настройте Read:**
- Fields: email, first_name, last_name, phone, avatar
- Filter: id = $CURRENT_USER

**Настройте Update:**
- Fields: first_name, last_name, phone, avatar
- Filter: id = $CURRENT_USER

## 3. Настройка связи с бронированиями

### Связь коллекций

```
directus_users (1) ──< (N) bookings
                     user_id → directus_users.id
```

### Поля в коллекции bookings

| Поле | Тип | Описание |
|------|-----|----------|
| user_id | M2O → directus_users | Кто забронировал |
| date | Date | Дата визита |
| time | Time | Время визита |
| guests | Integer | Количество гостей |
| status | Select | pending / confirmed / cancelled |

## 4. Настройка прав доступа к бронированиям

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

Проверьте загрузку профиля через браузер:

```bash
# Загрузка своих данных (нужен токен)
http://localhost:8055/users/me

# Загрузка своих бронирований
http://localhost:8055/items/bookings?filter[user_id][_eq]=ID_ПОЛЬЗОВАТЕЛЯ
```

## 7. Настройка фронтенда

В файле profile/profile.js убедитесь, что указан правильный URL:

```javascript
const DIRECTUS_URL = 'http://localhost:8055'; // Ваш URL Directus
```

### Ключевые функции

| Функция | Описание |
|---------|----------|
| loadUserProfile() | Загрузка данных пользователя |
| updateProfile(formData) | Обновление данных профиля |
| loadUserBookings(userId) | Загрузка истории бронирований |
| cancelBooking(bookingId) | Отмена брони (если статус = pending) |

## 8. Тестирование

1. Запустите Directus: `npx directus start`
2. Авторизуйтесь на сайте
3. Откройте profile/profile.html в браузере
4. Проверьте загрузку данных профиля
5. Измените имя → сохраните → проверьте обновление
6. Проверьте отображение истории бронирований

## 9. Возможные проблемы

### Данные профиля не загружаются
- Проверьте, что токен сохранён (getAuthToken() возвращает значение)
- Убедитесь, что у роли User есть права Read на directus_users
- Проверьте фильтр: id = $CURRENT_USER

### Не сохраняется изменение
- Проверьте, что поле есть в разрешённом списке для Update
- Убедитесь, что запрос отправляется с заголовком Authorization: Bearer ...

### Показываются чужие бронирования
- Добавьте фильтр user_id = $CURRENT_USER в запрос к bookings
- Проверьте права доступа в Directus

## 10. Продвинутые функции

### Загрузка аватара
Добавьте поддержку multipart/form-data для загрузки файлов:

```javascript
const formData = new FormData();
formData.append('avatar', fileInput.files[0]);
```

### Уведомления об изменениях
Добавьте отображение тостов после успешного обновления профиля.

### Сохранение темы в профиль
Добавьте поле preferences (JSON) для хранения настроек интерфейса.

Эта инструкция поможет настроить личный кабинет пользователя для Restik.
