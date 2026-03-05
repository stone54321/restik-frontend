// JavaScript для управления состоянием авторизации
// Версия: 2.1-STABLE (Fixed: sessionStorage issues, network error handling)

// Глобальный флаг
let isLoggingOut = false;

// ============================================
// ⚙️ НАСТРОЙКИ (КОНФИГ)
// ============================================

/**
 * 🔥 ВАЖНО: Функция возвращает адрес твоего бэкенда.
 *
 * ДЛЯ ЛОКАЛЬНОЙ РАЗРАБОТКИ:
 *   Оставь как есть: 'http://localhost:8055'
 *
 * ДЛЯ ПУБЛИКАЦИИ (Vercel/Netlify + Cloudflare Tunnel):
 *   1. Запусти cloudflared и скопируй публичную ссылку (вида ...trycloudflare.com)
 *   2. Замени строку ниже на эту ссылку:
 *      return 'https://твоя-ссылка-от-cloudflare.trycloudflare.com';
 */
function getApiUrl() {
    // === МЕНЯТЬ СТРОКУ НИЖЕ ПРИ ДЕПЛОЕ ===
    return 'https://finite-ken-correction-operate.trycloudflare.com';
    // =====================================
}

// ============================================
// 🍪 ФУНКЦИИ ДЛЯ РАБОТЫ С COOKIES
// ============================================

function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
            const value = c.substring(nameEQ.length, c.length);
            return value ? decodeURIComponent(value) : null;
        }
    }
    return null;
}

function deleteCookie(name) {
    // Удаляем cookie во всех возможных путях
    const paths = ['/', '/auth', '/menu', '/profile', '/api', '/booking', '/contact'];
    const domain = window.location.hostname;

    // Базовое удаление
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;

    // Удаление по путям и доменам
    paths.forEach(path => {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};domain=${domain}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};domain=.${domain}`;
    });
}

// ============================================
// 🔑 ТОКЕН И ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
// ============================================

/**
 * Получает токен. Приоритет: Куки -> LocalStorage
 * (SessionStorage убран для надежности)
 */
function getAuthToken() {
    return getCookie('authToken') ||
        localStorage.getItem('authToken') ||
        null;
}

/**
 * Сохраняет токен.
 * @param {string} token - JWT токен
 * @param {boolean} remember - Если true, сохраняет в куки на 30 дней + localStorage.
 *                             Если false, только в localStorage (до очистки кэша).
 */
function setAuthToken(token, remember = false) {
    // Сначала полная очистка старых данных
    deleteCookie('authToken');
    localStorage.removeItem('authToken');

    if (remember) {
        // Долгосрочное хранение: Куки + LocalStorage
        setCookie('authToken', token, 30);
        localStorage.setItem('authToken', token);
    } else {
        // Краткосрочное: Только LocalStorage (надежнее чем sessionStorage)
        localStorage.setItem('authToken', token);
    }
    console.log('✅ AuthToken saved');
}

/**
 * Получает данные пользователя (распаршенный JSON)
 */
function getUserData() {
    const raw = getCookie('userData') || localStorage.getItem('userData');
    if (!raw || raw === 'undefined') return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error('❌ Error parsing userData:', e);
        return null;
    }
}

/**
 * Сохраняет данные пользователя
 */
function setUserData(userData, remember = false) {
    if (!userData) return;
    const str = JSON.stringify(userData);

    deleteCookie('userData');
    localStorage.removeItem('userData');

    if (remember) {
        setCookie('userData', str, 30);
        localStorage.setItem('userData', str);
    } else {
        localStorage.setItem('userData', str);
    }
}

/**
 * Полная очистка данных авторизации
 */
function clearAuthData() {
    console.log('🧹 Clearing auth data...');

    // Cookies
    deleteCookie('authToken');
    deleteCookie('userData');

    // LocalStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');

    // SessionStorage (на всякий случай, если где-то осталось)
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
}

// ============================================
// 🔄 ПРОВЕРКА СТАТУСА (МЯГКАЯ)
// ============================================

/**
 * Проверяет валидность токена на сервере.
 * 🔥 ВАЖНО: Не разлогинивает при сетевых ошибках!
 */
async function checkAuthStatus() {
    if (isLoggingOut) return;

    const token = getAuthToken();
    if (!token) return; // Нет токена - нечего проверять

    const apiUrl = getApiUrl();

    try {
        const response = await fetch(`${apiUrl}/users/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // 🔥 КЛЮЧЕВОЙ МОМЕНТ:
        // 401/403 = Токен реально протух -> разлогиниваем
        // 500/0/Таймаут = Проблема сети/сервера -> НЕ трогаем пользователя
        if (response.status === 401 || response.status === 403) {
            console.warn('⚠️ Token invalid (401/403), logging out...');
            clearAuthData();
            updateAuthLinks();
        }
        // Если 200 OK - всё отлично, ничего делать не надо

    } catch (error) {
        // Сетевая ошибка (например, бэкенд выключен или нет интернета)
        // Мы НЕ разлогиниваем пользователя, просто пишем в консоль
        console.log('⚠️ Network error during auth check (keeping user logged in):', error.message);
    }
}

