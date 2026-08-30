import { useEffect } from "react";

// Records a visit when a page mounts, sends a heartbeat every 20s while the
// visitor stays on it, and sends a final beacon on unload — used to show
// roughly how long someone spent on a demo hub or marketing page.
export function useVisitTracking(path: string) {
  useEffect(() => {
    let visitId: number | null = null;
    let cancelled = false;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    fetch("/api/visits/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    })
      .then(res => res.json())
      .then(json => {
        if (cancelled || !json?.data?.id) return;
        visitId = json.data.id;
        heartbeatTimer = setInterval(() => {
          if (visitId) {
            fetch(`/api/visits/${visitId}/heartbeat`, { method: "POST" }).catch(() => {});
          }
        }, 20000);
      })
      .catch(() => {});

    const sendFinalBeat = () => {
      if (visitId) {
        navigator.sendBeacon?.(`/api/visits/${visitId}/heartbeat`);
      }
    };
    window.addEventListener("beforeunload", sendFinalBeat);

    return () => {
      cancelled = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      sendFinalBeat();
      window.removeEventListener("beforeunload", sendFinalBeat);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
}
