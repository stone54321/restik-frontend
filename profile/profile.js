// Конфигурация Directus
const DIRECTUS_URL = 'https://restrict-rapids-andale-maintains.trycloudflare.com';

// Глобальные переменные
let currentUser = null;
let userReservations = [];

// 🔥 Инициализация при загрузке страницы — БЕЗ РЕДИРЕКТОВ
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Профиль инициализирован');

    // 🔥 УБРАЛИ редирект! Просто загружаем профиль
    // Если не авторизован — покажем сообщение в loadProfile()

    loadProfile();
    setupEventListeners();
});

// ========== ФУНКЦИИ АВТОРИЗАЦИИ ==========

async function authFetch(url, options = {}) {
    const token = getAuthToken();

    if (!token) {
        throw new Error('Не авторизован');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
            const newToken = getAuthToken();
            headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(url, { ...options, headers });
        }
    }

    return response;
}

async function refreshToken() {
    return null;
}

async function getCurrentUser() {
    const token = getAuthToken();

    if (!token) {
        throw new Error('Пользователь не авторизован');
    }

    const response = await fetch(`${DIRECTUS_URL}/users/me`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                return getCurrentUser();
            }
            throw new Error('Сессия истекла');
        }
        const error = await response.json().catch(() => ({}));
        throw new Error(error.errors?.[0]?.message || 'Ошибка загрузки профиля');
    }

    const data = await response.json();
    return data.data;
}

// ========== ЗАГРУЗКА ПРОФИЛЯ ==========

async function loadProfile() {
    const loading = document.getElementById('loading');
    const profileContainer = document.getElementById('profileContainer');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    loading.style.display = 'flex';
    profileContainer.style.display = 'none';
    errorMessage.style.display = 'none';

    try {
        console.log('🔄 Загрузка профиля...');

        // 🔥 Проверяем авторизацию здесь, но НЕ редиректим
        if (!isAuthenticated()) {
            throw new Error('Пользователь не авторизован');
        }

        await loadUserData();

        if (currentUser?.id) {
            console.log('✅ Пользователь загружен:', currentUser.id);
            await loadUserReservations(currentUser.id);
            updateStatistics();
        }

        loading.style.display = 'none';
        profileContainer.style.display = 'block';
        console.log('✅ Профиль загружен');

    } catch (error) {
        console.error('❌ Ошибка загрузки профиля:', error);
        loading.style.display = 'none';
        errorMessage.style.display = 'block';
        profileContainer.style.display = 'none';
        errorText.textContent = getErrorMessage(error);

        // 🔥 Показываем ссылку на авторизацию (без редиректа!)
        if (error.message.includes('не авторизован') || error.message.includes('Сессия истекла')) {
            const authLink = document.createElement('a');
            authLink.href = '../auth/login.html';
            authLink.textContent = '→ Перейти к авторизации';
            authLink.style.color = '#D4A373';
            authLink.style.display = 'block';
            authLink.style.marginTop = '15px';
            authLink.style.textDecoration = 'none';
            authLink.style.fontWeight = '500';
            authLink.style.padding = '8px 16px';
            authLink.style.border = '1px solid #D4A373';
            authLink.style.borderRadius = '8px';
            authLink.style.display = 'inline-block';
            authLink.style.transition = 'all 0.2s';

            authLink.onmouseenter = () => {
                authLink.style.background = '#D4A373';
                authLink.style.color = '#1A1A1A';
            };
            authLink.onmouseleave = () => {
                authLink.style.background = 'transparent';
                authLink.style.color = '#D4A373';
            };

            errorText.appendChild(document.createElement('br'));
            errorText.appendChild(authLink);
        }
    }
}

async function loadUserData() {
    try {
        const user = await getCurrentUser();
        currentUser = user;
        console.log('👤 Данные пользователя:', user);
        updateProfileUI();
    } catch (error) {
        console.error('❌ Ошибка загрузки данных пользователя:', error);
        throw error;
    }
}

// ========== ОТОБРАЖЕНИЕ ПРОФИЛЯ ==========

function updateProfileUI() {
    if (!currentUser) return;

    const userName = document.getElementById('userName');
    if (userName) {
        userName.textContent = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'Имя пользователя';
    }

    const userEmail = document.getElementById('userEmail');
    if (userEmail) {
        userEmail.textContent = currentUser.email || 'email@example.com';
    }

    const userPhone = document.getElementById('userPhone');
    if (userPhone) {
        userPhone.textContent = currentUser.phone || '+7 (000) 000-00-00';
    }

    const avatarImage = document.getElementById('avatarImage');
    if (avatarImage) {
        if (currentUser.avatar) {
            avatarImage.src = `${DIRECTUS_URL}/assets/${currentUser.avatar}`;
        } else {
            avatarImage.src = '../img/default-avatar.jpg';
        }
    }
}

// ========== БРОНИРОВАНИЯ ==========

async function loadUserReservations(userId) {
    try {
        console.log('🔍 Загрузка бронирований для userId:', userId);

        const url = `${DIRECTUS_URL}/items/reservations?sort=-id`;
        const response = await authFetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        userReservations = data.data || [];
        console.log('✅ Бронирований найдено:', userReservations.length);

        renderReservations();

    } catch (error) {
        console.error('❌ Ошибка загрузки бронирований:', error);
    }
}

