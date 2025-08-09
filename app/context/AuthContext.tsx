import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '@/services/api';
import { router } from 'expo-router';

interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  avatar_url?: string;
  is_admin?: boolean; // 1 for admin, 0 for regular user
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, password_confirmation: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      console.log('AuthContext: Checking auth, token exists:', !!token);
      if (token) {
        const response = await authAPI.getProfile();
        console.log('AuthContext: Profile response:', response.data);
        setUser(response.data.data);
        console.log('AuthContext: User set successfully');
      } else {
        console.log('AuthContext: No token found, user not authenticated');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await SecureStore.deleteItemAsync('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      const { user: userData, token } = response.data;
      
      await SecureStore.setItemAsync('auth_token', token);
      setUser(userData);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, password_confirmation: string) => {
    try {
      console.log('AuthContext: Starting registration...');
      const response = await authAPI.register(name, email, password, password_confirmation);
      console.log('AuthContext: Registration response:', response.data);
      
      const { user: userData, token } = response.data;
      
      console.log('AuthContext: Setting token and user...');
      await SecureStore.setItemAsync('auth_token', token);
      setUser(userData);
      console.log('AuthContext: Registration completed successfully');
    } catch (error) {
      console.error('AuthContext: Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Try to call the logout API, but don't fail if it doesn't work
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Don't throw the error - we still want to logout locally
    } finally {
      // Always clear local auth state regardless of API call success
      await SecureStore.deleteItemAsync('auth_token');
      setUser(null);
      // Don't navigate here - let the AppLayout handle the navigation
      // The AppLayout will automatically show the auth screens when isAuthenticated becomes false
    }
  };

  const refreshUser = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        const response = await authAPI.getProfile();
        setUser(response.data.data);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    checkAuth,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 