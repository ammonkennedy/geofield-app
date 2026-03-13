import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/Layout";
import {
  MapPin, Plus, Trash2, Save, Map, X, Navigation, Edit3, Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import "maplibre-gl/dist/maplibre-gl.css";

interface PlannedSite {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  addedAt: string;
}

interface TripPlan {
  name: string;
  notes: string;
  sites: PlannedSite[];
  updatedAt: string;
}

const STORAGE_KEY = "geofield_trip_plan";

function loadPlan(): TripPlan {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TripPlan;
  } catch {}
  return { name: "", notes: "", sites: [], updatedAt: new Date().toISOString() };
}

function savePlan(plan: TripPlan) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...plan, updatedAt: new Date().toISOString() }));
}

function SitePickerMap({
  onAddSite,
  existingSites,
}: {
  onAddSite: (site: Omit<PlannedSite, "id" | "addedAt">) => void;
  existingSites: PlannedSite[];
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const pendingPopupRef = useRef<any>(null);
  const [pendingCoords, setPendingCoords] = useState<[number, number] | null>(null);
  const [siteName, setSiteName] = useState("");
  const [siteDesc, setSiteDesc] = useState("");

  const addMarkerForSite = useCallback((L: any, map: any, site: PlannedSite) => {
    const el = document.createElement("div");
    el.innerHTML = `
      <div style="background:#155e4e;color:white;border-radius:50%;width:28px;height:28px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:14px;">⭐</div>
    `;
    const marker = new L.Marker({ element: el, anchor: "center" })
      .setLngLat([site.lng, site.lat])
      .addTo(map);
    const popup = new L.Popup({ closeButton: false, offset: [0, -16] })
      .setHTML(`<div style="font-family:system-ui,sans-serif;min-width:130px;"><strong>${site.name}</strong>${site.description ? `<br/><span style="font-size:12px;color:#666;">${site.description}</span>` : ""}</div>`);
    marker.getElement().addEventListener("mouseenter", () => popup.setLngLat([site.lng, site.lat]).addTo(map));
    marker.getElement().addEventListener("mouseleave", () => popup.remove());
    markersRef.current.push(marker);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    import("maplibre-gl").then((L) => {
      if (!mapContainerRef.current || mapRef.current) return;
      const map = new L.Map({
        container: mapContainerRef.current!,
        style: {
          version: 8 as const,
          sources: {
            satellite: {
              type: "raster" as const,
              tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
              tileSize: 256,
              attribution: "© Esri",
            },
            terrain: {
              type: "raster-dem" as const,
              tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
              tileSize: 256,
              maxzoom: 15,
              encoding: "terrarium" as const,
            },
          },
          layers: [{ id: "satellite", type: "raster" as const, source: "satellite" }],
          terrain: { source: "terrain", exaggeration: 1.3 },
        },
        center: [-98.35, 39.5],
        zoom: 4,
        pitch: 30,
      });
      mapRef.current = map;
      map.addControl(new L.NavigationControl({ visualizePitch: true }), "top-right");

      map.on("load", () => {
        existingSites.forEach((s) => addMarkerForSite(L, map, s));
      });

      map.getCanvas().style.cursor = "crosshair";

      map.on("click", (e: any) => {
        const { lng, lat } = e.lngLat;
        setPendingCoords([lat, lng]);
        setSiteName("");
        setSiteDesc("");
      });
    });
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  const handleAddSite = () => {
    if (!pendingCoords || !siteName.trim()) return;
    onAddSite({ name: siteName.trim(), description: siteDesc.trim(), lat: pendingCoords[0], lng: pendingCoords[1] });
    setPendingCoords(null);
    setSiteName("");
    setSiteDesc("");
    // Add star marker on map
    import("maplibre-gl").then((L) => {
      if (!mapRef.current) return;
      const fakeSite: PlannedSite = {
        id: "preview",
        name: siteName.trim(),
        description: siteDesc.trim(),
        lat: pendingCoords![0],
        lng: pendingCoords![1],
        addedAt: new Date().toISOString(),
      };
      addMarkerForSite(L, mapRef.current, fakeSite);
    });
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="absolute inset-0 rounded-2xl overflow-hidden" />

      {/* Instructions overlay */}
      {!pendingCoords && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-card/95 backdrop-blur border border-border rounded-xl px-4 py-2.5 shadow-lg text-sm flex items-center gap-2 pointer-events-none">
          <Navigation className="w-4 h-4 text-primary" />
          Click anywhere on the map to place a sample site
        </div>
      )}

      {/* Site form popup */}
      {pendingCoords && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-card border border-border rounded-2xl shadow-xl p-5 w-80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold font-display flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              New Sample Site
            </h3>
            <button onClick={() => setPendingCoords(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3 font-mono">
            {pendingCoords[0].toFixed(5)}, {pendingCoords[1].toFixed(5)}
          </p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Site Name *</Label>
              <Input
                autoFocus
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. River Outcrop A"
                onKeyDown={(e) => e.key === "Enter" && handleAddSite()}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description (Optional)</Label>
              <Textarea
                value={siteDesc}
                onChange={(e) => setSiteDesc(e.target.value)}
                placeholder="Target lithology, accessibility notes..."
                className="h-20 resize-none text-sm"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleAddSite}
              disabled={!siteName.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Sample Site
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TripPlannerPage() {
  const [plan, setPlan] = useState<TripPlan>(loadPlan);
  const [mapOpen, setMapOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const updatePlan = (updates: Partial<TripPlan>) => {
    setPlan((prev) => {
      const next = { ...prev, ...updates };
      savePlan(next);
      return next;
    });
  };

  const handleSave = () => {
    savePlan(plan);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addSite = (site: Omit<PlannedSite, "id" | "addedAt">) => {
    const newSite: PlannedSite = {
      ...site,
      id: `site_${Date.now()}`,
      addedAt: new Date().toISOString(),
    };
    updatePlan({ sites: [...plan.sites, newSite] });
  };

  const removeSite = (id: string) => {
    updatePlan({ sites: plan.sites.filter((s) => s.id !== id) });
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display flex items-center gap-3">
              <Bookmark className="text-primary w-8 h-8" />
              Plan a Trip
            </h1>
            <p className="text-muted-foreground mt-1">
              Write your field plan and mark future sample sites on the map.
            </p>
          </div>
          <Button onClick={handleSave} variant={saved ? "default" : "outline"} className="gap-2 shrink-0">
            <Save className="w-4 h-4" />
            {saved ? "Saved!" : "Save Plan"}
          </Button>
        </div>

        {/* Trip name */}
        <div className="space-y-2 mb-6">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trip Name</Label>
          <Input
            value={plan.name}
            onChange={(e) => updatePlan({ name: e.target.value })}
            placeholder="e.g. Summer 2024 Granite Belt Survey"
            className="text-lg font-medium h-12"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2 mb-8">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Edit3 className="w-3.5 h-3.5" />
            Field Notes &amp; Plans
          </Label>
          <Textarea
            value={plan.notes}
            onChange={(e) => updatePlan({ notes: e.target.value })}
            placeholder={`Write your field plan here...\n\nObjectives, equipment checklist, safety notes, target formations, permits needed, weather windows, team assignments — anything relevant to this trip.`}
            className="min-h-64 text-sm leading-relaxed resize-y"
          />
          <p className="text-xs text-muted-foreground">Auto-saved to your browser. Use Export Excel on individual datasets to save data permanently.</p>
        </div>

        {/* Sample Sites */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold font-display flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Planned Sample Sites
              {plan.sites.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-1">({plan.sites.length})</span>
              )}
            </h2>
            <Button onClick={() => setMapOpen(true)} className="gap-2">
              <Map className="w-4 h-4" />
              Add Sample Sites
            </Button>
          </div>

          {plan.sites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-2xl text-center">
              <MapPin className="w-10 h-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-base">No sites planned yet</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                Click "Add Sample Sites" to open the map and pin your future collection spots.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {plan.sites.map((site, idx) => (
                <div
                  key={site.id}
                  className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold font-display shrink-0 text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{site.name}</p>
                    {site.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{site.description}</p>
                    )}
                    <p className="text-xs font-mono text-muted-foreground mt-1.5">
                      📍 {site.lat.toFixed(5)}, {site.lng.toFixed(5)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeSite(site.id)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map modal */}
      {mapOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden" style={{ height: "85vh" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="font-display font-bold text-xl flex items-center gap-2">
                  <Map className="w-5 h-5 text-primary" />
                  Pick Sample Sites
                </h2>
                <p className="text-sm text-muted-foreground">Click anywhere on the 3D map to pin a future sample location</p>
              </div>
              <div className="flex items-center gap-3">
                {plan.sites.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {plan.sites.length} site{plan.sites.length !== 1 ? "s" : ""} planned
                  </span>
                )}
                <Button variant="outline" onClick={() => setMapOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
            <div className="flex-1 p-4">
              <SitePickerMap onAddSite={addSite} existingSites={plan.sites} />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
