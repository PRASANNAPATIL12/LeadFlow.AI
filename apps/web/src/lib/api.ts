import axios from 'axios';

// Create an axios instance with default settings
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    // Check if localStorage is available (client-side)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and not already retrying and localStorage is available
    if (typeof window !== 'undefined' && error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          console.error('No refresh token available for token refresh attempt.');
          // Redirect to login or handle appropriately if no refresh token
          localStorage.removeItem('token');
          window.location.href = '/login';
          return Promise.reject(new Error('No refresh token available'));
        }
        
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/refresh-token`,
          { refreshToken }
        );
        
        const { token } = response.data;
        localStorage.setItem('token', token);
        
        // Retry the original request with new token
        originalRequest.headers['Authorization'] = `Bearer ${token}`;
        return axios(originalRequest);
      } catch (refreshError: any) {
        // If refresh fails, redirect to login
        console.error('Token refresh failed:', refreshError.response?.data || refreshError.message);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login'; // Ensure this path is correct for your app
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// API request helpers
// It's good practice to type the params and data for these helpers if possible.
export const apiHelpers = {
  // Leads
  getLeads: (params?: any) => api.get('/leads', { params }),
  getLead: (id: string) => api.get(`/leads/${id}`),
  createLead: (data: any) => api.post('/leads', data),
  updateLead: (id: string, data: any) => api.put(`/leads/${id}`, data),
  deleteLead: (id: string) => api.delete(`/leads/${id}`),
  
  // Activities
  getActivities: (params?: any) => api.get('/activities', { params }),
  createActivity: (data: any) => api.post('/activities', data),
  
  // Tasks
  getTasks: (params?: any) => api.get('/tasks', { params }),
  getTask: (id: string) => api.get(`/tasks/${id}`),
  createTask: (data: any) => api.post('/tasks', data),
  updateTask: (id: string, data: any) => api.put(`/tasks/${id}`, data),
  deleteTask: (id: string) => api.delete(`/tasks/${id}`),
  
  // Analytics
  getDashboardData: (params?: any) => api.get('/analytics/dashboard', { params }),
  getLeadAnalytics: (params?: any) => api.get('/analytics/leads', { params }),
  getCampaignAnalytics: (params?: any) => api.get('/analytics/campaigns', { params }),
  
  // Campaigns
  getCampaigns: (params?: any) => api.get('/campaigns', { params }),
  getCampaign: (id: string) => api.get(`/campaigns/${id}`),
  createCampaign: (data: any) => api.post('/campaigns', data),
  updateCampaign: (id: string, data: any) => api.put(`/campaigns/${id}`, data),
  deleteCampaign: (id: string) => api.delete(`/campaigns/${id}`),
  
  // Auth
  login: (credentials: { email: string, password: string }) => 
    api.post('/auth/login', credentials),
  register: (userData: any) => 
    api.post('/auth/register', userData),
  forgotPassword: (email: string) => 
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => 
    api.post('/auth/reset-password', { token, password }),
  
  // User
  getCurrentUser: () => api.get('/users/me'),
  updateProfile: (data: any) => api.put('/users/me', data),
  
  // Organizations
  getOrganization: () => api.get('/organizations/current'),
  updateOrganization: (data: any) => api.put('/organizations/current', data),
  
  // Integrations
  getIntegrations: () => api.get('/integrations'),
  connectIntegration: (type: string, credentials: any) => 
    api.post(`/integrations/${type}/connect`, credentials),
  disconnectIntegration: (type: string) => 
    api.delete(`/integrations/${type}`),
  
  // AI Settings
  getAISettings: () => api.get('/ai/settings'),
  updateAISettings: (settings: any) => api.put('/ai/settings', settings),
  
  // Webhooks
  getWebhooks: () => api.get('/webhooks'),
  createWebhook: (data: any) => api.post('/webhooks', data),
  updateWebhook: (id: string, data: any) => api.put(`/webhooks/${id}`, data),
  deleteWebhook: (id: string) => api.delete(`/webhooks/${id}`),
}; // Make sure this closing brace is present
