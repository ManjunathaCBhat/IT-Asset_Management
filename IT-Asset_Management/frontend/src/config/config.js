// Centralized Configuration File
// This file manages all environment-specific configurations

const config = {
  // API Configuration - allow override from environment for local development
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'https://it-asset-management-804186663775.europe-west1.run.app',
  
  // Environment Detection
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  
  // Feature Flags
  DEBUG_MODE: process.env.NODE_ENV === 'development',
  
  // Application Settings
  APP_NAME: 'IT Asset Management System',
  VERSION: '1.0.0',
  
  // API Endpoints (relative paths)
  ENDPOINTS: {
    LOGIN: '/api/users/login',
    EQUIPMENT: '/api/equipment',
    EQUIPMENT_COUNT: '/api/equipment/count',
    EQUIPMENT_REMOVED: '/api/equipment/removed',
    USERS: '/api/users',
    FORGOT_PASSWORD: '/api/forgot-password',
    RESET_PASSWORD: '/api/reset-password',
  },
  
  // Default Settings
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: ['10', '20', '50', '100']
  },
  
  // Validation Rules
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 6,
    MAX_SERIAL_NUMBER_LENGTH: 50,
    MIN_SERIAL_NUMBER_LENGTH: 5,
    PHONE_PATTERN: /^[0-9]{10,15}$/,
    NAME_PATTERN: /^[a-zA-Z\s]+$/
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint = '') => {
  return `${config.API_BASE_URL}${endpoint}`;
};

// Helper function to get specific endpoint URL
export const getEndpointUrl = (endpointKey) => {
  return getApiUrl(config.ENDPOINTS[endpointKey] || '');
};

// Debug helper (only logs in development)
export const debugLog = (message, data = null) => {
  if (config.DEBUG_MODE) {
    console.log(`[${config.APP_NAME}] ${message}`, data || '');
  }
};

export default config;