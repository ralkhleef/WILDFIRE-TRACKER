const EARTH_RADIUS_MILES = 3958.8;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const getDistanceInMiles = (latitudeA, longitudeA, latitudeB, longitudeB) => {
  const latitudeDifference = toRadians(latitudeB - latitudeA);
  const longitudeDifference = toRadians(longitudeB - longitudeA);

  const haversineResult =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(longitudeDifference / 2) ** 2;

  const distance =
    2 * EARTH_RADIUS_MILES * Math.atan2(Math.sqrt(haversineResult), Math.sqrt(1 - haversineResult));

  return Number(distance.toFixed(2));
};

const filterNearbyFires = (fires, latitude, longitude, radius) =>
  fires
    .filter(
      (fire) =>
        typeof fire.latitude === 'number' &&
        typeof fire.longitude === 'number' &&
        Number.isFinite(fire.latitude) &&
        Number.isFinite(fire.longitude)
    )
    .map((fire) => ({
      ...fire,
      distanceMiles: getDistanceInMiles(latitude, longitude, fire.latitude, fire.longitude),
    }))
    .filter((fire) => fire.distanceMiles <= radius)
    .sort((firstFire, secondFire) => firstFire.distanceMiles - secondFire.distanceMiles);

module.exports = {
  getDistanceInMiles,
  filterNearbyFires,
};
