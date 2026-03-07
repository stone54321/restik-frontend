# Инструкция по настройке авторизации (Auth) для Restik

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

## 2. Настройка коллекции directus_users

### Стандартные поля (уже есть в Directus)

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| email | String | Да | Email для входа |
| password | Hash | Да | Пароль (хешируется автоматически) |
| first_name | String | Нет | Имя пользователя |
| last_name | String | Нет | Фамилия |
| avatar | File | Нет | Аватарка |
| role | M2O → roles | Да | Роль (admin/user/public) |
| status | Select | Да | active / invited / draft |

### Дополнительные поля (опционально)

Зайдите в Settings → Data Model → directus_users
Нажмите "Create Field"
Добавьте поля:

| Поле | Тип | Зачем |
|------|-----|-------|
| phone | Input | Для уведомлений о брони |
| preferences | JSON | Настройки пользователя (тема, язык) |
| last_login | DateTime | Отслеживание активности |

## 3. Настройка прав доступа

### Роль: Public (неавторизованные)

Перейдите в Settings → Roles & Permissions
Откройте роль "Public"
Найдите коллекцию directus_users
Установите права:
- Read: ❌
- Create: ✅ (только регистрация)
- Update: ❌
- Delete: ❌

### Роль: User (авторизованные)

Откройте роль "User"
Найдите коллекцию directus_users
Установите права:
- Read: ✅ (фильтр: id = $CURRENT_USER)
- Create: ❌
- Update: ✅ (фильтр: id = $CURRENT_USER, только свои поля)
- Delete: ❌

## 4. Настройка токенов (важно!)

В файле .env проекта Directus добавьте:

```env
# Время жизни access token (по умолчанию 15 мин)
ACCESS_TOKEN_TTL=2592000

# Время жизни refresh token
REFRESH_TOKEN_TTL=2592000
```

После изменений перезапустите Directus.

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

Проверьте работу авторизации через консоль или браузер:

```bash
# Тест входа (замените email/password на свои)
curl -X POST http://localhost:8055/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"ваш_пароль"}'
```

Должен вернуть JSON с access_token и данными пользователя.

## 7. Настройка фронтенда

В файле auth-helper.js убедитесь, что указан правильный URL:

```javascript
const DIRECTUS_URL = 'http://localhost:8055'; // Ваш URL Directus
```

### Ключевые функции

| Функция | Описание |
|---------|----------|
| loginToDirectus(email, password) | Отправка данных на сервер |
| setAuthToken(token, remember) | Сохранение токена |
| getAuthToken() | Получение токена |
| clearAuthData() | Выход из аккаунта |
| checkAuthStatus() | Проверка авторизации |

## 8. Тестирование

1. Запустите Directus: `npx directus start`
2. Откройте auth/login.html в браузере
3. Введите тестовые данные администратора
4. Проверьте редирект в профиль после успешного входа
5. Проверьте ошибку при неверном пароле

## 9. Возможные проблемы

### Ошибка "Неверный email или пароль"
- Проверьте, что пользователь активен в админке (статус = Active)
- Убедитесь, что пароль введён правильно
- Проверьте настройки CORS в Directus

### Токен быстро протухает
- Увеличьте ACCESS_TOKEN_TTL в .env до 2592000 (30 дней)
- Перезапустите Directus после изменений

### Бесконечный редирект
- Проверьте функцию checkAuthStatus() в auth-helper.js
- Убедитесь, что флаг justLoggedIn устанавливается после входа

## 10. Продвинутые функции

### Авто-обновление токена
Добавьте функцию refreshAccessToken() для автоматического обновления токена при истечении.

### Регистрация новых пользователей
Добавьте эндпоинт POST /users с валидацией и ограничением роли (только user, не admin).

### Двухфакторная аутентификация
Включите TOTP в настройках Directus: Settings → Project → Auth Providers.

Эта инструкция поможет настроить безопасную систему авторизации для Restik.
