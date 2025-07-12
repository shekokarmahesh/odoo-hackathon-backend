import api from './api';

// Auth services
export const authService = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },

  verifyEmail: async (token) => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },
};

// Question services
export const questionService = {
  getAll: async (params) => {
    const response = await api.get('/questions', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/questions/${id}`);
    return response.data;
  },

  create: async (questionData) => {
    const response = await api.post('/questions', questionData);
    return response.data;
  },

  update: async (id, questionData) => {
    const response = await api.put(`/questions/${id}`, questionData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/questions/${id}`);
    return response.data;
  },

  search: async (query, params) => {
    const response = await api.get('/questions/search', { 
      params: { q: query, ...params } 
    });
    return response.data;
  },
};

// Answer services
export const answerService = {
  getByQuestion: async (questionId, params) => {
    const response = await api.get(`/answers/question/${questionId}`, { params });
    return response.data;
  },

  create: async (answerData) => {
    const response = await api.post('/answers', answerData);
    return response.data;
  },

  update: async (id, answerData) => {
    const response = await api.put(`/answers/${id}`, answerData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/answers/${id}`);
    return response.data;
  },

  accept: async (id) => {
    const response = await api.post(`/answers/${id}/accept`);
    return response.data;
  },
};

// Vote services
export const voteService = {
  vote: async (targetId, targetType, voteType) => {
    const response = await api.post('/votes', {
      target: targetId,
      targetType,
      voteType,
    });
    return response.data;
  },

  removeVote: async (targetId, targetType) => {
    const response = await api.delete('/votes', {
      data: { target: targetId, targetType }
    });
    return response.data;
  },
};

// Comment services
export const commentService = {
  getByParent: async (parentId, parentType) => {
    const response = await api.get(`/comments/${parentType}/${parentId}`);
    return response.data;
  },

  create: async (commentData) => {
    const response = await api.post('/comments', commentData);
    return response.data;
  },

  update: async (id, content) => {
    const response = await api.put(`/comments/${id}`, { content });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/comments/${id}`);
    return response.data;
  },
};

// Tag services
export const tagService = {
  getAll: async (params) => {
    const response = await api.get('/tags', { params });
    return response.data;
  },

  search: async (query) => {
    const response = await api.get('/tags/search', { params: { q: query } });
    return response.data;
  },

  create: async (tagData) => {
    const response = await api.post('/tags', tagData);
    return response.data;
  },
};

// User services
export const userService = {
  getProfile: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  updateProfile: async (userData) => {
    const response = await api.put('/users/profile', userData);
    return response.data;
  },

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getStats: async (id) => {
    const response = await api.get(`/users/${id}/stats`);
    return response.data;
  },
};

// Notification services
export const notificationService = {
  getAll: async (params) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },
};
