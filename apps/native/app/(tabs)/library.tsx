import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";

import { Action } from "@/components/action";
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
  const { baseUrl, state, info } = useServer();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [slides, setSlides] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const upload = useRef<FileSystem.UploadTask | null>(null);
  const cancelled = useRef(false);
  const connected = state === "connected";

  useEffect(() => () => { cancelled.current = true; void upload.current?.cancelAsync(); }, []);
  useEffect(() => { setSlides([]); setSlideIndex(0); }, [baseUrl]);

  const load = useCallback(async () => {
    if (!baseUrl) return;
    setLoading(true);
    try { setFiles((await api<{ files: MediaFile[] }>(baseUrl, "/api/files")).files); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Could not load library"); }
    finally { setLoading(false); }
  }, [baseUrl]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function run(work: () => Promise<void>) {
    setBusy(true); setMessage(""); cancelled.current = false;
    try { await work(); }
    catch (reason) { setMessage(cancelled.current ? "Upload cancelled" : reason instanceof Error ? reason.message : "Operation failed"); }
    finally { upload.current = null; setBusy(false); setProgress(""); }
  }

  async function send(asset: DocumentPicker.DocumentPickerAsset, temporary = false) {
    const name = asset.name.replace(/[\\/]/g, "_").replace(/^\.+/, "_");
    const limit = temporary ? 20 * 1024 ** 2 : 32 * 1024 ** 3;
    if (asset.size !== undefined && asset.size > limit) throw new Error(temporary ? "Photo exceeds 20 MB" : "File exceeds 32 GB");
    const task = FileSystem.createUploadTask(`${baseUrl}/${temporary ? "slides" : "files"}/${encodeURIComponent(name)}`, asset.uri,
      { httpMethod: "PUT", uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT, headers: { "Content-Type": asset.mimeType || "application/octet-stream" } },
      event => setProgress(`${asset.name} · ${event.totalBytesExpectedToSend > 0 ? Math.round(event.totalBytesSent / event.totalBytesExpectedToSend * 100) : 0}%`));
    upload.current = task;
    const response = await task.uploadAsync();
    if (cancelled.current || !response) throw new Error("Upload cancelled");
    const result = JSON.parse(response.body);
    if (response.status < 200 || response.status >= 300) throw new Error(result.error || "Upload failed");
    upload.current = null;
    return name;
  }

  async function pick(playOnTV: boolean) {
    await run(async () => {
      const selected = await DocumentPicker.getDocumentAsync({ type: ["image/*", "video/*", "audio/*"], multiple: !playOnTV, copyToCacheDirectory: true });
      if (selected.canceled) return;
      for (const asset of selected.assets) {
        if (cancelled.current) throw new Error("Upload cancelled");
        const name = await send(asset);
        if (playOnTV) await post(baseUrl, "/api/play", { file: name, fps: "auto" });
      }
      setMessage(playOnTV ? "Uploaded and playing on TV. File saved in box library." : `Uploaded ${selected.assets.length} file(s)`);
      await load();
    });
  }

  async function startSlides() {
    await run(async () => {
      const selected = await DocumentPicker.getDocumentAsync({ type: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"], multiple: true, copyToCacheDirectory: true });
      if (selected.canceled || !selected.assets.length) return;
      await send(selected.assets[0]!, true);
      setSlides(selected.assets); setSlideIndex(0); setMessage("Photo shown on TV. Temporary RAM storage only.");
    });
  }

  function showSlide(index: number) {
    void run(async () => { await send(slides[index]!, true); setSlideIndex(index); setMessage(`Photo ${index + 1} of ${slides.length}`); });
  }

  function remove(name: string) {
    Alert.alert("Delete media?", name, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void run(async () => { await post(baseUrl, "/api/delete", { file: name }); await load(); }) },
    ]);
  }

  async function download(name: string) {
    await run(async () => {
      const directory = `${FileSystem.cacheDirectory}mytv-downloads/`;
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      const destination = directory + encodeURIComponent(name);
      try {
        setProgress(`Downloading ${name}…`);
        const result = await FileSystem.downloadAsync(`${baseUrl}/files/${encodeURIComponent(name)}`, destination);
        if (result.status !== 200) throw new Error(`Download failed (${result.status})`);
        if (!await Sharing.isAvailableAsync()) throw new Error("Phone sharing unavailable");
        await Sharing.shareAsync(result.uri);
        setMessage("Download ready: choose player or Save from phone share menu.");
      } catch (reason) {
        await FileSystem.deleteAsync(destination, { idempotent: true });
        throw reason;
      }
      // Share recipients may read asynchronously. Keep successful download in OS-managed cache.
    });
  }

  return <Container className="bg-deck-black" scrollViewProps={{ contentContainerClassName: "px-4 pb-8" }}>
    <View className="mb-6 mt-4 flex-row items-end justify-between">
      <View><Text className="text-xs font-bold uppercase tracking-widest text-deck-acid">Phone → TV</Text><Text className="mt-1 text-3xl font-black uppercase text-deck-ink">Library</Text></View>
      <Action label="Refresh" disabled={!connected || busy} onPress={() => void load()} />
    </View>
    <View className="mb-4 gap-3 rounded-2xl border border-deck-line bg-deck-panel p-4">
      <Text className="text-lg font-bold text-deck-ink">Phone files</Text>
      <Text className="text-sm text-deck-dim">Videos, photos and music. Upload & play saves file to box, then plays on TV.</Text>
      <Action primary label="Choose file · upload & play" disabled={!connected || busy || !info?.capabilities.includes("safe-upload")} onPress={() => void pick(true)} />
      <Action label="Upload files to library" disabled={!connected || busy || !info?.capabilities.includes("safe-upload")} onPress={() => void pick(false)} />
      {connected && !info?.capabilities.includes("safe-upload") && <Text className="text-deck-dim">Update box controller to enable safe uploads.</Text>}
      <View className="my-1 h-px bg-deck-line" />
      <Text className="font-bold text-deck-ink">Temporary photo slideshow</Text>
      <Text className="text-sm text-deck-dim">One photo buffered in box RAM (max 20 MB). Next replaces it. End clears it; restart clears abandoned photos.</Text>
      <Action label="Choose slideshow photos" disabled={!connected || busy || !info?.capabilities.includes("slides")} onPress={() => void startSlides()} />
      {slides.length > 0 && <>
        <Text className="text-deck-ink">Photo {slideIndex + 1} / {slides.length}</Text>
        <View className="flex-row flex-wrap gap-2">
          <Action label="Previous" disabled={busy || !connected || slideIndex === 0} onPress={() => showSlide(slideIndex - 1)} />
          <Action label="Next" disabled={busy || !connected || slideIndex === slides.length - 1} onPress={() => showSlide(slideIndex + 1)} />
        </View>
      </>}
      <Action label="End & clear TV photos" disabled={busy || !connected || !info?.capabilities.includes("slides")} onPress={() => void run(async () => { await post(baseUrl, "/api/slides/end", {}); setSlides([]); setMessage("Temporary photos cleared"); })} />
      {!!progress && <Text accessibilityLiveRegion="polite" className="text-deck-ink">{progress}</Text>}
      {busy && upload.current && <Action label="Cancel upload" onPress={() => { cancelled.current = true; void upload.current?.cancelAsync(); }} />}
      {!!message && <Text accessibilityLiveRegion="polite" className="text-sm text-deck-ink">{message}</Text>}
    </View>
    {!connected ? <Text className="text-deck-dim">Connect to MediaBox first.</Text> : loading ? <ActivityIndicator colorClassName="accent-deck-acid" /> : files.length === 0 ? <Text className="p-6 text-center text-deck-dim">Media library empty</Text> : files.map(file => <View key={file.name} className="mb-3 gap-3 rounded-xl border border-deck-line bg-deck-panel p-4">
      <View className="flex-row items-center gap-3"><Ionicons name="document-outline" size={24} color="#d8ff3e" /><View className="min-w-0 flex-1"><Text className="font-bold text-deck-ink">{file.name}</Text><Text className="text-sm text-deck-dim">{size(file.size)}</Text></View></View>
      <View className="flex-row flex-wrap gap-2">
        <Action primary label="Play on TV" disabled={busy} onPress={() => void run(async () => { await post(baseUrl, "/api/play", { file: file.name, fps: "auto" }); setMessage(`Playing ${file.name}`); })} />
        <Action label="Get / open" disabled={busy} onPress={() => void download(file.name)} />
        <Action label="Delete" disabled={busy} onPress={() => remove(file.name)} />
      </View>
    </View>)}
  </Container>;
}
