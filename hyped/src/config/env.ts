export type Environment = 'development' | 'staging' | 'production';

// Current environment - change this based on build
// For APK testing, use staging environment
// For production release, change to: const ENV: Environment = __DEV__ ? 'development' : 'production';
const ENV: Environment = (__DEV__ ? 'development' : 'staging') as Environment;
// const ENV: Environment = 'production'; // Uncomment for production APK

interface EnvConfig {
  API_BASE_URL: string;
  SOCKET_URL: string;
  CALL_SOCKET_URL: string;
  ENABLE_LOGGING: boolean;
  REQUEST_TIMEOUT: number;
  APP_NAME: string;
  SAS_KEY: string;
}

const envConfigs: Record<Environment, EnvConfig> = {
  development: {
    API_BASE_URL: 'https://qasamvadini.aicte-india.org/api', // Local development server
    SOCKET_URL: 'wss://qasamvadini.aicte-india.org/socket',
    // Socket.IO call signaling server (HTTP is fine, Socket.IO handles protocol upgrade)
    // Make sure the server is accessible and port 8000 is open
    CALL_SOCKET_URL: 'http://74.225.150.128:8000',
    // API_BASE_URL: 'http://192.168.31.13:4000/api', // Local development server
    // SOCKET_URL: 'ws://192.168.31.13:4000/socket',
    ENABLE_LOGGING: true,
    REQUEST_TIMEOUT: 30000,
    APP_NAME: 'Hyped Dev',
    SAS_KEY: '?sp=racwdl&st=2025-12-02T09:15:41Z&se=2026-03-20T17:30:41Z&spr=https&sv=2024-11-04&sr=c&sig=S8%2Bu1KJqnlz%2FtkdU4qkxguFZg8xK5vY3YuRzr02alQ8%3D',
  },  
  staging: {
    API_BASE_URL: 'https://qasamvadini.aicte-india.org/api',
    SOCKET_URL: 'wss://qasamvadini.aicte-india.org/socket',
    // Socket.IO call signaling server (HTTP is fine, Socket.IO handles protocol upgrade)
    // Make sure the server is accessible and port 8000 is open
    CALL_SOCKET_URL: 'http://74.225.150.128:8000',
    ENABLE_LOGGING: true,
    REQUEST_TIMEOUT: 30000,
    APP_NAME: 'Hyped Staging',
    SAS_KEY: '?sp=racwdl&st=2025-12-02T09:15:41Z&se=2026-03-20T17:30:41Z&spr=https&sv=2024-11-04&sr=c&sig=S8%2Bu1KJqnlz%2FtkdU4qkxguFZg8xK5vY3YuRzr02alQ8%3D',
  },
  production: {
    API_BASE_URL: 'https://qasamvadini.aicte-india.org/api',
    SOCKET_URL: 'wss://qasamvadini.aicte-india.org/socket',
    // Socket.IO call signaling server (HTTP is fine, Socket.IO handles protocol upgrade)
    // Make sure the server is accessible and port 8000 is open
    CALL_SOCKET_URL: 'http://74.225.150.128:8000',
    ENABLE_LOGGING: false,
    REQUEST_TIMEOUT: 30000,
    APP_NAME: 'Hyped',
    SAS_KEY: '?sp=racwdl&st=2025-12-02T09:15:41Z&se=2026-03-20T17:30:41Z&spr=https&sv=2024-11-04&sr=c&sig=S8%2Bu1KJqnlz%2FtkdU4qkxguFZg8xK5vY3YuRzr02alQ8%3D',
  },
};

export const env = envConfigs[ENV];
export const currentEnv = ENV;
export const isDev = ENV === 'development';
export const isStaging = ENV === 'staging';
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



