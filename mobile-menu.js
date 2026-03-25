// Мобильное меню - гамбургер
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function() {
            // Переключаем классы для анимации
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
            
            // Блокируем скролл body когда меню открыто
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        });
        
        // Закрываем меню при клике на ссылку
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', function() {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
        
        // Закрываем меню при клике вне меню
        document.addEventListener('click', function(event) {
            if (!menuToggle.contains(event.target) && !navLinks.contains(event.target)) {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
        
        // Закрываем меню при Escape
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && navLinks.classList.contains('active')) {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
});
