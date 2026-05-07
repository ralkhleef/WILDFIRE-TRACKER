// Placeholder service for fetching and normalizing active wildfire data from CAL FIRE.
// Live CAL FIRE integration can be improved later without changing route/controller logic.
const crypto = require('crypto');

const env = require('../config/env');

const toNumberOrNull = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const toTextOrNull = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || null;
  if (typeof value === 'string') return value.trim() || null;
  return value || null;
};

const mapCalfireIncident = (incident) => {
  const location = toTextOrNull(incident.Counties || incident.Location) || 'California';
  const incidentName = toTextOrNull(incident.Name);

  return {
    id: `calfire-${incident.UniqueId || incident.Id || incidentName || crypto.randomUUID()}`,
    name: incidentName || location,
    location,
    latitude: toNumberOrNull(incident.Latitude || incident.latitude),
    longitude: toNumberOrNull(incident.Longitude || incident.longitude),
    size: toNumberOrNull(incident.AcresBurned || incident.Size || incident.size),
    containment: toNumberOrNull(
      incident.PercentContained || incident.Containment || incident.containment
    ),
    source: 'CAL FIRE',
    sourceType: 'confirmed_incident',
    status: incident.Active ? 'active' : 'reported',
    reportedAt: incident.Started || null,
  };
};

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
