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

// National Park webcam proxy — fetches from the NPS API and caches aggressively
// to stay within the DEMO_KEY rate limit (50 req/day). Cache TTL = 60 min.
let parkCamCache: { data: any[]; fetchedAt: number } | null = null;
const PARK_CAM_TTL = 60 * 60 * 1000; // 60 min

proxyRouter.get("/proxy/parkcams", async (req, res) => {
  const { minLat, maxLat, minLng, maxLng } = req.query as Record<string, string>;

  try {
    if (!parkCamCache || Date.now() - parkCamCache.fetchedAt > PARK_CAM_TTL) {
      const r = await fetch(
        "https://developer.nps.gov/api/v1/webcams?api_key=DEMO_KEY&limit=500",
        { headers: { Accept: "application/json" } }
      );
      if (!r.ok) throw new Error(`NPS API error: ${r.status}`);
      const raw = (await r.json()) as { data: any[] };

      parkCamCache = {
        fetchedAt: Date.now(),
        data: raw.data
          .filter((c) => c.latitude && c.longitude && c.status !== "Inactive")
          .map((c) => {
            // NPS API bug: image URL sometimes has double "https://www.nps.gov" prefix
            const rawImgUrl: string = c.images?.[0]?.url ?? "";
            const imageUrl = rawImgUrl
              ? rawImgUrl.replace("https://www.nps.govhttps://", "https://")
              : null;
            return {
              id: c.id as string,
              title: c.title as string,
              park: (c.relatedParks?.[0]?.fullName ?? "National Park") as string,
              parkCode: (c.relatedParks?.[0]?.parkCode ?? "") as string,
              lat: parseFloat(c.latitude),
              lng: parseFloat(c.longitude),
              status: c.status as string,
              isStreaming: !!c.isStreaming,
              imageUrl,
              viewerUrl: c.url as string,
              credit: c.credit as string | null,
            };
          }),
      };
    }

    let cameras = parkCamCache.data;

    if (minLat && maxLat && minLng && maxLng) {
      const [mn_lat, mx_lat, mn_lng, mx_lng] = [minLat, maxLat, minLng, maxLng].map(Number);
      cameras = cameras.filter(
        (c) => c.lat >= mn_lat && c.lat <= mx_lat && c.lng >= mn_lng && c.lng <= mx_lng
      );
    }

    return res.json({ cameras, source: "nps", total: cameras.length });
  } catch (err) {
    return res.status(502).json({ error: "Failed to fetch NPS webcam data" });
  }
});

export default proxyRouter;
