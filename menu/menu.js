// Конфигурация Directus
const DIRECTUS_URL = 'https://qualifications-essay-spotlight-sheriff.trycloudflare.com';
const MENU_ENDPOINT = '/items/menu_items';

// Глобальная переменная для хранения всех блюд
let allMenuItems = [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadMenuItems();
    setupFilters();
});

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
        const apiUrl = `${DIRECTUS_URL}${MENU_ENDPOINT}`;

        console.log('🔑 Token есть:', !!token);
        console.log('📡 Запрос к:', apiUrl);

        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log('🔐 Authorization header добавлен');
        }

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: headers
        });

        console.log('📥 Status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Server error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 Menu data:', data);

        allMenuItems = data.data || [];

        // По умолчанию показываем все блюда или закуски
        const appetizers = allMenuItems.filter(item => item.category === 'appetizers');
        renderMenu(appetizers.length > 0 ? appetizers : allMenuItems);

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

    if (!items || items.length === 0) {
        menuGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: var(--text-muted);">Блюда не найдены</p>';
        return;
    }

    menuGrid.innerHTML = items.map(item => {
        // 🔥 Безопасное получение ID картинки
        const imageId = item.image?.id || item.image;

        // Формируем URL
        const imageUrl = imageId
            ? `${DIRECTUS_URL}/assets/${imageId}`
            : '';

        console.log(`🖼️ Блюдо "${item.name}":`, { imageId, imageUrl });

        const categoryNames = {
            'appetizers': 'Закуски',
            'soups': 'Супы',
            'mains': 'Основные блюда',
            'desserts': 'Десерты',
            'drinks': 'Напитки'
        };

        return `
            <div class="dish-card" data-category="${item.category || 'mains'}">
                <img 
                    src="${imageUrl}" 
                    alt="${item.name || 'Блюдо'}" 
                    loading="lazy"
                    crossorigin="anonymous"
                    onerror="console.error('❌ Failed to load:', this.src); this.closest('.dish-card').style.opacity='0.5';"
                >
                <div class="dish-info">
                    <span class="category-badge">${categoryNames[item.category] || item.category}</span>
                    <h3>${item.name || 'Без названия'}</h3>
                    <p>${item.description || ''}</p>
                    <span class="dish-price">${item.price || 0} ₽</span>
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
            filterButtons.forEach(btn => btn.classList.remove('active'));
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