import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import maplibregl from "maplibre-gl";
import { Info, Layers, Flame, X } from "lucide-react";
import "./WildfireMap.css";

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5050";

const DEFAULT_CENTER = { latitude: 37.2, longitude: -119.5 };
const DEFAULT_RADIUS_MILES = 500;
const mapTilerKey = import.meta.env.VITE_MAPTILER_KEY?.trim();
const OPENFREEMAP_STANDARD_STYLE = "https://tiles.openfreemap.org/styles/positron";
const OPENFREEMAP_FALLBACK_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const MAPTILER_STANDARD_STYLE = mapTilerKey
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(mapTilerKey)}`
  : null;
const STANDARD_STYLE = MAPTILER_STANDARD_STYLE || OPENFREEMAP_STANDARD_STYLE;
const STANDARD_FALLBACK_STYLES = MAPTILER_STANDARD_STYLE
  ? [OPENFREEMAP_STANDARD_STYLE, OPENFREEMAP_FALLBACK_STYLE]
  : [OPENFREEMAP_FALLBACK_STYLE];

const CA_BOUNDS = {
  minLat: 32.5,
  maxLat: 42.1,
  minLng: -124.5,
  maxLng: -114.1,
};

const MAP_STYLES = {
  standard: {
    label: "Standard",
    style: STANDARD_STYLE,
  },
  satellite: {
    label: "Satellite",
    style: {
      version: 8,
      sources: {
        satellite: {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution:
            "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
        },
      },
      layers: [{ id: "satellite", type: "raster", source: "satellite" }],
    },
  },
  terrain: {
    label: "Terrain",
    style: {
      version: 8,
      sources: {
        terrain: {
          type: "raster",
          tiles: ["https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution:
            "Map data &copy; OpenStreetMap contributors, SRTM | Map style &copy; OpenTopoMap",
        },
      },
      layers: [{ id: "terrain", type: "raster", source: "terrain" }],
    },
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
  return String(fire?.source || "").toLowerCase().includes("nasa");
}

function getFireTitle(fire) {
  return fire?.name || fire?.location || "Wildfire record";
}

function getMarkerType(fire) {
  if (isNasaHotspot(fire)) return "hotspot";
  if (String(fire?.source || "").toLowerCase().includes("seed")) return "demo";
  return "confirmed";
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

function timeAgo(dateStr) {
  if (!dateStr) return "Time unknown";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (!Number.isFinite(diff)) return "Time unknown";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

function createMarkerElement(type) {
  const marker = document.createElement("span");
  marker.className = `fireMapMarker fireMapMarker--${type}`;
  marker.setAttribute("aria-hidden", "true");

  const inner = document.createElement("span");
  inner.className = "fireMapMarkerInner";
  marker.appendChild(inner);
  return marker;
}

function createPopupContent(fire) {
  const wrap = document.createElement("div");
  wrap.className = "mapPopupCard";

  const title = document.createElement("strong");
  title.textContent = getFireTitle(fire);
  wrap.appendChild(title);

  const location = document.createElement("p");
  location.textContent = fire.location || "Unknown location";
  wrap.appendChild(location);

  const meta = document.createElement("div");
  meta.className = "mapPopupMeta";

  const source = document.createElement("span");
  source.className = "mapPopupBadge";
  source.textContent = fire.source || "Unknown source";
  meta.appendChild(source);

  const reported = document.createElement("span");
  reported.textContent = isNasaHotspot(fire)
    ? `Detected ${timeAgo(fire.reportedAt)}`
    : `Reported ${timeAgo(fire.reportedAt)}`;
  meta.appendChild(reported);
  wrap.appendChild(meta);

  const note = document.createElement("p");
  note.className = "mapPopupNote";
  note.textContent = isNasaHotspot(fire)
    ? fire.subtitle || "Satellite hotspot detection, not confirmed incident"
    : fire.status
      ? `Status: ${fire.status}`
      : "Status unavailable";
  wrap.appendChild(note);

  const link = document.createElement("a");
  link.className = "mapPopupLink";
  link.href = `/fire/${encodeURIComponent(fire.id)}`;
  link.textContent = "View details";
  wrap.appendChild(link);

  return wrap;
}

export default function WildfireMap({ compact = false, title, initialCenter, onLocationChange }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const fireMarkersRef = useRef([]);
  const selectedMarkerRef = useRef(null);
  const standardFallbackIndexRef = useRef(0);
  const [center, setCenter] = useState(initialCenter || DEFAULT_CENTER);
  const [radius, setRadius] = useState(DEFAULT_RADIUS_MILES);
  const [fires, setFires] = useState([]);
  const [mapStyle, setMapStyle] = useState("standard");
  const [status, setStatus] = useState("Loading California fire data...");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLatitude, setManualLatitude] = useState(String(DEFAULT_CENTER.latitude));
  const [manualLongitude, setManualLongitude] = useState(String(DEFAULT_CENTER.longitude));
  // Floating-toolbar overlay panel (full map only). null when nothing is open.
  const [mapTool, setMapTool] = useState(null);
  const toggleMapTool = (key) => setMapTool((current) => (current === key ? null : key));

  const zoom = compact ? 5.15 : 5.45;

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
          body?.errors?.[0]?.msg || body?.message || "Could not load nearby fires.";
        setError(message);
        setFires([]);
        return;
      }

      const rawFires = Array.isArray(body?.data) ? body.data : [];
      const nextFires = rawFires.filter((f) =>
        isInCalifornia(Number(f.latitude), Number(f.longitude)),
      );
      setFires(nextFires);
      setStatus(
        nextFires.length
          ? `Showing ${nextFires.length} California fire record(s).`
          : "No California fires found for this area in the last 7 days.",
      );
    } catch {
      setError("Network error while loading nearby fires.");
      setFires([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[mapStyle].style,
      center: [center.longitude, center.latitude],
      zoom,
      attributionControl: false,
      maxBounds: [
        [-126.2, 31.2],
        [-112.3, 43.2],
      ],
    });

    mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current.on("error", () => {
      if (mapStyle !== "standard") return;
      const fallbackStyle = STANDARD_FALLBACK_STYLES[standardFallbackIndexRef.current];
      if (!fallbackStyle) return;
      standardFallbackIndexRef.current += 1;
      mapRef.current?.setStyle(fallbackStyle);
    });

    const resize = () => mapRef.current?.resize();
    const timers = [0, 120, 320, 650].map((delay) => window.setTimeout(resize, delay));
    window.addEventListener("resize", resize);

    return () => {
      timers.forEach(window.clearTimeout);
      window.removeEventListener("resize", resize);
      fireMarkersRef.current.forEach((marker) => marker.remove());
      selectedMarkerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Create the MapLibre instance once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapStyle === "standard") {
      standardFallbackIndexRef.current = 0;
    }
    mapRef.current.setStyle(MAP_STYLES[mapStyle].style);
    const timers = [80, 240, 520].map((delay) =>
      window.setTimeout(() => mapRef.current?.resize(), delay),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [mapStyle]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.easeTo({
      center: [center.longitude, center.latitude],
      zoom,
      duration: 450,
    });

    selectedMarkerRef.current?.remove();
    selectedMarkerRef.current = new maplibregl.Marker({
      element: createMarkerElement("selected"),
      anchor: "bottom",
    })
      .setLngLat([center.longitude, center.latitude])
      .setPopup(new maplibregl.Popup({ offset: 28 }).setText("Selected search center"))
      .addTo(mapRef.current);
  }, [center, zoom]);

  useEffect(() => {
    if (!mapRef.current) return;
    fireMarkersRef.current.forEach((marker) => marker.remove());
    fireMarkersRef.current = fires
      .map((fire) => {
        const latitude = Number(fire.latitude);
        const longitude = Number(fire.longitude);
        if (!isValidLatLng(latitude, longitude)) return null;

        return new maplibregl.Marker({
          element: createMarkerElement(getMarkerType(fire)),
          anchor: "bottom",
        })
          .setLngLat([longitude, latitude])
          .setPopup(new maplibregl.Popup({ offset: 30 }).setDOMContent(createPopupContent(fire)))
          .addTo(mapRef.current);
      })
      .filter(Boolean);
  }, [fires]);

  useEffect(() => {
    const nextCenter = initialCenter || DEFAULT_CENTER;
    setCenter(nextCenter);
    setManualLatitude(String(nextCenter.latitude));
    setManualLongitude(String(nextCenter.longitude));
    fetchNearbyFires(nextCenter.latitude, nextCenter.longitude, initialCenter ? 80 : DEFAULT_RADIUS_MILES);
    // Initial fetch only, then parent coordinate changes if provided.
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
    onLocationChange?.(parsedManualCoords.latitude, parsedManualCoords.longitude);
  }

  function handleRadiusApply() {
    fetchNearbyFires(center.latitude, center.longitude, radius);
  }

  return (
    <section className={`wildfireMapCard ${compact ? "compact" : "full"}`}>
      {compact ? (
      <header className="wildfireMapHeader">
        <h3 className="wildfireMapTitle">{title || "Wildfires near you"}</h3>
        <div className="wildfireMapControls">
          <fieldset className="mapStyleSwitcher" aria-label="Map style">
            {Object.entries(MAP_STYLES).map(([key, value]) => (
              <label key={key} className={mapStyle === key ? "active" : ""}>
                <input
                  type="radio"
                  name={`${title || "map"}-style`}
                  value={key}
                  checked={mapStyle === key}
                  onChange={() => setMapStyle(key)}
                />
                {value.label}
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            className="mapSecondaryBtn"
            onClick={() => setShowManualLocation((prev) => !prev)}
          >
            {showManualLocation ? "Hide location" : "Set location"}
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
            onClick={handleRadiusApply}
            disabled={loading}
          >
            Apply
          </button>
        </div>
      </header>
      ) : null}

      {compact ? <p className="mapStatusText">{status}</p> : null}
      {compact && error ? <p className="mapErrorText">{error}</p> : null}

      {compact ? (
        <div className="mapLegend" aria-label="Map marker legend">
          <span className="mapLegendItem">
            <span className="mapLegendDot mapLegendDot--confirmed" />
            CAL FIRE / confirmed
          </span>
          <span className="mapLegendItem">
            <span className="mapLegendDot mapLegendDot--hotspot" />
            NASA FIRMS hotspot
          </span>
        </div>
      ) : null}

      {compact && showManualLocation ? (
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
        <div ref={mapContainerRef} className="mapLibreCanvas" aria-label="Wildfire map" />

        {!compact ? (
          <>
            {/* Tiny floating control bar — Set location, Radius, Apply. */}
            <div className="mapFloatingControls" role="region" aria-label="Map area controls">
              <button
                type="button"
                className="mapFloatingBtn"
                onClick={() => setShowManualLocation((prev) => !prev)}
                aria-pressed={showManualLocation}
              >
                {showManualLocation ? "Close" : "Set location"}
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
                onClick={handleRadiusApply}
                disabled={loading}
              >
                Apply
              </button>
            </div>

            {showManualLocation ? (
              <form
                className="mapFloatingLocationForm"
                onSubmit={(event) => {
                  handleManualSubmit(event);
                  setShowManualLocation(false);
                }}
              >
                <label>
                  <span>Latitude</span>
                  <input
                    type="number"
                    step="any"
                    value={manualLatitude}
                    onChange={(event) => setManualLatitude(event.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Longitude</span>
                  <input
                    type="number"
                    step="any"
                    value={manualLongitude}
                    onChange={(event) => setManualLongitude(event.target.value)}
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="mapFloatingBtn mapFloatingBtn--primary"
                  disabled={loading}
                >
                  Use
                </button>
              </form>
            ) : null}

            {error ? <p className="mapFloatingError" role="alert">{error}</p> : null}

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
                    CAL FIRE incident
                  </li>
                  <li>
                    <span className="mapLegendDot mapLegendDot--hotspot" />
                    NASA FIRMS hotspot
                  </li>
                  <li>
                    <span className="mapLegendDot mapLegendDot--demo" />
                    Older / contained
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
                  {Object.entries(MAP_STYLES).map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      className={`mapBasemapTile ${mapStyle === key ? "active" : ""}`}
                      onClick={() => setMapStyle(key)}
                    >
                      <span className={`mapBasemapTilePreview mapBasemapTilePreview--${key}`} />
                      <span>{value.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {mapTool === "list" ? (
              <div className="mapFloatingPanel mapFloatingPanel--wide" role="dialog" aria-label="Fire list">
                <div className="mapFloatingPanelHeader">
                  <h4>Fires in view</h4>
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
                        <span>{fire.source || "Unknown source"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mapStatusText">No fires currently in view.</p>
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {compact && fires.length ? (
        <section className="mapResultsSection" aria-label="Nearby fire results">
          <h4 className="mapResultsTitle">Nearby fire results</h4>
          <ul className="mapResultsList">
            {fires.slice(0, 3).map((fire) => (
              <li key={`result-${fire.id}`} className="mapResultsItem">
                <Link className="mapDetailsLink" to={`/fire/${encodeURIComponent(fire.id)}`}>
                  {getFireTitle(fire)}
                </Link>
                <span>{fire.source || "Unknown source"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
