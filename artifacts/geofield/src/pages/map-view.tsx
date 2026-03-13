import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useGetSamples, useGetFolders } from "@workspace/api-client-react";
import { MapPin, FolderOpen, AlertCircle, Layers, Satellite, Map, Mountain } from "lucide-react";
import { Button } from "@/components/ui/button";
import "maplibre-gl/dist/maplibre-gl.css";

const TYPE_COLORS: Record<string, string> = {
  water: "#2d7dd2",
  rock: "#8b5e3c",
  soil_sand: "#c49a3c",
};
const TYPE_LABELS: Record<string, string> = {
  water: "Water",
  rock: "Rock",
  soil_sand: "Soil/Sand",
};

type BaseLayer = "street" | "satellite";
type OverlayLayer = "none" | "geology" | "soil";

function parseCoords(raw: any): [number, number] | null {
  if (!raw && raw !== 0) return null;
  const str = String(raw).trim();
  if (!str) return null;
  const match = str.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)
      return [lat, lng];
  }
  const nums = str.match(/-?\d+\.?\d*/g);
  if (nums && nums.length >= 2) {
    const lat = parseFloat(nums[0]);
    const lng = parseFloat(nums[1]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)
      return [lat, lng];
  }
  return null;
}

const STREET_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
    terrain: {
      type: "raster-dem" as const,
      tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 15,
      encoding: "terrarium" as const,
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
  terrain: { source: "terrain", exaggeration: 1.5 },
  sky: {
    "sky-color": "#87CEEB",
    "sky-horizon-blend": 0.5,
    "horizon-color": "#f9f5e4",
    "horizon-fog-blend": 0.5,
    "fog-color": "#f9f5e4",
    "fog-ground-blend": 0.5,
  },
};

const SATELLITE_STYLE = {
  ...STREET_STYLE,
  sources: {
    ...STREET_STYLE.sources,
    satellite: {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      maxzoom: 18,
    },
  },
  layers: [{ id: "satellite", type: "raster" as const, source: "satellite" }],
};

const GEO_WMS =
  "https://tiles.macrostrat.org/carto/{z}/{x}/{y}.png";

const SOIL_WMS = `https://maps.isric.org/mapserv?map=/map/wrb.map&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=TRUE&LAYERS=MostProbable&WIDTH=256&HEIGHT=256&CRS=EPSG%3A3857&BBOX={bbox-epsg-3857}`;

interface GeoInfo {
  loading: boolean;
  data?: Record<string, string> | null;
  error?: string;
  lngLat?: [number, number];
}

