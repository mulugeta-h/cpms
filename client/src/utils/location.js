// utils/location.js

/**
 * Parse a locationCoordinate string into { lat, lng } or null.
 * Accepts formats like:
 *   "9.0301,38.7400"
 *   "9.0301, 38.7400"
 *   "9.0301 38.7400"
 *   "lat:9.0301 lng:38.7400"
 *   "9°1'48.4\"N 38°44'24.0\"E"   (DMS — best-effort)
 */
export function parseCoordinate(input) {
  if (!input) return null;
  if (typeof input === "object" && input.lat != null && input.lng != null) {
    const lat = Number(input.lat);
    const lng = Number(input.lng);
    return isValidLatLng(lat, lng) ? { lat, lng } : null;
  }

  const str = String(input).trim();
  if (!str) return null;

  // Try DMS: e.g. 9°1'48.4"N 38°44'24.0"E
  const dms = str.match(
    /(\d+)[°d]\s*(\d+)?['′m]?\s*(\d+(?:\.\d+)?)?["″s]?\s*([NS])[,\s]+(\d+)[°d]\s*(\d+)?['′m]?\s*(\d+(?:\.\d+)?)?["″s]?\s*([EW])/i
  );
  if (dms) {
    const [, d1, m1, s1, dir1, d2, m2, s2, dir2] = dms;
    const lat = dmsToDec(Number(d1), Number(m1 || 0), Number(s1 || 0), dir1);
    const lng = dmsToDec(Number(d2), Number(m2 || 0), Number(s2 || 0), dir2);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // Try plain "lat,lng" or "lat lng"
  const numMatch = str.match(
    /(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/
  );
  if (numMatch) {
    const lat = Number(numMatch[1]);
    const lng = Number(numMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  return null;
}

function dmsToDec(deg, min, sec, dir) {
  let dec = deg + min / 60 + sec / 3600;
  if (dir && /[SW]/i.test(dir)) dec = -dec;
  return dec;
}

function isValidLatLng(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/* ---------- Map URL builders ---------- */

export function googleMapsUrl({ lat, lng }) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function googleEarthUrl({ lat, lng }) {
  // KML placemark — opens in Google Earth Pro or Earth Web
  return `https://earth.google.com/web/search/${lat},${lng}`;
}

/**
 * On mobile → open the Google Maps app URL scheme
 * (falls back to the web URL if no app).
 */
export function openLocationOnMap(input, { provider = "maps" } = {}) {
  const coords = parseCoordinate(input);
  if (!coords) return false;

  const webUrl =
    provider === "earth" ? googleEarthUrl(coords) : googleMapsUrl(coords);

  // Detect mobile
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    );

  if (isMobile && provider === "maps") {
    // Google Maps app scheme
    window.location.href = `geo:${coords.lat},${coords.lng}?q=${coords.lat},${coords.lng}(Location)`;
    // Fallback after a short delay if geo: not handled
    setTimeout(() => {
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }, 800);
  } else {
    window.open(webUrl, "_blank", "noopener,noreferrer");
  }

  return true;
}