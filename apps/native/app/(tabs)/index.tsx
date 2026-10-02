import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";
import { ActivityIndicator, AppState, Image, Platform, Pressable, Switch, Text, TextInput, View } from "react-native";
import { useCSSVariable } from "uniwind";

import { Container } from "@/components/container";
import { useServer } from "@/contexts/server-context";
import { api, post, type PlaybackStatus, type Quality } from "@/lib/api";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function clock(value = 0) {
  const seconds = Math.max(0, Math.round(value));
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function Control({ icon, label, onPress, primary = false }: { icon: IconName; label: string; onPress: () => void; primary?: boolean }) {
  const acid = useCSSVariable("--color-deck-acid") as string;
  const ink = useCSSVariable("--color-deck-ink") as string;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`min-h-14 flex-1 items-center justify-center rounded-xl border active:opacity-60 ${primary ? "border-deck-acid bg-deck-acid" : "border-deck-line bg-deck-control"}`}
    >
      <Ionicons name={icon} size={24} color={primary ? "#080a08" : acid || ink} />
      <Text className={`mt-1 text-xs font-bold ${primary ? "text-deck-black" : "text-deck-ink"}`}>{label}</Text>
    </Pressable>
  );
}

export default function Remote() {
  const { baseUrl, info, state, error, discover } = useServer();
  const [status, setStatus] = useState<PlaybackStatus>({ position: 0, duration: 0, title: "Nothing playing", paused: true, volume: 0, muted: false });
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState("720");
  const [fps, setFps] = useState("30");
  const [useProxy, setUseProxy] = useState(true);
  const [preview, setPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState(false);
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [timelineWidth, setTimelineWidth] = useState(1);

  const refresh = useCallback(async () => {
    if (!baseUrl || AppState.currentState !== "active") return;
    try { setStatus(await api<PlaybackStatus>(baseUrl, "/api/status")); } catch {}
  }, [baseUrl]);

  useFocusEffect(useCallback(() => {
    void refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, [refresh]));

  useFocusEffect(useCallback(() => {
    if (!preview || !baseUrl || state !== "connected") return;
    const tick = () => { if (AppState.currentState === "active") setPreviewUrl(`${baseUrl}/api/preview?${Date.now()}`); };
    tick();
    const timer = setInterval(tick, 2000);
    return () => clearInterval(timer);
  }, [preview, baseUrl, state]));

  const command = useCallback(async (name: string, position?: number) => {
    if (!baseUrl) return;
    if (Platform.OS === "ios") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await post(baseUrl, "/api/control", position === undefined ? { command: name } : { command: name, position });
      void refresh();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Command failed"); }
  }, [baseUrl, refresh]);

  async function play() {
    if (!url.trim()) return setMessage("Paste a video URL first");
    setBusy(true); setMessage("");
    try {
      const result = await post<{ message: string }>(baseUrl, "/api/play", { url: url.trim(), quality, fps, proxy: useProxy });
      setMessage(result.message);
      void refresh();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Playback failed"); }
    finally { setBusy(false); }
  }

  async function findQualities() {
    if (!url.trim()) return setMessage("Paste a YouTube URL first");
    setBusy(true); setMessage("");
    try {
      const result = await post<{ qualities: Quality[] }>(baseUrl, "/api/formats", { url: url.trim() });
      setQualities(result.qualities);
      const preferred = result.qualities.find(item => item.height <= 720) || result.qualities.find(item => item.height <= 1080);
      if (preferred) setQuality(String(preferred.height));
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Quality lookup failed"); }
    finally { setBusy(false); }
  }

  if (state !== "connected") {
    return (
      <Container className="bg-deck-black px-5" isScrollable={false}>
        <View className="flex-1 items-center justify-center gap-4">
          <View className="h-20 w-20 items-center justify-center rounded-3xl border border-deck-line bg-deck-panel">
            {state === "discovering" ? <ActivityIndicator size="large" colorClassName="accent-deck-acid" /> : <Ionicons name="tv-outline" size={36} color="#d8ff3e" />}
          </View>
          <Text className="text-center text-2xl font-black uppercase tracking-wider text-deck-ink">
            {state === "discovering" ? "Finding MediaBox" : "MediaBox offline"}
          </Text>
          <Text className="max-w-72 text-center text-base text-deck-dim">{state === "discovering" ? "Scanning this Wi-Fi network…" : error}</Text>
          {state === "offline" && <Pressable onPress={() => void discover()} className="min-h-12 justify-center rounded-xl bg-deck-acid px-8 active:opacity-60"><Text className="font-black uppercase text-deck-black">Scan again</Text></Pressable>}
        </View>
      </Container>
    );
  }

  const progress = status.duration ? Math.min(100, status.position / status.duration * 100) : 0;
  const options = [
    { value: "default", label: "Source / default" },
    ...(qualities.length ? qualities.filter(item => item.height <= 1080).flatMap(item => [
      { value: String(item.height), label: `${item.height}p${item.fps > 30 ? Math.round(item.fps) : ""}` },
      ...(item.fps > 30 && item.low ? [{ value: `${item.height}@30`, label: `${item.height}p30` }] : []),
    ]) : [{ value: "360", label: "360p" }, { value: "480", label: "480p" }, { value: "720", label: "720p" }, { value: "1080@30", label: "1080p30" }, { value: "1080", label: "1080p60" }]),
    { value: "audio", label: "Audio" },
  ];

  return (
    <Container className="bg-deck-black" scrollViewProps={{ contentContainerClassName: "px-4 pb-8" }}>
      <View className="mb-6 mt-4 flex-row items-center justify-between">
        <View><Text className="text-xs font-bold uppercase tracking-widest text-deck-acid">● {info?.name} / online</Text><Text className="mt-1 text-3xl font-black uppercase text-deck-ink">Remote</Text></View>
        <View className="rounded-full border border-deck-line bg-deck-panel px-3 py-2"><Text className="text-xs font-bold text-deck-dim">{info?.model}</Text></View>
      </View>

      <View className="rounded-2xl border border-deck-line bg-deck-panel p-4">
        <Text className="text-xs font-bold uppercase tracking-widest text-deck-dim">Now playing</Text>
        <Text className="mt-2 text-xl font-bold text-deck-ink" numberOfLines={2}>{status.title || "Nothing playing"}</Text>
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel="Playback position"
          onLayout={event => setTimelineWidth(event.nativeEvent.layout.width)}
          onPress={event => status.duration && void command("seek", status.duration * event.nativeEvent.locationX / timelineWidth)}
          className="my-2 h-12 justify-center"
        >
          <View className="h-2 overflow-hidden rounded-full bg-deck-control"><View className="h-full bg-deck-acid" style={{ width: `${progress}%` }} /></View>
        </Pressable>
        <View className="-mt-3 mb-4 flex-row justify-between"><Text className="text-xs text-deck-dim">{clock(status.position)}</Text><Text className="text-xs text-deck-dim">{clock(status.duration)}</Text></View>
        <View className="flex-row gap-2">
          <Control icon="play-back" label="−10 sec" onPress={() => void command("seek-back")} />
          <Control primary icon={status.paused ? "play" : "pause"} label={status.paused ? "Play" : "Pause"} onPress={() => void command("pause")} />
          <Control icon="play-forward" label="+10 sec" onPress={() => void command("seek-forward")} />
        </View>
        <View className="mt-2 flex-row gap-2">
          <Control icon="volume-low" label="Volume −" onPress={() => void command("volume-down")} />
          <Control icon={status.muted ? "volume-mute" : "volume-high"} label={status.muted ? "Unmute" : "Mute"} onPress={() => void command("mute")} />
          <Control icon="volume-high" label="Volume +" onPress={() => void command("volume-up")} />
          <Control icon="stop" label="Stop" onPress={() => void command("stop")} />
        </View>
      </View>

      <View className="mt-4 rounded-2xl border border-deck-line bg-deck-panel p-4">
        <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-deck-dim">Send to TV</Text>
        <TextInput
          accessibilityLabel="Video URL"
          value={url}
          onChangeText={value => { setUrl(value); setQualities([]); try { const host = new URL(value).hostname; if (!(host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com"))) setQuality("default"); } catch {} }}
          placeholder="YouTube, Spotify, or media URL"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          className="min-h-12 rounded-xl border border-deck-line bg-deck-black px-4 text-base text-deck-ink focus:border-deck-acid"
          placeholderTextColorClassName="accent-deck-dim"
          cursorColorClassName="accent-deck-acid"
        />
        <View className="my-3 flex-row flex-wrap gap-2">
          {options.map(item => <Pressable key={item.value} onPress={() => setQuality(item.value)} className={`min-h-12 justify-center rounded-lg border px-4 active:opacity-60 ${quality === item.value ? "border-deck-acid bg-deck-acid" : "border-deck-line bg-deck-control"}`}><Text className={`font-bold ${quality === item.value ? "text-deck-black" : "text-deck-ink"}`}>{item.label}</Text></Pressable>)}
        </View>
        <View className="mb-3 flex-row flex-wrap items-center gap-3">
          <Text className="font-bold text-deck-ink">Playback proxy</Text><Switch accessibilityLabel="Use playback proxy" value={useProxy} onValueChange={setUseProxy} />
          <Pressable accessibilityRole="button" onPress={() => setFps(fps === "30" ? "auto" : "30")} className="min-h-12 justify-center rounded-lg border border-deck-line bg-deck-control px-4"><Text className="font-bold text-deck-ink">{fps === "30" ? "Smooth 30 FPS" : "FPS auto"}</Text></Pressable>
        </View>
        <Text className="mb-3 text-sm text-deck-dim">720p60 / 1080p30 recommended. 1080p60 may drop frames.</Text>
        <View className="flex-row gap-2">
          <Pressable disabled={busy} onPress={() => void findQualities()} className="min-h-12 flex-1 items-center justify-center rounded-xl border border-deck-line bg-deck-control active:opacity-60 disabled:opacity-40"><Text className="font-bold text-deck-ink">Available</Text></Pressable>
          <Pressable disabled={busy} onPress={() => void play()} className="min-h-12 flex-[2] items-center justify-center rounded-xl bg-deck-acid active:opacity-60 disabled:opacity-40"><Text className="font-black uppercase text-deck-black">{busy ? "Working…" : "Play on TV"}</Text></Pressable>
        </View>
        {!!message && <Text accessibilityLiveRegion="polite" className="mt-3 rounded-lg border-l-4 border-deck-acid bg-deck-black p-3 text-sm text-deck-ink">{message}</Text>}
      </View>
      <View className="mt-4 rounded-2xl border border-deck-line bg-deck-panel p-4">
        <View className="flex-row items-center justify-between gap-3"><Text className="font-bold text-deck-ink">TV frame preview</Text><Switch accessibilityLabel="TV frame preview" value={preview} onValueChange={value => { setPreview(value); setPreviewError(false); }} /></View>
        <Text className="mt-2 text-sm text-deck-dim">Still frame every 2 seconds, not live video.</Text>
        {preview && !!previewUrl && <Image accessibilityLabel="Current TV frame" source={{ uri: previewUrl }} resizeMode="contain" style={{ width: "100%", aspectRatio: 16 / 9, marginTop: 12, backgroundColor: "#000" }} onError={() => setPreviewError(true)} onLoad={() => setPreviewError(false)} />}
        {preview && previewError && <Text accessibilityLiveRegion="polite" className="mt-2 text-deck-dim">No frame available. Start TV playback first.</Text>}
      </View>
    </Container>
  );
}
