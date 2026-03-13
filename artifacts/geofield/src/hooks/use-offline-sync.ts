import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetSamplesQueryKey } from "@workspace/api-client-react";
import { getQueue, removeFromQueue, QUEUE_UPDATED_EVENT } from "@/lib/offline-queue";

const API_BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

export function useOfflineSync() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline]     = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(() => getQueue().length);
  const [isSyncing, setIsSyncing]   = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(() => {
    setQueueCount(getQueue().length);
  }, []);

  // Keep queue count up to date across tabs and after enqueue/dequeue
  useEffect(() => {
    window.addEventListener(QUEUE_UPDATED_EVENT, refreshCount);
    window.addEventListener("storage", refreshCount);
    return () => {
      window.removeEventListener(QUEUE_UPDATED_EVENT, refreshCount);
      window.removeEventListener("storage", refreshCount);
    };
  }, [refreshCount]);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);
    let synced = 0;

    for (const item of queue) {
      try {
        const res = await fetch(`${API_BASE}/api/samples`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(item.payload),
        });
        if (res.ok) {
          removeFromQueue(item.queuedId);
          synced++;
        }
      } catch {
        // Still offline for this item — leave it in queue
      }
    }

    if (synced > 0) {
      setSyncedCount(synced);
      queryClient.invalidateQueries({ queryKey: getGetSamplesQueryKey() });
      setTimeout(() => setSyncedCount(0), 5000);
    }

    syncingRef.current = false;
    setIsSyncing(false);
  }, [queryClient]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      sync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [sync]);

  return { isOnline, queueCount, isSyncing, syncedCount, sync };
}
