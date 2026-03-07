const DIRECTUS_URL = 'https://ind-announcement-viewers-dramatically.trycloudflare.com';
const REGISTER_WEBHOOK = 'https://ind-announcement-viewers-dramatically.trycloudflare.com/flows/trigger/fcc8ea87-f310-4fe8-8701-c146628edfa4';

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordStrength = document.getElementById('passwordStrength');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const errorText = document.getElementById('errorText');
    const successText = document.getElementById('successText');

    // Обработка отправки формы
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Скрыть предыдущие сообщения
        hideMessages();
        
        // Получить данные формы
        const formData = new FormData(registerForm);
        const userData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            agree: formData.get('agree'),
            newsletter: formData.get('newsletter')
        };
        
        // Валидация формы
        const validationError = validateRegistrationForm(userData);
        if (validationError) {
            showError(validationError);
            return;
        }
        
        // Показать индикатор загрузки
        const submitBtn = registerForm.querySelector('.auth-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Регистрация...';
        submitBtn.disabled = true;
        
        try {
            // Симуляция запроса к API (замените на реальный запрос)
            const result = await registerInDirectus(userData);

            if (result.success) {
                // Опционально: сразу логиним пользователя
                try {
                    const loginResult = await loginToDirectus(userData.email, userData.password);
                    if (loginResult.success) {
                        const storage = localStorage;
                        storage.setItem('access_token', loginResult.accessToken);
                        storage.setItem('refresh_token', loginResult.refreshToken);
                        storage.setItem('user_data', JSON.stringify(loginResult.user));
                    }
                } catch (e) {
                    console.log('⚠️ Не удалось автоматически войти, но регистрация успешна');
                }

                showSuccess('Регистрация прошла успешно! Перенаправляем...');

                setTimeout(() => {
                    window.location.href = '../profile/profile.html';
                }, 2000);
            } else {
                showError(result.message);
            }
        } catch (error) {
            showError('Произошла ошибка. Пожалуйста, попробуйте позже.');
            console.error('Registration error:', error);
        }
    });

    // Обработка изменения пароля для индикатора силы
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        updatePasswordStrength(password);
        
        // Проверка совпадения паролей
        if (confirmPasswordInput.value) {
            validatePasswordMatch();
        }
    });

    // Обработка изменения подтверждения пароля
    confirmPasswordInput.addEventListener('input', validatePasswordMatch);

    // Обработка входа через Google
    const googleBtn = document.querySelector('.google-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', function() {
            showError('Регистрация через Google временно недоступна');
        });
    }

    // Обработка ссылки "условиями использования"
    const termsLink = document.querySelector('.terms-link');
    if (termsLink) {
        termsLink.addEventListener('click', function(e) {
            e.preventDefault();
            showError('Страница условий использования временно недоступна');
        });
    }
});

// Валидация формы регистрации
function validateRegistrationForm(userData) {
    // Валидация имени
    if (!userData.firstName || userData.firstName.length < 2) {
        return 'Имя должно содержать минимум 2 символа';
    }
    
    if (!userData.lastName || userData.lastName.length < 2) {
        return 'Фамилия должна содержать минимум 2 символа';
    }
    
    // Валидация email
    if (!validateEmail(userData.email)) {
        return 'Пожалуйста, введите корректный email';
    }
    
    // Валидация телефона
    if (!validatePhone(userData.phone)) {
        return 'Пожалуйста, введите корректный номер телефона';
    }
    
    // Валидация пароля
    if (userData.password.length < 6) {
        return 'Пароль должен содержать минимум 6 символов';
    }
    
    if (userData.password.length > 50) {
        return 'Пароль слишком длинный';
    }
    
    // Валидация совпадения паролей
    if (userData.password !== userData.confirmPassword) {
        return 'Пароли не совпадают';
    }
    
    // Валидация согласия с условиями
    if (!userData.agree) {
        return 'Необходимо согласиться с условиями использования';
    }
    
    return null;
}

// Функция валидации email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Функция валидации телефона
function validatePhone(phone) {
    // Базовая валидация телефона для российского формата
    const re = /^(\+7|8)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
    return re.test(phone.replace(/[^\d+]/g, ''));
}

// Обновление индикатора силы пароля
function updatePasswordStrength(password) {
    const passwordStrength = document.getElementById('passwordStrength');
    
    if (!password) {
        passwordStrength.innerHTML = '';
        return;
    }
    
    let strength = 0;
    
    // Проверка длины
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    
    // Проверка на разные типы символов
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    // Создание индикатора
    let strengthClass = '';
    let strengthText = '';
    
    if (strength <= 2) {
        strengthClass = 'strength-weak';
        strengthText = 'Слабый пароль';
    } else if (strength <= 4) {
        strengthClass = 'strength-medium';
        strengthText = 'Средний пароль';
    } else {
        strengthClass = 'strength-strong';
        strengthText = 'Надежный пароль';
    }
    
    passwordStrength.innerHTML = `
        <div class="password-strength-bar ${strengthClass}"></div>
        <div class="password-strength-text">${strengthText}</div>
    `;
}

// Валидация совпадения паролей
function validatePasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (confirmPassword && password !== confirmPassword) {
        confirmPasswordInput.classList.add('error');
        confirmPasswordInput.classList.remove('success');
        return false;
    } else if (confirmPassword && password === confirmPassword) {
        confirmPasswordInput.classList.add('success');
        confirmPasswordInput.classList.remove('error');
        return true;
    } else {
        confirmPasswordInput.classList.remove('error', 'success');
        return false;
    }
}

// Функция показа ошибки
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    errorText.textContent = message;
    errorMessage.style.display = 'block';
    
    // Автоматически скрыть через 5 секунд
    setTimeout(() => {
        hideMessages();
    }, 5000);
}

// Функция показа успеха
function showSuccess(message) {
    const successMessage = document.getElementById('successMessage');
    const successText = document.getElementById('successText');
    
    successText.textContent = message;
    successMessage.style.display = 'block';
    
    // Автоматически скрыть через 5 секунд
    setTimeout(() => {
        hideMessages();
    }, 5000);
}

// Функция скрытия сообщений
function hideMessages() {
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}

// Симуляция API запроса для регистрации
async function registerInDirectus(userData) {
    try {
        console.log('📤 Отправка на Flow...');

        const response = await fetch(REGISTER_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: userData.email,
                password: userData.password,
                first_name: userData.firstName,
                last_name: userData.lastName,
                phone: userData.phone
            })
        });

        console.log('📥 HTTP Status:', response.status);

        const text = await response.text();
        console.log('📦 Raw response:', text);

        // Если ответ пустой, но статус 200
        if (!text && response.ok) {
            return { success: true, message: 'Пользователь создан' };
        }

        // Парсим JSON
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('❌ Не JSON ответ:', text);
            throw new Error('Сервер вернул некорректный ответ');
        }

        // Обработка ошибок
        if (!response.ok) {
            console.error('❌ Ошибка от сервера:', data);
            const msg = data.errors?.[0]?.message || data.message || 'Ошибка регистрации';

            if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('unique')) {
                return { success: false, message: 'Email уже занят' };
            }
            throw new Error(msg);
        }

        console.log('✅ Успех:', data);
        return { success: true, user: data };

    } catch (error) {
        console.error('💥 Исключение:', error);
        return { success: false, message: error.message || 'Ошибка сервера' };
    }
}

// Проверка авторизации при загрузке страницы
function checkAuthStatus() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
        // Пользователь уже авторизован, перенаправить в профиль
        window.location.href = '../profile/profile.html';
    }
}

// Вызвать проверку при загрузке
checkAuthStatus();
