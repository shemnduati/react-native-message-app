import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';
import { authAPI } from '@/services/api';
import * as SecureStore from 'expo-secure-store';

export default function ApiTest() {
  const { currentTheme } = useTheme();
  const { expoPushToken, getExpoPushToken } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string>('');

  const isDark = currentTheme === 'dark';

  const runTest = async (testName: string, testFunction: () => Promise<any>) => {
    setIsLoading(true);
    setTestResults(prev => prev + `\n\n--- ${testName} ---\n`);
    
    try {
      const result = await testFunction();
      setTestResults(prev => prev + `✅ Success: ${JSON.stringify(result, null, 2)}\n`);
    } catch (error) {
      setTestResults(prev => prev + `❌ Error: ${error}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  const testApiConnection = async () => {
    const testUrl = Platform.OS === 'ios' 
      ? 'http://127.0.0.1:8000/api/test' 
      : 'http://192.168.100.16:8000/api/test';
    const response = await fetch(testUrl);
    return await response.json();
  };

  const testUserProfile = async () => {
    const testUrl = Platform.OS === 'ios' 
      ? 'http://127.0.0.1:8000/api/user' 
      : 'http://192.168.100.16:8000/api/user';
    
    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) {
      throw new Error('No auth token found. Please login first.');
    }
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  };

  const testUserUpdate = async () => {
    const testUrl = Platform.OS === 'ios' 
      ? 'http://127.0.0.1:8000/api/user' 
      : 'http://192.168.100.16:8000/api/user';
    
    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) {
      throw new Error('No auth token found. Please login first.');
    }
    
    const response = await fetch(testUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Test User Updated',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  };

  const testAvatarInfo = async () => {
    return {
      message: 'Avatar endpoint requires POST with file upload',
      endpoint: '/api/user/avatar',
      method: 'POST',
      required_fields: ['avatar (file)'],
      file_types: ['jpeg', 'png', 'jpg', 'gif'],
      max_size: '2MB',
      example_usage: 'Use FormData with file upload',
      note: 'This endpoint expects multipart/form-data, not JSON'
    };
  };

  const testAvatarUpload = async () => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) {
      throw new Error('No auth token found. Please login first.');
    }

    const testUrl = Platform.OS === 'ios' 
      ? 'http://127.0.0.1:8000/api/user/avatar' 
      : 'http://192.168.100.16:8000/api/user/avatar';
    
    // Create a mock file for testing (1x1 pixel JPEG)
    const formData = new FormData();
    formData.append('avatar', {
      uri: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      name: 'test-avatar.jpg',
      type: 'image/jpeg',
    } as any);
    
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return await response.json();
  };

  const testPushNotification = async () => {
    if (!expoPushToken) {
      throw new Error('No Expo push token available. Please get Expo push token first.');
    }

    const testUrl = Platform.OS === 'ios' 
      ? 'http://127.0.0.1:8000/api/test-push' 
      : 'http://192.168.100.16:8000/api/test-push';
    
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fcm_token: expoPushToken, // We still use fcm_token as the parameter name for compatibility
        title: 'Test Notification',
        body: 'This is a test push notification from the app!',
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
        },
      }),
    });

    return await response.json();
  };

  const handleGetExpoPushToken = async () => {
    try {
      const token = await getExpoPushToken();
      if (token) {
        Alert.alert('Expo Push Token', `Token: ${token.substring(0, 50)}...`);
      } else {
        Alert.alert('Error', 'Failed to get Expo push token');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to get Expo push token: ${error}`);
    }
  };

  return (
    <ScrollView className={`flex-1 p-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <Text
        className={`text-2xl font-bold mb-6 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}
      >
        API Test
      </Text>

      {/* Expo Push Token Section */}
      <View className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <Text className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-black'}`}>
          Expo Push Token
        </Text>
        <Text className={`text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Current Token: {expoPushToken ? `${expoPushToken.substring(0, 50)}...` : 'Not available'}
        </Text>
        <TouchableOpacity
          onPress={handleGetExpoPushToken}
          className="bg-blue-500 p-3 rounded-lg mb-2"
        >
          <Text className="text-white text-center font-semibold">Get Expo Push Token</Text>
        </TouchableOpacity>
      </View>

      {/* Test Buttons */}
      <View className="space-y-4">
        <TouchableOpacity
          onPress={() => runTest('API Connection', testApiConnection)}
          disabled={isLoading}
          className={`p-4 rounded-lg ${
            isLoading ? 'bg-gray-400' : 'bg-green-500'
          }`}
        >
          <Text className="text-white text-center font-semibold">
            {isLoading ? 'Testing...' : 'Test API Connection'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => runTest('User Profile (GET)', testUserProfile)}
          disabled={isLoading}
          className={`p-4 rounded-lg ${
            isLoading ? 'bg-gray-400' : 'bg-blue-500'
          }`}
        >
          <Text className="text-white text-center font-semibold">
            {isLoading ? 'Testing...' : 'Test User Profile (GET)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => runTest('User Update (PUT)', testUserUpdate)}
          disabled={isLoading}
          className={`p-4 rounded-lg ${
            isLoading ? 'bg-gray-400' : 'bg-orange-500'
          }`}
        >
          <Text className="text-white text-center font-semibold">
            {isLoading ? 'Testing...' : 'Test User Update (PUT)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => runTest('Avatar Upload Info', testAvatarInfo)}
          disabled={isLoading}
          className={`p-4 rounded-lg ${
            isLoading ? 'bg-gray-400' : 'bg-yellow-500'
          }`}
        >
          <Text className="text-white text-center font-semibold">
            {isLoading ? 'Testing...' : 'Test Avatar Upload Info'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => runTest('Avatar Upload Test', testAvatarUpload)}
          disabled={isLoading}
          className={`p-4 rounded-lg ${
            isLoading ? 'bg-gray-400' : 'bg-red-500'
          }`}
        >
          <Text className="text-white text-center font-semibold">
            {isLoading ? 'Testing...' : 'Test Avatar Upload'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => runTest('Push Notification', testPushNotification)}
          disabled={isLoading || !expoPushToken}
          className={`p-4 rounded-lg ${
            isLoading || !expoPushToken ? 'bg-gray-400' : 'bg-purple-500'
          }`}
        >
          <Text className="text-white text-center font-semibold">
            {isLoading ? 'Testing...' : 'Test Push Notification'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {testResults ? (
        <View className="mt-6 p-4 bg-gray-100 rounded-lg">
          <Text className="text-sm font-mono text-gray-800">
            {testResults}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
} 