import axios, { AxiosInstance, AxiosError } from 'axios';

// Use relative URL by default so requests go through nginx (same origin, no CORS)
// Override with VITE_API_URL for local dev: VITE_API_URL=http://localhost:3000
const BASE_URL = import.meta.env.VITE_API_URL ?? '';

const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor — attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — auto refresh token
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  verifyMfa: (otp: string, partialToken: string) =>
    api.post('/auth/mfa/verify', { otp, partialToken }),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
};

// Integration API (Sale System)
export const integrationApi = {
  // Internal endpoint — uses JWT auth (no API Key / HMAC required from the browser)
  createApplication: (data: any) => api.post('/integration/applications/internal', data),
  getApplicationStatus: (id: string) => api.get(`/integration/applications/${id}/status`),
};

// Questionnaire API
export const questionnaireApi = {
  getForm: (applicationId: string) => api.get(`/questionnaire/applications/${applicationId}/form`),
  saveAnswers: (applicationId: string, answers: any[]) =>
    api.post(`/questionnaire/applications/${applicationId}/answers`, { answers, isDraft: false }),
  saveDraft: (applicationId: string, answers: any[]) =>
    api.put(`/questionnaire/applications/${applicationId}/draft`, { answers, isDraft: true }),
};

// Workflow API
export const workflowApi = {
  submitApplication: (id: string) => api.post(`/workflow/applications/${id}/submit`),
  approveAction: (id: string, data: any) => api.post(`/workflow/applications/${id}/action`, data),
  getQueue: () => api.get('/workflow/queue'),
  listApplications: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get('/workflow/applications', { params }),
  getApplicationDetail: (id: string) => api.get(`/workflow/applications/${id}`),
};

// Users API
export const usersApi = {
  list: (page = 1, limit = 20) => api.get('/users', { params: { page, limit } }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  changePassword: (id: string, currentPassword: string, newPassword: string) =>
    api.post(`/users/${id}/change-password`, { currentPassword, newPassword }),
  createDelegation: (data: any) => api.post('/users/delegations', data),
  getActiveDelegations: () => api.get('/users/delegations/active'),
};

// Master Data API
export const masterApi = {
  listProducts: () => api.get('/master/products'),
  createProduct: (data: any) => api.post('/master/products', data),
  updateProduct: (id: string, data: any) => api.put(`/master/products/${id}`, data),
  listQuestions: () => api.get('/master/questions'),
  createQuestion: (data: any) => api.post('/master/questions', data),
  listFormTemplates: () => api.get('/master/form-templates'),
  listScoringModels: () => api.get('/master/scoring-models'),
  listApprovalMatrix: () => api.get('/master/approval-matrix'),
  updateApprovalMatrix: (id: string, data: any) => api.put(`/master/approval-matrix/${id}`, data),
  listApprovalCriteria: () => api.get('/master/approval-criteria'),
  createApprovalCriteria: (data: any) => api.post('/master/approval-criteria', data),
  searchCustomers: (q: string) => api.get('/master/customers', { params: { q } }),
  listBlacklist: () => api.get('/master/blacklist'),
  addBlacklist: (data: any) => api.post('/master/blacklist', data),
  removeBlacklist: (id: string) => api.delete(`/master/blacklist/${id}`),
};

// Reports API
export const reportsApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  getApplicationReport: (from: string, to: string, status?: string) =>
    api.get('/reports/applications', { params: { from, to, status } }),
  getSlaReport: (from: string, to: string) => api.get('/reports/sla', { params: { from, to } }),
  exportExcel: (from: string, to: string) =>
    api.get('/reports/export/excel', { params: { from, to }, responseType: 'blob' }),
};

export default api;
