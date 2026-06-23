import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ICON_SIZE = 28;
const BAR_CONTENT_HEIGHT = 44;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#0B0F14',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: BAR_CONTENT_HEIGHT + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: '#8B98A9',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 1.6,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="person" />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="barbell" />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="home" />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  focused,
  color,
  name,
}: {
  focused: boolean;
  color: string;
  name: 'person' | 'home' | 'barbell' | 'sparkles';
}) {
  // Filled when focused, outlined when not — classic iOS/Wealthsimple cue.
  const iconName: IconName = (focused ? name : `${name}-outline`) as IconName;
  return (
    <View className="items-center justify-center">
      {focused && (
        <View
          className="absolute h-0.5 w-4 rounded-full bg-primary"
          style={{ top: -6 }}
        />
      )}
      <Ionicons name={iconName} color={color} size={ICON_SIZE} />
    </View>
  );
}
