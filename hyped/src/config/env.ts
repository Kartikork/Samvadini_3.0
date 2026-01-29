/**
 * Environment Configuration
 * 
 * Centralized environment variables for the application.
 * In production, these should be loaded from environment-specific files
 * or build configuration.
 */

export type Environment = 'development' | 'staging' | 'production';

// Current environment - change this based on build
// To use staging, set ENV manually: const ENV: Environment = 'staging';
const ENV: Environment = __DEV__ ? 'development' : 'production';

interface EnvConfig {
  API_BASE_URL: string;
  SOCKET_URL: string;
  ENABLE_LOGGING: boolean;
  REQUEST_TIMEOUT: number;
  APP_NAME: string;
}

const envConfigs: Record<Environment, EnvConfig> = {
  development: {
    API_BASE_URL: 'https://qasamvadini.aicte-india.org/api', // Local development server
    SOCKET_URL: 'https://qasamvadini.aicte-india.org/socket',
    ENABLE_LOGGING: true,
    REQUEST_TIMEOUT: 30000,
    APP_NAME: 'Hyped Dev',
  },
  staging: {
    API_BASE_URL: 'https://staging-api.hyped.com/api/v1',
    SOCKET_URL: 'wss://staging-api.hyped.com',
    ENABLE_LOGGING: true,
    REQUEST_TIMEOUT: 30000,
    APP_NAME: 'Hyped Staging',
  },
  production: {
    API_BASE_URL: 'https://api.hyped.com/api/v1',
    SOCKET_URL: 'wss://api.hyped.com',
    ENABLE_LOGGING: false,
    REQUEST_TIMEOUT: 30000,
    APP_NAME: 'Hyped',
  },
};

export const env = envConfigs[ENV];
export const currentEnv = ENV;
export const isDev = ENV === 'development';
export const isStaging = (ENV as Environment) === 'staging';
export const isProd = ENV === 'production';

