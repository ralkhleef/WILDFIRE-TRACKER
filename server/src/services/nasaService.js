// Service for fetching and normalizing active fire data from NASA FIRMS.
const env = require('../config/env');

const parseFirmsCsv = (csvText) => {
  const lines = csvText.trim().split('\n');

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',').map((header) => header.trim());

  return lines.slice(1).map((line, index) => {
    const values = line.split(',');
    const fire = {};

    headers.forEach((header, valueIndex) => {
      fire[header] = values[valueIndex]?.trim();
    });

    return {
      id: `firms-${index}-${fire.latitude}-${fire.longitude}`,
      name: 'NASA FIRMS Active Fire',
      location: 'Satellite detected hotspot',
      latitude: Number(fire.latitude),
      longitude: Number(fire.longitude),
      size: null,
      containment: null,
      source: 'NASA FIRMS',
      status: 'active',
      brightness: fire.bright_ti4 || fire.brightness || null,
      confidence: fire.confidence || null,
      satellite: fire.satellite || null,
      reportedAt: fire.acq_date && fire.acq_time
        ? `${fire.acq_date} ${fire.acq_time}`
        : fire.acq_date || null,
    };
  }).filter((fire) =>
    Number.isFinite(fire.latitude) && Number.isFinite(fire.longitude)
  );
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

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`NASA FIRMS request failed with status ${response.status}.`);
  }

  const csvText = await response.text();
  return parseFirmsCsv(csvText);
};

module.exports = {
  fetchActiveFires,
};