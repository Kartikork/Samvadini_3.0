/**
 * Axios Instance
 * 
 * Configured axios instance with interceptors for:
 * - Authentication token injection
 * - Request/Response logging
 * - Error handling
 * - Token refresh logic
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiConfig, HTTP_STATUS, API_ERRORS } from '../config/api.config';
import { STORAGE_KEYS } from '../config/constants';
import { env, isDev } from '../config/env';

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: apiConfig.headers,
  withCredentials: apiConfig.withCredentials,
});

// Flag to prevent multiple token refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: AxiosError) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// ─────────────────────────────────────────────────────────────
// REQUEST INTERCEPTOR
// ─────────────────────────────────────────────────────────────

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Get auth token from storage
    const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (isDev && env.ENABLE_LOGGING) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        data: config.data,
        params: config.params,
      });
    }

    return config;
  },
  (error: AxiosError) => {
    if (isDev && env.ENABLE_LOGGING) {
      console.error('[API Request Error]', error);
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────
// RESPONSE INTERCEPTOR
// ─────────────────────────────────────────────────────────────

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (isDev && env.ENABLE_LOGGING) {
      console.log(`[API Response] ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Log error in development
    if (isDev && env.ENABLE_LOGGING) {
      console.error('[API Error]', {
        url: originalRequest?.url,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
    }

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
      if (isRefreshing) {
        // Wait for token refresh
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh token endpoint
        const response = await axios.post(`${apiConfig.baseURL}/auth/refresh`, {
          refreshToken,
        });

        const { token: newToken, refreshToken: newRefreshToken } = response.data;

        // Store new tokens
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
        if (newRefreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
        }

        // Process queued requests
        processQueue(null, newToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);

        // Clear tokens and redirect to login
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.AUTH_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.USER_DATA,
        ]);

        // TODO: Navigate to login screen
        // navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Transform error to user-friendly message
    const transformedError = transformError(error);
    return Promise.reject(transformedError);
  }
);

// ─────────────────────────────────────────────────────────────
// ERROR TRANSFORMER
// ─────────────────────────────────────────────────────────────

interface ApiError extends Error {
  status?: number;
  code?: string;
  data?: any;
}

function transformError(error: AxiosError): ApiError {
  const apiError: ApiError = new Error();

  if (!error.response) {
    // Network error or timeout
    if (error.code === 'ECONNABORTED') {
      apiError.message = API_ERRORS.TIMEOUT_ERROR;
    } else {
      apiError.message = API_ERRORS.NETWORK_ERROR;
    }
    return apiError;
  }

  const { status, data } = error.response;
  apiError.status = status;
  apiError.data = data;

  switch (status) {
    case HTTP_STATUS.BAD_REQUEST:
      apiError.message = (data as any)?.message || API_ERRORS.VALIDATION_ERROR;
      break;
    case HTTP_STATUS.UNAUTHORIZED:
      apiError.message = API_ERRORS.UNAUTHORIZED;
      break;
    case HTTP_STATUS.FORBIDDEN:
      apiError.message = API_ERRORS.FORBIDDEN;
      break;
    case HTTP_STATUS.NOT_FOUND:
      apiError.message = API_ERRORS.NOT_FOUND;
      break;
    case HTTP_STATUS.UNPROCESSABLE_ENTITY:
      apiError.message = (data as any)?.message || API_ERRORS.VALIDATION_ERROR;
      break;
    case HTTP_STATUS.TOO_MANY_REQUESTS:
      apiError.message = 'Too many requests. Please try again later.';
      break;
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
    case HTTP_STATUS.BAD_GATEWAY:
    case HTTP_STATUS.SERVICE_UNAVAILABLE:
      apiError.message = API_ERRORS.SERVER_ERROR;
      break;
    default:
      apiError.message = (data as any)?.message || API_ERRORS.UNKNOWN_ERROR;
  }

  return apiError;
}

export default axiosInstance;

// Export typed request methods
export const api = {
  get: <T>(url: string, config?: InternalAxiosRequestConfig) =>
    axiosInstance.get<T>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: any, config?: InternalAxiosRequestConfig) =>
    axiosInstance.post<T>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: any, config?: InternalAxiosRequestConfig) =>
    axiosInstance.put<T>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: any, config?: InternalAxiosRequestConfig) =>
    axiosInstance.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: InternalAxiosRequestConfig) =>
    axiosInstance.delete<T>(url, config).then((res) => res.data),
};




