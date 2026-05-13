// National Weather Service alerts service.
// Pulls wildfire-relevant alerts (Red Flag Warning, Fire Weather Watch,
// Extreme Fire Danger, Evacuation Orders) and normalizes them for the
// frontend. Network errors return [] rather than throwing, so the route
// degrades gracefully if NWS is unreachable.
const env = require('../config/env');

const FIRE_ALERT_KEYWORDS = [
  'red flag warning',
  'fire weather watch',
  'extreme fire danger',
  'fire weather',
  'wildfire',
  'evacuation',
];

const isFireRelevant = (event) => {
  if (!event) return false;
  const normalized = String(event).toLowerCase();
  return FIRE_ALERT_KEYWORDS.some((word) => normalized.includes(word));
};

// Look up severity in priority order so the frontend can show colored chips.
const severityForEvent = (event) => {
  const normalized = String(event || '').toLowerCase();
  if (normalized.includes('extreme')) return 'critical';
  if (normalized.includes('red flag') || normalized.includes('evacuation')) return 'warning';
  if (normalized.includes('watch')) return 'watch';
  return 'watch';
};

const normalizeAlert = (feature) => {
  const props = feature?.properties || {};
  return {
    id: feature?.id || props.id,
    event: props.event,
    headline: props.headline || props.event,
    description: props.description || '',
    instruction: props.instruction || '',
    severity: severityForEvent(props.event),
    nwsSeverity: props.severity || null,
    certainty: props.certainty || null,
    urgency: props.urgency || null,
    area: props.areaDesc || '',
    sender: props.senderName || '',
    effective: props.effective || null,
    onset: props.onset || null,
    expires: props.expires || null,
    source: 'NWS',
    sourceLabel: 'National Weather Service',
  };
};

const fetchActiveAlerts = async ({ area = 'CA' } = {}) => {
  if (!env.nwsAlertsApiUrl) return [];

  const url = `${env.nwsAlertsApiUrl}?area=${encodeURIComponent(area)}`;
  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/geo+json',
        'User-Agent': 'WildFire-Tracker (https://github.com/) contact: app@example.com',
      },
    });
  } catch (error) {
    console.warn(`NWS alerts request failed: ${error.message}`);
    return [];
  }

  if (!response.ok) {
    console.warn(`NWS alerts request failed with status ${response.status}.`);
    return [];
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    console.warn(`NWS alerts parsing failed: ${error.message}`);
    return [];
  }

  const features = Array.isArray(body?.features) ? body.features : [];
  return features
    .filter((feature) => isFireRelevant(feature?.properties?.event))
    .map(normalizeAlert);
};

module.exports = {
  fetchActiveAlerts,
};
