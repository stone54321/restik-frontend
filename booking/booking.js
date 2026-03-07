// Конфигурация Directus
const DIRECTUS_URL = 'https://ind-announcement-viewers-dramatically.trycloudflare.com';
const MENU_ENDPOINT = '/items/menu_items';
const TABLES_ENDPOINT = '/items/tables';
const RESERVATIONS_ENDPOINT = '/items/reservations';

// Глобальные переменные
let selectedDate = null;
let selectedTime = null;
let selectedTable = null;
let menuItems = [];
let tables = [];
let selectedMenuItems = new Map();

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Страница бронирования загружена');

    // 🔥 Ждём пока auth-helper загрузит функции
    await waitForAuthHelper();

    // 🔥 Обновляем навбар
    if (typeof updateAuthLinks === 'function') {
        updateAuthLinks();
    }

    // 🔥 Проверяем авторизацию
    if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
        showAuthRequiredMessage();
        return;
    }

    initializeBooking();
    setupEventListeners();
});

// Ждём загрузки функций из auth-helper.js
async function waitForAuthHelper() {
    return new Promise(resolve => {
        const check = () => {
            if (typeof updateAuthLinks === 'function' && typeof isAuthenticated === 'function') {
                resolve();
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
}

// Сообщение о необходимости авторизации
function showAuthRequiredMessage() {
    if (typeof updateAuthLinks === 'function') updateAuthLinks();

    const loading = document.getElementById('loading');
    const container = document.getElementById('bookingContainer');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    loading.style.display = 'none';
    container.style.display = 'none';
    errorMessage.style.display = 'block';

    errorText.innerHTML = `
        Для бронирования столика необходимо авторизоваться.
        <br><br>
        <a href="../auth/login.html" style="
            color: #D4A373;
            display: inline-block;
            margin-top: 15px;
            text-decoration: none;
            font-weight: 500;
            padding: 8px 16px;
            border: 1px solid #D4A373;
            border-radius: 8px;
            transition: all 0.2s;
        " onmouseover="this.style.background='#D4A373'; this.style.color='#1A1A1A'" 
           onmouseout="this.style.background='transparent'; this.style.color='#D4A373'">
            → Перейти к авторизации
        </a>
    `;
}

// ============================================
// ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ
// ============================================

async function initializeBooking() {
    const loading = document.getElementById('loading');
    const container = document.getElementById('bookingContainer');
    const errorMessage = document.getElementById('errorMessage');

    loading.style.display = 'block';
    container.style.display = 'none';
    errorMessage.style.display = 'none';

    try {
        initializeDateInput();
        generateTimeSlots();

        // 🔥 Загружаем только из Directus (без демо!)
        await Promise.all([
            loadMenuItems(),
            loadTables()
        ]);

        // 🔥 Если данные не загрузились — показываем ошибку
        if (tables.length === 0) {
            throw new Error('Столики не загружены. Проверьте Directus.');
        }
        if (menuItems.length === 0) {
            console.warn('⚠️ Меню пусто, но продолжаем');
        }

        loading.style.display = 'none';
        container.style.display = 'block';

    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        loading.style.display = 'none';
        errorMessage.style.display = 'block';
        document.getElementById('errorText').textContent =
            `Не удалось загрузить данные: ${error.message}. Проверьте подключение к Directus.`;
    }
}

// ============================================
// ДАТА И ВРЕМЯ
// ============================================

function initializeDateInput() {
    const dateInput = document.getElementById('booking-date');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Сбрасываем время до начала дня
    const todayString = today.toISOString().split('T')[0];
    
    // Устанавливаем минимальную дату - сегодня
    dateInput.min = todayString;
    dateInput.value = todayString;

    // Добавляем валидацию при изменении даты
    dateInput.addEventListener('change', (e) => {
        const selectedDateValue = e.target.value;
        const validationResult = validateDate(selectedDateValue);
        
        if (!validationResult.isValid) {
            // Показываем ошибку и сбрасываем на сегодня
            alert(validationResult.error);
            e.target.value = todayString;
            selectedDate = todayString;
            return;
        }
        
        selectedDate = selectedDateValue;
        updateSummary();
        updateTablesAvailability();
    });

    // Добавляем валидацию при попытке ввести дату вручную
    dateInput.addEventListener('input', (e) => {
        // Проверяем корректность формата даты в реальном времени
        const dateValue = e.target.value;
        if (dateValue && !isValidDateFormat(dateValue)) {
            e.target.setCustomValidity('Пожалуйста, введите корректную дату в формате ГГГГ-ММ-ДД');
        } else {
            e.target.setCustomValidity('');
        }
    });

    selectedDate = todayString;
}

// Функция валидации даты
function validateDate(dateString) {
    if (!dateString) {
        return { isValid: false, error: 'Пожалуйста, выберите дату' };
    }
    
    // Проверяем формат даты
    if (!isValidDateFormat(dateString)) {
        return { isValid: false, error: 'Некорректный формат даты. Выберите дату из календаря' };
    }
    
    const selectedDate = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Проверяем, что дата не в прошлом
    if (selectedDate < today) {
        return { isValid: false, error: 'Нельзя выбрать дату в прошлом. Пожалуйста, выберите сегодняшнюю или будущую дату' };
    }
    
    // Проверяем, что дата существует (например, не 31 февраля)
    const [year, month, day] = dateString.split('-').map(Number);
    const dateExists = isValidDate(year, month, day);
    
    if (!dateExists) {
        return { isValid: false, error: 'Указанная дата не существует. Пожалуйста, выберите корректную дату' };
    }
    
    // Проверяем, что дата не слишком далеко в будущем (например, не более 1 года)
    const maxDate = new Date(today);
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    
    if (selectedDate > maxDate) {
        return { isValid: false, error: 'Нельзя выбрать дату более чем на год вперед. Пожалуйста, выберите более близкую дату' };
    }
    
    return { isValid: true };
}

// Проверка формата даты ГГГГ-ММ-ДД
function isValidDateFormat(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const [year, month, day] = dateString.split('-').map(Number);
    return year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

// Проверка существования даты
function isValidDate(year, month, day) {
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
}

function generateTimeSlots() {
    const timeGrid = document.getElementById('timeGrid');
    const openingTime = 10;
    const closingTime = 23;

    timeGrid.innerHTML = '';

    for (let hour = openingTime; hour <= closingTime; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.textContent = time;
            slot.dataset.time = time;
            slot.addEventListener('click', selectTime);
            timeGrid.appendChild(slot);
        }
    }
}

function selectTime(e) {
    const slot = e.target.closest('.time-slot');
    if (!slot || slot.classList.contains('disabled')) return;

    console.log('\n⏰ ========== Выбор времени ==========');
    console.log('Выбрано время:', slot.dataset.time);

    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
    slot.classList.add('selected');
    selectedTime = slot.dataset.time;

    // 🔥 Сбрасываем выбранный столик при смене времени
    if (selectedTable) {
        console.log('🔄 Сброс выбранного столика при смене времени');
        document.querySelectorAll('.table').forEach(t => t.classList.remove('selected'));
        selectedTable = null;
        updateSummary();
    }

    // 🔥 Проверяем доступность
    updateTablesAvailability();

    console.log('=====================================\n');
}

// ============================================
// СТОЛИКИ (только Directus)
// ============================================

async function loadTables() {
    try {
        const token = typeof getAuthToken === 'function' ? getAuthToken() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // 🔥 Запрашиваем только активные столики, сортируем по вместимости
        const response = await fetch(
            `${DIRECTUS_URL}${TABLES_ENDPOINT}?filter[status][_eq]=active&sort=seats,name`,
            { headers }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        tables = data.data || [];

        console.log(`✅ Загружено столиков из Directus: ${tables.length}`);
        renderTables();

    } catch (error) {
        console.error('❌ Ошибка загрузки столиков:', error);
        throw error; // 🔥 Не используем демо — выбрасываем ошибку
    }
}

function renderTables() {
    const container = document.getElementById('tablesContainer');
    if (!container) return;

    container.innerHTML = '';

    if (tables.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Столики не найдены в Directus</p>';
        return;
    }

    tables.forEach(table => {
        const tableElement = document.createElement('div');
        tableElement.className = 'table';
        tableElement.dataset.tableId = table.id;
        tableElement.dataset.seats = table.seats || 2;

        // 🔥 Проверяем статус из Directus
        if (table.status === 'occupied' || table.status === 'maintenance') {
            tableElement.classList.add('occupied');
            tableElement.title = 'Недоступен';
        } else {
            tableElement.addEventListener('click', selectTable);
            tableElement.title = `Столик на ${table.seats || 2} пер.`;
        }

        tableElement.innerHTML = `
            <span class="table-seats">${table.seats || 2}</span>
            <span class="table-name">${table.name || `Стол ${table.id}`}</span>
        `;

        container.appendChild(tableElement);
    });
}

// 🔥 РЕАЛЬНАЯ проверка доступности (не рандом!)
// 🔥 Проверка доступности с правильным форматом времени
// 🔥 Проверка доступности с ПОЛНЫМ сбросом состояния
// 🔥 ОТЛАДОЧНАЯ версия проверки доступности
async function updateTablesAvailability() {
    if (!selectedDate || !selectedTime) return;

    console.log(`\n🔍 ========== ПРОВЕРКА: ${selectedDate} ${selectedTime} ==========`);

    try {
        const token = typeof getAuthToken === 'function' ? getAuthToken() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // 🔥 ПРОСТОЙ ЗАПРОС: получаем ВСЕ брони (без фильтра)
        console.log('📡 Запрашиваем ВСЕ брони...');
        const response = await fetch(
            `${DIRECTUS_URL}${RESERVATIONS_ENDPOINT}?fields=date,time,table,status`,
            { headers }
        );

        let bookedTableIds = [];

        if (response.ok) {
            const data = await response.json();
            const allReservations = data.data || [];

            console.log(`📦 Получено броней: ${allReservations.length}`);
            if (allReservations.length > 0) {
                console.log('📋 Пример записи:', allReservations[0]);
            }

            // 🔥 ФИЛЬТРУЕМ НА КЛИЕНТЕ
            bookedTableIds = allReservations
                .filter(r => {
                    // Нормализуем время для сравнения
                    const dbTime = r.time?.length === 8 ? r.time.slice(0, 5) : r.time; // "18:00:00" → "18:00"
                    const selectedTimeShort = selectedTime?.length === 8 ? selectedTime.slice(0, 5) : selectedTime;

                    const matches =
                        r.date === selectedDate &&
                        dbTime === selectedTimeShort &&
                        !['cancelled', 'no-show'].includes(r.status) &&
                        r.table;

                    if (matches) {
                        console.log(`  ✅ СОВПАДЕНИЕ: стол ${r.table}, ${r.date} ${r.time} (статус: ${r.status})`);
                    }
                    return matches;
                })
                .map(r => {
                    const id = typeof r.table === 'object' ? r.table.id : r.table;
                    return parseInt(id);
                });

        } else {
            console.error('❌ Ошибка запроса:', response.status);
        }

        console.log(`\n📊 ИТОГО занятых столиков: ${bookedTableIds.length}`);
        console.log('🔴 Занятые ID:', bookedTableIds);

        // 🔥 СБРОС + обновление UI
        document.querySelectorAll('.table').forEach(table => {
            const tableId = parseInt(table.dataset.tableId);
            const isBooked = bookedTableIds.includes(tableId);

            table.classList.toggle('occupied', isBooked);
            table.style.pointerEvents = isBooked ? 'none' : 'auto';
            table.title = isBooked ? 'Занято' : `Столик на ${table.dataset.seats} пер.`;

            if (isBooked && table.classList.contains('selected')) {
                table.classList.remove('selected');
                if (selectedTable?.id == tableId) {
                    selectedTable = null;
                    updateSummary();
                }
            }
        });

        console.log('✅ Проверка завершена\n');

    } catch (error) {
        console.error('❌ Ошибка:', error);
    }
}

function selectTable(e) {
    const table = e.currentTarget;

    // 🔥 Дополнительная проверка: если столик занят — не выбираем
    if (table.classList.contains('occupied')) {
        console.log('⛔ Столик занят, выбор отменён');
        return;
    }

    document.querySelectorAll('.table').forEach(t => t.classList.remove('selected'));
    table.classList.add('selected');

    selectedTable = {
        id: table.dataset.tableId,
        name: table.querySelector('.table-name')?.textContent || `Стол ${table.dataset.tableId}`,
        seats: table.dataset.seats
    };

    updateSummary();
}

// ============================================
// МЕНЮ (только Directus)
// ============================================

async function loadMenuItems() {
    try {
        const token = typeof getAuthToken === 'function' ? getAuthToken() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // 🔥 Запрашиваем только доступные блюда
        const response = await fetch(
            `${DIRECTUS_URL}${MENU_ENDPOINT}?sort=category,name`,
            { headers }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        menuItems = data.data || [];

        console.log(`✅ Загружено блюд из Directus: ${menuItems.length}`);
        renderMenuItems('all');

    } catch (error) {
        console.error('❌ Ошибка загрузки меню:', error);
        const menuGrid = document.getElementById('menuGrid');
        if (menuGrid) {
            menuGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #f44336;">Не удалось загрузить меню</p>';
        }
    }
}

function renderMenuItems(category) {
    const menuGrid = document.getElementById('menuGrid');
    if (!menuGrid) return;

    let filteredItems = menuItems;
    if (category !== 'all') {
        filteredItems = menuItems.filter(item => item.category === category);
    }

    if (filteredItems.length === 0) {
        menuGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Блюда не найдены</p>';
        return;
    }

    menuGrid.innerHTML = filteredItems.map(item => `
        <div class="menu-item" data-item-id="${item.id}">
            <h4>${item.name || 'Без названия'}</h4>
            <p class="description">${item.description || ''}</p>
            <div class="price">${item.price || 0} ₽</div>
            <div class="quantity-control">
                <button class="quantity-btn" data-action="decrease" data-item-id="${item.id}">−</button>
                <span class="quantity" data-item-id="${item.id}">0</span>
                <button class="quantity-btn" data-action="increase" data-item-id="${item.id}">+</button>
            </div>
        </div>
    `).join('');
}

// 🔥 Изменение количества (используется event delegation)
function changeQuantity(itemId, change) {
    const currentQty = selectedMenuItems.get(itemId) || 0;
    const newQty = Math.max(0, currentQty + change);

    if (newQty === 0) {
        selectedMenuItems.delete(itemId);
    } else {
        selectedMenuItems.set(itemId, newQty);
    }

    // Обновляем отображение
    const qtyEl = document.querySelector(`.quantity[data-item-id="${itemId}"]`);
    if (qtyEl) qtyEl.textContent = newQty;

    // Визуальное выделение
    const itemEl = document.querySelector(`.menu-item[data-item-id="${itemId}"]`);
    if (itemEl) {
        itemEl.classList.toggle('selected', newQty > 0);
    }

    updateSummary();
}

// ============================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================

function setupEventListeners() {
    // Категории меню
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            renderMenuItems(e.currentTarget.dataset.category);
        });
    });

    // 🔥 ДЕЛЕГИРОВАНИЕ для кнопок количества в меню
    const menuGrid = document.getElementById('menuGrid');
    if (menuGrid) {
        menuGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('.quantity-btn');
            if (!btn) return;

            const itemId = parseInt(btn.dataset.itemId);
            const action = btn.dataset.action;
            const change = action === 'increase' ? 1 : -1;

            changeQuantity(itemId, change);
            e.stopPropagation();
        });

        // 🔥 Клик по карточке блюда = +1
        menuGrid.addEventListener('click', (e) => {
            const item = e.target.closest('.menu-item');
            if (!item || e.target.closest('.quantity-btn')) return;

            const itemId = parseInt(item.dataset.itemId);
            changeQuantity(itemId, 1);
        });
    }

    // Количество гостей
    const guestsSelect = document.getElementById('guestsCount');
    if (guestsSelect) {
        guestsSelect.addEventListener('change', updateSummary);
    }

    // Кнопка подтверждения
    const confirmBtn = document.getElementById('confirmBooking');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmBooking);
    }
}