// ============================================
// 🔐 ПРОВЕРКА ВХОДА (HELPER)
// ============================================

/**
 * Возвращает Promise<boolean>, удобно для защиты роутов
 */
async function isAuthenticated() {
    const token = getAuthToken();
    if (!token) return false;

    let userData = getUserData();

    // Если токена есть, но данных нет — пробуем подгрузить с сервера
    if (!userData) {
        try {
            const apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.data) {
                    setUserData(data.data, getCookie('authToken') !== null);
                    return true;
                }
            }
        } catch (e) {
            console.log('⚠️ Could not fetch userData:', e.message);
        }
        return false;
    }

    return true;
}

// ============================================
// 🔗 ОБНОВЛЕНИЕ ССЫЛОК В МЕНЮ
// ============================================

function updateAuthLinks() {
    const authLink = document.getElementById('authLink');
    if (!authLink) return;

    const token = getAuthToken();
    const userData = getUserData();

    if (token && userData) {
        // Пользователь авторизован
        authLink.textContent = userData.first_name || 'Профиль';

        // Умное определение пути к профилю (относительные пути)
        const path = window.location.pathname;
        let profilePath = 'profile/profile.html'; // Дефолт для корня

        if (path.includes('/menu/') || path.includes('/auth/') ||
            path.includes('/booking/') || path.includes('/contact/') || path.includes('/profile/')) {
            profilePath = '../profile/profile.html';
        }

        authLink.href = profilePath;
        authLink.classList.add('authenticated');
    } else {
        // Пользователь гость
        authLink.textContent = 'Войти';

        // Умное определение пути к логину
        const path = window.location.pathname;
        let loginPath = 'auth/login.html'; // Дефолт для корня

        if (path.includes('/menu/') || path.includes('/auth/') ||
            path.includes('/booking/') || path.includes('/contact/') || path.includes('/profile/')) {
            loginPath = '../auth/login.html';
        }

        authLink.href = loginPath;
        authLink.classList.remove('authenticated');
    }
}

// ============================================
// 🚪 ФУНКЦИЯ ВЫХОДА (LOGOUT)
// ============================================

function logout() {
    console.log('🚪 Logout initiated');
    isLoggingOut = true;

    // 1. Очистка данных
    clearAuthData();

    // 2. Обновление UI (кнопка сразу станет "Войти")
    updateAuthLinks();

    // 3. Редирект на главную
    const path = window.location.pathname;
    // Если мы в подпапке, идем на уровень вверх
    const redirect = (path.includes('/menu/') || path.includes('/auth/') || path.includes('/profile/'))
        ? '../index.html'
        : 'index.html';

    console.log(`🔄 Redirecting to: ${redirect}`);

    // Небольшая задержка для визуального эффекта
    setTimeout(() => {
        window.location.replace(redirect);
        isLoggingOut = false;
    }, 300);
}

// ============================================
// 🎨 СТИЛИ (ИНЖЕКТИРУЮТСЯ АВТОМАТИЧЕСКИ)
// ============================================

if (!document.getElementById('auth-styles')) {
    const style = document.createElement('style');
    style.id = 'auth-styles';
    style.textContent = `
        #authLink.authenticated { 
            background: #D4A373; 
            color: #1A1A1A; 
            padding: 8px 18px; 
            border-radius: 20px; 
            font-weight: 500;
            transition: all 0.3s ease;
        }
        #authLink.authenticated:hover { 
            background: transparent; 
            color: #D4A373; 
            border: 1px solid #D4A373;
        }
        /* Скрываем стрелочку у ссылки профиля если есть */
        #authLink.authenticated::after { display: none !important; }
    `;
    document.head.appendChild(style);
}

// ============================================
// 🚀 ИНИЦИАЛИЗАЦИЯ
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Проверяем статус и обновляем интерфейс
    checkAuthStatus().then(() => {
        updateAuthLinks();
    }).catch(err => {
        console.error('Auth init error:', err);
        updateAuthLinks(); // На всякий случай обновляем даже при ошибке
    });
});

// ============================================
// 🌍 GLOBAL EXPORTS (ДЛЯ HTML onclick)
// ============================================
// Делаем функции доступными глобально, чтобы работали onclick="logout()" в HTML

window.logout = logout;
window.updateAuthLinks = updateAuthLinks;
window.getAuthToken = getAuthToken;
window.setAuthToken = setAuthToken;
window.getUserData = getUserData;
window.setUserData = setUserData;
window.clearAuthData = clearAuthData;
window.isAuthenticated = isAuthenticated;
window.checkAuthStatus = checkAuthStatus;
window.getApiUrl = getApiUrl; // Экспортируем и конфиг
window.getCookie = getCookie;
window.setCookie = setCookie;
window.deleteCookie = deleteCookie;

console.log('✅ auth-helper.js v2.1 loaded');