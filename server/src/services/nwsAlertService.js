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

// Pick the strongest matching severity for the UI chip.
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
