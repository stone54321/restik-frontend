// Конфигурация Directus
const DIRECTUS_URL = 'https://finite-ken-correction-operate.trycloudflare.com'; // Твой URL Directus
const MENU_ENDPOINT = '/items/menu_items';

// Глобальная переменная для хранения всех блюд
let allMenuItems = [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadMenuItems();
    setupFilters();
});

// Загрузка блюд из Directus
// Загрузка блюд из Directus
async function loadMenuItems() {
    const loading = document.getElementById('loading');
    const menuGrid = document.getElementById('menuGrid');
    const errorMessage = document.getElementById('errorMessage');

    loading.style.display = 'flex';
    menuGrid.style.display = 'none';
    errorMessage.style.display = 'none';

    try {
        const token = getAuthToken();

        console.log('🔑 Token есть:', !!token);
        console.log('📡 URL:', `${DIRECTUS_URL}${MENU_ENDPOINT}`);

        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log('🔐 Authorization header добавлен');
        } else {
            console.log('⚠️ Запрос без токена (Public)');
        }

        const response = await fetch(`${DIRECTUS_URL}${MENU_ENDPOINT}`, {
            method: 'GET',
            headers: headers
        });

        console.log('📥 Status:', response.status);

        // 🔍 Показываем полный ответ
        const responseText = await response.text();
        console.log('📄 Response:', responseText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = JSON.parse(responseText);
        console.log('📦 Menu data:', data);

        allMenuItems = data.data || [];

        const appetizers = allMenuItems.filter(item => item.category === 'appetizers');
        renderMenu(appetizers);

        loading.style.display = 'none';
        menuGrid.style.display = 'grid';

    } catch (error) {
        console.error('❌ Ошибка загрузки меню:', error);
        loading.style.display = 'none';
        errorMessage.style.display = 'block';
        menuGrid.style.display = 'none';
    }
}

// Отображение блюд в сетке
function renderMenu(items) {
    const menuGrid = document.getElementById('menuGrid');

    if (items.length === 0) {
        menuGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">Блюда не найдены</p>';
        return;
    }

    menuGrid.innerHTML = items.map(item => {
        // Формируем URL изображения
        const imageUrl = item.image
            ? `${DIRECTUS_URL}/assets/${item.image}`
            : '../img/placeholder.jpg';

        // Перевод категорий
        const categoryNames = {
            'appetizers': 'Закуски',
            'soups': 'Супы',
            'mains': 'Основные блюда',
            'desserts': 'Десерты',
            'drinks': 'Напитки'
        };

        return `
            <div class="dish-card" data-category="${item.category || 'mains'}">
                <img src="${imageUrl}" alt="${item.name}" onerror="this.src='../img/placeholder.jpg'">
                <div class="dish-info">
                    <span class="category-badge">${categoryNames[item.category] || item.category}</span>
                    <h3>${item.name}</h3>
                    <p>${item.description || ''}</p>
                    <span class="dish-price">${item.price} ₽</span>
                </div>
            </div>
        `;
    }).join('');
}

// Настройка фильтров по категориям
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Убираем активный класс со всех кнопок
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Добавляем активный класс на нажатую
            button.classList.add('active');

            const category = button.getAttribute('data-category');
            filterByCategory(category);
        });
    });
}

// Фильтрация по категории
function filterByCategory(category) {
    const filtered = allMenuItems.filter(item => item.category === category);
    renderMenu(filtered);
}

// Экспорт функции для кнопки "Попробовать снова"
window.loadMenuItems = loadMenuItems;