import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { useServer } from "@/contexts/server-context";
import { api, post } from "@/lib/api";

type MediaFile = { name: string; size: number };

function size(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.ceil(bytes / 1024)} KB`;
}

export default function Library() {
  const { baseUrl, state } = useServer();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!baseUrl) return setLoading(false);
    setLoading(true);
    try { setFiles((await api<{ files: MediaFile[] }>(baseUrl, "/api/files")).files); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Could not load library"); }
    finally { setLoading(false); }
  }, [baseUrl]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function play(name: string) {
    try { setMessage((await post<{ message: string }>(baseUrl, "/api/play", { file: name, fps: "auto" })).message); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Playback failed"); }
  }

  function remove(name: string) {
    Alert.alert("Delete media?", name, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await post(baseUrl, "/api/delete", { file: name }); await load(); }
        catch (reason) { setMessage(reason instanceof Error ? reason.message : "Delete failed"); }
      } },
    ]);
  }

  return (
    <Container className="bg-deck-black" scrollViewProps={{ contentContainerClassName: "px-4 pb-8" }}>
      <View className="mb-6 mt-4 flex-row items-end justify-between">
        <View><Text className="text-xs font-bold uppercase tracking-widest text-deck-acid">/srv/media</Text><Text className="mt-1 text-3xl font-black uppercase text-deck-ink">Library</Text></View>
        <Pressable accessibilityLabel="Refresh library" onPress={() => void load()} className="h-12 w-12 items-center justify-center rounded-xl border border-deck-line bg-deck-panel active:opacity-60"><Ionicons name="refresh" size={22} color="#d8ff3e" /></Pressable>
      </View>
      {state !== "connected" ? <Text className="rounded-xl border border-deck-line bg-deck-panel p-4 text-deck-dim">Connect to MediaBox first.</Text> : loading ? <ActivityIndicator className="mt-20" size="large" colorClassName="accent-deck-acid" /> : files.length === 0 ? <View className="items-center rounded-2xl border border-dashed border-deck-line p-10"><Ionicons name="film-outline" size={36} color="#a5ad9e" /><Text className="mt-3 text-deck-dim">Media library empty</Text></View> : files.map(file => (
        <View key={file.name} className="mb-2 flex-row items-center gap-3 rounded-xl border border-deck-line bg-deck-panel p-3">
          <View className="h-11 w-11 items-center justify-center rounded-lg bg-deck-control"><Ionicons name="film-outline" size={22} color="#d8ff3e" /></View>
          <View className="min-w-0 flex-1"><Text className="font-bold text-deck-ink" numberOfLines={1}>{file.name}</Text><Text className="text-xs text-deck-dim">{size(file.size)}</Text></View>
          <Pressable accessibilityLabel={`Play ${file.name} on TV`} onPress={() => void play(file.name)} className="h-12 w-12 items-center justify-center rounded-xl bg-deck-acid active:opacity-60"><Ionicons name="play" size={20} color="#080a08" /></Pressable>
          <Pressable accessibilityLabel={`Delete ${file.name}`} onPress={() => remove(file.name)} className="h-12 w-12 items-center justify-center rounded-xl border border-deck-line active:opacity-60"><Ionicons name="trash-outline" size={20} color="#ff6257" /></Pressable>
        </View>
      ))}
      {!!message && <Text accessibilityLiveRegion="polite" className="mt-3 rounded-lg border-l-4 border-deck-acid bg-deck-panel p-3 text-deck-ink">{message}</Text>}
      <Text className="mt-5 text-center text-sm text-deck-dim">Phone upload arrives next with photo slideshow.</Text>
    </Container>
  );
}
