import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .catch((error) => {
        window.dispatchEvent(new CustomEvent('trusthire:session-expired'));
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (!originalRequest || originalRequest._retry || status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await refreshSession();
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);

export function getApiError(error, fallback = 'Something went wrong') {
  const data = error?.response?.data;
  // Backend returns { error: { message, stack } } or { error: "string" } or { detail: "string" }
  if (data?.error) {
    return typeof data.error === 'string' ? data.error : data.error.message || fallback;
  }
  if (data?.detail) return String(data.detail);
  if (data?.message) return String(data.message);
  return error?.message || fallback;
}

export default api;
