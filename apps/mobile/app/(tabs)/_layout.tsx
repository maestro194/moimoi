import { Tabs } from 'expo-router';
import { LayoutDashboard, History, Star, Gamepad2, Settings, Music2 } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#c084fc',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#111827',
          borderTopColor: '#1f2937',
        },
        headerStyle: {
          backgroundColor: '#111827',
        },
        headerTintColor: '#f9fafb',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <LayoutDashboard size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scores"
        options={{
          title: 'Scores',
          tabBarIcon: ({ color }) => <Star size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="songs"
        options={{
          title: 'Songs',
          tabBarIcon: ({ color }) => <Music2 size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Sessions',
          tabBarIcon: ({ color }) => <History size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="arcade"
        options={{
          title: 'Arcade',
          tabBarIcon: ({ color }) => <Gamepad2 size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