// ============================================
// СВОДКА
// ============================================

function updateSummary() {
    const summaryDate = document.getElementById('summaryDate');
    const summaryTime = document.getElementById('summaryTime');
    const summaryTable = document.getElementById('summaryTable');
    const summaryOrder = document.getElementById('summaryOrder');

    if (summaryDate) {
        summaryDate.textContent = selectedDate ?
            new Date(selectedDate).toLocaleDateString('ru-RU', {
                day: 'numeric', month: 'long', year: 'numeric'
            }) : 'Не выбрана';
    }

    if (summaryTime) {
        summaryTime.textContent = selectedTime || 'Не выбрано';
    }

    if (summaryTable) {
        summaryTable.textContent = selectedTable ?
            `${selectedTable.name} (${selectedTable.seats} мест)` : 'Не выбран';
    }

    // 🔥 Подсчёт суммы предзаказа
    if (summaryOrder) {
        let total = 0;
        selectedMenuItems.forEach((quantity, itemId) => {
            const item = menuItems.find(m => m.id === itemId);
            if (item?.price) {
                total += item.price * quantity;
            }
        });
        summaryOrder.textContent = `${total} ₽`;
    }
}

// ============================================
// ПОДТВЕРЖДЕНИЕ БРОНИРОВАНИЯ
// ============================================

