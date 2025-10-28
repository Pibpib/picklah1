import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Feather from '@expo/vector-icons/Feather';
import { default as FontAwesome5, default as Images } from '@expo/vector-icons/FontAwesome5';
import Setting from '@expo/vector-icons/Ionicons';



export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.text,
        tabBarActiveBackgroundColor: theme.mainlight, 
        tabBarStyle: {
          height:50,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Spin',
          tabBarIcon: ({ color }) => <FontAwesome5 size={28} name="fan" color={color} />,
        }}
      />
      <Tabs.Screen
        name="manage/index"
        options={{
          title: 'Manage',
          tabBarIcon: ({ color }) => <Feather size={28} name="edit" color={color} />,
        }}
      />
      <Tabs.Screen
  name="user"              
  options={{
    title: 'Settings',
    tabBarIcon: ({ color, size }) => (<Setting name="settings" color={color} size={size ?? 24} /> ), }}
/>
<Tabs.Screen name="memories" 
options={{
    title: 'Memories',
    tabBarIcon: ({ color, size }) => (<Images name="Memories" color={color} size={size ?? 24} /> ), }} />

    </Tabs>
    
  );
}
