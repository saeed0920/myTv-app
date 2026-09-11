import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform, Pressable } from "react-native";
import { useCSSVariable } from "uniwind";

import { useAppTheme } from "@/contexts/app-theme-context";

export function ThemeToggle() {
  const { toggleTheme, isLight } = useAppTheme();
  const ink = useCSSVariable("--color-deck-ink") as string;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Use ${isLight ? "dark" : "light"} theme`}
      onPress={() => {
        if (Platform.OS === "ios") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        toggleTheme();
      }}
      className="h-12 w-12 items-center justify-center rounded-xl border border-deck-line bg-deck-panel active:opacity-60"
    >
      <Ionicons name={isLight ? "moon" : "sunny"} size={22} color={ink} />
    </Pressable>
  );
}
