// Handles wildfire API requests and delegates data work to the fire service layer.
const asyncHandler = require('../utils/asyncHandler');
const fireService = require('../services/fireService');

const normalizeSourceLabel = (source) => {
  const value = String(source || '').toLowerCase();
  if (value.includes('cal fire')) return 'CAL FIRE';
  if (value.includes('nasa')) return 'NASA FIRMS';
  if (value.includes('seed')) return 'Demo Data';
  return source || 'Unknown';
};

const isThermalDetection = (fire, sourceLabel) =>
  fire?.sourceType === 'thermal_detection' ||
  fire?.sourceType === 'satellite_hotspot' ||
  sourceLabel === 'NASA FIRMS';

// Public payload shape: distinguishes official incidents from satellite thermal
// detections. Frontend uses `displayType` for headlines and `sourceLabel` for
// the small "Source: ..." line.
const normalizeFire = (fire) => {
  if (!fire) return fire;
  const sourceLabel = normalizeSourceLabel(fire.source);
  const isDemoFire = sourceLabel === 'Demo Data';
  const isThermal = isThermalDetection(fire, sourceLabel);
  const confirmed = isThermal || isDemoFire
    ? false
    : typeof fire.confirmed === 'boolean'
      ? fire.confirmed
      : true;
  const sourceType = isThermal
    ? 'thermal_detection'
    : isDemoFire
      ? 'demo_fire'
      : 'confirmed_incident';
  const label = isThermal
    ? 'Thermal Detection'
    : isDemoFire
      ? 'Demo Fire'
      : 'Fire Detected';

  return {
    ...fire,
    sourceLabel,
    confirmed,
    sourceType,
    label,
    demo: isDemoFire || fire.demo === true,
    // Frontend wording rules:
    //   confirmed CAL FIRE / seed incidents → "Official Fire Incident"
    //   NASA FIRMS satellite detections    → "Thermal Detection"
    displayType: isThermal
      ? 'Thermal Detection'
      : isDemoFire
        ? 'Demo Data'
        : 'Official Fire Incident',
    displayBadge: label,
    updatedAt: fire.updatedAt || fire.reportedAt || null,
  };
};

const parseSourceParam = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'calfire' || normalized === 'cal_fire' || normalized === 'cal-fire') {
    return 'calfire';
  }
  if (normalized === 'firms' || normalized === 'nasa' || normalized === 'nasa_firms') {
    return 'firms';
  }
  return null;
};

const parsePositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const buildListOptions = (req) => ({
  includeExternal: req.query.includeExternal === 'true',
  includeHotspots:
    req.query.includeHotspots === 'true' || req.query.hotspots === 'true',
  source: parseSourceParam(req.query.source),
  region: String(req.query.region || '').toLowerCase() || null,
  demo: req.query.demo === 'true' || req.query.demoMode === 'true',
  firmsDays: parsePositiveNumber(req.query.firmsDays, 3),
  firmsConfidence: String(req.query.firmsConfidence || 'medium').toLowerCase(),
  minFrp: parsePositiveNumber(req.query.minFrp, 1),
});

const getEmptyMessage = (options) => {
  const includesThermalLayer =
    options.source === 'firms' || options.includeHotspots || options.includeExternal;
  if (includesThermalLayer) {
    return 'No recent high-confidence thermal detections found for this area.';
  }
  return 'No active official fire incidents found for this area.';
};

const getFires = asyncHandler(async (req, res) => {
  const options = buildListOptions(req);
  const fires = await fireService.listFires(options);
  const data = fires.map(normalizeFire);

  res.status(200).json({
    success: true,
    count: data.length,
    source: options.source || (options.includeExternal || options.includeHotspots ? 'all' : 'calfire'),
    message: data.length === 0 ? getEmptyMessage(options) : undefined,
    data,
  });
});

const getFireById = asyncHandler(async (req, res) => {
  const fire = await fireService.getFireById(req.params.id);
  res.status(200).json({
    success: true,
    data: normalizeFire(fire),
  });
});

const getNearbyFires = asyncHandler(async (req, res) => {
  const options = buildListOptions(req);
  const fires = await fireService.getNearbyFires({
    latitude: Number(req.query.latitude ?? req.query.lat),
    longitude: Number(req.query.longitude ?? req.query.lng),
    radius: req.query.radius ? Number(req.query.radius) : undefined,
    includeExternal: options.includeExternal || options.includeHotspots || options.source === 'firms',
    includeHotspots: options.includeHotspots,
    source: options.source,
    region: options.region,
    demo: options.demo,
    firmsDays: options.firmsDays,
    firmsConfidence: options.firmsConfidence,
    minFrp: options.minFrp,
  });

  const data = fires.map(normalizeFire);
  res.status(200).json({
    success: true,
    count: data.length,
    source: options.source || (options.includeExternal || options.includeHotspots ? 'all' : 'calfire'),
    message: data.length === 0 ? getEmptyMessage(options) : undefined,
    data,
  });
});

module.exports = {
  getFires,
  getFireById,
  getNearbyFires,
};