export default function MapViewPage() {
  const [selectedFolderId, setSelectedFolderId] = useState<number | "all">("all");
  const [baseLayer, setBaseLayer] = useState<BaseLayer>("satellite");
  const [overlayLayer, setOverlayLayer] = useState<OverlayLayer>("none");
  const [geoInfo, setGeoInfo] = useState<GeoInfo | null>(null);
  const [terrain, setTerrain] = useState(true);

  const { data: allSamples } = useGetSamples();
  const { data: folders } = useGetFolders();

  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const popupRef = useRef<any>(null);

  const filteredSamples = (allSamples || []).filter((s) =>
    selectedFolderId === "all" ? true : s.folderId === selectedFolderId
  );
  const samplesWithCoords = filteredSamples.filter((s) =>
    parseCoords((s.fields as any)?.location)
  );
  const samplesWithoutCoords = filteredSamples.filter(
    (s) => !parseCoords((s.fields as any)?.location)
  );

  const rebuildMap = useCallback(
    (L: any, base: BaseLayer, over: OverlayLayer, ter: boolean) => {
      if (!mapContainerRef.current) return;
      const center: [number, number] = mapRef.current
        ? mapRef.current.getCenter().toArray()
        : [-98.35, 39.5];
      const zoom = mapRef.current ? mapRef.current.getZoom() : 4;
      const pitch = mapRef.current ? mapRef.current.getPitch() : 40;
      const bearing = mapRef.current ? mapRef.current.getBearing() : 0;

      if (mapRef.current) {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        mapRef.current.remove();
        mapRef.current = null;
      }

      const style = base === "satellite" ? { ...SATELLITE_STYLE } : { ...STREET_STYLE };
      if (!ter) {
        delete (style as any).terrain;
      }

      if (over === "geology") {
        (style as any).sources["geology"] = {
          type: "raster",
          tiles: [GEO_WMS],
          tileSize: 256,
          attribution: "© Macrostrat",
        };
        (style as any).layers.push({
          id: "geology-overlay",
          type: "raster",
          source: "geology",
          paint: { "raster-opacity": 0.6 },
        });
      }
      if (over === "soil") {
        (style as any).sources["soil"] = {
          type: "raster",
          tiles: [SOIL_WMS],
          tileSize: 256,
          attribution: "© ISRIC World Soil Information",
        };
        (style as any).layers.push({
          id: "soil-overlay",
          type: "raster",
          source: "soil",
          paint: { "raster-opacity": 0.65 },
        });
      }

      const map = new L.Map({
        container: mapContainerRef.current!,
        style,
        center,
        zoom,
        pitch: ter ? pitch : 0,
        bearing,
        maxPitch: ter ? 85 : 0,
        attributionControl: true,
      });
      mapRef.current = map;

      map.addControl(new L.NavigationControl({ visualizePitch: true }), "top-right");
      map.addControl(new L.ScaleControl(), "bottom-left");

      map.on("click", async (e: any) => {
        if (over === "none") return;
        const { lng, lat } = e.lngLat;
        setGeoInfo({ loading: true, data: null, lngLat: [lng, lat] });

        if (over === "geology") {
          try {
            const r = await fetch(
              `https://macrostrat.org/api/v2/geologic_units/burwell?lat=${lat}&lng=${lng}&response=short`
            );
            const d = await r.json();
            const unit = d?.success?.data?.[0];
            if (unit) {
              setGeoInfo({
                loading: false,
                lngLat: [lng, lat],
                data: {
                  "Formation": unit.strat_name_long || unit.map_unit_name || "Unknown",
                  "Age": [unit.t_int_name, unit.b_int_name].filter(Boolean).join(" – ") || "—",
                  "Era": unit.era || "—",
                  "Lithology": unit.lith || "—",
                  "Description": unit.descrip || "—",
                  "Color": unit.color || "—",
                },
              });
            } else {
              setGeoInfo({ loading: false, lngLat: [lng, lat], data: { Note: "No formation data at this location." } });
            }
          } catch {
            setGeoInfo({ loading: false, lngLat: [lng, lat], error: "Failed to load geological data." });
          }
        }

        if (over === "soil") {
          try {
            const r = await fetch(
              `https://casoilresource.lawr.ucdavis.edu/api/point/?lat=${lat}&lon=${lng}`
            );
            const d = await r.json();
            const series = d?.series?.[0];
            if (series) {
              setGeoInfo({
                loading: false,
                lngLat: [lng, lat],
                data: {
                  "Soil Series": series.series || "Unknown",
                  "Taxonomic Class": series.taxclname || "—",
                  "Land Use": series.landuse || "—",
                  "Family": series.family || "—",
                },
              });
            } else {
              setGeoInfo({ loading: false, lngLat: [lng, lat], data: { Note: "No soil data at this location." } });
            }
          } catch {
            setGeoInfo({ loading: false, lngLat: [lng, lat], error: "Soil data unavailable for this location." });
          }
        }
      });

      map.on("load", () => {
        addMarkers(L, map);
      });
    },
    []
  );

  function addMarkers(L: any, map: any) {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }

    const popup = new L.Popup({ closeButton: true, maxWidth: 260 });
    popupRef.current = popup;

    filteredSamples.forEach((sample) => {
      const coords = parseCoords((sample.fields as any)?.location);
      if (!coords) return;

      const color = TYPE_COLORS[sample.sampleType] || "#666";
      const label = TYPE_LABELS[sample.sampleType] || sample.sampleType;
      const letter = sample.sampleType === "water" ? "W" : sample.sampleType === "rock" ? "R" : "S";
      const dateStr = (sample.fields as any)?.collectionDate
        ? new Date((sample.fields as any).collectionDate).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "";
      const photoHtml = (sample.fields as any)?.photo
        ? `<img src="${(sample.fields as any).photo}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:8px;" />`
        : "";

      const el = document.createElement("div");
      el.innerHTML = `<div style="background:${color};color:white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:34px;height:34px;border:2.5px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;cursor:pointer;"><span style="transform:rotate(45deg);font-size:14px;font-weight:700;">${letter}</span></div>`;

      const marker = new L.Marker({ element: el, anchor: "bottom" })
        .setLngLat([coords[1], coords[0]])
        .addTo(map);

      marker.getElement().addEventListener("click", (e: Event) => {
        e.stopPropagation();
        popup
          .setLngLat([coords[1], coords[0]])
          .setHTML(`
            <div style="font-family:system-ui,sans-serif;min-width:180px;">
              ${photoHtml}
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                <span style="background:${color};color:white;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;">${label}</span>
                <strong style="font-size:13px;">${sample.sampleId}</strong>
              </div>
              ${dateStr ? `<div style="font-size:11px;color:#666;margin-bottom:3px;">📅 ${dateStr}</div>` : ""}
              <div style="font-size:11px;color:#666;">📍 ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}</div>
              <a href="/sample/${sample.id}" style="display:block;margin-top:10px;background:${color};color:white;text-align:center;border-radius:6px;padding:5px;font-size:12px;text-decoration:none;font-weight:600;">View Sample →</a>
            </div>
          `)
          .addTo(map);
      });

      markersRef.current.push(marker);
    });

    if (samplesWithCoords.length === 1) {
      const [lat, lng] = parseCoords((samplesWithCoords[0].fields as any)?.location)!;
      map.flyTo({ center: [lng, lat], zoom: 13 });
    } else if (samplesWithCoords.length > 1) {
      const coords = samplesWithCoords
        .map((s) => parseCoords((s.fields as any)?.location))
        .filter(Boolean) as [number, number][];
      const lngs = coords.map((c) => c[1]);
      const lats = coords.map((c) => c[0]);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 80 }
      );
    }
  }

  useEffect(() => {
    let mounted = true;
    import("maplibre-gl").then((L) => {
      if (!mounted || !mapContainerRef.current) return;
      rebuildMap(L, baseLayer, overlayLayer, terrain);
    });
    return () => {
      mounted = false;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    import("maplibre-gl").then((L) => {
      rebuildMap(L, baseLayer, overlayLayer, terrain);
    });
  }, [baseLayer, overlayLayer, terrain]);

  useEffect(() => {
    if (!mapRef.current) return;
    import("maplibre-gl").then((L) => {
      if (mapRef.current?._loaded) addMarkers(L, mapRef.current);
      else mapRef.current?.once("load", () => addMarkers(L, mapRef.current));
    });
  }, [allSamples, selectedFolderId]);

  return (
    <Layout>
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display flex items-center gap-3">
              <MapPin className="text-primary w-8 h-8" />
              3D Geological Map
            </h1>
            <p className="text-muted-foreground mt-1">
              {samplesWithCoords.length} sample{samplesWithCoords.length !== 1 ? "s" : ""} plotted
              {selectedFolderId !== "all" && folders && (
                <span className="ml-1">
                  from <strong>{folders.find((f) => f.id === selectedFolderId)?.name}</strong>
                </span>
              )}
            </p>
          </div>

          {/* Dataset filter */}
          <div className="relative">
            <select
              className="flex items-center pl-8 pr-4 h-9 rounded-lg border border-border bg-card text-sm font-medium shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
              value={selectedFolderId}
              onChange={(e) =>
                setSelectedFolderId(e.target.value === "all" ? "all" : Number(e.target.value))
              }
            >
              <option value="all">All Datasets</option>
              {folders?.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <FolderOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Map Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Base layer */}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setBaseLayer("satellite")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${baseLayer === "satellite" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Satellite className="w-3.5 h-3.5" />
              Satellite
            </button>
            <button
              onClick={() => setBaseLayer("street")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${baseLayer === "street" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Map className="w-3.5 h-3.5" />
              Street
            </button>
          </div>

          {/* 3D terrain toggle */}
          <button
            onClick={() => setTerrain(!terrain)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all shadow-sm ${terrain ? "bg-accent text-accent-foreground border-accent" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
          >
            <Mountain className="w-3.5 h-3.5" />
            3D Terrain
          </button>

          {/* Geological overlay */}
          <div className="relative">
            <select
              className="flex items-center pl-8 pr-4 h-9 rounded-lg border border-border bg-card text-sm font-medium shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
              value={overlayLayer}
              onChange={(e) => {
                setOverlayLayer(e.target.value as OverlayLayer);
                setGeoInfo(null);
              }}
            >
              <option value="none">No Overlay</option>
              <option value="geology">Rock Formations (Macrostrat)</option>
              <option value="soil">Soil Types (SoilGrids)</option>
            </select>
            <Layers className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Legend */}
          <div className="flex gap-3 ml-auto">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-muted-foreground">{TYPE_LABELS[type]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Overlay hint */}
        {overlayLayer !== "none" && (
          <div className="text-xs text-muted-foreground bg-card border border-border rounded-lg px-3 py-2 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
            {overlayLayer === "geology"
              ? "Click anywhere on the map to get rock formation and geological age data."
              : "Click anywhere on the map to get soil classification data."}
          </div>
        )}

        {samplesWithoutCoords.length > 0 && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>{samplesWithoutCoords.length} sample{samplesWithoutCoords.length !== 1 ? "s" : ""} not shown</strong>{" "}
              — no GPS coordinates: {samplesWithoutCoords.map((s) => s.sampleId).join(", ")}.{" "}
              Edit those samples and enter <em>lat, lng</em> (e.g. 40.7128, -74.0060).
            </span>
          </div>
        )}
      </div>

      {/* Map + side panel */}
      <div className="relative flex gap-4" style={{ height: "calc(100vh - 340px)", minHeight: "400px" }}>
        {/* Geo info side panel */}
        {geoInfo && (
          <div className="w-72 shrink-0 bg-card border border-border rounded-2xl shadow-lg overflow-y-auto p-5 space-y-3 z-10">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold font-display text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                {overlayLayer === "geology" ? "Rock Formation Data" : "Soil Data"}
              </h3>
              <button onClick={() => setGeoInfo(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
            </div>
            {geoInfo.lngLat && (
              <p className="text-xs text-muted-foreground">
                📍 {geoInfo.lngLat[1].toFixed(4)}, {geoInfo.lngLat[0].toFixed(4)}
              </p>
            )}
            {geoInfo.loading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 bg-muted animate-pulse rounded" />
                ))}
              </div>
            )}
            {geoInfo.error && (
              <p className="text-sm text-destructive">{geoInfo.error}</p>
            )}
            {geoInfo.data && !geoInfo.loading && (
              <div className="space-y-2.5">
                {Object.entries(geoInfo.data).map(([key, val]) => (
                  <div key={key}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{key}</p>
                    <p className="text-sm text-foreground mt-0.5">{val || "—"}</p>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                  {overlayLayer === "geology" ? "Source: Macrostrat" : "Source: SoilGrids / UC Davis SoilWeb"}
                </p>
              </div>
            )}
          </div>
        )}

        <div
          ref={mapContainerRef}
          className="flex-1 rounded-2xl overflow-hidden border border-border shadow-lg"
        />
      </div>
    </Layout>
  );
}
