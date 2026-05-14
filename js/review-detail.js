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

      if (submission.reviewer_comment) {
        document.getElementById('feedbackText').value = submission.reviewer_comment;
      }

      if (submission.grades && submission.grades.length > 0) {
        submission.grades.forEach(g => {
          const c = criteria.find(x => x.name === g.criterion_name);
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