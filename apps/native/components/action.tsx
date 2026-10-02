import { Pressable, Text } from "react-native";

export function Action({ label, onPress, disabled = false, primary = false }: {
  label: string; onPress: () => void; disabled?: boolean; primary?: boolean;
}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    className={`min-h-12 items-center justify-center rounded-xl border px-4 active:opacity-60 disabled:opacity-40 ${primary ? "border-deck-acid bg-deck-acid" : "border-deck-line bg-deck-control"}`}>
    <Text className={`font-bold ${primary ? "text-deck-black" : "text-deck-ink"}`}>{label}</Text>
  </Pressable>;
}
