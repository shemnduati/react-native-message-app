import { Tabs, Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { StatusBar } from "expo-status-bar";
import { AppState, View, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import "../global.css"
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { NotificationBadge } from "@/components/NotificationBadge";
import { useNotifications } from "@/context/NotificationContext";

function AppTabsLayout() {
  const { currentTheme } = useTheme();
  const { unreadCount, resetAllCounts } = useNotifications();
  const isDark = currentTheme === 'dark';

  // Handle app state changes for badge management
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App came to foreground - clear badge count
        resetAllCounts();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [resetAllCounts]);

  return (
    <>
      <StatusBar 
        style={isDark ? 'light' : 'dark'} 
        backgroundColor={isDark ? '#111827' : '#FFFFFF'} 
      />
      <Tabs
        screenOptions={{
          headerShown: false, // Hide all headers
          tabBarStyle: {
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderTopColor: isDark ? '#374151' : '#E5E7EB',
          },
          tabBarActiveTintColor: '#8B5CF6',
          tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#6B7280',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Messages",
            tabBarIcon: ({ color, size }) => (
              <View style={{ position: 'relative', width: size, height: size }}>
                <MaterialCommunityIcons name="chat-outline" size={size} color={color} />
                <NotificationBadge size="small" />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="groups"
          options={{
            title: "Groups",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-group" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="users"
          options={{
            title: "Users",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-plus" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="(auth)"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="create-group"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="group-info"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="api-test"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>
    </>
  );
}

function AuthLayout() {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';

  return (
    <>
      <StatusBar 
        style={isDark ? 'light' : 'dark'} 
        backgroundColor={isDark ? '#111827' : '#FFFFFF'} 
      />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/signup" />
      </Stack>
    </>
  );
}

function AppLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';

  console.log('AppLayout: isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', user?.name);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View className={`flex-1 justify-center items-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  // Show auth screens if not authenticated
  if (!isAuthenticated) {
    console.log('AppLayout: Showing auth screens');
    return <AuthLayout />;
  }

  // Show main app if authenticated
  console.log('AppLayout: Showing main app');
  return <AppTabsLayout />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          <AppLayout />
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