// ============================================
// ПОДТВЕРЖДЕНИЕ БРОНИРОВАНИЯ
// ============================================

// 🔥 Вспомогательная функция проверки доступности (вынесена наружу)
async function checkTableIsFree(date, time, tableId) {
    try {
        const token = typeof getAuthToken === 'function' ? getAuthToken() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // 🔥 Простой запрос ВСЕХ броней
        const response = await fetch(
            `${DIRECTUS_URL}${RESERVATIONS_ENDPOINT}?fields=date,time,table,status`,
            { headers }
        );

        if (response.ok) {
            const data = await response.json();
            const allReservations = data.data || [];

            // Нормализуем время для сравнения
            const selectedTimeShort = time?.length === 8 ? time.slice(0, 5) : time;

            const isTaken = allReservations.some(r => {
                const dbTime = r.time?.length === 8 ? r.time.slice(0, 5) : r.time;
                const rTableId = typeof r.table === 'object' ? r.table.id : r.table;

                return r.date === date &&
                    dbTime === selectedTimeShort &&
                    parseInt(rTableId) === parseInt(tableId) &&
                    !['cancelled', 'no-show'].includes(r.status);
            });

            console.log(`🔍 checkTableIsFree: стол ${tableId} на ${date} ${time} → ${isTaken ? '🔴 ЗАНЯТ' : '🟢 Свободен'}`);
            return !isTaken;
        }

        return true; // Если ошибка — разрешаем

    } catch (e) {
        console.error('❌ Ошибка проверки:', e);
        return true;
    }
}

