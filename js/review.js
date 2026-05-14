import { groupsAPI } from './api.js';
import { loadCurrentUser, showToast, escapeHtml } from './review-core.js';

let currentGroupId = null;
let projects = [];
let currentFilter = 'all';
let sortAsc = false;

// ── Загрузка информации о группе ──
async function loadGroupInfo() {
  const params = new URLSearchParams(window.location.search);
  currentGroupId = params.get('group');

  if (!currentGroupId) {
    showToast('Группа не выбрана', true);
    return;
  }

  try {
    const groups = await groupsAPI.getMyGroups();
    const group = groups.find(g => g.id == currentGroupId);
    if (group) {
      const nameEl = document.getElementById('groupName');
      if (nameEl) nameEl.innerText = escapeHtml(group.name);
    }
  } catch (error) {
    console.error('Ошибка загрузки группы:', error);
  }
}

// ── Мок-проекты (заменить на реальный API когда будет готов) ──
function generateMockProjects() {
  return [
    { id: 1, name: 'Проект «Альфа»',   author: 'Иванов И.И.',   status: 'reviewing', date: '2026-05-10', deadline: '2026-05-15', totalCriteria: 5, scoredCriteria: 2 },
    { id: 2, name: 'Проект «Бета»',    author: 'Петров П.П.',   status: 'urgent',    date: '2026-05-09', deadline: '2026-05-12', totalCriteria: 4, scoredCriteria: 4 },
    { id: 3, name: 'Проект «Гамма»',   author: 'Сидоров С.С.',  status: 'archive',   date: '2026-05-08', deadline: '2026-05-10', totalCriteria: 6, scoredCriteria: 6 },
    { id: 4, name: 'Проект «Дельта»',  author: 'Козлова А.А.',  status: 'reviewing', date: '2026-05-11', deadline: '2026-05-18', totalCriteria: 5, scoredCriteria: 0 },
    { id: 5, name: 'Проект «Эпсилон»', author: 'Новиков Д.Д.',  status: 'urgent',    date: '2026-05-07', deadline: '2026-05-11', totalCriteria: 3, scoredCriteria: 3 },
    { id: 6, name: 'Проект «Зета»',    author: 'Морозова Е.Е.', status: 'archive',   date: '2026-05-06', deadline: '2026-05-09', totalCriteria: 5, scoredCriteria: 5 },
    { id: 7, name: 'Проект «Эта»',     author: 'Волков А.А.',   status: 'reviewing', date: '2026-05-12', deadline: '2026-05-20', totalCriteria: 4, scoredCriteria: 1 },
    { id: 8, name: 'Проект «Тета»',    author: 'Лебедева О.О.', status: 'reviewing', date: '2026-05-13', deadline: '2026-05-19', totalCriteria: 5, scoredCriteria: 3 },
  ];
}

// ── Рендер списка проектов ──
function renderProjects() {
  const container = document.getElementById('projectsList');
  if (!container) return;

  const filtered = currentFilter === 'all'
    ? projects
    : projects.filter(p => p.status === currentFilter);

  if (filtered.length === 0) {
    container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #9ca3af; padding: 32px 0;">Нет проектов для отображения</div>';
    updateProgress(0, 0);
    return;
  }

  container.innerHTML = filtered.map(p => {
    return `
      <div class="project-card" data-status="${p.status}" data-id="${p.id}">
        <div class="card-content">
          <p class="card-row"><span class="card-label">Дедлайн:</span> ${escapeHtml(p.deadline)}</p>
          <p class="card-row"><span class="card-label">Проект:</span> ${escapeHtml(p.name)}</p>
          <p class="card-row"><span class="card-label">Студент:</span> ${escapeHtml(p.author)}</p>
          <p class="card-row"><span class="card-label">Прогресс:</span> ${p.scoredCriteria} из ${p.totalCriteria} критериев оценено</p>
        </div>
        <button class="review-btn">Перейти к оценке</button>
      </div>
    `;
  }).join('');

  // Переход на детальную оценку
  container.querySelectorAll('[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const projectId = card.dataset.id;
      window.location.href = `review-detail.html?group=${currentGroupId}&project=${projectId}`;
    });
  });

  updateProgress(filtered.filter(p => p.scoredCriteria === p.totalCriteria).length, filtered.length);
}

// ── Прогресс-бар ──
function updateProgress(checked, total) {
  const bar = document.getElementById('progressBar');
  const text = document.getElementById('progressText');
  const counter = document.getElementById('progressCounter');
  if (!bar || !text || !counter) return;

  const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
  bar.style.width = `${percent}%`;
  text.innerText = `${percent}%`;
  counter.innerText = `${checked} из ${total} проверено`;
}

// ── Фильтры ──
function setupFilters() {
  const buttons = document.querySelectorAll('.filter-btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Все кнопки — обычный оранжевый, приглушённые
      buttons.forEach(b => {
        b.classList.remove('is-active');
        b.classList.add('opacity-70');
      });

      // Нажатая кнопка — темно-оранжевая через review.css
      btn.classList.add('is-active');
      btn.classList.remove('opacity-70');

      currentFilter = btn.dataset.filter;
      renderProjects();
    });
  });
}

// ── Сортировка ──
function setupSort() {
  const sortToggle = document.getElementById('sortToggle');
  if (!sortToggle) return;

  sortToggle.addEventListener('click', () => {
    sortAsc = !sortAsc;
    projects.sort((a, b) => {
      const da = new Date(a.date), db = new Date(b.date);
      return sortAsc ? da - db : db - da;
    });
    const label = sortToggle.querySelector('span');
    if (label) label.innerText = sortAsc ? 'Сначала старые' : 'Сначала новые';
    renderProjects();
  });
}

// ── Инициализация ──
async function init() {
  await loadCurrentUser();
  await loadGroupInfo();

  // TODO: заменить на реальный вызов groupsAPI.getGroupSubmissions(currentGroupId)
  projects = generateMockProjects();

  setupFilters();
  setupSort();
  renderProjects();
}

init();