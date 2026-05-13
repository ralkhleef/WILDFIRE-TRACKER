import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Info, Layers, Flame, MapPin, X } from "lucide-react";
import "./WildfireMap.css";

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5050";
const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";

// Default view shows all of California. Users can pan or tap "Use my location"
// to recenter elsewhere.
const DEFAULT_CENTER = { lat: 37.2, lng: -119.5 };
const DEFAULT_ZOOM = 6;
const DEFAULT_USER_LOCATION_RADIUS_MILES = 100;
const DEFAULT_FULL_RADIUS_MILES = 500;

const CA_BOUNDS = {
  minLat: 32.5,
  maxLat: 42.1,
  minLng: -124.5,
  maxLng: -114.1,
};

const MAP_STYLES = [
  { key: "roadmap", label: "Standard" },
  { key: "satellite", label: "Satellite" },
  { key: "terrain", label: "Terrain" },
];

const THERMAL_FILTERS = {
  recent: {
    label: "Recent 24h",
    firmsDays: "1",
    firmsConfidence: "medium",
    minFrp: "1",
  },
  threeDays: {
    label: "Last 3 days",
    firmsDays: "3",
    firmsConfidence: "medium",
    minFrp: "1",
  },
  high: {
    label: "High confidence only",
    firmsDays: "3",
    firmsConfidence: "high",
    minFrp: "1",
  },
};

function isInCalifornia(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= CA_BOUNDS.minLat &&
    lat <= CA_BOUNDS.maxLat &&
    lng >= CA_BOUNDS.minLng &&
    lng <= CA_BOUNDS.maxLng
  );
}

function isNasaHotspot(fire) {
  return (
    fire?.sourceType === "thermal_detection" ||
    fire?.sourceType === "satellite_hotspot" ||
    String(fire?.source || "").toLowerCase().includes("nasa")
  );
}

function isOfficialIncident(fire) {
  return !isDemoFire(fire) && (fire?.sourceType === "confirmed_incident" || fire?.confirmed === true);
}

function isDemoFire(fire) {
  return (
    fire?.demo === true ||
    fire?.sourceType === "demo_fire" ||
    fire?.sourceType === "demo_fallback" ||
    fire?.sourceLabel === "Demo Data" ||
    String(fire?.source || "").toLowerCase().includes("seed")
  );
}

function getAlertTitle(alert) {
  return alert?.headline || alert?.event || "Weather Alert";
}

function getFireTitle(fire) {
  if (isNasaHotspot(fire)) return fire?.name || "Thermal Detection";
  return fire?.name || fire?.location || "Wildfire record";
}

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function formatNumber(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value.toLocaleString();
}

