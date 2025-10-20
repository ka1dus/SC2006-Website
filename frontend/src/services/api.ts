import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token (bypassed for demo)
api.interceptors.request.use(
  (config) => {
    // Skip authentication for demo mode
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors (bypassed for demo)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Skip authentication redirect for demo mode
    // if (error.response?.status === 401) {
    //   localStorage.removeItem('token');
    //   window.location.href = '/login';
    // }
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    return response.data.data;
  },

  async register(name: string, email: string, password: string) {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data.data;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await api.post('/auth/change-password', { 
      currentPassword, 
      newPassword 
    });
    return response.data;
  },

  async resetPassword(email: string) {
    const response = await api.post('/auth/reset-password', { email });
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data.data.user;
  },

  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Subzone services
export const subzoneService = {
  async getAllSubzones(filters?: {
    region?: string;
    percentile?: number;
    search?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.region) params.append('region', filters.region);
    if (filters?.percentile) params.append('percentile', filters.percentile.toString());
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/subzones?${params.toString()}`);
    return response.data.data.subzones;
  },

  async getSubzoneById(subzoneId: string) {
    const response = await api.get(`/subzones/${subzoneId}`);
    return response.data.data.subzone;
  },

  async getSubzoneDetails(subzoneId: string) {
    const response = await api.get(`/subzones/${subzoneId}/details`);
    return response.data.data.details;
  },

  async searchSubzones(query: string) {
    const response = await api.get(`/subzones/search?query=${encodeURIComponent(query)}`);
    return response.data.data.subzones;
  },

  async getAllRegions() {
    const response = await api.get('/subzones/regions');
    return response.data.data.regions;
  },

  async getLatestScores(subzoneIds?: string[]) {
    const params = subzoneIds ? `?subzoneIds=${subzoneIds.join(',')}` : '';
    const response = await api.get(`/subzones/scores/latest${params}`);
    return response.data.data.scores;
  },

  async getScoresByPercentile(threshold: number) {
    const response = await api.get(`/subzones/scores/percentile?threshold=${threshold}`);
    return response.data.data.scores;
  },
};

// Admin services
export const adminService = {
  async refreshDatasets(options?: { force?: boolean; datasets?: string[] }) {
    const response = await api.post('/admin/refresh-datasets', options || {});
    return response.data;
  },

  async getAllSnapshots() {
    const response = await api.get('/admin/snapshots');
    return response.data.data.snapshots;
  },

  async getSnapshotById(id: string) {
    const response = await api.get(`/admin/snapshots/${id}`);
    return response.data.data.snapshot;
  },

  async createSnapshot(notes?: string) {
    const response = await api.post('/admin/snapshots', { notes });
    return response.data;
  },

  async getKernelConfigs() {
    const response = await api.get('/admin/kernel-configs');
    return response.data.data.configs;
  },

  async createKernelConfig(config: any) {
    const response = await api.post('/admin/kernel-configs', config);
    return response.data;
  },

  async getSystemStats() {
    const response = await api.get('/admin/stats');
    return response.data.data;
  },
};

// Export services
export const exportService = {
  async exportSubzoneDetails(subzoneId: string, format: 'pdf' | 'png' = 'pdf') {
    const response = await api.post('/export/subzone', {
      subzoneId,
      format,
      includeDetails: true,
      includeLegend: true,
    }, {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportComparison(subzoneIds: string[], format: 'pdf' | 'png' = 'pdf') {
    const response = await api.post('/export/comparison', {
      subzoneIds,
      format,
    }, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Convenience functions for backward compatibility
export const loginUser = authService.login;
export const registerUser = authService.register;
export const changePassword = authService.changePassword;
export const resetPassword = authService.resetPassword;

export default api;
