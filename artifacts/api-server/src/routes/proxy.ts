import { Router } from "express";

const proxyRouter = Router();

// Proxies USDA Soil Data Access (SDA) spatial query — US coverage, avoids CORS
proxyRouter.get("/proxy/soil", async (req, res) => {
  const { lat, lng } = req.query as { lat?: string; lng?: string };
  if (!lat || !lng) {
    return res.status(400).json({ error: "lat and lng required" });
  }

  const query = `
    SELECT TOP 1
      mu.muname,
      c.compname,
      c.comppct_r,
      c.taxclname,
      c.taxorder,
      c.taxsuborder,
      c.drainagecl,
      c.slope_r,
      c.tfact
    FROM mapunit mu
    LEFT JOIN component c
      ON mu.mukey = c.mukey AND c.majcompflag = 'Yes'
    WHERE mu.mukey IN (
      SELECT mukey
      FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('point(${lng} ${lat})')
    )
    ORDER BY c.comppct_r DESC
  `;

  try {
    const response = await fetch(
      "https://SDMDataAccess.sc.egov.usda.gov/tabular/post.rest",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `query=${encodeURIComponent(query)}&format=JSON`,
      }
    );
    if (!response.ok) {
      return res.status(response.status).json({ error: "Upstream soil API error" });
    }
    const data = await response.json() as { Table?: any[][] };

    if (!data?.Table?.length) {
      return res.json({ noData: true });
    }

    const row = data.Table[0];
    return res.json({
      mapUnit:      row[0] ?? null,
      soilSeries:   row[1] ?? null,
      pctComponent: row[2] ?? null,
      taxClass:     row[3] ?? null,
      order:        row[4] ?? null,
      suborder:     row[5] ?? null,
      drainage:     row[6] ?? null,
      slope:        row[7] ?? null,
      tfact:        row[8] ?? null,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch soil data" });
  }
});

// Road camera proxy — fetches 511NY camera list, filters active cameras with live HLS streams
// and returns a bbox-filtered subset to avoid sending all 1500+ cameras to the client.
let roadCamCache: { data: any[]; fetchedAt: number } | null = null;
const CAM_CACHE_TTL = 5 * 60 * 1000; // 5 min

proxyRouter.get("/proxy/roadcams", async (req, res) => {
  const { minLat, maxLat, minLng, maxLng } = req.query as Record<string, string>;

  try {
    // Refresh cache if stale
    if (!roadCamCache || Date.now() - roadCamCache.fetchedAt > CAM_CACHE_TTL) {
      const r = await fetch(
        "https://511ny.org/api/getcameras?key=&format=json&lang=en",
        { headers: { Accept: "application/json" } }
      );
      if (!r.ok) throw new Error("511NY upstream error");
      const raw = (await r.json()) as any[];
      roadCamCache = {
        fetchedAt: Date.now(),
        data: raw
          .filter((c) => !c.Disabled && !c.Blocked && c.VideoUrl && c.Latitude && c.Longitude)
          .map((c) => ({
            id: c.ID as string,
            name: c.Name as string,
            road: c.RoadwayName as string,
            direction: c.DirectionOfTravel as string,
            lat: c.Latitude as number,
            lng: c.Longitude as number,
            videoUrl: c.VideoUrl as string,
          })),
      };
    }

    let cameras = roadCamCache.data;

    // Spatial filter if bbox provided
    if (minLat && maxLat && minLng && maxLng) {
      const [mn_lat, mx_lat, mn_lng, mx_lng] = [minLat, maxLat, minLng, maxLng].map(Number);
      cameras = cameras.filter(
        (c) => c.lat >= mn_lat && c.lat <= mx_lat && c.lng >= mn_lng && c.lng <= mx_lng
      );
    }

    // Cap at 200 cameras per request
    return res.json({ cameras: cameras.slice(0, 200), source: "511ny", total: cameras.length });
  } catch (err) {
    return res.status(502).json({ error: "Failed to fetch road camera data" });
  }
});

export default proxyRouter;
