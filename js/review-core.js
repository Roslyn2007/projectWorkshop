import { authAPI, usersAPI, groupsAPI } from './api.js';

export function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `fixed top-5 right-5 px-5 py-3 rounded-md text-white text-sm z-50 animate-slide-in ${isError ? 'bg-red-600' : 'bg-gray-800'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
}

export async function loadCurrentUser() {
  try {
    const user = await usersAPI.getMe();
    const displayName = (user.name && user.surname)
      ? `${user.name} ${user.surname}`
      : (user.name || user.email || 'Пользователь');
    const el = document.getElementById('headerUserName');
    if (el) el.innerText = displayName;
  } catch (error) {
    const el = document.getElementById('headerUserName');
    if (el) el.innerText = 'Гость';
  }
}

export let criteria = [];

export function setCriteria(newCriteria) {
  criteria = newCriteria;
}

export async function loadGroupCriteria(groupId) {
  try {
    const serverCriteria = await groupsAPI.getCriteria(groupId);
    criteria = serverCriteria.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      score: null,
      max_score: c.max_score || 10
    }));
  } catch (error) {
    console.warn('Не удалось загрузить критерии с бэкенда:', error.message);
    criteria = [
      { id: 1, name: 'Критерий 1', score: null, max_score: 10 },
      { id: 2, name: 'Критерий 2', score: null, max_score: 10 },
      { id: 3, name: 'Критерий 3', score: null, max_score: 10 }
    ];
  }
}

export async function loadProjectSubmission(projectId) {
  try {
    return await groupsAPI.getSubmission(projectId);
  } catch (error) {
    console.warn('Не удалось загрузить submission:', error.message);
    return null;
  }
}

export function renderCriteriaList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (criteria.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400">Нет критериев оценки. Добавьте первый критерий выше.</p>';
    return;
  }

  container.innerHTML = criteria.map(c => {
    const max = c.max_score || 10;
    const scoresHtml = Array.from({ length: max }, (_, i) => {
      const score = i + 1;
      const isActive = c.score === score;
      return `
        <div class="score-circle ${isActive ? 'active' : ''}" data-criteria-id="${c.id}" data-score="${score}" title="${score} балл${score===1?'':'ов'}">
          ${score}
        </div>
        ${score < max ? '<div class="score-line"></div>' : ''}
      `;
    }).join('');

    return `
      <div class="criteria-item" data-criteria-id="${c.id}">
        <h3 class="text-base font-medium text-gray-800 mb-3">${escapeHtml(c.name)}</h3>
        <div class="flex items-center">
          ${scoresHtml}
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.score-circle').forEach(circle => {
    circle.addEventListener('click', () => {
      const criteriaId = parseInt(circle.dataset.criteriaId);
      const score = parseInt(circle.dataset.score);
      setCriteriaScore(criteriaId, score);
      renderCriteriaList(containerId);
      updateTotalScore();
    });
  });
}

export function setCriteriaScore(criteriaId, score) {
  const c = criteria.find(x => x.id === criteriaId);
  if (!c) return;
  c.score = score;
}

export function updateTotalScore(totalId = 'totalScore', maxTotalId = 'maxTotalScore') {
  const totalEl = document.getElementById(totalId);
  const maxEl = document.getElementById(maxTotalId);
  if (!totalEl || !maxEl) return;

  if (criteria.length === 0) {
    totalEl.innerText = '**';
    maxEl.innerText = '**';
    return;
  }
  const total = criteria.reduce((sum, c) => sum + (c.score || 0), 0);
  const max = criteria.reduce((sum, c) => sum + (c.max_score || 10), 0);
  totalEl.innerText = total;
  maxEl.innerText = max;
}

//  УПРАВЛЕНИЕ КРИТЕРИЯМИ (добавление / удаление)
export function updateRemoveDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;

  if (criteria.length === 0) {
    dropdown.innerHTML = '<div class="px-3 py-2 text-sm text-gray-400">Нет критериев</div>';
    return;
  }

  dropdown.innerHTML = criteria.map(c => `
    <div class="remove-criteria-option px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 cursor-pointer border-b border-orange-100 last:border-0"
         data-criteria-id="${c.id}">
      ${escapeHtml(c.name)}
    </div>
  `).join('');
}

