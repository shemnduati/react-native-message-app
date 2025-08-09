import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

// API Base URL - Update this based on your setup
// For iOS Simulator: http://127.0.0.1:8000/api or http://localhost:8000/api
// For Android Emulator: http://10.0.2.2:8000/api or http://YOUR_COMPUTER_IP:8000/api
// For Physical Device: http://YOUR_COMPUTER_IP:8000/api
const API_BASE_URL = __DEV__ 
  ? Platform.OS === 'ios' 
    ? 'http://127.0.0.1:8000/api'  // iOS Simulator
    : 'http://192.168.100.16:8000/api'   // Android Emulator - Using your computer's IP
  : 'https://your-production-api.com/api'; // Change this for production

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000, // 10 second timeout
  transformResponse: [function (data) {
    // Ensure proper JSON parsing
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return parsed;
      } catch (e) {
        console.error('TransformResponse - Parse error:', e);
        console.error('TransformResponse - Raw data length:', data.length);
        console.error('TransformResponse - Raw data preview:', data.substring(0, 200) + '...');
        console.error('TransformResponse - Raw data end:', data.substring(Math.max(0, data.length - 100)));
        
        // Try to fix common truncation issues
        if (data.includes('[') && !data.endsWith(']')) {
          console.log('Attempting to fix truncated JSON array...');
          try {
            const fixedData = data + ']';
            const parsed = JSON.parse(fixedData);
            console.log('Successfully parsed fixed JSON array');
            return parsed;
          } catch (fixError) {
            console.error('Failed to parse fixed JSON array:', fixError);
          }
        }
        
        if (data.includes('{') && !data.endsWith('}')) {
          console.log('Attempting to fix truncated JSON object...');
          try {
            const fixedData = data + '}';
            const parsed = JSON.parse(fixedData);
            console.log('Successfully parsed fixed JSON object');
            return parsed;
          } catch (fixError) {
            console.error('Failed to parse fixed JSON object:', fixError);
          }
        }
        
        return data;
      }
    }
    return data;
  }],
});

// API Base URL configured

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors and JSON parsing
api.interceptors.response.use(
  (response) => {
    // Handle case where response.data is a JSON string instead of parsed object
    if (typeof response.data === 'string') {
      try {
        response.data = JSON.parse(response.data);
      } catch (parseError) {
        console.warn('Response interceptor - Failed to parse JSON string:', parseError);
        console.warn('Response interceptor - Raw data length:', response.data.length);
        console.warn('Response interceptor - Raw data preview:', response.data.substring(0, 200) + '...');
        
        // Try to fix common truncation issues
        if (response.data.includes('[') && !response.data.endsWith(']')) {
          console.log('Response interceptor - Attempting to fix truncated JSON array...');
          try {
            const fixedData = response.data + ']';
            response.data = JSON.parse(fixedData);
            console.log('Response interceptor - Successfully parsed fixed JSON array');
          } catch (fixError) {
            console.error('Response interceptor - Failed to parse fixed JSON array:', fixError);
          }
        }
        
        if (response.data.includes('{') && !response.data.endsWith('}')) {
          console.log('Response interceptor - Attempting to fix truncated JSON object...');
          try {
            const fixedData = response.data + '}';
            response.data = JSON.parse(fixedData);
            console.log('Response interceptor - Successfully parsed fixed JSON object');
          } catch (fixError) {
            console.error('Response interceptor - Failed to parse fixed JSON object:', fixError);
          }
        }
      }
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      await SecureStore.deleteItemAsync('auth_token');
      router.replace('/(auth)/login');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/login', { email, password }),
  
  register: (name: string, email: string, password: string, password_confirmation: string) =>
    api.post('/register', { name, email, password, password_confirmation }),
  
  logout: () => api.post('/logout'),
  
  getProfile: () => api.get('/user'),
  
  updateProfile: (data: any) => api.put('/user', data),
  
  registerFcmToken: (fcmToken: string) => api.post('/user/fcm-token', { fcm_token: fcmToken }),
  
  uploadAvatar: (formData: FormData) => api.post('/user/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 300000, // 5 minute timeout for file uploads
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log('Upload progress:', percentCompleted + '%');
      }
    },
  }),
};

// Messages API
export const messagesAPI = {
  getByUser: (userId: number) => api.get(`/messages/user/${userId}`),
  
  getByGroup: (groupId: number) => api.get(`/messages/group/${groupId}`),
  
  loadOlder: (messageId: number) => api.get(`/messages/${messageId}/older`),
  
  sendMessage: (data: FormData | {
    message?: string;
    receiver_id?: number;
    group_id?: number;
    reply_to_id?: number;
    attachments?: any[];
  }, config?: any) => {
    // If data is FormData, send it directly with multipart headers
    if (data instanceof FormData) {
      return api.post('/messages', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        ...config
      });
    }
    // Otherwise, send as regular JSON
    return api.post('/messages', data, config);
  },
  
  deleteMessage: (messageId: number) => api.delete(`/messages/${messageId}`),
};

// Conversations API
export const conversationsAPI = {
  getAll: () => api.get('/conversations'),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
};

// Groups API
export const groupsAPI = {
  getAll: () => api.get('/groups'),
  
  create: (data: { name: string; description?: string; user_ids: number[] }) =>
    api.post('/groups', data),
  
  update: (groupId: number, data: { name?: string; description?: string }) =>
    api.put(`/groups/${groupId}`, data),
  
  delete: (groupId: number) => api.delete(`/groups/${groupId}`),
};

export default api; 