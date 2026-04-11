// Placeholder service for fetching and normalizing active wildfire data from CAL FIRE.
// Live CAL FIRE integration can be improved later without changing route/controller logic.
const crypto = require('crypto');

const env = require('../config/env');

const toNumberOrNull = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const mapCalfireIncident = (incident) => ({
  id: `calfire-${incident.UniqueId || incident.Id || incident.Name || crypto.randomUUID()}`,
  name: incident.Name || 'Unnamed CAL FIRE incident',
  location: incident.Counties || incident.Location || 'California',
  latitude: toNumberOrNull(incident.Latitude || incident.latitude),
  longitude: toNumberOrNull(incident.Longitude || incident.longitude),
  size: toNumberOrNull(incident.AcresBurned || incident.Size || incident.size),
  containment: toNumberOrNull(
    incident.PercentContained || incident.Containment || incident.containment
  ),
  source: 'CAL FIRE',
  status: incident.Active ? 'active' : 'reported',
  reportedAt: incident.Started || null,
});

const fetchActiveFires = async () => {
  if (!env.calfireApiUrl) {
    return [];
  }

  const response = await fetch(env.calfireApiUrl);

  if (!response.ok) {
    throw new Error(`CAL FIRE request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const incidents = Array.isArray(payload) ? payload : payload?.incidents || [];

  return incidents
    .map(mapCalfireIncident)
    .filter((incident) => incident.latitude !== null && incident.longitude !== null);
};

module.exports = {
  fetchActiveFires,
};
