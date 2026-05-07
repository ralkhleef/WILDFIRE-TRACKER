// Service for fetching and normalizing active fire data from NASA FIRMS.
const env = require('../config/env');
const {
  isInCalifornia,
  nearestCaliforniaCounty,
  parseFireDate,
} = require('../utils/californiaFilter');

const formatCoord = (n) =>
  Number.isFinite(n) ? n.toFixed(2) : '';

const buildLabel = (latitude, longitude) => {
  const county = nearestCaliforniaCounty(latitude, longitude);
  if (county) {
    return {
      location: `${county}, CA`,
    };
  }
  return {
    location: `${formatCoord(latitude)}, ${formatCoord(longitude)}, CA`,
  };
};

const slugify = (value) =>
  String(value || 'california')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const formatTimeAgo = (dateValue) => {
  const date = parseFireDate(dateValue);
  if (!date) return 'recently';
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
};

const numericOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const confidenceRank = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'h' || normalized === 'high') return 3;
  if (normalized === 'n' || normalized === 'nominal' || normalized === 'medium') return 2;
  if (normalized === 'l' || normalized === 'low') return 1;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const newestByReportedAt = (a, b) => {
  const aTime = parseFireDate(a.reportedAt)?.getTime() || 0;
  const bTime = parseFireDate(b.reportedAt)?.getTime() || 0;
  return bTime - aTime;
};

const groupFirmsDetections = (detections) => {
  const grouped = new Map();

  detections.forEach((detection) => {
    const key = detection.location || 'California';
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        ...detection,
        detections: [detection],
      });
      return;
    }

    current.detections.push(detection);
  });

  return Array.from(grouped.values())
    .map((group) => {
      const detectionsForArea = group.detections.sort(newestByReportedAt);
      const latest = detectionsForArea[0];
      const count = detectionsForArea.length;
      const avgLatitude =
        detectionsForArea.reduce((sum, item) => sum + item.latitude, 0) / count;
      const avgLongitude =
        detectionsForArea.reduce((sum, item) => sum + item.longitude, 0) / count;
      const strongestBrightness = detectionsForArea
        .map((item) => numericOrNull(item.brightness))
        .filter((value) => value !== null)
        .sort((a, b) => b - a)[0];
      const strongestConfidence = detectionsForArea
        .map((item) => item.confidence)
        .sort((a, b) => confidenceRank(b) - confidenceRank(a))[0];
      const timeLabel = formatTimeAgo(latest.reportedAt);
      const subtitle =
        count === 1
          ? `NASA FIRMS hotspot detected ${timeLabel}`
          : `NASA FIRMS hotspot cluster: ${count} detections, latest ${timeLabel}`;

      return {
        ...latest,
        id: `firms-${slugify(group.location)}`,
        name: group.location,
        location: group.location,
        latitude: Number(avgLatitude.toFixed(5)),
        longitude: Number(avgLongitude.toFixed(5)),
        source: 'NASA FIRMS',
        sourceType: 'satellite_hotspot',
        status: 'hotspot',
        subtitle,
        details: subtitle,
        hotspotCount: count,
        brightness:
          typeof strongestBrightness === 'number'
            ? String(strongestBrightness)
            : latest.brightness,
        confidence: strongestConfidence || latest.confidence || null,
        reportedAt: latest.reportedAt,
      };
    })
    .sort(newestByReportedAt);
};

const parseFirmsCsv = (csvText) => {
  const lines = csvText.trim().split('\n');

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',').map((header) => header.trim());

  return lines
    .slice(1)
    .map((line, index) => {
      const values = line.split(',');
      const fire = {};

      headers.forEach((header, valueIndex) => {
        fire[header] = values[valueIndex]?.trim();
      });

      const latitude = Number(fire.latitude);
      const longitude = Number(fire.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      const rawDate =
        fire.acq_date && fire.acq_time
          ? `${fire.acq_date} ${fire.acq_time}`
          : fire.acq_date || null;

      const parsedDate = parseFireDate(rawDate);

      const { location } = buildLabel(latitude, longitude);

      return {
        id: `firms-${index}-${latitude}-${longitude}`,
        name: location,
        location,
        latitude,
        longitude,
        size: null,
        containment: null,
        source: 'NASA FIRMS',
        sourceType: 'satellite_hotspot',
        status: 'hotspot',
        brightness: fire.bright_ti4 || fire.brightness || null,
        confidence: fire.confidence || null,
        satellite: fire.satellite || null,
        reportedAt: parsedDate ? parsedDate.toISOString() : rawDate,
      };
    })
    .filter(Boolean)
    // California-only at the source so we don't ship global hotspots downstream.
    .filter((fire) => isInCalifornia(fire.latitude, fire.longitude));
};

const fetchActiveFires = async () => {
  if (
    !env.nasaFirmsApiUrl ||
    !env.nasaFirmsMapKey ||
    !env.nasaFirmsSource ||
    !env.nasaFirmsArea ||
    !env.nasaFirmsDayRange
  ) {
    return [];
  }

  const url =
    `${env.nasaFirmsApiUrl}/${env.nasaFirmsMapKey}` +
    `/${env.nasaFirmsSource}` +
    `/${env.nasaFirmsArea}` +
    `/${env.nasaFirmsDayRange}`;

  let response;

  try {
    response = await fetch(url);
  } catch (error) {
    console.warn(`NASA FIRMS request failed: ${error.message}`);
    return [];
  }

  if (!response.ok) {
    console.warn(`NASA FIRMS request failed with status ${response.status}.`);
    return [];
  }

  try {
    const csvText = await response.text();
    return groupFirmsDetections(parseFirmsCsv(csvText));
  } catch (error) {
    console.warn(`NASA FIRMS response parsing failed: ${error.message}`);
    return [];
  }
};

module.exports = {
  fetchActiveFires,
};
