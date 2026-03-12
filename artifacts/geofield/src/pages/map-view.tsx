import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useGetSamples, useGetFolders } from "@workspace/api-client-react";
import { MapPin, FolderOpen, Layers } from "lucide-react";
import "leaflet/dist/leaflet.css";

const typeColors: Record<string, string> = {
  water: "#2d7dd2",
  rock: "#8b5e3c",
  soil_sand: "#c49a3c",
};

const typeLabels: Record<string, string> = {
  water: "Water",
  rock: "Rock",
  soil_sand: "Soil/Sand",
};

function parseCoords(location: string | undefined): [number, number] | null {
  if (!location || typeof location !== "string") return null;
  const match = location.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return [lat, lng];
    }
  }
  return null;
}

function makeIcon(L: any, sampleType: string) {
  const color = typeColors[sampleType] || "#666";
  const letter = sampleType === "water" ? "W" : sampleType === "rock" ? "R" : "S";
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};color:white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:32px;height:32px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:13px;font-weight:700;line-height:1;">${letter}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  });
}

export default function MapViewPage() {
  const [selectedFolderId, setSelectedFolderId] = useState<number | "all">("all");
  const { data: allSamples } = useGetSamples();
  const { data: folders } = useGetFolders();
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);

  const filteredSamples = (allSamples || []).filter(s => {
    if (selectedFolderId === "all") return true;
    return s.folderId === selectedFolderId;
  });

  const samplesWithCoords = filteredSamples.filter(s =>
    parseCoords((s.fields as any)?.location) !== null
  );

  // Create map once on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    import("leaflet").then((L) => {
      if (!mapContainerRef.current || mapRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapContainerRef.current!).setView([39.5, -98.35], 4);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers whenever samples or folder filter changes
  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (!map) return;

      // Remove existing markers
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];

      const bounds: [number, number][] = [];

      filteredSamples.forEach((sample) => {
        const coords = parseCoords((sample.fields as any)?.location);
        if (!coords) return;

        bounds.push(coords);
        const color = typeColors[sample.sampleType] || "#666";
        const label = typeLabels[sample.sampleType] || sample.sampleType;
        const icon = makeIcon(L, sample.sampleType);

        const photoHtml = (sample.fields as any)?.photo
          ? `<img src="${(sample.fields as any).photo}" style="width:100%;height:80px;object-fit:cover;border-radius:4px;margin-bottom:6px;" />`
          : "";

        const dateStr = (sample.fields as any)?.collectionDate
          ? new Date((sample.fields as any).collectionDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
          : "";

        const marker = L.marker(coords, { icon }).addTo(map);
        marker.bindPopup(`
          <div style="min-width:170px;font-family:system-ui,sans-serif;">
            ${photoHtml}
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="background:${color};color:white;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600;">${label}</span>
              <strong style="font-size:13px;">${sample.sampleId}</strong>
            </div>
            ${dateStr ? `<div style="font-size:11px;color:#666;">📅 ${dateStr}</div>` : ""}
            <div style="font-size:11px;color:#666;margin-top:2px;">📍 ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}</div>
            <a href="/sample/${sample.id}" style="display:block;margin-top:8px;background:#2d7dd2;color:white;text-align:center;border-radius:4px;padding:4px;font-size:12px;text-decoration:none;">View Sample →</a>
          </div>
        `, { maxWidth: 230 });

        markersRef.current.push(marker);
      });

      if (bounds.length === 1) {
        map.setView(bounds[0], 13);
      } else if (bounds.length > 1) {
        map.fitBounds(bounds as any, { padding: [50, 50] });
      }
    });
  }, [allSamples, selectedFolderId]);

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-display flex items-center gap-3">
            <MapPin className="text-primary w-8 h-8" />
            Sample Map
          </h1>
          <p className="text-muted-foreground mt-1">
            {samplesWithCoords.length} sample{samplesWithCoords.length !== 1 ? "s" : ""} with GPS coordinates
            {selectedFolderId !== "all" && folders && (
              <span className="ml-1">
                in <strong>{folders.find(f => f.id === selectedFolderId)?.name}</strong>
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Legend */}
          <div className="flex gap-3">
            {Object.entries(typeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-muted-foreground">{typeLabels[type]}</span>
              </div>
            ))}
          </div>

          {/* Folder filter */}
          <div className="relative">
            <select
              className="flex items-center gap-2 pl-8 pr-4 h-9 rounded-lg border border-border bg-card text-sm font-medium shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
              value={selectedFolderId}
              onChange={(e) =>
                setSelectedFolderId(e.target.value === "all" ? "all" : Number(e.target.value))
              }
            >
              <option value="all">All Folders</option>
              {folders?.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <FolderOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {samplesWithCoords.length === 0 && allSamples && allSamples.length > 0 ? (
        <div className="flex flex-col items-center justify-center h-96 text-center border-2 border-dashed border-border rounded-2xl">
          <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">No GPS data in this selection</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">
            None of the samples in this folder have GPS coordinates recorded.
          </p>
        </div>
      ) : samplesWithCoords.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 text-center border-2 border-dashed border-border rounded-2xl">
          <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">No GPS data yet</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Create a new sample and allow location access to start plotting on the map.
          </p>
        </div>
      ) : null}

      <div
        ref={mapContainerRef}
        className="w-full rounded-2xl overflow-hidden border border-border shadow-lg"
        style={{
          height: "calc(100vh - 240px)",
          minHeight: "400px",
          display: samplesWithCoords.length === 0 ? "none" : "block",
        }}
      />
    </Layout>
  );
}
