import { authAPI, usersAPI, groupsAPI } from './api.js';

let currentGroupId = null;
let currentUserRole = null;
let groupsList = [];

function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 6px;
    color: white;
    font-size: 14px;
    z-index: 9999;
    animation: slideIn 0.3s ease;
    ${isError ? 'background: #dc2626;' : 'background: #1f2937;'}
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, (m) => {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

async function loadCurrentUser() {
  try {
    const user = await usersAPI.getMe();
    const displayName = (user.name && user.surname)
      ? `${user.name} ${user.surname}`
      : (user.name || user.email || 'Пользователь');

    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) userNameDisplay.innerText = displayName;
  } catch (error) {
    console.error('Ошибка загрузки пользователя:', error);
  }
}

async function loadGroups() {
  try {
    const groups = await groupsAPI.getMyGroups();
    groupsList = groups;
    renderGroupsList(groups);
    return groups;
  } catch (error) {
    console.error(error);
    renderGroupsList([]);
    return [];
  }
}

function renderGroupsList(groups) {
  const container = document.getElementById('groupsListContainer');
  const detailsContainer = document.getElementById('groupsListDetails');

  const renderInto = (parent, activeId) => {
    if (!parent) return;
    if (groups.length === 0) {
      parent.innerHTML = `
        <div class="border-2 border-purple-500 bg-white p-3 flex justify-center items-center group-item">
          <span class="text-sm text-gray-500">У вас пока нет групп</span>
        </div>
      `;
    } else {
      parent.innerHTML = '';
      groups.forEach(group => {
        const isActive = group.id === activeId;
        const div = document.createElement('div');
        div.className = `border-2 ${isActive ? 'border-purple-700 bg-purple-50' : 'border-purple-500 bg-white'} p-3 flex justify-between items-center cursor-pointer group-item`;
        div.setAttribute('data-group-id', group.id);
        div.innerHTML = `
          <span class="text-sm font-medium ${isActive ? 'text-purple-900' : 'text-gray-800'} group-name">${escapeHtml(group.name)}</span>
          <div class="group-divider"></div>
          <span class="text-sm ${isActive ? 'text-purple-800' : 'text-gray-600'} group-role">${escapeHtml(group.role || 'участник')}</span>
        `;
        div.onclick = () => openGroupDetails(group.id);
        parent.appendChild(div);
      });
    }
    parent.insertAdjacentHTML('beforeend', '<div style="height: 2px;"></div>');
  };

  renderInto(container, currentGroupId);
  renderInto(detailsContainer, currentGroupId);
}

function setUserRole(role) {
  currentUserRole = role;

  const organizerActions = document.getElementById('organizerActions');
  const expertActions = document.getElementById('expertActions');
  const studentActions = document.getElementById('studentActions');

  if (organizerActions) organizerActions.classList.add('hidden');
  if (expertActions) expertActions.classList.add('hidden');
  if (studentActions) studentActions.classList.add('hidden');

  document.querySelectorAll('.role-organizer-only').forEach(el => el.classList.add('hidden'));

  switch(role) {
    case 'organizer':
    case 'creator':
      if (organizerActions) organizerActions.classList.remove('hidden');
      document.querySelectorAll('.role-organizer-only').forEach(el => el.classList.remove('hidden'));
      break;
    case 'expert':
    case 'reviewer':
      if (expertActions) expertActions.classList.remove('hidden');
      break;
    case 'student':
    case 'member':
      if (studentActions) studentActions.classList.remove('hidden');
      break;
    default:
      if (studentActions) studentActions.classList.remove('hidden');
  }
}

function showSection(sectionName) {
  const sectionGroups = document.getElementById('sectionGroups');
  const sectionGroupDetails = document.getElementById('sectionGroupDetails');

  if (sectionName === 'groups') {
    if (sectionGroups) {
      sectionGroups.classList.remove('hidden');
      sectionGroups.classList.add('active');
    }
    if (sectionGroupDetails) {
      sectionGroupDetails.classList.add('hidden');
      sectionGroupDetails.classList.remove('active');
    }
    currentGroupId = null;
    currentUserRole = null;
  } else if (sectionName === 'details') {
    if (sectionGroups) {
      sectionGroups.classList.add('hidden');
      sectionGroups.classList.remove('active');
    }
    if (sectionGroupDetails) {
      sectionGroupDetails.classList.remove('hidden');
      sectionGroupDetails.classList.add('active');
    }
  }
}

