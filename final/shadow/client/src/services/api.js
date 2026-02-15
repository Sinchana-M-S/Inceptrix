import axios from 'axios';

const API_URL = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data)
};

// Activities API
export const activitiesAPI = {
  create: (data) => api.post('/activities', data),
  getAll: (params) => api.get('/activities', { params }),
  getStats: () => api.get('/activities/stats'),
  getById: (id) => api.get(`/activities/${id}`),
  delete: (id) => api.delete(`/activities/${id}`)
};

// Testimonies API
export const testimoniesAPI = {
  submit: (data) => api.post('/testimonies', data),
  getPending: () => api.get('/testimonies/pending'),
  getMyValidations: () => api.get('/testimonies/my-validations'),
  getReceived: () => api.get('/testimonies/received'),
  getForCaregiver: (id) => api.get(`/testimonies/caregiver/${id}`)
};

// VCS API
export const vcsAPI = {
  getScore: () => api.get('/vcs/score'),
  getBreakdown: () => api.get('/vcs/breakdown'),
  getHistory: () => api.get('/vcs/history'),
  calculate: () => api.post('/vcs/calculate'),
  getInsights: () => api.get('/vcs/insights')
};

// Lender API
export const lenderAPI = {
  getVCSScore: (id) => api.get(`/lender/vcs-score/${id}`),
  getBreakdown: (id) => api.get(`/lender/score-breakdown/${id}`),
  getRiskBands: () => api.get('/lender/risk-bands'),
  getCreditLimit: (id) => api.get(`/lender/credit-limit/${id}`),
  search: (params) => api.get('/lender/search', { params }),
  createLoanApplication: (data) => api.post('/lender/loan-application', data)
};

// Admin API
export const adminAPI = {
  getBiasAudit: () => api.get('/admin/bias-audit'),
  getFraudAlerts: () => api.get('/admin/fraud-alerts'),
  getModelDrift: () => api.get('/admin/model-drift'),
  getDashboard: () => api.get('/admin/dashboard')
};

// AI/ML API
export const aiAPI = {
  classifyActivity: (rawText) => api.post('/ai/classify-activity', { rawText }),
  getLoanPrediction: (userId) => api.get('/ai/loan-prediction', { params: { userId } }),
  getLoanPredictionForCaregiver: (caregiverId) => api.get(`/ai/loan-prediction/${caregiverId}`),
  analyzeFraud: (activityId) => api.post('/ai/fraud-analysis', { activityId }),
  getRiskAssessment: (userId) => api.get(`/ai/risk-assessment/${userId}`),
  getScoreExplanation: () => api.get('/ai/score-explanation'),
  getStatus: () => api.get('/ai/status')
};

export default api;
