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

export const authAPI = {
    async login(email, password) {
        const data = await request('/auth/login', 'POST', { email, password }, false);
        if (data.access_token) {
            setAuthToken(data.access_token);
        }
        return data;
    },

    async register(userData) {
        // userData: { email, password, name, surname, patronymic }
        return await request('/users/register', 'POST', userData, false);
    },

    logout() {
        setAuthToken('');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
    },

    getToken() {
        return authToken;
    },

    isAuthenticated() {
        return !!authToken;
    }
};

export const usersAPI = {
    // ⚠️ GET /users/me отсутствует на бэкенде!
    // Если добавят — раскомментируйте:
    // async getMe() {
    //     return await request('/users/me', 'GET');
    // },

    // Временно: декодируем токен локально (небезопасно для production)
    async getMe() {
        try {
            const token = authToken.split('.')[1];
            const payload = JSON.parse(atob(token));
            // Пытаемся получить данные из токена или возвращаем заглушку
            return {
                id: payload.user_id,
                email: payload.sub || 'user@example.com',
                name: payload.name || 'Пользователь',
                surname: payload.surname || ''
            };
        } catch {
            // Fallback: пробуем загрузить через другой эндпоинт
            throw new Error('Не удалось получить данные пользователя');
        }
    },

    async updateProfile(data) {
        // data: { email?, name?, surname?, patronymic? }
        return await request('/users/me', 'PUT', data);
    },

    async changePassword(current_password, new_password) {
        throw new Error('Смена пароля временно недоступна');
    }
};

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

    //  КРИТЕРИИ ОЦЕНКИ

    // Получить критерии группы
    async getCriteria(groupId) {
        return await request(`/groups/${groupId}/criteria`, 'GET');
    },

    // Создать критерий (только создатель группы)
    async createCriterion(groupId, data) {
        // data: { name: string, description?: string }
        return await request(`/groups/${groupId}/criteria`, 'POST', data);
    },

    // Обновить критерий
    async updateCriterion(groupId, criterionId, data) {
        return await request(`/groups/${groupId}/criteria/${criterionId}`, 'PUT', data);
    },

    // Удалить критерий
    async deleteCriterion(groupId, criterionId) {
        return await request(`/groups/${groupId}/criteria/${criterionId}`, 'DELETE');
    },

    //  РАБОТЫ / ПРОЕКТЫ (SUBMISSIONS)

    // ⚠️ GET /groups/{group_id}/submissions отсутствует на бэкенде!
    // Нужен для страницы review.html (список проектов группы)
    async getGroupSubmissions(groupId) {
        // ЗАГЛУШКА: заменить на реальный эндпоинт когда появится
        // return await request(`/groups/${groupId}/submissions`, 'GET');
        throw new Error('Эндпоинт GET /groups/{group_id}/submissions не реализован на бэкенде');
    },

    // Отправить проект на проверку (студент)
    async submitWork(link, groupId) {
        return await request('/groups/submit', 'POST', { link, group_id: groupId });
    },

    // Получить детали работы с оценками
    async getSubmission(submissionId) {
        return await request(`/groups/submissions/${submissionId}`, 'GET');
    },

    // Оценить работу (эксперт)
    // reviewData: { comment?: string, grades: [{ criterion_id: number, score: number }] }
    async reviewWork(submissionId, comment, grades) {
        return await request(`/groups/submissions/${submissionId}/review`, 'POST', {
            comment,
            grades
        });
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