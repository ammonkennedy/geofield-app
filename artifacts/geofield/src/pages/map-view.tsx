import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useGetSamples } from "@workspace/api-client-react";
import { Droplet, Mountain, Sprout, MapPin } from "lucide-react";
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
  if (!location) return null;
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

export default function MapViewPage() {
  const [, setLocation] = useLocation();
  const { data: samples } = useGetSamples();
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const samplesWithCoords = (samples || []).filter(s =>
    parseCoords((s.fields as any)?.location) !== null
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    import("leaflet").then((L) => {
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

      const bounds: [number, number][] = [];

      (samples || []).forEach((sample) => {
        const coords = parseCoords((sample.fields as any)?.location);
        if (!coords) return;

        bounds.push(coords);
        const color = typeColors[sample.sampleType] || "#666";
        const label = typeLabels[sample.sampleType] || sample.sampleType;

        const icon = L.divIcon({
          className: "",
          html: `
            <div style="
              background:${color};
              color:white;
              border-radius:50% 50% 50% 0;
              transform:rotate(-45deg);
              width:32px;height:32px;
              border:2px solid white;
              box-shadow:0 2px 6px rgba(0,0,0,0.3);
              display:flex;align-items:center;justify-content:center;
            ">
              <span style="transform:rotate(45deg);font-size:13px;font-weight:700;line-height:1;">
                ${sample.sampleType === "water" ? "W" : sample.sampleType === "rock" ? "R" : "S"}
              </span>
            </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -36],
        });

        const photoHtml = (sample.fields as any)?.photo
          ? `<img src="${(sample.fields as any).photo}" style="width:100%;height:80px;object-fit:cover;border-radius:4px;margin-bottom:6px;" />`
          : "";

        const marker = L.marker(coords, { icon }).addTo(map);
        marker.bindPopup(`
          <div style="min-width:160px;font-family:system-ui,sans-serif;">
            ${photoHtml}
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="
                background:${color};color:white;
                border-radius:4px;padding:2px 7px;
                font-size:11px;font-weight:600;
              ">${label}</span>
              <strong style="font-size:13px;">${sample.sampleId}</strong>
            </div>
            ${(sample.fields as any)?.collectionDate ? `<div style="font-size:11px;color:#666;">📅 ${(sample.fields as any).collectionDate}</div>` : ""}
            <div style="font-size:11px;color:#666;margin-top:2px;">📍 ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}</div>
            <a href="/sample/${sample.id}" style="
              display:block;margin-top:8px;
              background:#2d7dd2;color:white;
              text-align:center;border-radius:4px;
              padding:4px;font-size:12px;
              text-decoration:none;
            ">View Sample →</a>
          </div>
        `, { maxWidth: 220 });
      });

      if (bounds.length > 0) {
        if (bounds.length === 1) {
          map.setView(bounds[0], 12);
        } else {
          map.fitBounds(bounds as any, { padding: [40, 40] });
        }
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !samples) return;
    import("leaflet").then((L) => {
      mapRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          mapRef.current.removeLayer(layer);
        }
      });

      const bounds: [number, number][] = [];

      samples.forEach((sample) => {
        const coords = parseCoords((sample.fields as any)?.location);
        if (!coords) return;
        bounds.push(coords);

        const color = typeColors[sample.sampleType] || "#666";
        const label = typeLabels[sample.sampleType] || sample.sampleType;

        const icon = L.divIcon({
          className: "",
          html: `
            <div style="
              background:${color};color:white;
              border-radius:50% 50% 50% 0;transform:rotate(-45deg);
              width:32px;height:32px;border:2px solid white;
              box-shadow:0 2px 6px rgba(0,0,0,0.3);
              display:flex;align-items:center;justify-content:center;">
              <span style="transform:rotate(45deg);font-size:13px;font-weight:700;line-height:1;">
                ${sample.sampleType === "water" ? "W" : sample.sampleType === "rock" ? "R" : "S"}
              </span>
            </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -36],
        });

        const photoHtml = (sample.fields as any)?.photo
          ? `<img src="${(sample.fields as any).photo}" style="width:100%;height:80px;object-fit:cover;border-radius:4px;margin-bottom:6px;" />`
          : "";

        L.marker(coords, { icon }).addTo(mapRef.current).bindPopup(`
          <div style="min-width:160px;font-family:system-ui,sans-serif;">
            ${photoHtml}
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="background:${color};color:white;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600;">${label}</span>
              <strong style="font-size:13px;">${sample.sampleId}</strong>
            </div>
            ${(sample.fields as any)?.collectionDate ? `<div style="font-size:11px;color:#666;">📅 ${(sample.fields as any).collectionDate}</div>` : ""}
            <div style="font-size:11px;color:#666;margin-top:2px;">📍 ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}</div>
            <a href="/sample/${sample.id}" style="display:block;margin-top:8px;background:#2d7dd2;color:white;text-align:center;border-radius:4px;padding:4px;font-size:12px;text-decoration:none;">View Sample →</a>
          </div>
        `, { maxWidth: 220 });
      });

      if (bounds.length === 1) map.setView(bounds[0], 12);
      else if (bounds.length > 1) mapRef.current.fitBounds(bounds as any, { padding: [40, 40] });
    });
  }, [samples]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold font-display flex items-center gap-3">
            <MapPin className="text-primary w-8 h-8" />
            Sample Map
          </h1>
          <p className="text-muted-foreground mt-1">
            {samplesWithCoords.length} sample{samplesWithCoords.length !== 1 ? "s" : ""} with GPS coordinates
          </p>
        </div>
        <div className="flex gap-3">
          {Object.entries(typeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5 text-sm">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-muted-foreground capitalize">{typeLabels[type]}</span>
            </div>
          ))}
        </div>
      </div>

      {samplesWithCoords.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 text-center border-2 border-dashed border-border rounded-2xl">
          <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">No GPS data yet</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Samples with GPS coordinates will appear here as pins on the map. Create a new sample and allow location access to get started.
          </p>
        </div>
      ) : (
        <div
          ref={mapContainerRef}
          className="w-full rounded-2xl overflow-hidden border border-border shadow-lg"
          style={{ height: "calc(100vh - 220px)", minHeight: "400px" }}
        />
      )}
    </Layout>
  );
}
