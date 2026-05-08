// Единый API-клиент для работы с бэкендом FastAPI
const API_BASE = 'http://localhost:8000';

// Хранение токена
let authToken = localStorage.getItem('access_token') || '';

function setAuthToken(token) {
    authToken = token;
    if (token) {
        localStorage.setItem('access_token', token);
    } else {
        localStorage.removeItem('access_token');
    }
}

async function request(endpoint, method = 'GET', body = null, needsAuth = true) {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (needsAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const options = {
        method,
        headers,
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        
        // Если 401 – неавторизован, очищаем токен и выбрасываем ошибку
        if (response.status === 401) {
          setAuthToken('');
          // Редирект на страницу входа, если мы не там
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/index.html')) {
            window.location.href = '/index.html';
          }
          throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || `Ошибка ${response.status}`);
        }
        return data;
    } catch (error) {
        console.error(`API request failed: ${endpoint}`, error);
        throw error;
    }
}

// ============= Авторизация =============
export const authAPI = {
    async login(email, password) {
        const data = await request('/auth/login', 'POST', { email, password }, false);
        if (data.access_token) {
            setAuthToken(data.access_token);
        }
        return data;
    },

    async register(userData) {
        // userData должен содержать email, password, first_name?, last_name?
        // По схеме UserCreate: email, password, first_name?, last_name?
        return await request('/users/register', 'POST', userData, false);
    },

    logout() {
        setAuthToken('');
        localStorage.removeItem('userRole'); // очищаем старые ключи
        localStorage.removeItem('userName');
    },

    getToken() {
        return authToken;
    },

    isAuthenticated() {
        return !!authToken;
    }
};

// ============= Пользователи =============
export const usersAPI = {
    async getMe() {
        return await request('/users/me', 'GET');
    },

    async updateProfile(data) {
        // data: { email?, first_name?, last_name? }
        return await request('/users/me', 'PUT', data);
    },

    async changePassword(current_password, new_password) {
        // В вашем бэкенде эндпоинт для смены пароля отсутствует.
        // Если добавите – раскомментируйте:
        // return await request('/users/change-password', 'POST', { current_password, new_password });
        throw new Error('Смена пароля временно недоступна');
    }
};

// ============= Группы =============
export const groupsAPI = {
    // Получить все группы текущего пользователя
    async getMyGroups() {
        return await request('/groups/my', 'GET');
    },

    // Создать новую группу
    async createGroup(name) {
        return await request('/groups', 'POST', { name });
    },

    // Присоединиться по токену (код приглашения)
    async joinGroupByToken(token) {
        return await request(`/groups/join/${token}`, 'GET');
    },

    // Получить список участников группы
    async getMembers(groupId) {
        return await request(`/groups/${groupId}/members`, 'GET');
    },

    // Удалить участника из группы (только создатель)
    async removeMember(groupId, userId) {
        return await request(`/groups/${groupId}/members/${userId}`, 'DELETE');
    },

    // Получить критерии группы
    async getCriteria(groupId) {
        return await request(`/groups/${groupId}/criteria`, 'GET');
    },

    // ========== Работы / Проекты ==========

    // Отправить проект на проверку (студент)
    async submitWork(link, groupId) {
        return await request('/groups/submit', 'POST', { link, group_id: groupId });
    },

    // Получить детали работы с оценками
    async getSubmission(submissionId) {
        return await request(`/groups/submissions/${submissionId}`, 'GET');
    },

    // Оценить работу (эксперт)
    async reviewWork(submissionId, comment, grades) {
        return await request(`/groups/submissions/${submissionId}/review`, 'POST', { comment, grades });
    },

    // Обновить ссылку на проект (студент)
    async updateSubmissionLink(submissionId, link) {
        return await request(`/groups/submissions/${submissionId}/link`, 'PUT', { link });
    },

    // Обновить комментарий проверяющего (эксперт)
    async updateSubmissionComment(submissionId, comment) {
        return await request(`/groups/submissions/${submissionId}/comment`, 'PUT', { comment });
    }
};