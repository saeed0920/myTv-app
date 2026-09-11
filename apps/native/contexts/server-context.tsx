import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useState } from "react";

import { connectServer, discoverServer, rememberServer, type DeviceInfo } from "@/lib/api";

type Connection = "discovering" | "connected" | "offline";

type ServerContextValue = {
  baseUrl: string;
  info: DeviceInfo | null;
  state: Connection;
  error: string;
  discover: () => Promise<void>;
  connect: (address: string) => Promise<void>;
};

const ServerContext = createContext<ServerContextValue | null>(null);

export function ServerProvider({ children }: PropsWithChildren) {
  const [baseUrl, setBaseUrl] = useState("");
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  const [state, setState] = useState<Connection>("discovering");
  const [error, setError] = useState("");

  const useFound = useCallback(async (found: Awaited<ReturnType<typeof discoverServer>>) => {
    setBaseUrl(found.baseUrl);
    setInfo(found.info);
    setState("connected");
    setError("");
    await rememberServer(found.baseUrl);
  }, []);

  const discover = useCallback(async () => {
    setState("discovering");
    setError("");
    try {
      await useFound(await discoverServer());
    } catch (reason) {
      setState("offline");
      setError(reason instanceof Error ? reason.message : "Discovery failed");
    }
  }, [useFound]);

  const connect = useCallback(async (address: string) => {
    setState("discovering");
    setError("");
    try {
      await useFound(await connectServer(address));
    } catch (reason) {
      setState("offline");
      const message = reason instanceof Error ? reason.message : "Connection failed";
      setError(message);
      throw reason;
    }
  }, [useFound]);

  useEffect(() => { void discover(); }, [discover]);

  return (
    <ServerContext.Provider value={{ baseUrl, info, state, error, discover, connect }}>
      {children}
    </ServerContext.Provider>
  );
}

export function useServer() {
  const value = useContext(ServerContext);
  if (!value) throw new Error("useServer must be used inside ServerProvider");
  return value;
}
