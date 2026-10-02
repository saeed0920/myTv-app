import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import { Alert } from "react-native";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { Action } from "@/components/action";
import { Container } from "@/components/container";
import { api, post } from "@/lib/api";

type Bluetooth = { alias: string; powered: boolean; discoverable: boolean; devices: { mac: string; name: string; connected: boolean; trusted: boolean }[] };
import { ThemeToggle } from "@/components/theme-toggle";
import { useServer } from "@/contexts/server-context";

export default function Box() {
  const { baseUrl, info, state, error, discover, connect } = useServer();
  const [address, setAddress] = useState(baseUrl);
  const [message, setMessage] = useState("");
  const [proxy, setProxy] = useState("");
  const [link, setLink] = useState("");
  const [bluetooth, setBluetooth] = useState<Bluetooth | null>(null);
  const [busy, setBusy] = useState(false);
  const [btError, setBtError] = useState("");
  const connected = state === "connected";

  const refresh = useCallback(async () => {
    if (!baseUrl || state !== "connected") return;
    try { setProxy((await api<{ proxy: string }>(baseUrl, "/api/proxy")).proxy); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Proxy unavailable"); }
    setBtError("");
    try { setBluetooth(await api<Bluetooth>(baseUrl, "/api/bt", undefined, 30000)); }
    catch (reason) { setBluetooth(null); setBtError(reason instanceof Error ? reason.message : "Bluetooth unavailable"); }
  }, [baseUrl, state]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  async function applyProxy(value: string) {
    setBusy(true); setMessage("Testing proxy…");
    try {
      const result = await post<{ message: string }>(baseUrl, "/api/proxy", { link: value.trim() });
      setMessage(result.message); setLink("");
      setProxy((await api<{ proxy: string }>(baseUrl, "/api/proxy")).proxy);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Proxy update failed"); }
    finally { setBusy(false); }
  }

  async function btAction(action: string, fields: object = {}) {
    setBusy(true); setMessage("");
    try { await post(baseUrl, "/api/bt", { action, ...fields }); await refresh(); setMessage(`Bluetooth: ${action}`); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Bluetooth action failed"); }
    finally { setBusy(false); }
  }

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

      <View className="mt-4 gap-3 rounded-2xl border border-deck-line bg-deck-panel p-4">
        <Text className="text-lg font-black text-deck-ink">Playback proxy</Text>
        <Text className="text-sm text-deck-dim">Current: {connected ? proxy || "Direct (no proxy)" : "Connect first"}</Text>
        <Text className="text-sm text-deck-dim">Runs on TV box, not phone. Paste Xray/V2Ray share link or HTTP host:port. Applying node tests traffic.</Text>
        <Text className="font-bold text-deck-ink">Share link / proxy address</Text>
        <TextInput accessibilityLabel="Proxy share link or address" value={link} onChangeText={setLink} autoCapitalize="none" autoCorrect={false} secureTextEntry
          placeholder="vless://… or 192.168.1.102:10808" placeholderTextColorClassName="accent-deck-dim" cursorColorClassName="accent-deck-acid"
          className="min-h-12 rounded-xl border border-deck-line bg-deck-black px-4 text-base text-deck-ink" />
        <Action primary label={busy ? "Working…" : "Apply & test proxy"} disabled={!connected || busy || !link.trim()} onPress={() => void applyProxy(link)} />
        <Action label="Use direct · no proxy" disabled={!connected || busy} onPress={() => void applyProxy("")} />
      </View>

      <View className="mt-4 gap-3 rounded-2xl border border-deck-line bg-deck-panel p-4">
        <Text className="text-lg font-black text-deck-ink">Bluetooth audio</Text>
        <Text className="text-sm text-deck-dim">Pair phone to MediaBox in phone Bluetooth settings. Phone audio plays through TV HDMI.</Text>
        {!!btError && <Text accessibilityLiveRegion="polite" className="text-deck-danger">{btError}</Text>}
        {bluetooth && connected && <>
          <Text className="text-deck-ink">{bluetooth.alias || "MediaBox"} · {bluetooth.powered ? "On" : "Off"} · {bluetooth.discoverable ? "Discoverable" : "Hidden"}</Text>
          <View className="flex-row flex-wrap gap-2">
            <Action label={bluetooth.powered ? "Power off" : "Power on"} disabled={busy} onPress={() => void btAction("power", { on: !bluetooth.powered })} />
            <Action label={bluetooth.discoverable ? "Hide device" : "Allow pairing"} disabled={busy} onPress={() => void btAction("discoverable", { on: !bluetooth.discoverable })} />
          </View>
          {bluetooth.devices.length === 0 && <Text className="text-deck-dim">No paired devices.</Text>}
          {bluetooth.devices.map(device => <View key={device.mac} className="gap-2 rounded-xl border border-deck-line p-3">
            <Text className="font-bold text-deck-ink">{device.name} · {device.connected ? "Connected" : "Disconnected"}</Text>
            <Text className="text-sm text-deck-dim">{device.mac} · {device.trusted ? "Trusted" : "Not trusted"}</Text>
            <View className="flex-row flex-wrap gap-2">
              <Action label={device.connected ? "Disconnect" : "Connect"} disabled={busy} onPress={() => void btAction(device.connected ? "disconnect" : "connect", { mac: device.mac })} />
              <Action label="Trust" disabled={busy || device.trusted} onPress={() => void btAction("trust", { mac: device.mac })} />
              <Action label="Forget" disabled={busy} onPress={() => Alert.alert("Forget Bluetooth device?", device.name, [{ text: "Cancel", style: "cancel" }, { text: "Forget", style: "destructive", onPress: () => void btAction("remove", { mac: device.mac }) }])} />
            </View>
          </View>)}
        </>}
        <Action label="Refresh device settings" disabled={!connected || busy} onPress={() => void refresh()} />
      </View>
      {!!message && <Text accessibilityLiveRegion="polite" className="mt-4 rounded-xl border border-deck-line bg-deck-panel p-4 text-deck-ink">{message}</Text>}
      <Text className="mt-6 text-center text-xs leading-5 text-deck-dim">myTv v{Constants.expoConfig?.version || "1.1.0"} · API v{info?.apiVersion || 1}{"\n"}Same Wi-Fi only. No cloud account.{"\n"}Box API has no authentication. Keep network trusted.</Text>
    </Container>
  );
}
