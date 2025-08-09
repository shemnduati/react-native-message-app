import { Stack } from "expo-router";
import { useTheme } from "@/context/ThemeContext";

export default function ChatLayout() {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
        headerStyle: {
          backgroundColor: isDark ? '#1F2937' : '#8B5CF6',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="user/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="group/[id]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
} 