export async function handleAddCriterion(groupId, name, onSuccess) {
  if (!name) {
    showToast('Введите название критерия', true);
    return false;
  }

  try {
    const created = await groupsAPI.createCriterion(groupId, { name });
    criteria.push({
      id: created.id,
      name: created.name,
      description: created.description,
      score: null,
      max_score: created.max_score || 10
    });
    showToast('Критерий добавлен');
  } catch (error) {
    showToast('Ошибка добавления: ' + error.message, true);
    const newId = criteria.length > 0 ? Math.max(...criteria.map(c => c.id)) + 1 : 1;
    criteria.push({ id: newId, name, score: null, max_score: 10 });
  }

  if (onSuccess) onSuccess();
  return true;
}

export async function handleDeleteCriterion(groupId, criteriaId, onSuccess) {
  const c = criteria.find(x => x.id === criteriaId);
  if (!c) return false;
  if (!confirm(`Удалить критерий "${c.name}"?`)) return false;

  try {
    await groupsAPI.deleteCriterion(groupId, criteriaId);
    criteria = criteria.filter(x => x.id !== criteriaId);
    showToast('Критерий удалён');
  } catch (error) {
    showToast('Ошибка удаления: ' + error.message, true);
    criteria = criteria.filter(x => x.id !== criteriaId);
  }

  if (onSuccess) onSuccess();
  return true;
}

export async function handleFinishReview(projectId, feedback, groupId, onSuccess) {
  if (criteria.length === 0) {
    showToast('Добавьте хотя бы один критерий оценки', true);
    return false;
  }

  const unscored = criteria.filter(c => c.score === null);
  if (unscored.length > 0) {
    showToast(`Оцените все критерии (осталось: ${unscored.length})`, true);
    return false;
  }

  const grades = criteria.map(c => ({
    criterion_id: c.id,
    score: c.score
  }));

  try {
    await groupsAPI.reviewWork(projectId, feedback, grades);
    showToast('Оценка успешно сохранена!');
    if (onSuccess) onSuccess();
    return true;
  } catch (error) {
    showToast('Ошибка сохранения: ' + error.message, true);
    return false;
  }
}

export function initReviewPage(options) {
  const {
    groupId,
    projectId,
    containerId,
    addBtnId,
    inputId,
    removeBtnId,
    dropdownId,
    finishBtnId,
    feedbackId,
    onFinish
  } = options;

  // ── Добавление критерия ──
  const addBtn = document.getElementById(addBtnId);
  const input = document.getElementById(inputId);
  if (addBtn && input) {
    addBtn.addEventListener('click', async () => {
      addBtn.disabled = true;
      addBtn.innerHTML = '<span class="animate-spin inline-block mr-1">⟳</span> Добавление...';

      await handleAddCriterion(groupId, input.value.trim(), () => {
        input.value = '';
        renderCriteriaList(containerId);
        updateTotalScore();
        updateRemoveDropdown(dropdownId);
      });

      addBtn.disabled = false;
      addBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Добавить критерий оценки
      `;
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBtn.click();
      }
    });
  }

  // ── Удаление критерия (выпадашка) ──
  const removeBtn = document.getElementById(removeBtnId);
  const dropdown = document.getElementById(dropdownId);
  if (removeBtn && dropdown) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== removeBtn) {
        dropdown.classList.add('hidden');
      }
    });
  }

  // Делегирование клика по опциям удаления
  if (dropdown) {
    dropdown.addEventListener('click', async (e) => {
      const opt = e.target.closest('.remove-criteria-option');
      if (!opt) return;
      e.stopPropagation();

      const id = parseInt(opt.dataset.criteriaId);
      await handleDeleteCriterion(groupId, id, () => {
        renderCriteriaList(containerId);
        updateTotalScore();
        updateRemoveDropdown(dropdownId);
      });
      dropdown.classList.add('hidden');
    });
  }

  // ── Завершение оценки ──
  const finishBtn = document.getElementById(finishBtnId);
  if (finishBtn) {
    finishBtn.addEventListener('click', async () => {
      const feedback = document.getElementById(feedbackId)?.value.trim() || '';

      finishBtn.disabled = true;
      finishBtn.innerHTML = '<span class="animate-spin inline-block mr-1">⟳</span> Сохранение...';

      const success = await handleFinishReview(projectId, feedback, groupId, onFinish);

      if (!success) {
        finishBtn.disabled = false;
        finishBtn.innerText = 'Завершить оценку';
      }
    });
  }
}