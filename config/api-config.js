// Конфигурация API
// Измените URL при деплое на продакшен

const API_CONFIG = {
    // Основной URL Directus API
    DIRECTUS_URL: 'https://court-organic-description-motorola.trycloudflare.com',
    
    // Эндпоинты
    ENDPOINTS: {
        MENU_ITEMS: '/items/menu_items',
        TABLES: '/items/tables', 
        RESERVATIONS: '/items/reservations',
        USERS: '/users',
        USERS_ME: '/users/me'
    }
};

// Для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
} else {
    window.API_CONFIG = API_CONFIG;
}
