import axios, { AxiosError } from 'axios';
import type { AuthResponse, ApiErrorResponse } from '../types';

const BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

const getBaseUrl = () => (import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || ''));

async function refreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const { data } = await axios.post<AuthResponse>(`${getBaseUrl()}/api/auth/refresh`, {}, { withCredentials: true });
      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/2fa/complete-login'];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config;
    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }
    const url = originalRequest.url ?? '';
    const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) => url.includes(ep));
    if (error.response?.status === 401 && !isAuthEndpoint) {
      originalRequest._retry = true;
      const newToken = await refreshToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}
