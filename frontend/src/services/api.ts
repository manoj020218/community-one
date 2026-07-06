import axios, { AxiosInstance, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const BASE_URL = '/api';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          useAuthStore.getState().setTokens(data.data.accessToken, refreshToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        }
      } catch {
        useAuthStore.getState().logout();
      }
    }

    const message = error.response?.data?.error?.message || 'An error occurred';
    if (error.response?.status !== 401) toast.error(message);

    return Promise.reject(error);
  }
);

export async function extractData<T>(responsePromise: Promise<AxiosResponse<{ success: boolean; data: T }>>): Promise<T> {
  const response = await responsePromise;
  return response.data.data as T;
}
