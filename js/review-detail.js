import { groupsAPI } from './api.js';
import {
  loadCurrentUser,
  loadGroupCriteria,
  loadProjectSubmission,
  renderCriteriaList,
  updateTotalScore,
  updateRemoveDropdown,
  initReviewPage,
  showToast,
  escapeHtml,
  criteria
} from './review-core.js';

let currentGroupId = null;
let currentProjectId = null;

// Получаем user_id из токена для сопоставления отзывов
function getUserIdFromToken() {
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.user_id || null;
  } catch {
    return null;
  }
}

async function loadProject() {
  const params = new URLSearchParams(window.location.search);
  currentGroupId = params.get('group');
  currentProjectId = params.get('project');

  if (!currentGroupId || !currentProjectId) {
    showToast('Проект или группа не выбраны', true);
    return;
  }

  try {
    const groups = await groupsAPI.getMyGroups();
    const group = groups.find(g => g.id == currentGroupId);
    if (group) {
      const nameEl = document.getElementById('groupName');
      if (nameEl) nameEl.innerText = escapeHtml(group.name);
    }

    await loadGroupCriteria(currentGroupId);

    const submission = await loadProjectSubmission(currentProjectId);
    if (submission) {
      document.getElementById('projectName').innerText = `Проект #${submission.id}`;
      const linkEl = document.getElementById('projectDownloadLink');
      linkEl.href = submission.link;
      linkEl.innerText = submission.link;

      // Бэкенд возвращает reviews[], а не reviewer_comment на верхнем уровне
      const currentUserId = getUserIdFromToken();
      const myReview = submission.reviews?.find(r => r.reviewer_id === currentUserId);
      
      if (myReview?.comment) {
        document.getElementById('feedbackText').value = myReview.comment;
      }

      // Если уже есть оценки — подгружаем их в criteria
      if (myReview?.grades?.length > 0) {
        myReview.grades.forEach(g => {
          const c = criteria.find(x => x.id === g.criterion_id || x.name === g.criterion_name);
          if (c) c.score = g.score;
        });
      }

      if (submission.status === 'graded') {
        showToast('Эта работа уже оценена. Вы можете изменить оценку.');
      }
    } else {
      // Fallback-заглушка
      document.getElementById('projectName').innerText = 'Проект «Альфа»';
      const linkEl = document.getElementById('projectDownloadLink');
      linkEl.href = 'https://example.com/project-alpha';
      linkEl.innerText = 'https://example.com/project-alpha';
    }

    renderCriteriaList('criteriaList');
    updateTotalScore('totalScore', 'maxTotalScore');
    updateRemoveDropdown('removeCriteriaDropdown');

  } catch (error) {
    showToast('Ошибка загрузки проекта: ' + error.message, true);
  }
}

async function init() {
  await loadCurrentUser();
  await loadProject();

  initReviewPage({
    groupId: currentGroupId,
    projectId: currentProjectId,
    containerId: 'criteriaList',
    addBtnId: 'addCriteriaBtn',
    inputId: 'newCriteriaInput',
    removeBtnId: 'removeCriteriaBtn',
    dropdownId: 'removeCriteriaDropdown',
    finishBtnId: 'finishReviewBtn',
    feedbackId: 'feedbackText',
    onFinish: () => {
      setTimeout(() => {
        window.location.href = `review.html?group=${currentGroupId}`;
      }, 1000);
    }
  });
}

init();