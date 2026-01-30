/**
 * API Configuration and Connection Helper
 * 
 * Provides centralized API connection utilities for the application.
 * Uses environment configuration for base URLs.
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { env } from '../../config/env';
import { store } from '../../state/store';

// Types
interface ApiHeaders {
  'Content-Type'?: string;
  Authorization?: string;
  [key: string]: string | undefined;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

/**
 * Creates an authenticated axios connection
 * 
 * @param method - HTTP method (get, post, put, delete, etc.)
 * @param url - API endpoint (relative to base URL)
 * @param data - Request body data
 * @param headers - Additional headers
 * @returns Promise with API response
 */
export const axiosConn = async <T = any>(
  method: string,
  url: string,
  data?: any,
  headers: ApiHeaders = { 'Content-Type': 'application/json' }
): Promise<AxiosResponse<T>> => {
  // Get auth token from Redux store
  const state = store.getState();
  const authToken = state.auth?.token;

  // Set authorization header if token exists
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const config: AxiosRequestConfig = {
    url: `${env.API_BASE_URL}/${url}`,
    method: method,
    data: data,
    headers: headers as Record<string, string>,
    timeout: env.REQUEST_TIMEOUT,
  };

  try {
    const response = await axios(config);
    return response;
  } catch (error: any) {
    if (env.ENABLE_LOGGING) {
      console.error('[API Error]', {
        url: config.url,
        method,
        status: error?.response?.status,
        message: error?.message,
      });
    }
    throw error;
  }
};

/**
 * API endpoints used in the application
 */
export const API_ENDPOINTS = {
  // Chat sync endpoints
  SYNC_CHAT_LIST: 'chat/sync-live-to-local',
  SYNC_CHAT_MESSAGES: 'chat/sync-chat-messages-live-to-local',
  SYNC_GROUP_MESSAGES: 'chat/sync-group-messages-live-to-local',
  UPDATE_CHAT_REQUEST: 'chat/update-chat-request',
  
  // User endpoints
  GET_USER_PROFILE: 'user/profile',
  UPDATE_USER_PROFILE: 'user/profile/update',
  
  // Contact endpoints
  SYNC_CONTACTS: 'contacts/sync',
} as const;

export default {
  axiosConn,
  API_ENDPOINTS,
};

