document.addEventListener('DOMContentLoaded', function() {
    // Инициализация формы обратной связи
    const feedbackForm = document.getElementById('feedbackForm');
    
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Установка минимальной даты для бронирования (если есть)
    setMinDate();
});

// Обработка отправки формы
function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Валидация формы
    if (!validateForm(data)) {
        return;
    }
    
    // Показываем индикатор загрузки
    showLoading();
    
    // Имитация отправки формы (в реальном проекте здесь будет API запрос)
    setTimeout(() => {
        hideLoading();
        showNotification('Сообщение успешно отправлено! Мы свяжемся с вами в ближайшее время.', 'success');
        e.target.reset();
    }, 1500);
}

// Валидация формы
function validateForm(data) {
    const errors = [];
    
    if (!data.name || data.name.trim().length < 2) {
        errors.push('Имя должно содержать минимум 2 символа');
    }
    
    if (!data.email || !isValidEmail(data.email)) {
        errors.push('Введите корректный email');
    }
    
    if (data.phone && !isValidPhone(data.phone)) {
        errors.push('Введите корректный номер телефона');
    }
    
    if (!data.subject) {
        errors.push('Выберите тему сообщения');
    }
    
    if (!data.message || data.message.trim().length < 10) {
        errors.push('Сообщение должно содержать минимум 10 символов');
    }
    
    if (errors.length > 0) {
        showNotification(errors.join('<br>'), 'error');
        return false;
    }
    
    return true;
}

// Валидация email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Валидация телефона
function isValidPhone(phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// Показать уведомление
function showNotification(message, type = 'success') {
    // Удаляем существующие уведомления
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    
    document.body.appendChild(notification);
    
    // Показываем уведомление
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Скрываем уведомление через 5 секунд
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Показать индикатор загрузки
function showLoading() {
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';
    }
}

// Скрыть индикатор загрузки
function hideLoading() {
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить сообщение';
    }
}

// Установка минимальной даты
function setMinDate() {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    
    dateInputs.forEach(input => {
        input.min = today;
    });
}

// Маска для телефона (опционально)
function setupPhoneMask() {
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            let formattedValue = '';
            
            if (value.length > 0) {
                if (value[0] === '7') {
                    formattedValue = '+7';
                    value = value.substring(1);
                } else if (value[0] === '8') {
                    formattedValue = '+7';
                    value = value.substring(1);
                } else {
                    formattedValue = '+7';
                }
                
                if (value.length > 0) {
                    formattedValue += ' (' + value.substring(0, 3);
                }
                if (value.length >= 4) {
                    formattedValue += ') ' + value.substring(3, 6);
                }
                if (value.length >= 7) {
                    formattedValue += '-' + value.substring(6, 8);
                }
                if (value.length >= 9) {
                    formattedValue += '-' + value.substring(8, 10);
                }
            }
            
            e.target.value = formattedValue;
        });
    }
}

// Инициализация маски телефона
setupPhoneMask();

// Обработка кликов по социальным ссылкам
document.querySelectorAll('.social-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const socialNetwork = this.querySelector('span').textContent;
        showNotification(`Переход на страницу ${socialNetwork} в разработке`, 'success');
    });
});
