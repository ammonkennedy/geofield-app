export interface UTMResult {
  zone: number;
  letter: string;
  easting: number;
  northing: number;
  hemisphere: "N" | "S";
  display: string;
}

export function latLngToUTM(lat: number, lng: number): UTMResult {
  // WGS84 ellipsoid constants
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const b = a * (1 - f);
  const e2 = 1 - (b * b) / (a * a);
  const ep2 = (a * a - b * b) / (b * b);
  const k0 = 0.9996;
  const E0 = 500000;

  const zone = Math.floor((lng + 180) / 6) + 1;
  const lngOriginRad = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) ** 2);
  const T = Math.tan(latRad) ** 2;
  const C = ep2 * Math.cos(latRad) ** 2;
  const A = Math.cos(latRad) * (lngRad - lngOriginRad);

  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * latRad -
      ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * latRad) +
      ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * latRad) -
      ((35 * e2 ** 3) / 3072) * Math.sin(6 * latRad));

  const easting =
    k0 *
      N *
      (A +
        ((1 - T + C) * A ** 3) / 6 +
        ((5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5) / 120) +
    E0;

  const N0 = lat < 0 ? 10000000 : 0;
  const northing =
    k0 *
      (M +
        N *
          Math.tan(latRad) *
          (A ** 2 / 2 +
            ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 +
            ((61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6) / 720)) +
    N0;

  const letters = "CDEFGHJKLMNPQRSTUVWX";
  const letterIdx = Math.max(0, Math.min(Math.floor((lat + 80) / 8), 19));
  const letter =
    lat >= 84 ? "Z" : lat <= -80 ? "A" : letters[letterIdx];

  const e = Math.round(easting);
  const n = Math.round(northing);
  const hemisphere: "N" | "S" = lat >= 0 ? "N" : "S";

  return {
    zone,
    letter,
    easting: e,
    northing: n,
    hemisphere,
    display: `${zone}${letter}  ${e.toLocaleString()}E  ${n.toLocaleString()}N`,
  };
}

export function parseCoords(raw: unknown): [number, number] | null {
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
