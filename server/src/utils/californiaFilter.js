const CA_BOUNDS = {
  minLat: 32.5,
  maxLat: 42.1,
  minLng: -124.5,
  maxLng: -114.1,
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const isInCalifornia = (latitude, longitude) => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return (
    latitude >= CA_BOUNDS.minLat &&
    latitude <= CA_BOUNDS.maxLat &&
    longitude >= CA_BOUNDS.minLng &&
    longitude <= CA_BOUNDS.maxLng
  );
};

const parseFireDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }
  if (typeof value === 'string') {
    let candidate = value.trim();
    if (!candidate) return null;
    const firmsMatch = candidate.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,4})$/);
    if (firmsMatch) {
      const datePart = firmsMatch[1];
      const timeRaw = firmsMatch[2].padStart(4, '0');
      const hh = timeRaw.slice(0, 2);
      const mm = timeRaw.slice(2, 4);
      candidate = `${datePart}T${hh}:${mm}:00Z`;
    }
    const parsed = new Date(candidate);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  return null;
};

const isWithinLastDays = (value, days = 7) => {
  const d = parseFireDate(value);
  if (!d) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return d.getTime() >= cutoff;
};

// Approximate county labels for NASA points that only give coordinates.
const CA_REGIONS = [
  { name: 'Del Norte County', lat: 41.74, lng: -123.95 },
  { name: 'Siskiyou County', lat: 41.59, lng: -122.54 },
  { name: 'Modoc County', lat: 41.59, lng: -120.72 },
  { name: 'Humboldt County', lat: 40.75, lng: -123.87 },
  { name: 'Trinity County', lat: 40.65, lng: -123.11 },
  { name: 'Shasta County', lat: 40.76, lng: -122.04 },
  { name: 'Lassen County', lat: 40.67, lng: -120.59 },
  { name: 'Tehama County', lat: 40.13, lng: -122.23 },
  { name: 'Plumas County', lat: 40.00, lng: -120.84 },
  { name: 'Mendocino County', lat: 39.55, lng: -123.41 },
  { name: 'Glenn County', lat: 39.60, lng: -122.39 },
  { name: 'Butte County', lat: 39.66, lng: -121.60 },
  { name: 'Sierra County', lat: 39.58, lng: -120.51 },
  { name: 'Lake County', lat: 39.10, lng: -122.75 },
  { name: 'Colusa County', lat: 39.18, lng: -122.24 },
  { name: 'Sutter County', lat: 39.04, lng: -121.69 },
  { name: 'Yuba County', lat: 39.27, lng: -121.35 },
  { name: 'Nevada County', lat: 39.30, lng: -120.77 },
  { name: 'Placer County', lat: 39.06, lng: -120.72 },
  { name: 'El Dorado County', lat: 38.78, lng: -120.52 },
  { name: 'Sonoma County', lat: 38.53, lng: -122.95 },
  { name: 'Napa County', lat: 38.50, lng: -122.33 },
  { name: 'Yolo County', lat: 38.69, lng: -121.90 },
  { name: 'Sacramento County', lat: 38.45, lng: -121.34 },
  { name: 'Amador County', lat: 38.44, lng: -120.65 },
  { name: 'Alpine County', lat: 38.59, lng: -119.82 },
  { name: 'Marin County', lat: 38.05, lng: -122.75 },
  { name: 'Solano County', lat: 38.27, lng: -121.94 },
  { name: 'Calaveras County', lat: 38.20, lng: -120.55 },
  { name: 'Tuolumne County', lat: 38.02, lng: -119.95 },
  { name: 'Mono County', lat: 37.94, lng: -118.88 },
  { name: 'Contra Costa County', lat: 37.92, lng: -121.95 },
  { name: 'San Francisco County', lat: 37.77, lng: -122.45 },
  { name: 'Alameda County', lat: 37.65, lng: -121.91 },
  { name: 'San Mateo County', lat: 37.43, lng: -122.40 },
  { name: 'Santa Clara County', lat: 37.23, lng: -121.69 },
  { name: 'Stanislaus County', lat: 37.56, lng: -120.99 },
  { name: 'San Joaquin County', lat: 37.93, lng: -121.27 },
  { name: 'Mariposa County', lat: 37.58, lng: -119.91 },
  { name: 'Merced County', lat: 37.19, lng: -120.72 },
  { name: 'Madera County', lat: 37.21, lng: -119.76 },
  { name: 'Santa Cruz County', lat: 37.05, lng: -122.00 },
  { name: 'San Benito County', lat: 36.61, lng: -121.07 },
  { name: 'Fresno County', lat: 36.74, lng: -119.79 },
  { name: 'Inyo County', lat: 36.51, lng: -117.41 },
  { name: 'Monterey County', lat: 36.24, lng: -121.31 },
  { name: 'Kings County', lat: 36.07, lng: -119.82 },
  { name: 'Tulare County', lat: 36.13, lng: -118.80 },
  { name: 'San Luis Obispo County', lat: 35.39, lng: -120.43 },
  { name: 'Kern County', lat: 35.34, lng: -118.73 },
  { name: 'Santa Barbara County', lat: 34.54, lng: -120.04 },
  { name: 'Ventura County', lat: 34.36, lng: -119.13 },
  { name: 'Los Angeles County', lat: 34.31, lng: -118.22 },
  { name: 'San Bernardino County', lat: 34.84, lng: -116.18 },
  { name: 'Orange County', lat: 33.70, lng: -117.77 },
  { name: 'Riverside County', lat: 33.74, lng: -115.99 },
  { name: 'San Diego County', lat: 33.02, lng: -116.74 },
  { name: 'Imperial County', lat: 33.04, lng: -115.37 },
];

const nearestCaliforniaCounty = (latitude, longitude) => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  let best = null;
  let bestDist = Infinity;
  for (const region of CA_REGIONS) {
    const dx = region.lat - latitude;
    const dy = region.lng - longitude;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDist) {
      bestDist = d2;
      best = region;
    }
  }
  return best ? best.name : null;
};

const filterCaliforniaRecent = (fires, { days = 7 } = {}) =>
  (fires || []).filter((fire) => {
    if (!isInCalifornia(Number(fire.latitude), Number(fire.longitude))) return false;
    if (!isWithinLastDays(fire.reportedAt, days)) return false;
    return true;
  });

module.exports = {
  CA_BOUNDS,
  SEVEN_DAYS_MS,
  isInCalifornia,
  parseFireDate,
  isWithinLastDays,
  nearestCaliforniaCounty,
  filterCaliforniaRecent,
};
