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
        localStorage.removeItem('feedback_user_profile');
    },

    getToken() {
        return authToken;
    },

    isAuthenticated() {
        return !!authToken;
    }
};

export const usersAPI = {
    // Используем userStore + fallback на токен
    async getMe() {
        // 1. Пробуем взять из хранилища (сохраняется при регистрации)
        const stored = loadFromStorage();
        if (stored) return stored;

        // 2. Fallback — декодируем токен
        try {
            const token = authToken.split('.')[1];
            const payload = JSON.parse(atob(token));
            return {
                id: payload.user_id,
                email: payload.sub || 'user@example.com',
                name: 'Пользователь',
                surname: ''
            };
        } catch {
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

// === UserStore helpers (inline, чтобы не зависеть от отдельного импорта) ===
function loadFromStorage() {
    try {
        const raw = localStorage.getItem('feedback_user_profile');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveProfileToStorage(profile) {
    if (!profile) {
        localStorage.removeItem('feedback_user_profile');
        return;
    }
    localStorage.setItem('feedback_user_profile', JSON.stringify({
        id: profile.id,
        name: profile.name,
        surname: profile.surname,
        patronymic: profile.patronymic,
        email: profile.email,
        updatedAt: Date.now()
    }));
}

export const groupsAPI = {
    // Получить все группы текущего пользователя
    async getMyGroups() {
        return await request('/groups/my', 'GET');
    },

    // Создать новую группу
    async createGroup(name, groupMode = 'classic', countOfInspectors = 1) {
        return await request('/groups', 'POST', { 
            name, 
            group_mode: groupMode, 
            count_of_inspectors: countOfInspectors 
        });
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

    // Получить работы, назначенные текущему проверяющему
    async getMyReviews() {
        return await request('/groups/my-reviews', 'GET');
    },

    // ⚠️ GET /groups/{group_id}/submissions отсутствует на бэкенде!
    // Нужен для страницы review.html (список проектов группы для организатора)
    async getGroupSubmissions(groupId) {
        // ЗАГЛУШКА: заменить на реальный эндпоинт когда появится
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
    // ⚠️ Бэкенд использует submission.reviewer_id, которого нет в модели — ручка может не работать
    async updateSubmissionComment(submissionId, comment) {
        return await request(`/groups/submissions/${submissionId}/comment`, 'PUT', { comment });
    }
};