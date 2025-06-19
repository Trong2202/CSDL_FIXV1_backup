// đổi màu với localStorage persistence
const sideMenu = document.querySelector('aside');
const menuBtn = document.getElementById('menu-btn');
const closeBtn = document.getElementById('close-btn');
const darkMode = document.querySelector('.dark-mode');

// Khôi phục dark mode từ localStorage khi tải trang
document.addEventListener('DOMContentLoaded', function() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode-variables');
        darkMode.querySelector('span:nth-child(1)').classList.remove('active');
        darkMode.querySelector('span:nth-child(2)').classList.add('active');
    } else {
        document.body.classList.remove('dark-mode-variables');
        darkMode.querySelector('span:nth-child(1)').classList.add('active');
        darkMode.querySelector('span:nth-child(2)').classList.remove('active');
    }
});

menuBtn.addEventListener('click', () => {
    sideMenu.style.display = 'block';
});

closeBtn.addEventListener('click', () => {
    sideMenu.style.display = 'none';
});

darkMode.addEventListener('click', () => {
    const isCurrentlyDark = document.body.classList.contains('dark-mode-variables');
    
    document.body.classList.toggle('dark-mode-variables');
    darkMode.querySelector('span:nth-child(1)').classList.toggle('active');
    darkMode.querySelector('span:nth-child(2)').classList.toggle('active');
    
    // Lưu trạng thái vào localStorage
    localStorage.setItem('darkMode', !isCurrentlyDark);
});
