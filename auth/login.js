const DIRECTUS_URL = 'https://restrict-rapids-andale-maintains.trycloudflare.com';

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Login page loaded');

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const errorText = document.getElementById('errorText');
    const successText = document.getElementById('successText');


    // Обработка отправки формы
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Скрыть предыдущие сообщения
        hideMessages();

        // Получить данные формы
        const formData = new FormData(loginForm);
        const email = formData.get('email');
        const password = formData.get('password');

        // Базовая валидация
        if (!validateEmail(email)) {
            showError('Пожалуйста, введите корректный email');
            return;
        }

        if (password.length < 6) {
            showError('Пароль должен содержать минимум 6 символов');
            return;
        }

        // Показать индикатор загрузки
        const submitBtn = loginForm.querySelector('.auth-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Вход...';
        submitBtn.disabled = true;

        try {
            // Запрос к Directus API
            const result = await loginToDirectus(email, password);

            if (result.success) {
                console.log('✅ Login successful, saving data...');
                console.log('Access token:', result.accessToken ? 'exists' : 'missing');
                console.log('User data:', result.user ? 'exists' : 'missing');
                
                // Сохраняем токен и данные пользователя
                const remember = !!formData.get('remember');
                console.log('Remember me:', remember);

                // 🔥 Сначала очищаем старые данные
                if (typeof clearAuthData === 'function') {
                    console.log('🧹 Clearing old auth data...');
                    clearAuthData();
                }

                // Сохраняем новые
                if (typeof setAuthToken === 'function') {
                    console.log('💾 Setting auth token...');
                    setAuthToken(result.accessToken, remember);
                } else {
                    console.error('❌ setAuthToken function not found!');
                }
                
                if (typeof setUserData === 'function') {
                    console.log('💾 Setting user data...');
                    setUserData(result.user, remember);
                } else {
                    console.error('❌ setUserData function not found!');
                }

                // Проверяем что сохранилось
                setTimeout(() => {
                    if (typeof getAuthToken === 'function' && typeof getUserData === 'function') {
                        const token = getAuthToken();
                        const userData = getUserData();
                        console.log('🔍 Verification - Token:', !!token);
                        console.log('🔍 Verification - UserData:', !!userData);
                    } else {
                        console.error('❌ getAuthToken or getUserData functions not found!');
                    }
                }, 100);

                // 🔥 ВАЖНО: ставим флаг что только что залогинились
                // Это предотвратит повторную проверку авторизации в profile.js
                sessionStorage.setItem('justLoggedIn', 'true');
                console.log('✅ Флаг justLoggedIn установлен');

                showSuccess('Вход выполнен успешно!');

                // 🔥 Используем replace вместо href чтобы нельзя было вернуться назад
                setTimeout(() => {
                    console.log('🔄 Редирект на профиль...');
                    window.location.replace('../profile/profile.html');
                }, 1000);

            } else {
                showError(result.message || 'Неверный email или пароль');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('Произошла ошибка. Пожалуйста, попробуйте позже.');
        } finally {
            // Восстановить кнопку
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Обработка входа через Google
    const googleBtn = document.querySelector('.google-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showError('Вход через Google временно недоступен');
        });
    }

    // Обработка ссылки "Забыли пароль"
    const forgotPasswordLink = document.querySelector('.forgot-password');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            showError('Функция восстановления пароля временно недоступна');
        });
    }
});

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    if (errorText) errorText.textContent = message;
    if (errorMessage) errorMessage.style.display = 'block';

    setTimeout(() => {
        hideMessages();
    }, 5000);
}

function showSuccess(message) {
    const successMessage = document.getElementById('successMessage');
    const successText = document.getElementById('successText');

    if (successText) successText.textContent = message;
    if (successMessage) successMessage.style.display = 'block';

    setTimeout(() => {
        hideMessages();
    }, 5000);
}

function hideMessages() {
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    if (errorMessage) errorMessage.style.display = 'none';
    if (successMessage) successMessage.style.display = 'none';
}

async function loginToDirectus(email, password) {
    try {
        const response = await fetch(`${DIRECTUS_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.errors?.[0]?.message || 'Ошибка входа');
        }

        return {
            success: true,
            accessToken: data.data.access_token,
            refreshToken: data.data.refresh_token,
            user: data.data.user
        };
    } catch (error) {
        console.error('Directus login error:', error);
        return {
            success: false,
            message: error.message || 'Неверный email или пароль'
        };
    }
}