const env = require('../config/env');
const {
  CA_BOUNDS,
  isInCalifornia,
  isWithinLastDays,
  nearestCaliforniaCounty,
  parseFireDate,
} = require('../utils/californiaFilter');

const formatCoord = (n) =>
  Number.isFinite(n) ? n.toFixed(2) : '';

const FIRMS_DEFAULT_AREA = `${CA_BOUNDS.minLng},${CA_BOUNDS.minLat},${CA_BOUNDS.maxLng},${CA_BOUNDS.maxLat}`;
const FIRMS_DEFAULT_SOURCE = 'VIIRS_SNPP_NRT';
const FIRMS_DEFAULT_DAY_RANGE = 3;
const FIRMS_DEFAULT_CONFIDENCE = 'medium';
const FIRMS_DEFAULT_MIN_FRP = 1;
const STRONG_NOMINAL_BRIGHTNESS = 330;
const roundToQuarter = (value) => Math.round(value * 4) / 4;

const buildLabel = (latitude, longitude) => {
  const county = nearestCaliforniaCounty(latitude, longitude);
  const coordKey = `coord:${roundToQuarter(latitude)},${roundToQuarter(longitude)}`;
  if (county) {
    return {
      location: `${county}, CA`,
      clusterKey: coordKey,
    };
  }
  return {
    location: `Thermal detection at ${formatCoord(latitude)}, ${formatCoord(longitude)}`,
    clusterKey: coordKey,
  };
};

const slugify = (value) =>
  String(value || 'california')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

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

const getConfidenceCode = (value) => String(value || '').trim().toLowerCase();

const getDetectionFrp = (fire) =>
  numericOrNull(fire.frp ?? fire.FRP ?? fire.power ?? fire.fire_radiative_power);

const getDetectionBrightness = (fire) =>
  numericOrNull(fire.bright_ti4 ?? fire.bright_ti5 ?? fire.brightness);

const hasAcceptableConfidence = (fire, options) => {
  const confidence = getConfidenceCode(fire.confidence);
  const frp = getDetectionFrp(fire);
  const brightness = getDetectionBrightness(fire);
  const minFrp = options.minFrp;

  if (confidence === 'h' || confidence === 'high') return true;
  if (confidence === 'l' || confidence === 'low') return false;

  if (options.confidence === 'high') return false;

  if (confidence === 'n' || confidence === 'nominal' || confidence === 'medium') {
    return (
      (typeof frp === 'number' && frp >= minFrp) ||
      (typeof brightness === 'number' && brightness >= STRONG_NOMINAL_BRIGHTNESS)
    );
  }

  const numericConfidence = Number(confidence);
  if (Number.isFinite(numericConfidence)) {
    if (numericConfidence >= 80) return true;
    if (numericConfidence < 50) return false;
    return (
      options.confidence !== 'high' &&
      ((typeof frp === 'number' && frp >= minFrp) ||
        (typeof brightness === 'number' && brightness >= STRONG_NOMINAL_BRIGHTNESS))
    );
  }

  return false;
};

const newestByReportedAt = (a, b) => {
  const aTime = parseFireDate(a.reportedAt)?.getTime() || 0;
  const bTime = parseFireDate(b.reportedAt)?.getTime() || 0;
  return bTime - aTime;
};

const groupFirmsDetections = (detections) => {
  const grouped = new Map();

  detections.forEach((detection) => {
    const key =
      detection.clusterKey ||
      `coord:${roundToQuarter(detection.latitude)},${roundToQuarter(detection.longitude)}`;
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
      const subtitle =
        count === 1
          ? '1 satellite heat signature detected'
          : `${count} satellite heat signatures detected`;

      return {
        ...latest,
        id: `firms-${slugify(group.clusterKey || group.location)}`,
        name: 'Thermal Detection',
        location: group.location,
        latitude: Number(avgLatitude.toFixed(5)),
        longitude: Number(avgLongitude.toFixed(5)),
        source: 'NASA FIRMS',
        sourceType: 'thermal_detection',
        label: 'Thermal Detection',
        status: 'thermal_detection',
        confirmed: false,
        subtitle,
        details: subtitle,
        thermalDetectionCount: count,
        brightness: typeof strongestBrightness === 'number' ? String(strongestBrightness) : latest.brightness,
        frp: latest.frp || null,
        confidence: strongestConfidence || latest.confidence || null,
        reportedAt: latest.reportedAt,
      };
    })
    .sort(newestByReportedAt);
};

const parseFirmsCsv = (csvText, options) => {
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
      if (!parsedDate || !isWithinLastDays(parsedDate, options.days)) {
        return null;
      }

      if (!hasAcceptableConfidence(fire, options)) {
        return null;
      }

      const { location, clusterKey } = buildLabel(latitude, longitude);

      return {
        id: `firms-${index}-${latitude}-${longitude}`,
        name: location,
        location,
        clusterKey,
        latitude,
        longitude,
        size: null,
        containment: null,
        source: 'NASA FIRMS',
        sourceType: 'thermal_detection',
        label: 'Thermal Detection',
        status: 'thermal_detection',
        confirmed: false,
        subtitle: 'NASA FIRMS satellite thermal detection',
        details: 'NASA FIRMS satellite thermal detection. Not a confirmed wildfire incident.',
        brightness: fire.bright_ti4 || fire.brightness || null,
        frp: fire.frp || null,
        confidence: fire.confidence || null,
        satellite: fire.satellite || null,
        reportedAt: parsedDate ? parsedDate.toISOString() : rawDate,
      };
    })
    .filter(Boolean)
    // Keep the UI focused on California even if FIRMS returns wider data.
    .filter((fire) => isInCalifornia(fire.latitude, fire.longitude));
};

const normalizeOptions = (options = {}) => {
  const days = Math.min(5, Math.max(1, Number(options.firmsDays) || FIRMS_DEFAULT_DAY_RANGE));
  const confidence = String(options.firmsConfidence || FIRMS_DEFAULT_CONFIDENCE).toLowerCase();
  const minFrp = Math.max(0, Number(options.minFrp) || FIRMS_DEFAULT_MIN_FRP);
  return {
    days,
    confidence: confidence === 'medium' || confidence === 'nominal' || confidence === 'all'
      ? 'medium'
      : 'high',
    minFrp,
  };
};

const fetchActiveFires = async (options = {}) => {
  if (!env.nasaFirmsApiUrl || !env.nasaFirmsMapKey) {
    return [];
  }

  const normalizedOptions = normalizeOptions(options);
  const source = env.nasaFirmsSource || FIRMS_DEFAULT_SOURCE;
  const area = env.nasaFirmsArea || FIRMS_DEFAULT_AREA;
  const dayRange = normalizedOptions.days;

  const url =
    `${env.nasaFirmsApiUrl}/${env.nasaFirmsMapKey}` +
    `/${source}` +
    `/${area}` +
    `/${dayRange}`;

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
    return groupFirmsDetections(parseFirmsCsv(csvText, normalizedOptions));
  } catch (error) {
    console.warn(`NASA FIRMS response parsing failed: ${error.message}`);
    return [];
  }
};

module.exports = {
  fetchActiveFires,
};
