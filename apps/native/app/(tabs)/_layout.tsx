import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useCSSVariable } from "uniwind";

export default function TabLayout() {
  const panel = useCSSVariable("--color-deck-panel") as string;
  const ink = useCSSVariable("--color-deck-ink") as string;
  const dim = useCSSVariable("--color-deck-dim") as string;
  const acid = useCSSVariable("--color-deck-acid") as string;
  const line = useCSSVariable("--color-deck-line") as string;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: acid,
      tabBarInactiveTintColor: dim,
      tabBarLabelStyle: { fontWeight: "700" },
      tabBarStyle: { backgroundColor: panel, borderTopColor: line, height: 64 },
      sceneStyle: { backgroundColor: panel },
    }}>
      <Tabs.Screen name="index" options={{ title: "Remote", tabBarIcon: ({ color, size }) => <Ionicons name="game-controller-outline" size={size} color={color || ink} /> }} />
      <Tabs.Screen name="library" options={{ title: "Library", tabBarIcon: ({ color, size }) => <Ionicons name="film-outline" size={size} color={color || ink} /> }} />
      <Tabs.Screen name="box" options={{ title: "Box", tabBarIcon: ({ color, size }) => <Ionicons name="hardware-chip-outline" size={size} color={color || ink} /> }} />
    </Tabs>
  );
}