function renderReservations() {
    console.log('🎨 Отрисовка бронирований, найдено:', userReservations.length);

    const reservationsList = document.getElementById('reservationsList');
    const emptyReservations = document.getElementById('emptyReservations');

    if (!reservationsList || !emptyReservations) {
        console.error('❌ Не найдены элементы DOM для бронирований');
        return;
    }

    if (userReservations.length === 0) {
        console.log('⚠️ Бронирований нет, показываем empty state');
        reservationsList.style.display = 'none';
        emptyReservations.style.display = 'block';
        return;
    }

    reservationsList.style.display = 'flex';
    emptyReservations.style.display = 'none';

    reservationsList.innerHTML = userReservations.map(reservation => {
        const statusClass = `status-${reservation.status}`;
        const statusText = getStatusText(reservation.status);
        const reservationId = String(reservation.id).slice(0, 8);
        const bookingDate = reservation.date || reservation.date_created;
        const guests = reservation.party_size || reservation.guests || 1;
        const notes = reservation.special_requests || reservation.notes;
        const total = reservation.total || 0;

        return `
            <div class="reservation-item">
                <div class="reservation-info">
                    <h4>Бронирование #${reservationId}</h4>
                    <p>📅 ${formatDate(bookingDate)} в ${reservation.time || 'не указано'}</p>
                    <p>👥 ${guests} гостя(ей)</p>
                    <p>💰 ${total.toLocaleString('ru-RU')} ₽</p>
                    ${notes ? `<p>📝 ${notes}</p>` : ''}
                </div>
                <div class="reservation-status">
                    <span class="${statusClass}">${statusText}</span>
                </div>
            </div>
        `;
    }).join('');

    console.log('✅ Бронирования отрисованы');
}

// ========== СТАТИСТИКА ==========

function updateStatistics() {
    const totalReservations = document.getElementById('totalReservations');
    if (totalReservations) {
        totalReservations.textContent = userReservations.length;
    }

    const totalSpent = document.getElementById('totalSpent');
    if (totalSpent) {
        const spent = userReservations
            .filter(r => r.status === 'completed' || r.status === 'confirmed')
            .reduce((sum, r) => sum + (r.total || 0), 0);
        totalSpent.textContent = `${spent.toLocaleString('ru-RU')} ₽`;
    }

    const favoriteDish = document.getElementById('favoriteDish');
    if (favoriteDish) favoriteDish.textContent = '-';

    const loyaltyPoints = document.getElementById('loyaltyPoints');
    if (loyaltyPoints) loyaltyPoints.textContent = '-';
}

// ========== РЕДАКТИРОВАНИЕ ПРОФИЛЯ ==========

function setupEventListeners() {
    const editProfileBtn = document.getElementById('editProfileBtn');
    const editProfileModal = document.getElementById('editProfileModal');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editProfileForm = document.getElementById('editProfileForm');

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', showEditModal);
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', hideEditModal);
    }

    if (editProfileForm) {
        editProfileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveProfile();
        });
    }

    if (editProfileModal) {
        editProfileModal.addEventListener('click', (e) => {
            if (e.target === editProfileModal) {
                hideEditModal();
            }
        });
    }
}

function showEditModal() {
    const modal = document.getElementById('editProfileModal');
    const editName = document.getElementById('editName');
    const editEmail = document.getElementById('editEmail');
    const editPhone = document.getElementById('editPhone');

    if (!currentUser || !editName || !editEmail || !editPhone) return;

    editName.value = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim();
    editEmail.value = currentUser.email || '';
    editPhone.value = currentUser.phone || '';

    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideEditModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function saveProfile() {
    const editName = document.getElementById('editName');
    const editEmail = document.getElementById('editEmail');
    const editPhone = document.getElementById('editPhone');

    if (!editName || !editEmail || !editPhone || !currentUser) return;

    const nameParts = editName.value.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
        console.log('💾 Сохранение профиля...');

        const response = await authFetch(`${DIRECTUS_URL}/users/${currentUser.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                email: editEmail.value,
                phone: editPhone.value
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        currentUser.first_name = firstName;
        currentUser.last_name = lastName;
        currentUser.email = editEmail.value;
        currentUser.phone = editPhone.value;

        updateProfileUI();
        hideEditModal();
        showNotification('Профиль успешно обновлен!');
        console.log('✅ Профиль сохранён');

    } catch (error) {
        console.error('❌ Ошибка сохранения профиля:', error);
        showNotification('Ошибка при сохранении профиля', 'error');
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${type === 'success' ? '#4CAF50' : '#F44336'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 2000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        transition: opacity 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getErrorMessage(error) {
    if (error.message.includes('не авторизован') || error.message.includes('Сессия истекла')) {
        return '🔐 Для доступа к профилю необходимо авторизоваться.';
    }
    if (error.message.includes('Не удалось загрузить данные пользователя')) {
        return 'Не удалось загрузить данные пользователя. Проверьте подключение к интернету.';
    }
    if (error.message.includes('HTTP error')) {
        return 'Ошибка сервера. Пожалуйста, попробуйте позже.';
    }
    return 'Произошла ошибка. Пожалуйста, попробуйте позже.';
}

function formatDate(dateString) {
    if (!dateString) return 'Дата не указана';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Ожидает подтверждения',
        'confirmed': 'Подтверждено',
        'completed': 'Завершено',
        'cancelled': 'Отменено'
    };
    return statusMap[status] || status;
}

// 🔥 УБРАЛИ второй DOMContentLoaded с редиректами!
// Теперь всё управление — в loadProfile() через try/catch

// Экспорт функций
window.loadProfile = loadProfile;