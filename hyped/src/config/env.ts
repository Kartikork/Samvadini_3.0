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
  SAS_KEY: string;
}

const envConfigs: Record<Environment, EnvConfig> = {
  development: {
    API_BASE_URL: 'https://samvadiniprod.aicte-india.org/api', // Local development server
    SOCKET_URL: 'wss://qasamvadini.aicte-india.org/socket',
    // API_BASE_URL: 'http://192.168.0.104:4000/api', // Local development server
    // SOCKET_URL: 'ws://192.168.0.104:4000/socket',
    ENABLE_LOGGING: true,
    REQUEST_TIMEOUT: 30000,
    APP_NAME: 'Hyped Dev',
    SAS_KEY: '?sp=racwdl&st=2025-12-02T09:15:41Z&se=2026-03-20T17:30:41Z&spr=https&sv=2024-11-04&sr=c&sig=S8%2Bu1KJqnlz%2FtkdU4qkxguFZg8xK5vY3YuRzr02alQ8%3D',
  },  
  staging: {
    API_BASE_URL: 'https://staging-api.hyped.com/api/v1',
    SOCKET_URL: 'wss://staging-api.hyped.com',
    ENABLE_LOGGING: true,
    REQUEST_TIMEOUT: 30000,
    APP_NAME: 'Hyped Staging',
    SAS_KEY: 'sp=r&st=2025-01-21T06:42:11Z&se=2025-07-01T14:42:11Z&spr=https&sv=2022-11-02&sr=c&sig=kcxKjDWoBFKHGr0p3wauAghAlov4Y0OfJND4WgDX7cM%3D',
  },
  production: {
    API_BASE_URL: 'https://api.hyped.com/api/v1',
    SOCKET_URL: 'wss://api.hyped.com',
    ENABLE_LOGGING: false,
    REQUEST_TIMEOUT: 30000,
    APP_NAME: 'Hyped',
    SAS_KEY: 'sp=r&st=2025-01-21T06:42:11Z&se=2025-07-01T14:42:11Z&spr=https&sv=2022-11-02&sr=c&sig=kcxKjDWoBFKHGr0p3wauAghAlov4Y0OfJND4WgDX7cM%3D',
  },
};

export const env = envConfigs[ENV];
export const currentEnv = ENV;
export const isDev = ENV === 'development';
export const isStaging = (ENV as Environment) === 'staging';
export const isProd = ENV === 'production';

/**
 * Append SAS key to Azure Blob Storage URLs
 * @param url - The image/file URL
 * @returns URL with SAS key appended
 */
export const getImageUrlWithSas = (url: string | undefined | null): string | null => {
  if (!url) return null;
  
  // Skip if it's not an Azure Blob URL or already has SAS key
  if (!url.includes('blob.core.windows.net') && !url.includes('aicte-india.org')) {
    return url;
  }
  
  // Skip if URL already has query params (might already have SAS)
  if (url.includes('?')) {
    return url;
  }
  
  return `${url}?${env.SAS_KEY}`;
};



