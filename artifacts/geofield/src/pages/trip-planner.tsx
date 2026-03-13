import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import {
  MapPin, Plus, Trash2, Save, Map, X, Navigation, Edit3, Bookmark, ChevronLeft,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import "maplibre-gl/dist/maplibre-gl.css";

export interface PlannedSite {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  addedAt: string;
}

export interface Trip {
  id: string;
  name: string;
  notes: string;
  sites: PlannedSite[];
  createdAt: string;
  updatedAt: string;
}

const TRIPS_KEY = "geofield_trips";

export function loadTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(TRIPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveTrips(trips: Trip[]) {
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
  window.dispatchEvent(new CustomEvent("trips-updated"));
}

// ── Site Picker Map (embedded) ────────────────────────────────────────────────
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
  const [pendingCoords, setPendingCoords] = useState<[number, number] | null>(null);
  const [siteName, setSiteName] = useState("");
  const [siteDesc, setSiteDesc] = useState("");

  useEffect(() => {
    // Delay initialization so the container has rendered with proper dimensions
    const timer = setTimeout(() => {
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
          pitch: 25,
          maxPitch: 85,
        });
        mapRef.current = map;
        map.addControl(new L.NavigationControl({ visualizePitch: true }), "top-right");
        map.getCanvas().style.cursor = "crosshair";

        // Add existing site markers
        map.on("load", () => {
          existingSites.forEach((s) => addSiteMarker(L, map, s));
        });

        map.on("click", (e: any) => {
          const { lng, lat } = e.lngLat;
          setPendingCoords([lat, lng]);
          setSiteName("");
          setSiteDesc("");
        });
      });
    }, 200);

    return () => {
      clearTimeout(timer);
      markersRef.current.forEach((m) => { try { m.remove(); } catch {} });
      markersRef.current = [];
      if (mapRef.current) { try { mapRef.current.remove(); } catch {} mapRef.current = null; }
    };
  }, []);

  function addSiteMarker(L: any, map: any, site: { name: string; lat: number; lng: number; description?: string }) {
    const el = document.createElement("div");
    el.style.cssText = "display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:#155e4e;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);font-size:15px;cursor:pointer;";
    el.textContent = "⭐";

    const popup = new L.Popup({ closeButton: false, offset: [0, -18] }).setHTML(
      `<div style="font-family:system-ui,sans-serif;"><strong>${site.name}</strong>${site.description ? `<br/><span style="font-size:12px;color:#555;">${site.description}</span>` : ""}<br/><span style="font-size:11px;color:#888;">${site.lat.toFixed(5)}, ${site.lng.toFixed(5)}</span></div>`
    );

    const marker = new L.Marker({ element: el, anchor: "center" }).setLngLat([site.lng, site.lat]).addTo(map);
    el.addEventListener("mouseenter", () => popup.setLngLat([site.lng, site.lat]).addTo(map));
    el.addEventListener("mouseleave", () => { try { popup.remove(); } catch {} });
    markersRef.current.push(marker);
    return marker;
  }

  const handleAddSite = () => {
    if (!pendingCoords || !siteName.trim()) return;
    const site: Omit<PlannedSite, "id" | "addedAt"> = {
      name: siteName.trim(),
      description: siteDesc.trim(),
      lat: pendingCoords[0],
      lng: pendingCoords[1],
    };
    onAddSite(site);
    // Add marker to map
    import("maplibre-gl").then((L) => {
      if (mapRef.current) addSiteMarker(L, mapRef.current, { ...site });
    });
    setPendingCoords(null);
    setSiteName("");
    setSiteDesc("");
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="absolute inset-0" />

      {!pendingCoords && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-card/95 backdrop-blur border border-border rounded-xl px-4 py-2.5 shadow-lg text-sm flex items-center gap-2 pointer-events-none">
          <Navigation className="w-4 h-4 text-primary" />
          Click anywhere on the map to pin a sample site
        </div>
      )}

      {pendingCoords && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-card border border-border rounded-2xl shadow-xl p-5 w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold font-display flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4 text-primary" />
              New Sample Site
            </h3>
            <button onClick={() => setPendingCoords(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3 font-mono bg-muted/50 rounded px-2 py-1">
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
                placeholder="Target lithology, access notes..."
                className="h-20 resize-none text-sm"
              />
            </div>
            <Button className="w-full gap-2" onClick={handleAddSite} disabled={!siteName.trim()}>
              <Plus className="w-4 h-4" />
              Add Sample Site
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Trip Planner Page ────────────────────────────────────────────────────
export default function TripPlannerPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, setLocation] = useLocation();
  const [trips, setTrips] = useState<Trip[]>(loadTrips);
  const [mapOpen, setMapOpen] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  // Create a new trip when navigating to /trip/new
  useEffect(() => {
    if (tripId === "new") {
      const newTrip: Trip = {
        id: `trip_${Date.now()}`,
        name: "New Trip",
        notes: "",
        sites: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updated = [...loadTrips(), newTrip];
      saveTrips(updated);
      setTrips(updated);
      setLocation(`/trip/${newTrip.id}`, { replace: true });
    }
  }, [tripId]);

  const activeTrip = tripId && tripId !== "new" ? trips.find((t) => t.id === tripId) : null;

  const updateTrip = (updates: Partial<Trip>) => {
    const updated = trips.map((t) =>
      t.id === activeTrip?.id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    );
    saveTrips(updated);
    setTrips(updated);
  };

  const handleSave = () => {
    if (!activeTrip) return;
    updateTrip({});
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  };

  const deleteTrip = () => {
    if (!activeTrip) return;
    if (!confirm(`Delete "${activeTrip.name}"? This cannot be undone.`)) return;
    const updated = trips.filter((t) => t.id !== activeTrip.id);
    saveTrips(updated);
    setTrips(updated);
    setLocation(updated.length > 0 ? `/trip/${updated[updated.length - 1].id}` : "/");
  };

  const addSite = (site: Omit<PlannedSite, "id" | "addedAt">) => {
    if (!activeTrip) return;
    const newSite: PlannedSite = { ...site, id: `site_${Date.now()}`, addedAt: new Date().toISOString() };
    updateTrip({ sites: [...activeTrip.sites, newSite] });
  };

  const removeSite = (id: string) => {
    if (!activeTrip) return;
    updateTrip({ sites: activeTrip.sites.filter((s) => s.id !== id) });
  };

  // No active trip yet (loading state or navigating)
  if (!activeTrip && tripId !== "new") {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-80 text-center">
          <Bookmark className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">No trip selected</h2>
          <p className="text-muted-foreground mt-2">Create a new trip from the sidebar.</p>
          <Button className="mt-6 gap-2" onClick={() => setLocation("/trip/new")}>
            <Plus className="w-4 h-4" /> New Trip
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold font-display flex items-center gap-3 mb-1">
              <Bookmark className="text-primary w-8 h-8 shrink-0" />
              <span className="truncate">{activeTrip?.name || "Loading..."}</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              {activeTrip?.sites.length ?? 0} planned site{(activeTrip?.sites.length ?? 0) !== 1 ? "s" : ""}
              {activeTrip?.updatedAt && ` · Saved ${new Date(activeTrip.updatedAt).toLocaleDateString()}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/20 hover:bg-destructive/10"
              onClick={deleteTrip}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button onClick={handleSave} variant={saveFlash ? "default" : "outline"} className="gap-2">
              <Save className="w-4 h-4" />
              {saveFlash ? "Saved!" : "Save"}
            </Button>
          </div>
        </div>

        {/* Trip name */}
        <div className="space-y-2 mb-6">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trip Name</Label>
          <Input
            value={activeTrip?.name ?? ""}
            onChange={(e) => updateTrip({ name: e.target.value })}
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
            value={activeTrip?.notes ?? ""}
            onChange={(e) => updateTrip({ notes: e.target.value })}
            placeholder={`Write your field plan here...\n\nObjectives, equipment checklist, safety notes, target formations, permits needed, weather windows, team assignments...`}
            className="min-h-64 text-sm leading-relaxed resize-y"
          />
        </div>

        {/* Sample Sites */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold font-display flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Planned Sample Sites
              {(activeTrip?.sites.length ?? 0) > 0 && (
                <span className="text-sm font-normal text-muted-foreground">({activeTrip?.sites.length})</span>
              )}
            </h2>
            <Button onClick={() => setMapOpen(true)} className="gap-2">
              <Map className="w-4 h-4" />
              Add Sample Sites
            </Button>
          </div>

          {(activeTrip?.sites.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-2xl text-center">
              <MapPin className="w-10 h-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold">No sites planned yet</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                Click "Add Sample Sites" to pin future collection spots on the map.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTrip?.sites.map((site, idx) => (
                <div key={site.id} className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border shadow-sm">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold font-display text-sm shrink-0">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="bg-card rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden"
            style={{ height: "85vh" }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="font-display font-bold text-xl flex items-center gap-2">
                  <Map className="w-5 h-5 text-primary" />
                  Pick Sample Sites
                </h2>
                <p className="text-sm text-muted-foreground">Click anywhere on the 3D map to place a future sample site</p>
              </div>
              <div className="flex items-center gap-3">
                {(activeTrip?.sites.length ?? 0) > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {activeTrip?.sites.length} site{(activeTrip?.sites.length ?? 0) !== 1 ? "s" : ""} planned
                  </span>
                )}
                <Button onClick={() => setMapOpen(false)}>Done</Button>
              </div>
            </div>
            <div className="flex-1 relative overflow-hidden p-4">
              <div className="absolute inset-4 rounded-2xl overflow-hidden border border-border shadow-lg">
                <SitePickerMap onAddSite={addSite} existingSites={activeTrip?.sites ?? []} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