async function confirmBooking() {
    console.log('\n🎯 ========== НАЧАЛО БРОНИРОВАНИЯ ==========');

    // 1️⃣ Проверка авторизации
    if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
        alert('Сессия истекла. Пожалуйста, авторизуйтесь снова.');
        if (typeof clearAuthData === 'function') clearAuthData();
        window.location.href = '../auth/login.html';
        return;
    }

    // 2️⃣ Валидация полей
    if (!selectedDate || !selectedTime || !selectedTable) {
        alert('Пожалуйста, выберите дату, время и столик');
        return;
    }

    // 2.1️⃣ Дополнительная проверка даты
    const dateValidation = validateDate(selectedDate);
    if (!dateValidation.isValid) {
        alert(dateValidation.error);
        // Сбрасываем на сегодня
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('booking-date');
        if (dateInput) {
            dateInput.value = today;
            selectedDate = today;
        }
        return;
    }

    // 3️⃣ 🔥 ПРОВЕРКА: не занят ли столик на это время
    console.log('🔍 Проверка занятости столика...');
    const isFree = await checkTableIsFree(selectedDate, selectedTime, selectedTable.id);

    if (!isFree) {
        alert('⛔ Этот столик уже занят на выбранное время!\n\nПожалуйста, выберите другой столик или время.');
        updateTablesAvailability(); // 🔥 Обновляем визуальное состояние
        console.log('❌ Бронирование отменено: столик занят');
        return;
    }
    console.log('✅ Столик свободен, продолжаем...');

    const guestsCount = document.getElementById('guestsCount')?.value || 1;

    // 4️⃣ Сбор предзаказа
    const preOrder = [];
    selectedMenuItems.forEach((quantity, itemId) => {
        const item = menuItems.find(m => m.id === itemId);
        if (item && quantity > 0) {
            preOrder.push({
                menu_item_id: item.id,
                name: item.name,
                price: item.price,
                quantity: quantity
            });
        }
    });

    // 5️⃣ Форматирование времени для Directus
    const formatTimeForDirectus = (time) => {
        if (!time) return null;
        return time.length === 5 ? time + ':00' : time;
    };

    // 6️⃣ Получаем ID пользователя
    const userData = typeof getUserData === 'function' ? getUserData() : null;
    const userId = userData?.id || null;

    // 7️⃣ Считаем сумму
    const totalAmount = preOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // 8️⃣ Формируем данные для отправки
    const bookingData = {
        date: selectedDate,
        time: formatTimeForDirectus(selectedTime),  // 🔥 "18:00" → "18:00:00"
        table: selectedTable.id,
        party_size: parseInt(guestsCount),
        total: totalAmount,
        status: 'pending',
        user_created: userId
        // 🔥 pre_order уберите если такого поля нет в Directus
    };

    console.log('📤 Отправка бронирования:', {
        ...bookingData,
        time: `${selectedTime} → ${bookingData.time}`
    });

    try {
        // Блокируем кнопку
        const btn = document.getElementById('confirmBooking');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Обработка...';
        }

        const token = typeof getAuthToken === 'function' ? getAuthToken() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        console.log('🌐 Запрос:', `${DIRECTUS_URL}${RESERVATIONS_ENDPOINT}`);

        // 9️⃣ Отправка запроса
        const response = await fetch(`${DIRECTUS_URL}${RESERVATIONS_ENDPOINT}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(bookingData)
        });

        console.log('📥 Ответ:', response.status, response.statusText);
        console.log('📋 Content-Type:', response.headers.get('content-type'));

        // 🔟 Обработка 204 No Content (успех без тела ответа)
        if (response.status === 204) {
            console.log('✅ Бронирование создано (204 No Content)');
            alert('🎉 Бронирование успешно подтверждено!');
            resetForm();
            if (typeof updateAuthLinks === 'function') updateAuthLinks();
            return;
        }

        // 1️⃣1️⃣ Обработка ошибок
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Ошибка от сервера:', errorData);
                throw new Error(errorData.errors?.[0]?.message || `HTTP ${response.status}`);
            } else {
                const text = await response.text();
                console.error('❌ Сервер вернул:', response.status, text.substring(0, 200));
                throw new Error(`HTTP ${response.status}`);
            }
        }

        // 1️⃣2️⃣ Успех с JSON ответом
        const result = await response.json();
        console.log('✅ Бронирование создано:', result.data);
        alert('🎉 Бронирование успешно подтверждено!');

        // Сброс формы
        resetForm();
        if (typeof updateAuthLinks === 'function') updateAuthLinks();

    } catch (error) {
        console.error('❌ Ошибка бронирования:', error);
        alert(`Ошибка: ${error.message}. Пожалуйста, попробуйте ещё раз.`);
    } finally {
        // Разблокируем кнопку
        const btn = document.getElementById('confirmBooking');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Подтвердить бронирование';
        }
        console.log('🏁 ========== КОНЕЦ БРОНИРОВАНИЯ ==========\n');
    }
}

// Сброс формы
function resetForm() {
    selectedDate = null;
    selectedTime = null;
    selectedTable = null;
    selectedMenuItems.clear();

    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
        selectedDate = dateInput.value;
    }

    document.querySelectorAll('.time-slot, .table, .menu-item').forEach(el => {
        el.classList.remove('selected');
    });

    document.querySelectorAll('.quantity').forEach(el => {
        el.textContent = '0';
    });

    const guestsSelect = document.getElementById('guestsCount');
    if (guestsSelect) guestsSelect.value = '1';

    updateSummary();
}

// ============================================
// ЭКСПОРТ ФУНКЦИЙ
// ============================================

window.initializeBooking = initializeBooking;
window.changeQuantity = changeQuantity;
window.updateTablesAvailability = updateTablesAvailability;