import axios from 'axios';

export const getBaseApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  return 'https://billing-saas-api.onrender.com';
};

const api = axios.create({
  baseURL: `${getBaseApiUrl()}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 35000,
});

// Attach JWT token from localStorage & update baseURL dynamically
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    config.baseURL = `${getBaseApiUrl()}/api/v1`;
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — attempt token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${getBaseApiUrl()}/api/v1/auth/refresh`, {
          refreshToken,
        });

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;

// ── Typed API helpers ────────────────────────────────────────────────────────

export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
};

export const itemsApi = {
  list: (params?: any) => api.get('/items', { params }),
  get: (id: string) => api.get(`/items/${id}`),
  create: (data: any) => api.post('/items', data),
  update: (id: string, data: any) => api.put(`/items/${id}`, data),
  delete: (id: string) => api.delete(`/items/${id}`),
  lookupBarcode: (barcode: string) => api.get(`/items/barcode/${barcode}`),
  restock: (id: string, data: any) => api.post(`/items/${id}/restock`, data),
  planUsage: () => api.get('/items/plan-usage'),
};

export const billingApi = {
  createBill: (data: any) => api.post('/billing', data),
  create: (data: any) => api.post('/billing', data),
  list: (params?: any) => api.get('/billing', { params }),
  get: (id: string) => api.get(`/billing/${id}`),
  getPublic: (id: string) => axios.get(`${getBaseApiUrl()}/api/v1/billing/public/${id}`),
  holdBill: (data: any) => api.post('/billing/hold', data),
  hold: (data: any) => api.post('/billing/hold', data),
  getHeld: () => api.get('/billing/held/list'),
  resumeHeld: (holdId: string) => api.post(`/billing/held/${holdId}/resume`),
  returnBill: (data: any) => api.post('/billing/return', data),
};

export const customersApi = {
  list: (params?: any) => api.get('/customers', { params }),
  get: (id: string) => api.get(`/customers/${id}`),
  lookupByPhone: (phone: string) => api.get(`/customers/phone/${phone}`),
  getByPhone: (phone: string) => api.get(`/customers/phone/${phone}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
  sales: (params: any) => api.get('/reports/sales', { params }),
  bestSellers: (params: any) => api.get('/reports/best-sellers', { params }),
  lowStock: () => api.get('/reports/low-stock'),
  taxReport: (params: any) => api.get('/reports/tax', { params }),
  stockMovement: (params?: any) => api.get('/reports/stock-movement', { params }),
};

export const categoriesApi = {
  list: () => api.get('/categories'),
  create: (data: any) => api.post('/categories', data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

export const suppliersApi = {
  list: () => api.get('/suppliers'),
  get: (id: string) => api.get(`/suppliers/${id}`),
  create: (data: any) => api.post('/suppliers', data),
  update: (id: string, data: any) => api.put(`/suppliers/${id}`, data),
  delete: (id: string) => api.delete(`/suppliers/${id}`),
  createPo: (data: any) => api.post('/suppliers/purchase-orders', data),
  listPos: () => api.get('/suppliers/purchase-orders/list'),
  getPo: (id: string) => api.get(`/suppliers/purchase-orders/${id}`),
  receivePo: (id: string) => api.post(`/suppliers/purchase-orders/${id}/receive`),
};

export const stockApi = {
  adjust: (data: any) => api.post('/stock/adjust', data),
  transactions: (params?: any) => api.get('/stock/transactions', { params }),
};

export const usersApi = {
  getStaff: () => api.get('/users/staff'),
  createStaff: (data: any) => api.post('/users/staff', data),
  updateStaff: (id: string, data: any) => api.put(`/users/staff/${id}`, data),
  removeStaff: (id: string) => api.delete(`/users/staff/${id}`),
};

export const tenantsApi = {
  getProfile: () => api.get('/tenants/profile'),
  getSettings: () => api.get('/tenants/settings'),
  updateSettings: (data: any) => api.put('/tenants/settings', data),
};

export const subscriptionsApi = {
  current: () => api.get('/subscriptions/current'),
  createOrder: (data: any) => api.post('/subscriptions/create-order', data),
  verify: (data: any) => api.post('/subscriptions/verify', data),
};

export const notificationsApi = {
  getLogs: (params?: any) => api.get('/notifications/logs', { params }),
};

export const superAdminApi = {
  getMetrics: () => api.get('/superadmin/metrics'),
  getTenants: (params?: any) => api.get('/superadmin/tenants', { params }),
  createTenant: (data: any) => api.post('/superadmin/tenants', data),
  overridePlan: (id: string, data: any) => api.put(`/superadmin/tenants/${id}/plan`, data),
  toggleStatus: (id: string, data: any) => api.put(`/superadmin/tenants/${id}/status`, data),
  deleteTenant: (id: string) => api.delete(`/superadmin/tenants/${id}`),
};
