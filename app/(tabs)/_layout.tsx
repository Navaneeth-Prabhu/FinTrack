import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { ArrowRightLeft, Bolt, ChartPie, LayoutPanelLeft, TrendingUp } from 'lucide-react-native';

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        animation: 'none',
        lazy: true,
        tabBarActiveTintColor: colors.primary,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingTop: Platform.OS === 'ios' ? 10 : 10,
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <LayoutPanelLeft color={color} />,
          headerTitle: '',
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: 'Transactions',
          headerShown: false,
          headerStyle: {
            backgroundColor: colors.background,
          },
          tabBarIcon: ({ color }) => <ArrowRightLeft color={color} />,
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Budgets',
          tabBarIcon: ({ color }) => <ChartPie color={color} />,
        }}
      />
      <Tabs.Screen
        name="investments"
        options={{
          title: 'Investments',
          tabBarIcon: ({ color }) => <TrendingUp color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Bolt color={color} />,
        }}
      />
    </Tabs>
  );
}
