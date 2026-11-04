import { Tabs, useRouter } from 'expo-router';
import { LayoutDashboard, History, Star, Gamepad2, Settings, Music2 } from 'lucide-react-native';
import { COLORS } from '@/constants/Theme';
import { Tap } from '@/components/Tap';

/** Settings lives behind a gear on the Dashboard header, so the bar keeps five tabs. */
function SettingsButton() {
  const router = useRouter();
  return (
    <Tap label="Settings" style={{ paddingHorizontal: 16, paddingVertical: 10 }} onPress={() => router.push('/settings')}>
      <Settings size={20} color={COLORS.text} />
    </Tap>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.purpleLight,
        tabBarInactiveTintColor: COLORS.textSubtle,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.surfaceLight,
        },
        headerStyle: {
          backgroundColor: COLORS.surface,
        },
        headerTintColor: COLORS.text,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <LayoutDashboard size={20} color={color} />,
          headerRight: () => <SettingsButton />,
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
    </Tabs>
  );
}
