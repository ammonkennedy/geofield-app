import { useState, useEffect } from "react";
import { X, Camera, Radio, Image, ExternalLink, RefreshCw, TreePine } from "lucide-react";

export interface RoadCam {
  id: string;
  title: string;
  park: string;
  parkCode: string;
  lat: number;
  lng: number;
  status: string;
  isStreaming: boolean;
  imageUrl?: string | null;
  viewerUrl: string;
  credit?: string | null;
}

interface RoadCamPanelProps {
  cam: RoadCam;
  onClose: () => void;
}

export function RoadCamPanel({ cam, onClose }: RoadCamPanelProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Build a cache-busted image URL so refresh actually fetches a new frame
  useEffect(() => {
    if (cam.imageUrl) {
      setImgError(false);
      setImgSrc(`${cam.imageUrl}?_t=${Date.now()}`);
    }
  }, [cam.imageUrl, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const npsLogoUrl = `https://www.nps.gov/common/commonspot/templates/images/branding/nps-logo-bw.gif`;

  return (
    <div className="absolute bottom-4 left-4 z-20 w-80 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-3 py-2.5 bg-muted/50 border-b border-border">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <TreePine className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide truncate">
              {cam.park}
            </span>
            {cam.isStreaming && (
              <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold shrink-0">
                <Radio className="w-2.5 h-2.5" />
                LIVE
              </span>
            )}
            {!cam.isStreaming && cam.imageUrl && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium shrink-0">
                <Image className="w-2.5 h-2.5" />
                Photo
              </span>
            )}
          </div>
          <p className="font-semibold text-sm leading-tight line-clamp-2">{cam.title}</p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      {cam.isStreaming ? (
        /* Live streaming — embed NPS viewer in an iframe */
        <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
          <iframe
            src={cam.viewerUrl}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen"
            title={cam.title}
          />
        </div>
      ) : cam.imageUrl && !imgError ? (
        /* Static reference photo */
        <div className="relative bg-muted/30" style={{ aspectRatio: "16/9" }}>
          {imgSrc && (
            <img
              src={imgSrc}
              alt={cam.title}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          )}
          <button
            onClick={refresh}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-lg p-1.5 transition-colors"
            title="Refresh image"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1.5">
            <span className="text-[10px] text-white/70">Reference photo · not a live feed</span>
          </div>
        </div>
      ) : (
        /* No image — show NPS viewer link card */
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-6 bg-muted/20">
          <Camera className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            View this camera on the NPS website
          </p>
          <a
            href={cam.viewerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open NPS Webcam
          </a>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 text-[10px] text-muted-foreground bg-muted/30">
        <span>Source: NPS · {cam.status}</span>
        <div className="flex items-center gap-2">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${cam.lat},${cam.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Maps
          </a>
          <a
            href={cam.viewerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            NPS
          </a>
        </div>
      </div>
    </div>
  );
}