async function openGroupDetails(groupId) {
  currentGroupId = groupId;
  try {
    const group = groupsList.find(g => g.id === groupId);
    if (!group) throw new Error('Группа не найдена');

    const userRole = group.role || 'member';
    setUserRole(userRole);

    const currentGroupNameSpan = document.getElementById('currentGroupNameSpan');
    if (currentGroupNameSpan) currentGroupNameSpan.innerText = group.name;

    const members = await groupsAPI.getMembers(groupId);
    renderMembers(members);

    showSection('details');
    await loadGroups();

  } catch (error) {
    showToast('Не удалось загрузить группу', true);
    console.error(error);
  }
}

function renderMembers(members) {
  const container = document.getElementById('membersListArea');
  if (!container) return;
  container.innerHTML = members.map(m => `
    <div class="flex justify-between items-center py-2 px-2 border-b border-gray-100 last:border-0" data-member-id="${m.user_id}">
      <span class="text-gray-800 text-sm">${escapeHtml((m.name + ' ' + m.surname).trim() || m.email || m.user_id)}</span>
      <span class="text-gray-500 text-xs font-medium bg-gray-100 px-2 py-0.5">${escapeHtml(m.role || 'участник')}</span>
    </div>
  `).join('');

  const dropdown = document.getElementById('removeMemberDropdown');
  if (dropdown) {
    dropdown.innerHTML = members.map(m => {
      const full = (m.name + ' ' + m.surname).trim() || m.email || m.user_id;
      return `
        <div class="remove-member-option px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 cursor-pointer border-b border-orange-100"
             data-member-id="${m.user_id}" data-member-name="${escapeHtml(full)}">
          ${escapeHtml(full)} — ${escapeHtml(m.role || 'участник')}
        </div>
      `;
    }).join('');

    document.querySelectorAll('.remove-member-option').forEach(opt => {
      opt.onclick = async (e) => {
        e.stopPropagation();
        const memberId = opt.dataset.memberId;
        const memberName = opt.dataset.memberName;
        if (confirm(`Удалить участника "${memberName}" из группы?`)) {
          try {
            await groupsAPI.removeMember(currentGroupId, memberId);
            showToast(`Участник ${memberName} удален`);
            await openGroupDetails(currentGroupId);
          } catch (error) {
            showToast('Ошибка удаления: ' + error.message, true);
          }
        }
        dropdown.classList.add('hidden');
      };
    });
  }
}

const createGroupBtn = document.getElementById('createGroupBtn');
if (createGroupBtn) {
  createGroupBtn.onclick = async () => {
    const nameInput = document.getElementById('newGroupName');
    const name = nameInput?.value.trim();
    if (!name) { showToast('Введите название группы', true); return; }

    createGroupBtn.disabled = true;
    createGroupBtn.textContent = 'Создание...';

    try {
      const newGroup = await groupsAPI.createGroup(name);

      showToast(`Группа "${name}" создана!`);
      if (nameInput) nameInput.value = '';

      const inviteBlock = document.getElementById('inviteLinksBlock');
      if (inviteBlock) inviteBlock.classList.remove('hidden');

      const studentField = document.getElementById('studentInviteField');
      const expertField = document.getElementById('expertInviteField');
      if (studentField && newGroup.student_invite_token) {
        studentField.value = newGroup.student_invite_token;
      }
      if (expertField && newGroup.reviewer_invite_token) {
        expertField.value = newGroup.reviewer_invite_token;
      }

      await loadGroups();
    } catch (error) {
      showToast('Ошибка создания группы: ' + error.message, true);
    } finally {
      createGroupBtn.disabled = false;
      createGroupBtn.textContent = 'Создать новую группу';
    }
  };
}

const addExpertBtn = document.getElementById('addExpertBtn');
if (addExpertBtn) {
  addExpertBtn.onclick = async () => {
    if (!currentGroupId) return;
    const group = groupsList.find(g => g.id === currentGroupId);
    const linkBlock = document.getElementById('expertLinkBlock');
    const linkField = document.getElementById('expertInviteLink');

    if (linkBlock) linkBlock.classList.remove('hidden');

    if (group && group.reviewer_invite_token && linkField) {
      linkField.value = group.reviewer_invite_token;
      showToast('Ссылка для приглашения эксперта готова');
    } else {
      showToast('Ссылка недоступна', true);
    }
  };
}

