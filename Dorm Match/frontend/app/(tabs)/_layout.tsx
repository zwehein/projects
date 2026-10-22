import { Tabs } from 'expo-router';
import { Home, Search, PlusSquare, Star, User } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/constants/colors';

type IconProps = { color: string; size: number };

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const isNarrow = width < 375;
  const iconSize = isNarrow ? 20 : 22;
  const labelSize = isNarrow ? 9 : 10;

  const tabBarHeight = 62 + insets.bottom;
  const tabBarPaddingBottom = 8 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 6,
        },
        tabBarShowLabel: !isNarrow,
        tabBarLabelStyle: { fontSize: labelSize, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }: IconProps) => <Home size={iconSize} color={color} /> }} />
      <Tabs.Screen name="listings" options={{ title: 'Listings', tabBarIcon: ({ color }: IconProps) => <Search size={iconSize} color={color} /> }} />
      <Tabs.Screen name="post" options={{ title: 'Post', tabBarIcon: ({ color }: IconProps) => <PlusSquare size={iconSize} color={color} /> }} />
      <Tabs.Screen name="reviews" options={{ title: 'Reviews', tabBarIcon: ({ color }: IconProps) => <Star size={iconSize} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }: IconProps) => <User size={iconSize} color={color} /> }} />
    </Tabs>
  );
}
