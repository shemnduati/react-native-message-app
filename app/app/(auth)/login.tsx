import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { currentTheme } = useTheme();

  const isDark = currentTheme === 'dark';

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Attempting login with:', { email, password: '***' });
      await login(email, password);
      console.log('Login successful!');
      router.replace('/');
    } catch (error: any) {
      console.error('Login error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      
      let errorMessage = 'An error occurred during login';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Handle Laravel validation errors
        const errors = error.response.data.errors;
        const errorText = Object.keys(errors).map(key => 
          `${key}: ${errors[key].join(', ')}`
        ).join('\n');
        errorMessage = errorText;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          className={isDark ? 'bg-gray-900' : 'bg-white'}
        >
        <View className="flex-1 justify-center px-6 py-12">
          {/* App Icon and Name */}
          <View className="items-center mb-8">
            <Image
              source={require('@/assets/images/icon.png')}
              style={{ width: 80, height: 80, borderRadius: 20 }}
              resizeMode="cover"
            />
            <Text
              className={`text-2xl font-bold mt-4 mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              TechChat
            </Text>
            <Text
              className={`text-center text-base ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              Secure messaging for everyone
            </Text>
          </View>

          {/* Header */}
          <View className="mb-8">
            <Text
              className={`text-2xl font-bold text-center mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Welcome Back
            </Text>
            <Text
              className={`text-center text-base ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              Sign in to your account to continue
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            <View>
              <Text
                className={`text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-200' : 'text-gray-700'
                }`}
              >
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                keyboardType="email-address"
                autoCapitalize="none"
                className={`w-full px-4 py-3 rounded-lg border ${
                  isDark
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
            </View>

            <View>
              <Text
                className={`text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-200' : 'text-gray-700'
                }`}
              >
                Password
              </Text>
              <View className="relative">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                  secureTextEntry={!showPassword}
                  className={`w-full px-4 py-3 pr-12 rounded-lg border ${
                    isDark
                      ? 'bg-gray-800 border-gray-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-0 bottom-0 justify-center"
                >
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color={isDark ? '#9CA3AF' : '#6B7280'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              className={`w-full py-3 rounded-lg mt-6 ${
                isLoading
                  ? 'bg-purple-400'
                  : 'bg-purple-600'
              }`}
            >
              <Text className="text-white text-center font-semibold text-lg">
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign Up Link */}
          <View className="mt-8 flex-row justify-center">
            <Text
              className={`text-base ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              Don't have an account?{' '}
            </Text>
            <Link href="/signup" asChild>
              <TouchableOpacity>
                <Text className="text-purple-600 font-semibold text-base">
                  Sign Up
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Debug: Force Logout Button - Remove in production */}
          {__DEV__ && (
            <TouchableOpacity
              onPress={async () => {
                const { logout } = useAuth();
                await logout();
              }}
              className="mt-4 bg-red-500 py-2 px-4 rounded-lg"
            >
              <Text className="text-white text-center font-semibold">
                Debug: Force Logout
              </Text>
            </TouchableOpacity>
          )}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 