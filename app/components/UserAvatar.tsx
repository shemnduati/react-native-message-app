import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface UserAvatarProps {
  avatarUrl?: string | null;
  name: string;
  size?: number;
  style?: any;
}

export default function UserAvatar({ avatarUrl, name, size = 40, style }: UserAvatarProps) {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';

  const getInitials = (userName: string) => {
    return userName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: avatarUrl ? 'transparent' : '#8B5CF6',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...style,
  };

  const textStyle = {
    fontSize: size * 0.4,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  };

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={containerStyle}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={containerStyle}>
      <Text style={textStyle}>{getInitials(name)}</Text>
    </View>
  );
} 