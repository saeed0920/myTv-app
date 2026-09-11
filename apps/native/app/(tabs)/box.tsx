import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { Container } from "@/components/container";
import { ThemeToggle } from "@/components/theme-toggle";
import { useServer } from "@/contexts/server-context";

export default function Box() {
  const { baseUrl, info, state, error, discover, connect } = useServer();
  const [address, setAddress] = useState(baseUrl);
  const [message, setMessage] = useState("");

  async function submit() {
    try { await connect(address); setMessage("Connected."); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Connection failed"); }
  }

  return (
    <Container className="bg-deck-black" scrollViewProps={{ contentContainerClassName: "px-4 pb-8" }}>
      <View className="mb-6 mt-4 flex-row items-center justify-between">
        <View><Text className="text-xs font-bold uppercase tracking-widest text-deck-acid">Device</Text><Text className="mt-1 text-3xl font-black uppercase text-deck-ink">MediaBox</Text></View>
        <ThemeToggle />
      </View>

      <View className="rounded-2xl border border-deck-line bg-deck-panel p-4">
        <View className="flex-row items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-deck-control"><Ionicons name="tv-outline" size={28} color="#d8ff3e" /></View>
          <View className="flex-1"><Text className="text-lg font-black text-deck-ink">{info?.name || "No box connected"}</Text><Text className="text-sm text-deck-dim">{state === "connected" ? `${info?.model} · ${baseUrl}` : error || "Offline"}</Text></View>
          {state === "discovering" ? <ActivityIndicator colorClassName="accent-deck-acid" /> : <View className={`h-3 w-3 rounded-full ${state === "connected" ? "bg-deck-acid" : "bg-deck-danger"}`} />}
        </View>
        {!!info && <View className="mt-4 flex-row flex-wrap gap-2">{info.capabilities.map(capability => <View key={capability} className="rounded-full border border-deck-line px-3 py-1.5"><Text className="text-xs font-bold uppercase text-deck-dim">{capability}</Text></View>)}</View>}
      </View>

      <View className="mt-4 rounded-2xl border border-deck-line bg-deck-panel p-4">
        <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-deck-dim">Find box</Text>
        <Pressable disabled={state === "discovering"} onPress={() => void discover()} className="min-h-12 items-center justify-center rounded-xl bg-deck-acid active:opacity-60 disabled:opacity-40"><Text className="font-black uppercase text-deck-black">Scan this Wi-Fi</Text></Pressable>
        <View className="my-4 h-px bg-deck-line" />
        <Text className="mb-2 text-sm text-deck-dim">Manual fallback</Text>
        <TextInput
          accessibilityLabel="MediaBox address"
          value={address}
          onChangeText={setAddress}
          placeholder="mediabox.local or 192.168.1.104"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          className="min-h-12 rounded-xl border border-deck-line bg-deck-black px-4 text-base text-deck-ink focus:border-deck-acid"
          placeholderTextColorClassName="accent-deck-dim"
          cursorColorClassName="accent-deck-acid"
        />
        <Pressable disabled={!address.trim() || state === "discovering"} onPress={() => void submit()} className="mt-2 min-h-12 items-center justify-center rounded-xl border border-deck-line bg-deck-control active:opacity-60 disabled:opacity-40"><Text className="font-bold text-deck-ink">Connect address</Text></Pressable>
        {!!message && <Text accessibilityLiveRegion="polite" className="mt-3 text-sm text-deck-dim">{message}</Text>}
      </View>

      <Text className="mt-6 text-center text-xs leading-5 text-deck-dim">Same Wi-Fi only · API v{info?.apiVersion || 1}{"\n"}No cloud account. No internet exposure.</Text>
    </Container>
  );
}
