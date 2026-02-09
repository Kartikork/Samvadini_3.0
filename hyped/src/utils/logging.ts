import { env } from '../config/env';

export const log = (...args: any[]): void => {
  if (env.ENABLE_LOGGING) {
    console.log(...args);
  }
};

export const warn = (...args: any[]): void => {
  if (env.ENABLE_LOGGING) {
    console.warn(...args);
  }
};

export const error = (...args: any[]): void => {
  console.error(...args);
};


