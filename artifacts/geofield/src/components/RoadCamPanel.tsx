import { useEffect, useRef, useState } from "react";
import { X, Camera, Video, VideoOff, ExternalLink, AlertCircle } from "lucide-react";

export interface RoadCam {
  id: string;
  name: string;
  road: string;
  direction: string;
  lat: number;
  lng: number;
  videoUrl: string;
}

interface RoadCamPanelProps {
  cam: RoadCam;
  onClose: () => void;
}

export function RoadCamPanel({ cam, onClose }: RoadCamPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setStatus("loading");

    const startHls = async () => {
      // Safari supports HLS natively
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = cam.videoUrl;
        video.play().catch(() => setStatus("error"));
        video.oncanplay = () => setStatus("playing");
        video.onerror = () => setStatus("error");
        return;
      }

      // All other browsers use hls.js
      const HlsModule = await import("hls.js");
      const Hls = HlsModule.default;
      if (!Hls.isSupported()) {
        setStatus("error");
        return;
      }

      const hls = new Hls({ enableWorker: false, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(cam.videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setStatus("playing");
      });
      hls.on(Hls.Events.ERROR, (_: any, data: any) => {
        if (data.fatal) setStatus("error");
      });
    };

    startHls();

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      if (video) {
        video.pause();
        video.src = "";
      }
    };
  }, [cam.videoUrl]);

  return (
    <div className="absolute bottom-4 left-4 z-20 w-80 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-3 py-2.5 bg-muted/50 border-b border-border">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Camera className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide truncate">
              Road Camera
            </span>
            {status === "playing" && (
              <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <p className="font-semibold text-sm leading-tight truncate">{cam.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {cam.road}{cam.direction && cam.direction !== "Unknown" ? ` · ${cam.direction}` : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Video area */}
      <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          autoPlay
        />

        {/* Loading overlay */}
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-white">
            <Video className="w-8 h-8 animate-pulse" />
            <span className="text-xs">Connecting to stream…</span>
          </div>
        )}

        {/* Error overlay */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-white">
            <VideoOff className="w-8 h-8 text-muted-foreground" />
            <span className="text-xs text-muted-foreground text-center px-4">
              Stream unavailable — camera may be offline
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 text-[10px] text-muted-foreground bg-muted/30">
        <span className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Source: 511NY · NYSDOT
        </span>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${cam.lat},${cam.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Open in Maps
        </a>
      </div>
    </div>
  );
}
