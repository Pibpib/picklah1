import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Colors } from '@/constants/theme';

// Icons
import Feather from '@expo/vector-icons/Feather';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const ActiveBubble = ({ children }: { children?: React.ReactNode }) => (
    <View
      style={{
        marginBottom: 8,
        width: 56,
        height: 32,
        padding: 2,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.mainlight,
      }}
    >
      {children}
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.text,
        tabBarStyle: {
          height: 80,
          paddingTop: 8,
          paddingBottom: 20,
          paddingHorizontal: 16,
        },
        headerShown: false,
      }}
    >
      {/* SPIN */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Spin',
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <ActiveBubble>
                <FontAwesome5 name="fan" size={24} color={color} />
              </ActiveBubble>
            ) : (
              <FontAwesome5 name="fan" size={24} color={color} />
            ),
        }}
      />

      {/* MANAGE */}
      <Tabs.Screen
        name="manage"
        options={{
          title: 'Manage',
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <ActiveBubble>
                <Feather name="edit" size={24} color={color} />
              </ActiveBubble>
            ) : (
              <Feather name="edit" size={24} color={color} />
            ),
        }}
      />

      {/* MEMORIES */}
      <Tabs.Screen
        name="memories"
        options={{
          title: 'Memories',
          tabBarIcon: ({ color, focused, size }) =>
            focused ? (
              <ActiveBubble>
                <FontAwesome5 name="images" size={24} color={color} />
              </ActiveBubble>
            ) : (
              <FontAwesome5 name="images" size={24} color={color} />
            ),
        }}
      />

      {/* GAME */}
      <Tabs.Screen
        name="game"
        options={{
          title: 'Game',
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <ActiveBubble>
                <Ionicons name="game-controller-outline" size={24} color={color} />
              </ActiveBubble>
            ) : (
              <Ionicons name="game-controller-outline" size={24} color={color} />
            ),
        }}
      />

      {/* SETTINGS */}
      <Tabs.Screen
        name="user"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused, size }) =>
            focused ? (
              <ActiveBubble>
                <Ionicons name="settings" size={24} color={color} />
              </ActiveBubble>
            ) : (
              <Ionicons name="settings" size={24} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}
