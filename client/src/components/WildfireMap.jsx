import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "./WildfireMap.css";

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5050";

const DEFAULT_CENTER = { latitude: 34.0522, longitude: -118.2437 };
const DEFAULT_RADIUS_MILES = 50;

function RecenterMap({ center }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;
    map.setView([center.latitude, center.longitude], map.getZoom(), {
      animate: true,
    });
  }, [center, map]);

  return null;
}

function isValidLatLng(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export default function WildfireMap({ compact = false, title, initialCenter, onLocationChange }) {
  const [center, setCenter] = useState(initialCenter || DEFAULT_CENTER);
  const [radius, setRadius] = useState(DEFAULT_RADIUS_MILES);
  const [fires, setFires] = useState([]);
  const [status, setStatus] = useState("Requesting your location...");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLatitude, setManualLatitude] = useState(
    String(DEFAULT_CENTER.latitude),
  );
  const [manualLongitude, setManualLongitude] = useState(
    String(DEFAULT_CENTER.longitude),
  );

  const zoom = compact ? 8 : 9;

  const parsedManualCoords = useMemo(() => {
    const latitude = Number(manualLatitude);
    const longitude = Number(manualLongitude);
    if (!isValidLatLng(latitude, longitude)) return null;
    return { latitude, longitude };
  }, [manualLatitude, manualLongitude]);

  async function fetchNearbyFires(latitude, longitude, miles = radius) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${apiBase}/api/fires/nearby?latitude=${latitude}&longitude=${longitude}&radius=${miles}&includeExternal=true`,
      );
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          body?.errors?.[0]?.msg ||
          body?.message ||
          "Could not load nearby fires.";
        setError(message);
        setFires([]);
        return;
      }

      const nextFires = Array.isArray(body?.data) ? body.data : [];
      setFires(nextFires);
      setStatus(
        nextFires.length
          ? `Showing ${nextFires.length} nearby fire(s).`
          : "No nearby fires found for this area.",
      );
    } catch {
      setError("Network error while loading nearby fires.");
      setFires([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialCenter) {
      setStatus("Using provided location.");
      fetchNearbyFires(initialCenter.latitude, initialCenter.longitude, radius);
      return;
    }
    if (!navigator.geolocation) {
      setStatus("Geolocation is not supported in this browser.");
      setShowManualLocation(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextCenter = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
        setCenter(nextCenter);
        setManualLatitude(String(coords.latitude.toFixed(4)));
        setManualLongitude(String(coords.longitude.toFixed(4)));
        setStatus("Using your location to find nearby fires.");
        fetchNearbyFires(nextCenter.latitude, nextCenter.longitude, radius);
      },
      () => {
        setStatus("Location permission denied. Enter your coordinates below.");
        setShowManualLocation(true);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
    // We intentionally run this once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!initialCenter) return;
    setCenter(initialCenter);
    fetchNearbyFires(initialCenter.latitude, initialCenter.longitude, radius);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCenter?.latitude, initialCenter?.longitude]);

  function handleManualSubmit(event) {
    event.preventDefault();
    setError("");

    if (!parsedManualCoords) {
      setError("Please provide valid latitude and longitude values.");
      return;
    }

    setCenter(parsedManualCoords);
    setStatus("Using manual location.");
    fetchNearbyFires(parsedManualCoords.latitude, parsedManualCoords.longitude);
    if (onLocationChange) onLocationChange(parsedManualCoords.latitude, parsedManualCoords.longitude);
  }

  function handleRadiusApply() {
    fetchNearbyFires(center.latitude, center.longitude, radius);
  }

  return (
    <section className={`wildfireMapCard ${compact ? "compact" : "full"}`}>
      <header className="wildfireMapHeader">
        <h3 className="wildfireMapTitle">{title || "Wildfires near you"}</h3>
        <div className="wildfireMapControls">
          <button
            type="button"
            className="mapSecondaryBtn"
            onClick={() => setShowManualLocation((prev) => !prev)}
          >
            {showManualLocation ? "Hide location inputs" : "Change location"}
          </button>
          <label className="mapControlLabel" htmlFor={`${title || "map"}-radius`}>
            Radius (mi)
          </label>
          <input
            id={`${title || "map"}-radius`}
            className="mapRadiusInput"
            type="number"
            min="1"
            max="500"
            value={radius}
            onChange={(event) => setRadius(Number(event.target.value))}
          />
          <button
            type="button"
            className="mapApplyBtn"
            onClick={handleRadiusApply}
            disabled={loading}
          >
            Apply
          </button>
        </div>
      </header>

      <p className="mapStatusText">{status}</p>
      {error ? <p className="mapErrorText">{error}</p> : null}

      {showManualLocation ? (
        <form className="manualLocationForm" onSubmit={handleManualSubmit}>
          <label className="mapControlLabel" htmlFor="manual-lat">
            Latitude
          </label>
          <input
            id="manual-lat"
            className="mapCoordInput"
            type="number"
            step="any"
            value={manualLatitude}
            onChange={(event) => setManualLatitude(event.target.value)}
            required
          />
          <label className="mapControlLabel" htmlFor="manual-lng">
            Longitude
          </label>
          <input
            id="manual-lng"
            className="mapCoordInput"
            type="number"
            step="any"
            value={manualLongitude}
            onChange={(event) => setManualLongitude(event.target.value)}
            required
          />
          <button type="submit" className="mapApplyBtn" disabled={loading}>
            Use Location
          </button>
        </form>
      ) : null}

      <div className={`wildfireMapContainer ${compact ? "compactMap" : "fullMap"}`}>
        <MapContainer
          center={[center.latitude, center.longitude]}
          zoom={zoom}
          scrollWheelZoom={!compact}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap center={center} />

          <CircleMarker
            center={[center.latitude, center.longitude]}
            radius={8}
            pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.8 }}
          >
            <Popup>Your selected location</Popup>
          </CircleMarker>

          {fires.map((fire) => {
            const latitude = Number(fire.latitude);
            const longitude = Number(fire.longitude);
            if (!isValidLatLng(latitude, longitude)) return null;

            return (
              <CircleMarker
                key={fire.id}
                center={[latitude, longitude]}
                radius={7}
                pathOptions={{
                  color: "#dc2626",
                  fillColor: "#ef4444",
                  fillOpacity: 0.75,
                }}
              >
                <Popup>
                  <strong>{fire.name || "Wildfire"}</strong>
                  <br />
                  {fire.location || "Unknown location"}
                  <br />
                  Source: {fire.source || "Unknown"}
                  <br />
                  {fire.status ? `Status: ${fire.status}` : "Status unavailable"}
                  <br />
                  {typeof fire.containment === "number"
                    ? `Containment: ${fire.containment}%`
                    : "Containment unavailable"}
                  <br />
                  <Link className="mapDetailsLink" to={`/fire/${encodeURIComponent(fire.id)}`}>
                    View details
                  </Link>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {fires.length ? (
        <section className="mapResultsSection" aria-label="Nearby fire results">
          <h4 className="mapResultsTitle">Nearby fire results</h4>
          <ul className="mapResultsList">
            {fires.slice(0, compact ? 3 : 8).map((fire) => (
              <li key={`result-${fire.id}`} className="mapResultsItem">
                <Link className="mapDetailsLink" to={`/fire/${encodeURIComponent(fire.id)}`}>
                  {fire.name || "Unnamed wildfire"}
                </Link>
                <span>{fire.location || "Unknown location"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