const addStudentBtn = document.getElementById('addStudentBtn');
if (addStudentBtn) {
  addStudentBtn.onclick = async () => {
    if (!currentGroupId) return;
    const group = groupsList.find(g => g.id === currentGroupId);
    const linkBlock = document.getElementById('studentLinkBlock');
    const linkField = document.getElementById('studentInviteLink');

    if (linkBlock) linkBlock.classList.remove('hidden');

    if (group && group.student_invite_token && linkField) {
      linkField.value = group.student_invite_token;
      showToast('Ссылка для приглашения студента готова');
    } else {
      showToast('Ссылка недоступна', true);
    }
  };
}

const removeBtn = document.getElementById('removeMemberBtn');
const removeDropdown = document.getElementById('removeMemberDropdown');
if (removeBtn && removeDropdown) {
  removeBtn.onclick = (e) => {
    e.stopPropagation();
    removeDropdown.classList.toggle('hidden');
  };
  document.addEventListener('click', (e) => {
    if (!removeDropdown.contains(e.target) && e.target !== removeBtn) {
      removeDropdown.classList.add('hidden');
    }
  });
}

const goToReviewBtn = document.getElementById('goToReviewBtn');
if (goToReviewBtn) {
  goToReviewBtn.onclick = () => {
    if (!currentGroupId) {
      showToast('Сначала выберите группу', true);
      return;
    }
    window.location.href = `review.html?group=${currentGroupId}`;
  };
}

const sendForReviewBtn = document.getElementById('sendForReviewBtn');
if (sendForReviewBtn) {
  sendForReviewBtn.onclick = async () => {
    const link = document.getElementById('projectLinkInput')?.value.trim();
    if (!link) {
      showToast('Введите ссылку на проект', true);
      return;
    }
    if (!currentGroupId) {
      showToast('Сначала выберите группу', true);
      return;
    }

    sendForReviewBtn.disabled = true;
    sendForReviewBtn.textContent = 'Отправка...';

    try {
      await groupsAPI.submitWork(link, currentGroupId);
      showToast('Проект отправлен на проверку');
      document.getElementById('projectLinkInput').value = '';
    } catch (error) {
      showToast('Ошибка отправки: ' + error.message, true);
    } finally {
      sendForReviewBtn.disabled = false;
      sendForReviewBtn.textContent = 'Отправить на проверку';
    }
  };
}

const studentSendForReviewBtn = document.getElementById('studentSendForReviewBtn');
if (studentSendForReviewBtn) {
  studentSendForReviewBtn.onclick = async () => {
    const link = document.getElementById('studentProjectLink')?.value.trim();
    if (!link) {
      showToast('Введите ссылку на проект', true);
      return;
    }
    if (!currentGroupId) {
      showToast('Сначала выберите группу', true);
      return;
    }

    studentSendForReviewBtn.disabled = true;
    studentSendForReviewBtn.textContent = 'Отправка...';

    try {
      await groupsAPI.submitWork(link, currentGroupId);
      showToast('Проект отправлен на проверку');
      document.getElementById('studentProjectLink').value = '';
    } catch (error) {
      showToast('Ошибка отправки: ' + error.message, true);
    } finally {
      studentSendForReviewBtn.disabled = false;
      studentSendForReviewBtn.textContent = 'Отправить на проверку';
    }
  };
}

const backBtn = document.getElementById('backToGroupsBtn');
if (backBtn) {
  backBtn.onclick = async () => {
    showSection('groups');
    await loadGroups();
  };
}

async function init() {
  await loadCurrentUser();
  await loadGroups();

  // ── Переключение режимов ──
  const modeSelector = document.getElementById('modeSelector');
  if (modeSelector) {
    const buttons = modeSelector.querySelectorAll('.mode-btn');
    
    // По умолчанию активен первый режим
    if (buttons.length > 0) {
      buttons[0].classList.add('is-active');
    }
    
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });
  }
}

init();