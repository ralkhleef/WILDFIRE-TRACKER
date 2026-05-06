import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { NavLink, Link } from "react-router-dom";
import "./EvacuationResources.css";

const DEFAULT_CENTER = { lat: 34.0522, lng: -118.2437 };
const FIRE_RADIUS_MI = 60;

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5001";

const MOCK_TEMPLATE = [
  { id: "s1", name: "Shelter 1", color: "#dc2626", offsetLat: 0.018, offsetLng: 0.012 },
  { id: "s2", name: "Shelter 2", color: "#ea580c", offsetLat: -0.015, offsetLng: 0.022 },
  { id: "s3", name: "Shelter 3", color: "#2563eb", offsetLat: 0.022, offsetLng: -0.018 },
];

function milesBetween(aLat, aLng, bLat, bLng) {
  const R = 3959;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const sin =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(sin), Math.sqrt(1 - sin));
  return R * c;
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

function RecenterEvac({ center }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    map.setView([center.lat, center.lng], 11);
  }, [center, map]);
  return null;
}

async function nominatimSearch(query) {
  const q = encodeURIComponent(query.trim());
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Geocode request failed.");
  const data = await res.json();
  if (!Array.isArray(data) || !data[0]) return null;
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

export default function EvacuationResources() {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [geocodeBusy, setGeocodeBusy] = useState(false);
  const [nearbyFires, setNearbyFires] = useState([]);
  const [firesLoading, setFiresLoading] = useState(false);
  const [firesError, setFiresError] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("Using default map center. Search for your area below.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCenter({ lat: coords.latitude, lng: coords.longitude });
        setStatus("Centered on your location. Adjust with search if needed.");
      },
      () => {
        setStatus("Location unavailable. Enter an address or ZIP to find resources.");
      },
      { enableHighAccuracy: true, timeout: 9000 },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadNearbyFires() {
      if (
        !isValidLatLng(Number(center.lat), Number(center.lng)) ||
        !apiBase
      ) {
        setNearbyFires([]);
        return;
      }

      setFiresLoading(true);
      setFiresError("");

      try {
        const response = await fetch(
          `${apiBase}/api/fires/nearby?latitude=${center.lat}&longitude=${center.lng}&radius=${FIRE_RADIUS_MI}&includeExternal=true`,
        );
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message =
            body?.errors?.[0]?.msg ||
            body?.message ||
            "Could not load nearby fires.";
          throw new Error(message);
        }

        const data = Array.isArray(body?.data) ? body.data : [];

        if (!cancelled) {
          setNearbyFires(
            data.filter(
              (f) =>
                isValidLatLng(Number(f.latitude), Number(f.longitude)),
            ),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setNearbyFires([]);
          setFiresError(
            err instanceof Error ? err.message : "Failed to load nearby fires.",
          );
        }
      } finally {
        if (!cancelled) setFiresLoading(false);
      }
    }

    loadNearbyFires();
    return () => {
      cancelled = true;
    };
  }, [center.lat, center.lng]);

  const shelters = useMemo(() => {
    return MOCK_TEMPLATE.map((s) => {
      const latitude = center.lat + s.offsetLat;
      const longitude = center.lng + s.offsetLng;
      const distanceMi = milesBetween(center.lat, center.lng, latitude, longitude);
      const address = `${latitude.toFixed(3)}, ${longitude.toFixed(3)} (demo)`;
      return {
        ...s,
        latitude,
        longitude,
        distanceMi,
        address,
      };
    }).sort((a, b) => a.distanceMi - b.distanceMi);
  }, [center]);

  async function handleFindResources(e) {
    e.preventDefault();
    const term = query.trim();
    if (!term) {
      setStatus("Please enter an address, city, or ZIP.");
      return;
    }
    setGeocodeBusy(true);
    setStatus("Searching...");
    try {
      const coords = await nominatimSearch(term);
      if (!coords) {
        setStatus("No matches found. Try a different spelling or ZIP.");
        setGeocodeBusy(false);
        return;
      }
      setCenter(coords);
      setStatus(`Showing resources near: ${term}`);
    } catch {
      setStatus("Could not reach the map search service. Try again later.");
    } finally {
      setGeocodeBusy(false);
    }
  }

  function handleShare() {
    const text = `Evacuation resources near ${center.lat.toFixed(3)}, ${center.lng.toFixed(3)}`;
    const url = window.location.href;

    if (navigator.share) {
      navigator.share({ title: "Wildfire evacuation resources", text, url }).catch(() => {});
      return;
    }

    navigator.clipboard.writeText(`${text}\n${url}`).then(
      () => alert("Link and location copied to clipboard."),
      () => alert(text),
    );
  }

  return (
    <div className="evacShell">
      <aside className="evacSidebar" aria-label="App navigation">
        <p className="evacBrand">Wildfire</p>
        <input
          className="evacSidebarSearch"
          type="search"
          placeholder="Search fires..."
          aria-label="Search fires"
        />
        <nav className="evacNav">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/map"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            Map
          </NavLink>
          <NavLink
            to="/alerts"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            Alerts
          </NavLink>
          <NavLink
            to="/resources"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            Resources
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            Settings
          </NavLink>
        </nav>
      </aside>

      <main className="evacMain">
        <header className="evacMainHeader">
          <h1 className="evacMainTitle">Evacuation resources</h1>
          <div className="evacMainActions">
            <label className="evacToggle">
              Notifications
              <input
                type="checkbox"
                checked={notificationsOn}
                onChange={(e) => setNotificationsOn(e.target.checked)}
                aria-label="Toggle notifications"
              />
            </label>
            <button type="button" className="evacShareBtn" onClick={handleShare}>
              Share
            </button>
          </div>
        </header>

        <form className="evacSearchBanner" onSubmit={handleFindResources}>
          <label htmlFor="evac-find-near">Find resources near</label>
          <input
            id="evac-find-near"
            className="evacSearchInput"
            type="text"
            placeholder="Search address, city, or ZIP..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={geocodeBusy}
          />
          <button type="submit" className="evacSearchBtn" disabled={geocodeBusy}>
            Search
          </button>
        </form>
        {status ? (
          <p className="evacHint" role="status">
            {status}
          </p>
        ) : null}

        <div className="evacMidGrid">
          <section className="evacMapPanel">
            <h3>Map</h3>
            <p className="evacMapSub">Nearby evacuation centers (demo locations)</p>
            <div className="evacMapViewport">
              <MapContainer
                center={[center.lat, center.lng]}
                zoom={11}
                scrollWheelZoom
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <RecenterEvac center={center} />

                <CircleMarker
                  center={[center.lat, center.lng]}
                  radius={8}
                  pathOptions={{ color: "#111827", fillColor: "#111827", fillOpacity: 0.85 }}
                >
                  <Popup>Your search center</Popup>
                </CircleMarker>

                {shelters.map((s) => (
                  <CircleMarker
                    key={s.id}
                    center={[s.latitude, s.longitude]}
                    radius={10}
                    pathOptions={{
                      color: s.color,
                      fillColor: s.color,
                      fillOpacity: 0.8,
                    }}
                  >
                    <Popup>{s.name}</Popup>
                  </CircleMarker>
                ))}

                {nearbyFires.map((fire) => {
                  const latitude = Number(fire.latitude);
                  const longitude = Number(fire.longitude);
                  if (!isValidLatLng(latitude, longitude)) return null;

                  const containment =
                    typeof fire.containment === "number"
                      ? `${fire.containment}% contained`
                      : null;

                  return (
                    <CircleMarker
                      key={`evac-fire-${fire.id}`}
                      center={[latitude, longitude]}
                      radius={7}
                      pathOptions={{
                        color: "#dc2626",
                        fillColor: "#ef4444",
                        fillOpacity: 0.8,
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
                        {containment ? (
                          <>
                            <br />
                            {containment}
                          </>
                        ) : null}
                        <br />
                        <Link
                          to={`/fire/${encodeURIComponent(fire.id)}`}
                          className="evacFireLink"
                        >
                          View details
                        </Link>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
              <div className="evacLegend">
                Legend: pin = open shelter / center; red pin = wildfire incident
              </div>
            </div>
          </section>

          <section className="evacListPanel">
            <h3>Shelters</h3>
            <p className="evacListSub">Sorted by distance</p>
            <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 280 }}>
              {shelters.map((s) => (
                <article key={s.id} className="evacShelterCard">
                  <h4>{s.name}</h4>
                  <address>{s.address}</address>
                  <span>{s.distanceMi.toFixed(1)} mi away</span>
                </article>
              ))}
            </div>
            <div className="evacMoreBox">More shelters (scroll)</div>

            <div className="evacFiresMiniPanel" aria-label="Nearby fires">
              <h3>Nearby fires</h3>
              <p className="evacListSub">From CAL FIRE + NASA FIRMS (includes external sources)</p>

              {firesLoading ? (
                <p className="evacHint" role="status">Loading nearby fires…</p>
              ) : firesError ? (
                <p className="evacFireErrorText">{firesError}</p>
              ) : nearbyFires.length ? (
                <div className="evacFiresList">
                  {nearbyFires.slice(0, 6).map((fire) => {
                    const latitude = Number(fire.latitude);
                    const longitude = Number(fire.longitude);
                    const distanceMi = isValidLatLng(latitude, longitude)
                      ? milesBetween(center.lat, center.lng, latitude, longitude)
                      : null;

                    return (
                      <div key={`mini-fire-${fire.id}`} className="evacFireMiniItem">
                        <Link to={`/fire/${encodeURIComponent(fire.id)}`} className="evacFireMiniLink">
                          {fire.name || "Wildfire"}
                        </Link>
                        <span>
                          {distanceMi !== null ? `${distanceMi.toFixed(1)} mi` : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="evacHint">No nearby fires found.</p>
              )}
            </div>
          </section>
        </div>

        <section className="evacEmergencyPanel">
          <div className="evacEmergencyHeader">
            <h3>Emergency contacts</h3>
            <span>Tap to call (wireframe)</span>
          </div>
          <p className="evacEmergencySub">Save these numbers offline if possible.</p>
          <ol className="evacEmergencyList">
            <li>
              <a href="tel:911">911</a>
              {" — "}Emergency (life safety)
            </li>
            <li>
              <a href="tel:18007334767">1-800-RED-CROSS</a>
              {" — "}American Red Cross
            </li>
            <li>
              <a href="tel:+15415550199">(541) 555-0199</a>
              {" — "}County Emergency Operations Center (demo)
            </li>
          </ol>
          <p className="evacHint">
            Mapping data © OpenStreetMap contributors · Geocoding via Nominatim (fair use /
            attribution)
          </p>
        </section>
      </main>
    </div>
  );
}