function formatPopupValue(value, fallback = "Unknown") {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
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

// Emoji-rendered SVG markers: official fires, thermal detections, and user location.
function makeEmojiMarkerIcon(googleMaps, emoji, options = {}) {
  if (!googleMaps) return undefined;
  const size = options.size || 36;
  const fontSize = options.fontSize || Math.round(size * 0.7);
  const halo = options.halo || "rgba(255, 255, 255, 0.85)";
  const svg = `\
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">\
<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${halo}"/>\
<text x="50%" y="56%" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-family="apple color emoji, segoe ui emoji, noto color emoji, sans-serif">${emoji}</text>\
</svg>`;
  return {
    url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    scaledSize: new googleMaps.Size(size, size),
    anchor: new googleMaps.Point(size / 2, size - 2),
  };
}

function makeFireMarkerIcon(googleMaps, fire) {
  const hotspot = isNasaHotspot(fire);
  return makeEmojiMarkerIcon(googleMaps, hotspot ? "⚠️" : "🔥", {
    size: hotspot ? 28 : 36,
    fontSize: hotspot ? 18 : 25,
    halo: hotspot ? "rgba(249, 115, 22, 0.12)" : "rgba(220, 38, 38, 0.18)",
  });
}

function makeUserLocationIcon(googleMaps) {
  return makeEmojiMarkerIcon(googleMaps, "📍", {
    size: 34,
    fontSize: 24,
    halo: "rgba(37, 99, 235, 0.18)",
  });
}

export default function WildfireMap({
  compact = false,
  title,
  initialCenter,
  onLocationChange,
}) {
  const { isLoaded: mapsLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: googleMapsKey,
  });

  const initial = useMemo(() => {
    if (initialCenter?.latitude && initialCenter?.longitude) {
      return { lat: initialCenter.latitude, lng: initialCenter.longitude };
    }
    return DEFAULT_CENTER;
  }, [initialCenter]);

  const [center, setCenter] = useState(initial);
  const [userLocation, setUserLocation] = useState(null);
  const [radius, setRadius] = useState(
    compact ? DEFAULT_USER_LOCATION_RADIUS_MILES : DEFAULT_FULL_RADIUS_MILES,
  );
  const [fires, setFires] = useState([]);
  const [mapStyle, setMapStyle] = useState("roadmap");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFire, setSelectedFire] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [mapTool, setMapTool] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [showOfficial, setShowOfficial] = useState(true);
  const [thermalFilter, setThermalFilter] = useState("threeDays");
  const [showWeatherAlerts, setShowWeatherAlerts] = useState(false);
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState("");
  // NASA FIRMS thermal detections are OFF by default — they are NOT confirmed
  // fire incidents and we keep them visually + semantically separate.
  const [showHotspots, setShowHotspots] = useState(false);
  // Demo mode is OFF by default. Picks up ?demo=true from the URL on first
  // load. When enabled the backend includes "Demo Data" seed fires.
  const [demoMode, setDemoMode] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return new URLSearchParams(window.location.search).get("demo") === "true";
    } catch {
      return false;
    }
  });
  const toggleMapTool = (key) => setMapTool((current) => (current === key ? null : key));

  const mapRef = useRef(null);

  const fetchFires = useCallback(
    async (lat, lng, miles, options = {}) => {
      setLoading(true);
      setError("");
      const includeHotspots = options.includeHotspots ?? showHotspots;
      const includeOfficial = options.includeOfficial ?? showOfficial;
      if (!includeOfficial && !includeHotspots) {
        setFires([]);
        setStatus("Choose Official Fires or Thermal Hotspots to display map data.");
        setLoading(false);
        return;
      }
      try {
        const params = new URLSearchParams();
        if (includeHotspots) {
          const filter = THERMAL_FILTERS[options.thermalFilter ?? thermalFilter] || THERMAL_FILTERS.threeDays;
          params.set("includeHotspots", "true");
          params.set("firmsDays", filter.firmsDays);
          params.set("firmsConfidence", filter.firmsConfidence);
          params.set("minFrp", filter.minFrp);
        }
        if (!includeOfficial && includeHotspots) params.set("source", "firms");
        if (includeOfficial && !includeHotspots) params.set("source", "calfire");
        const demoOn = options.demo ?? demoMode;
        if (demoOn) params.set("demo", "true");
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          params.set("latitude", String(lat));
          params.set("longitude", String(lng));
          params.set("radius", String(miles));
        }
        const basePath = Number.isFinite(lat) && Number.isFinite(lng)
          ? `${apiBase}/api/fires/nearby`
          : `${apiBase}/api/fires`;
        const url = `${basePath}?${params.toString()}`;
        const response = await fetch(url);
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body?.message || "Could not load California fires.");
        }
        const raw = Array.isArray(body?.data) ? body.data : [];
        const safe = raw.filter((f) =>
          isInCalifornia(Number(f.latitude), Number(f.longitude)),
        );
        setFires(safe);
        const officialCount = safe.filter(isOfficialIncident).length;
        const demoCount = safe.filter(isDemoFire).length;
        const hotspotCount = safe.filter(isNasaHotspot).length;
        const officialLabel = `${officialCount} official fire incident${officialCount === 1 ? "" : "s"}`;
        const demoLabel = `${demoCount} demo fire${demoCount === 1 ? "" : "s"}`;
        const thermalLabel = `${hotspotCount} thermal detection${hotspotCount === 1 ? "" : "s"}`;
        if (!safe.length) {
          setStatus(
            body?.message ||
              (includeOfficial
                ? "No active official fire incidents found for this area."
                : "No recent satellite thermal detections found for this area."),
          );
        } else {
          const parts = [officialLabel];
          if (demoCount) parts.push(demoLabel);
          if (hotspotCount) parts.push(thermalLabel);
          setStatus(parts.length === 1 ? `Showing ${parts[0]}` : `Showing ${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`);
        }
      } catch (err) {
        setError(err.message || "Network error while loading fires.");
        setFires([]);
      } finally {
        setLoading(false);
      }
    },
    [showHotspots, showOfficial, thermalFilter, demoMode],
  );

  const fetchWeatherAlerts = useCallback(async () => {
    setAlertsLoading(true);
    setAlertsError("");
    try {
      const response = await fetch(`${apiBase}/api/nws-alerts?area=CA`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.message || "Could not load weather alerts.");
      }
      setWeatherAlerts(Array.isArray(body?.data) ? body.data : []);
    } catch (err) {
      setAlertsError(err.message || "Network error while loading weather alerts.");
      setWeatherAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  // Default load: official incidents only. Re-fetch whenever a data layer changes.
  useEffect(() => {
    const lat = userLocation?.lat;
    const lng = userLocation?.lng;
    setSelectedFire(null);
    fetchFires(lat, lng, radius, {
      includeHotspots: showHotspots,
      includeOfficial: showOfficial,
      thermalFilter,
      demo: demoMode,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHotspots, showOfficial, thermalFilter, demoMode]);

  useEffect(() => {
    setSelectedAlert(null);
    if (!showWeatherAlerts) {
      setWeatherAlerts([]);
      setAlertsError("");
      return;
    }
    fetchWeatherAlerts();
  }, [fetchWeatherAlerts, showWeatherAlerts]);

  const displayStatus = useMemo(() => {
    const officialCount = fires.filter(isOfficialIncident).length;
    const demoCount = fires.filter(isDemoFire).length;
    const hotspotCount = fires.filter(isNasaHotspot).length;
    const alertCount = showWeatherAlerts ? weatherAlerts.length : 0;

    if (officialCount || hotspotCount || alertCount) {
      const parts = [
        `${officialCount} official fire${officialCount === 1 ? "" : "s"}`,
      ];
      if (demoMode) {
        parts.push(`${demoCount} demo fire${demoCount === 1 ? "" : "s"}`);
      }
      if (showHotspots) {
        parts.push(`${hotspotCount} thermal detection${hotspotCount === 1 ? "" : "s"}`);
      }
      if (showWeatherAlerts) {
        parts.push(`${alertCount} weather alert${alertCount === 1 ? "" : "s"}`);
      }
      if (parts.length === 1) return `Showing ${parts[0]}`;
      if (parts.length === 2) return `Showing ${parts[0]} and ${parts[1]}`;
      return `Showing ${parts[0]}, ${parts[1]}, and ${parts[2]}`;
    }

    if (alertsError) return alertsError;
    if (showWeatherAlerts && alertsLoading) return "Loading weather alerts...";
    if (showWeatherAlerts && !weatherAlerts.length && !fires.length) {
      return "No active official fires or weather alerts found for this area.";
    }
    return status;
  }, [alertsError, alertsLoading, demoMode, fires, showHotspots, showWeatherAlerts, status, weatherAlerts]);

  // When the parent supplies a new initial center, recenter and re-fetch nearby.
  useEffect(() => {
    if (!initialCenter) return;
    const next = { lat: initialCenter.latitude, lng: initialCenter.longitude };
    setCenter(next);
    fetchFires(next.lat, next.lng, radius);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCenter?.latitude, initialCenter?.longitude]);

  const handleUseMyLocation = useCallback(() => {
    setLocationError("");
    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { lat: coords.latitude, lng: coords.longitude };
        setUserLocation(next);
        setCenter(next);
        if (mapRef.current) {
          mapRef.current.panTo(next);
          mapRef.current.setZoom(8);
        }
        if (onLocationChange) onLocationChange(coords.latitude, coords.longitude);
        fetchFires(coords.latitude, coords.longitude, radius, {
          includeHotspots: showHotspots,
          includeOfficial: showOfficial,
          thermalFilter,
          demo: demoMode,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(
            "Location permission denied. Allow location access in your browser to use this feature.",
          );
        } else {
          setLocationError("Could not get your current location. Try again later.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [demoMode, fetchFires, onLocationChange, radius, showHotspots, showOfficial, thermalFilter]);

  const handleApplyRadius = useCallback(() => {
    const lat = userLocation?.lat ?? center.lat;
    const lng = userLocation?.lng ?? center.lng;
    fetchFires(lat, lng, radius, {
      includeHotspots: showHotspots,
      includeOfficial: showOfficial,
      thermalFilter,
      demo: demoMode,
    });
  }, [demoMode, fetchFires, center.lat, center.lng, radius, userLocation, showHotspots, showOfficial, thermalFilter]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    if (userLocation) return;
    const officialMarkers = fires
      .filter(isOfficialIncident)
      .map((fire) => ({
        lat: Number(fire.latitude),
        lng: Number(fire.longitude),
      }))
      .filter(({ lat, lng }) => isValidLatLng(lat, lng));

    if (!officialMarkers.length) return;

    const maxZoom = userLocation ? 10 : 7;
    if (officialMarkers.length === 1) {
      mapRef.current.panTo(officialMarkers[0]);
      mapRef.current.setZoom(maxZoom);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    officialMarkers.forEach((position) => bounds.extend(position));
    mapRef.current.fitBounds(bounds, {
      top: 96,
      right: 72,
      bottom: 72,
      left: compact ? 48 : 280,
    });
    window.google.maps.event.addListenerOnce(mapRef.current, "idle", () => {
      const currentZoom = mapRef.current?.getZoom();
      if (typeof currentZoom === "number" && currentZoom > maxZoom) {
        mapRef.current.setZoom(maxZoom);
      }
    });
  }, [compact, fires, mapReady, userLocation]);

  if (!googleMapsKey) {
    return (
      <section className={`wildfireMapCard ${compact ? "compact" : "full"}`}>
        <div className="mapMissingKey">
          <h3>Google Maps key missing</h3>
          <p>
            Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to <code>client/.env</code>
            {" "}and restart <code>npm run dev</code> to enable the map.
          </p>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className={`wildfireMapCard ${compact ? "compact" : "full"}`}>
        <div className="mapMissingKey">
          <h3>Google Maps failed to load</h3>
          <p>Check your API key restrictions and network, then reload.</p>
        </div>
      </section>
    );
  }

  const renderMap = () => (
    <GoogleMap
      mapContainerClassName="googleMapCanvas"
      center={center}
      zoom={DEFAULT_ZOOM}
      mapTypeId={mapStyle}
      onLoad={onMapLoad}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: compact ? "cooperative" : "greedy",
      }}
    >
      {userLocation ? (
        <Marker
          position={userLocation}
          icon={makeUserLocationIcon(window.google?.maps)}
          title="📍 Your Location"
        />
      ) : null}
      {fires.map((fire) => {
        const lat = Number(fire.latitude);
        const lng = Number(fire.longitude);
        if (!isValidLatLng(lat, lng)) return null;
        return (
          <Marker
            key={fire.id}
            position={{ lat, lng }}
            icon={makeFireMarkerIcon(window.google?.maps, fire)}
            onClick={() => setSelectedFire(fire)}
            title={isNasaHotspot(fire) ? "⚠️ Thermal Detection" : "🔥 Fire Detected"}
          />
        );
      })}
      {selectedFire && isValidLatLng(Number(selectedFire.latitude), Number(selectedFire.longitude)) ? (
        <InfoWindow
          position={{
            lat: Number(selectedFire.latitude),
            lng: Number(selectedFire.longitude),
          }}
          onCloseClick={() => setSelectedFire(null)}
          options={{
            maxWidth: 320,
            pixelOffset: window.google?.maps ? new window.google.maps.Size(0, -8) : undefined,
          }}
        >
          {isNasaHotspot(selectedFire) ? (
            <div className="mapPopupCard mapPopupCard--thermal">
              <div className="mapPopupHeader">
                <span className="mapPopupBadge mapPopupBadge--hotspot">⚠️ Thermal Detection</span>
                <strong>{getFireTitle(selectedFire)}</strong>
                <p>{selectedFire.location || selectedFire.county || "California"}</p>
              </div>
              <div className="mapPopupDetails mapPopupDetails--thermal">
                <span>
                  <b>Detected</b>
                  {formatDate(selectedFire.updatedAt || selectedFire.reportedAt || selectedFire.detectedAt)}
                </span>
                <span>
                  <b>Confidence</b>
                  {formatPopupValue(selectedFire.confidence || selectedFire.confidenceLabel)}
                </span>
                <span>
                  <b>Source</b>
                  {selectedFire.sourceLabel || selectedFire.source || "NASA FIRMS"}
                </span>
              </div>
              {selectedFire.subtitle ? (
                <p className="mapPopupCaption">{selectedFire.subtitle}</p>
              ) : null}
            </div>
          ) : (
            <div className="mapPopupCard">
              <div className="mapPopupHeader">
                <span className={`mapPopupBadge ${isDemoFire(selectedFire) ? "mapPopupBadge--demo" : "mapPopupBadge--official"}`}>
                  {isDemoFire(selectedFire) ? "Demo Data" : "🔥 Fire Detected"}
                </span>
                <strong>{getFireTitle(selectedFire)}</strong>
                <p>{selectedFire.location || selectedFire.county || "California"}</p>
              </div>
              <div className="mapPopupDetails">
                <span>
                  <b>Containment</b>
                  {typeof selectedFire.containment === "number" ? `${selectedFire.containment}%` : "Unknown"}
                </span>
                <span>
                  <b>Size</b>
                  {formatNumber(selectedFire.size) ? `${formatNumber(selectedFire.size)} acres` : "Unknown"}
                </span>
                <span>
                  <b>Updated</b>
                  {formatDate(selectedFire.updatedAt || selectedFire.reportedAt)}
                </span>
                <span>
                  <b>Source</b>
                  {selectedFire.sourceLabel || selectedFire.source || "CAL FIRE"}
                </span>
              </div>
              <Link
                className="mapPopupLink"
                to={`/fire/${encodeURIComponent(selectedFire.id)}`}
                onClick={() => setSelectedFire(null)}
              >
                View details
              </Link>
            </div>
          )}
        </InfoWindow>
      ) : null}
    </GoogleMap>
  );

  const renderAlertCard = (alert, options = {}) => {
    const active = selectedAlert?.id === alert.id;
    return (
      <article
        key={alert.id || `${alert.event}-${alert.effective}`}
        className={`mapWeatherAlertCard ${active ? "active" : ""}`}
      >
        <button
          type="button"
          className="mapWeatherAlertButton"
          onClick={() => setSelectedAlert(active ? null : alert)}
        >
          <span className="mapWeatherAlertBadge">⚠️ Weather Alert</span>
          <strong>{getAlertTitle(alert)}</strong>
          <span>{alert.area || "California"}</span>
        </button>
        {(active || options.expanded) ? (
          <div className="mapWeatherAlertDetails">
            <p>Severity: {alert.nwsSeverity || alert.severity || "Unknown"}</p>
            <p>Effective: {formatDate(alert.effective || alert.onset)}</p>
            <p>Expires: {formatDate(alert.expires)}</p>
            <p>Source: {alert.sourceLabel || alert.sender || "National Weather Service"}</p>
          </div>
        ) : null}
      </article>
    );
  };

  return (
    <section className={`wildfireMapCard ${compact ? "compact" : "full"}`}>
      {compact ? (
        <header className="wildfireMapHeader">
          <h3 className="wildfireMapTitle">{title || "Wildfires near you"}</h3>
          <div className="wildfireMapControls">
            <fieldset className="mapStyleSwitcher" aria-label="Map style">
              {MAP_STYLES.map((style) => (
                <label key={style.key} className={mapStyle === style.key ? "active" : ""}>
                  <input
                    type="radio"
                    name={`${title || "map"}-style`}
                    value={style.key}
                    checked={mapStyle === style.key}
                    onChange={() => setMapStyle(style.key)}
                  />
                  {style.label}
                </label>
              ))}
            </fieldset>
            <div className="mapLayerToggleGroup" aria-label="Data layers">
              <label className={showOfficial ? "active" : ""}>
                <input
                  type="checkbox"
                  checked={showOfficial}
                  onChange={(event) => setShowOfficial(event.target.checked)}
                />
                Official Fires
              </label>
              <label className={showHotspots ? "active" : ""}>
                <input
                  type="checkbox"
                  checked={showHotspots}
                  onChange={(event) => setShowHotspots(event.target.checked)}
                />
                Thermal Hotspots
              </label>
              <label className={showWeatherAlerts ? "active" : ""}>
                <input
                  type="checkbox"
                  checked={showWeatherAlerts}
                  onChange={(event) => setShowWeatherAlerts(event.target.checked)}
                />
                Weather Alerts
              </label>
              <label className={demoMode ? "active" : ""} title="Show 'Demo Data' seed fires for testing">
                <input
                  type="checkbox"
                  checked={demoMode}
                  onChange={(event) => setDemoMode(event.target.checked)}
                />
                Demo Data
              </label>
              {showHotspots ? (
                <select
                  className="mapThermalFilterSelect"
                  value={thermalFilter}
                  onChange={(event) => setThermalFilter(event.target.value)}
                  aria-label="Thermal hotspot filter"
                >
                  {Object.entries(THERMAL_FILTERS).map(([key, filter]) => (
                    <option key={key} value={key}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            <button
              type="button"
              className="mapSecondaryBtn"
              onClick={handleUseMyLocation}
            >
              Use my location
            </button>
            <label className="mapControlLabel" htmlFor={`${title || "map"}-radius`}>
              Radius
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
              onClick={handleApplyRadius}
              disabled={loading}
            >
              Apply
            </button>
          </div>
        </header>
      ) : null}

      {compact && displayStatus ? <p className="mapStatusText">{displayStatus}</p> : null}
      {compact && error ? <p className="mapErrorText">{error}</p> : null}
      {compact && alertsError ? <p className="mapErrorText">{alertsError}</p> : null}
      {compact && locationError ? <p className="mapErrorText">{locationError}</p> : null}

      {compact ? (
        <div className="mapLegend" aria-label="Map marker legend">
            <span className="mapLegendItem">
              <span className="mapLegendDot mapLegendDot--confirmed" />
            🔥 Official Fire Incident
            </span>
            <span className="mapLegendItem">
              <span className="mapLegendDot mapLegendDot--hotspot" />
            ⚠️ Thermal Detection
            </span>
            <span className="mapLegendItem">
              <span className="mapLegendDot mapLegendDot--weather" />
            ⚠️ Weather Alert
            </span>
        </div>
      ) : null}

      <div className={`wildfireMapContainer ${compact ? "compactMap" : "fullMap"}`}>
        {mapsLoaded ? renderMap() : (
          <div className="mapLoading">Loading map…</div>
        )}

        {!compact ? (
          <>
            <div className="mapFloatingControls" role="region" aria-label="Map area controls">
              <button
                type="button"
                className="mapFloatingBtn"
                onClick={handleUseMyLocation}
              >
                <MapPin size={14} strokeWidth={2.5} />
                Use my location
              </button>
              <label className="mapFloatingRadiusLabel">
                <span>Radius</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={radius}
                  onChange={(event) => setRadius(Number(event.target.value))}
                  aria-label="Radius (miles)"
                />
                <span className="mapFloatingRadiusUnit">mi</span>
              </label>
              <button
                type="button"
                className="mapFloatingBtn mapFloatingBtn--primary"
                onClick={handleApplyRadius}
                disabled={loading}
              >
                Apply
              </button>
            </div>

            <div className="mapLayerFloatingControls" aria-label="Data layers">
              <label className={showOfficial ? "active" : ""}>
                <input
                  type="checkbox"
                  checked={showOfficial}
                  onChange={(event) => setShowOfficial(event.target.checked)}
                />
                Official Fires
              </label>
              <label className={showHotspots ? "active" : ""}>
                <input
                  type="checkbox"
                  checked={showHotspots}
                  onChange={(event) => setShowHotspots(event.target.checked)}
                />
                Thermal Hotspots
              </label>
              <label className={showWeatherAlerts ? "active" : ""}>
                <input
                  type="checkbox"
                  checked={showWeatherAlerts}
                  onChange={(event) => setShowWeatherAlerts(event.target.checked)}
                />
                Weather Alerts
              </label>
              <label className={demoMode ? "active" : ""} title="Show 'Demo Data' seed fires for testing">
                <input
                  type="checkbox"
                  checked={demoMode}
                  onChange={(event) => setDemoMode(event.target.checked)}
                />
                Demo Data
              </label>
              {showHotspots ? (
                <select
                  className="mapThermalFilterSelect"
                  value={thermalFilter}
                  onChange={(event) => setThermalFilter(event.target.value)}
                  aria-label="Thermal hotspot filter"
                >
                  {Object.entries(THERMAL_FILTERS).map(([key, filter]) => (
                    <option key={key} value={key}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            {locationError ? (
              <p className="mapFloatingError" role="alert">{locationError}</p>
            ) : error ? (
              <p className="mapFloatingError" role="alert">{error}</p>
            ) : null}
            {displayStatus && !error && !locationError ? (
              <p className="mapFloatingStatus">{displayStatus}</p>
            ) : null}
            {alertsError ? (
              <p className="mapFloatingAlertError" role="alert">{alertsError}</p>
            ) : null}

            <div className="mapFloatingToolbar" role="toolbar" aria-label="Map tools">
              <button
                type="button"
                className={`mapToolBtn ${mapTool === "legend" ? "active" : ""}`}
                aria-label="Legend"
                aria-pressed={mapTool === "legend"}
                onClick={() => toggleMapTool("legend")}
              >
                <Info size={18} strokeWidth={2} />
              </button>
              <button
                type="button"
                className={`mapToolBtn ${mapTool === "basemap" ? "active" : ""}`}
                aria-label="Basemap"
                aria-pressed={mapTool === "basemap"}
                onClick={() => toggleMapTool("basemap")}
              >
                <Layers size={18} strokeWidth={2} />
              </button>
              <button
                type="button"
                className={`mapToolBtn ${mapTool === "list" ? "active" : ""}`}
                aria-label="Fire list"
                aria-pressed={mapTool === "list"}
                onClick={() => toggleMapTool("list")}
              >
                <Flame size={18} strokeWidth={2} />
              </button>
            </div>

            {mapTool === "legend" ? (
              <div className="mapFloatingPanel" role="dialog" aria-label="Legend">
                <div className="mapFloatingPanelHeader">
                  <h4>Legend</h4>
                  <button
                    type="button"
                    className="mapPanelClose"
                    aria-label="Close legend"
                    onClick={() => setMapTool(null)}
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
                <ul className="mapLegendList">
                  <li>
                    <span className="mapLegendDot mapLegendDot--confirmed" />
                    🔥 Official Fire Incident
                  </li>
                  <li>
                    <span className="mapLegendDot mapLegendDot--hotspot" />
                    ⚠️ Thermal Detection
                  </li>
                  <li>
                    <span className="mapLegendDot mapLegendDot--weather" />
                    ⚠️ Weather Alert
                  </li>
                </ul>
              </div>
            ) : null}

            {mapTool === "basemap" ? (
              <div className="mapFloatingPanel" role="dialog" aria-label="Basemap">
                <div className="mapFloatingPanelHeader">
                  <h4>Basemap</h4>
                  <button
                    type="button"
                    className="mapPanelClose"
                    aria-label="Close basemap"
                    onClick={() => setMapTool(null)}
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
                <div className="mapBasemapTiles">
                  {MAP_STYLES.map((style) => (
                    <button
                      key={style.key}
                      type="button"
                      className={`mapBasemapTile ${mapStyle === style.key ? "active" : ""}`}
                      onClick={() => setMapStyle(style.key)}
                    >
                      <span className={`mapBasemapTilePreview mapBasemapTilePreview--${style.key}`} />
                      <span>{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {mapTool === "list" ? (
              <div className="mapFloatingPanel mapFloatingPanel--wide" role="dialog" aria-label="Fire list">
                <div className="mapFloatingPanelHeader">
                  <h4>Map records</h4>
                  <button
                    type="button"
                    className="mapPanelClose"
                    aria-label="Close fire list"
                    onClick={() => setMapTool(null)}
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
                {fires.length ? (
                  <ul className="mapFireOverlayList">
                    {fires.slice(0, 12).map((fire) => (
                      <li key={`tool-${fire.id}`}>
                        <Link
                          className="mapDetailsLink"
                          to={`/fire/${encodeURIComponent(fire.id)}`}
                          onClick={() => setMapTool(null)}
                        >
                          {getFireTitle(fire)}
                        </Link>
                        <span>{fire.sourceLabel || fire.source || "Unknown source"}</span>
                      </li>
                    ))}
                  </ul>
	                ) : (
	                  <p className="mapStatusText">
                      {showOfficial
                        ? "No active official fire incidents found for this area."
                        : "No map records currently in view."}
                    </p>
	                )}
              </div>
            ) : null}

            {showWeatherAlerts ? (
              <div className="mapWeatherAlertOverlay" aria-label="Weather alerts">
                <div className="mapWeatherAlertHeader">
                  <h4>Weather Alerts</h4>
                  {alertsLoading ? <span>Loading...</span> : <span>{weatherAlerts.length}</span>}
                </div>
                {weatherAlerts.length ? (
                  <div className="mapWeatherAlertList">
                    {weatherAlerts.slice(0, 5).map((alert) => renderAlertCard(alert))}
                  </div>
                ) : (
                  <p className="mapWeatherAlertEmpty">
                    {alertsLoading ? "Checking NWS alerts..." : "No active fire weather alerts found."}
                  </p>
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {compact && showWeatherAlerts ? (
        <section className="mapWeatherAlertCompact" aria-label="Weather alerts">
          {weatherAlerts.length ? (
            weatherAlerts.slice(0, 3).map((alert) => renderAlertCard(alert, { expanded: true }))
          ) : (
            <p className="mapStatusText">
              {alertsLoading ? "Checking NWS alerts..." : "No active fire weather alerts found."}
            </p>
          )}
        </section>
      ) : null}

      {compact && fires.length ? (
        <section className="mapResultsSection" aria-label="Nearby fire results">
          <h4 className="mapResultsTitle">Nearby fire results</h4>
          <ul className="mapResultsList">
            {fires.slice(0, 3).map((fire) => (
              <li key={`result-${fire.id}`} className="mapResultsItem">
                <Link className="mapDetailsLink" to={`/fire/${encodeURIComponent(fire.id)}`}>
                  {getFireTitle(fire)}
                </Link>
                <span>{fire.sourceLabel || fire.source || "Unknown source"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
