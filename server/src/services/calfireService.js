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

const truthyActiveValue = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'y', '1', 'active', 'current'].includes(normalized)) return true;
    if (['false', 'no', 'n', '0', 'inactive', 'archived'].includes(normalized)) return false;
  }
  return null;
};

const getIncidentStatusText = (incident) =>
  String(
    incident.Status ||
      incident.status ||
      incident.IncidentStatus ||
      incident.Stage ||
      incident.ArchiveYear ||
      '',
  ).toLowerCase();

const isInactiveCalfireIncident = (incident) => {
  if (incident.ArchiveYear) return true;

  const activeValue =
    truthyActiveValue(incident.Active) ??
    truthyActiveValue(incident.IsActive) ??
    truthyActiveValue(incident.Current) ??
    truthyActiveValue(incident.IsCurrent);

  if (activeValue === false) return true;

  const status = getIncidentStatusText(incident);
  return ['inactive', 'archive', 'archived', 'final', 'closed', 'contained'].some((word) =>
    status.includes(word),
  );
};

const isActiveCalfireIncident = (incident) => {
  if (isInactiveCalfireIncident(incident)) return false;
  const activeValue =
    truthyActiveValue(incident.Active) ??
    truthyActiveValue(incident.IsActive) ??
    truthyActiveValue(incident.Current) ??
    truthyActiveValue(incident.IsCurrent);
  if (activeValue === true) return true;

  const status = getIncidentStatusText(incident);
  if (['active', 'current', 'ongoing', 'new'].some((word) => status.includes(word))) return true;

  // Some CAL FIRE feeds omit active flags, so only clear archive words hide a fire.
  return true;
};

const mapCalfireIncident = (incident) => {
  const location = toTextOrNull(incident.Counties || incident.Location) || 'California';
  const incidentName = toTextOrNull(incident.Name);
  const statusText = getIncidentStatusText(incident);

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
    label: 'Fire Detected',
    confirmed: true,
    status: statusText.includes('contained') ? 'contained' : 'active',
    reportedAt:
      incident.Started ||
      incident.StartDate ||
      incident.StartedDate ||
      incident.Created ||
      incident.Updated ||
      null,
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
    .filter(isActiveCalfireIncident)
    .map(mapCalfireIncident)
    .filter((incident) => incident.latitude !== null && incident.longitude !== null);
};

module.exports = {
  fetchActiveFires,
};
