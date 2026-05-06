import { authAPI, usersAPI } from './api.js';

function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `fixed top-5 right-5 px-5 py-3 rounded-md text-white text-sm z-50 animate-slide-in ${isError ? 'bg-red-600' : 'bg-gray-800'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function loadCurrentUser() {
  try {
    const user = await usersAPI.getMe();
    const displayName = (user.name && user.surname)
      ? `${user.name} ${user.surname}`
      : (user.name || user.email || 'Пользователь');
    document.getElementById('headerUserName').innerText = displayName;

    document.getElementById('profileFirstName').value = user.name || '';
    document.getElementById('profileLastName').value = user.surname || '';
    document.getElementById('profileEmail').value = user.email || '';
    const patronymicField = document.getElementById('profilePatronymic');
    if (patronymicField) patronymicField.value = user.patronymic || '';
  } catch (error) {
    document.getElementById('headerUserName').innerText = 'Гость';
  }
}

// ========== ВЫПАДАЮЩЕЕ МЕНЮ ==========
const profileIconBtn = document.getElementById('profile-btn');
const profileDropdownMenu = document.getElementById('profileDropdown');

function toggleProfileMenu() {
  profileDropdownMenu.classList.toggle('hidden');
}

if (profileIconBtn) {
  profileIconBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleProfileMenu();
  });
}

document.addEventListener('click', (e) => {
  if (!profileDropdownMenu.contains(e.target) && e.target !== profileIconBtn) {
    profileDropdownMenu?.classList.add('hidden');
  }
});

// ========== ТАБЫ ==========
function switchTab(tabName) {
  // Сброс всех табов
  document.querySelectorAll('.settings-tab').forEach(t => {
    t.classList.remove('text-orange-500', 'border-orange-500');
    t.classList.add('text-gray-500', 'border-transparent');
  });
  
  // Активируем нужный таб
  const activeTab = document.querySelector(`.settings-tab[data-tab="${tabName}"]`);
  if (activeTab) {
    activeTab.classList.add('text-orange-500', 'border-orange-500');
    activeTab.classList.remove('text-gray-500', 'border-transparent');
  }
  
  // Скрываем ВСЕ панели
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.remove('active');
    p.classList.add('hidden');
  });
  
  // Показываем нужную панель
  const panel = document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
  if (panel) {
    panel.classList.remove('hidden');
    panel.classList.add('active');
  }
}

// Навешиваем обработчики на табы
document.querySelectorAll('.settings-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    switchTab(tab.dataset.tab);
  });
});

// ========== СОХРАНЕНИЕ ПРОФИЛЯ ==========
document.getElementById('saveProfileBtn').addEventListener('click', async () => {
  const name = document.getElementById('profileFirstName').value.trim();
  const surname = document.getElementById('profileLastName').value.trim();
  const email = document.getElementById('profileEmail').value.trim();
  const patronymic = document.getElementById('profilePatronymic')?.value.trim();
  
  try {
    await usersAPI.updateProfile({ name, surname, patronymic, email });
    showToast('Профиль обновлён');
    await loadCurrentUser();
  } catch (error) {
    showToast('Ошибка сохранения: ' + error.message, true);
  }
});

// ========== СМЕНА ПАРОЛЯ ==========
document.getElementById('changePasswordBtn').addEventListener('click', () => {
  const current = document.getElementById('currentPassword').value;
  const newPass = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmPassword').value;

  if (!current || !newPass || !confirm) {
    showToast('Заполните все поля', true);
    return;
  }
  if (newPass !== confirm) {
    showToast('Пароли не совпадают', true);
    return;
  }
  
  showToast('Функция смены пароля временно недоступна', true);
});

// ========== ВЫХОД ==========
document.getElementById('logoutBtn').addEventListener('click', () => {
  authAPI.logout();
  window.location.href = '/index.html';
});

// ========== ИНИЦИАЛИЗАЦИЯ ==========
async function init() {
  await loadCurrentUser();
  // По умолчанию показываем "Личные данные"
  switchTab('personal');
}

init();