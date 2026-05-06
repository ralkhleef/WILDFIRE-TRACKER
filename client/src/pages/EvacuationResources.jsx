import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./EvacuationResources.css";
import WildfireMap from "../components/WildfireMap.jsx";

const DEFAULT_CENTER = { lat: 34.0522, lng: -118.2437 };
const FIRE_RADIUS_MI = 60;

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5001";

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
  const [shelters, setShelters] = useState([]);
  const [sheltersLoading, setSheltersLoading] = useState(false);

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
  useEffect(() => {
  let cancelled = false;
  async function loadShelters() {
    setSheltersLoading(true);
    const q = `[out:json][timeout:25];(node["amenity"="shelter"](around:50000,${center.lat},${center.lng});node["social_facility"="evacuation_centre"](around:50000,${center.lat},${center.lng});node["emergency"="assembly_point"](around:50000,${center.lat},${center.lng});node["amenity"="community_centre"](around:50000,${center.lat},${center.lng});way["amenity"="shelter"](around:50000,${center.lat},${center.lng}););out center body;`;
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: `data=${encodeURIComponent(q)}`,
      });
      const data = await res.json();
      if (cancelled) return;
      const results = (data.elements || [])
        .map((el) => {
          const lat = el.lat ?? el.center?.lat;
          const lng = el.lon ?? el.center?.lon;
          if (!lat || !lng) return null;
          return {
            id: `osm-${el.id}`,
            name: el.tags?.name || "Emergency Shelter",
            latitude: Number(lat),
            longitude: Number(lng),
            address: [el.tags?.["addr:street"], el.tags?.["addr:city"]]
              .filter(Boolean).join(", ") || null,
            distanceMi: milesBetween(center.lat, center.lng, Number(lat), Number(lng)),
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.distanceMi - b.distanceMi);
      setShelters(results);
    } catch {
      setShelters([]);
    } finally {
      if (!cancelled) setSheltersLoading(false);
    }
  }
  loadShelters();
  return () => { cancelled = true; };
}, [center.lat, center.lng]);

  const shelterKey = `${center.lat},${center.lng}`;

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
          <label htmlFor="evac-find-near">Find shelters near</label>
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
              <WildfireMap
              title="Nearby evacuation centers"
              initialCenter={{ latitude: center.lat, longitude: center.lng }}
              onLocationChange={(lat, lng) => setCenter({ lat, lng })}
            />
          </section>
 
          <section className="evacListPanel">
            <h3>Shelters</h3>
            <p className="evacListSub">Sorted by distance · via OpenStreetMap</p>
            <div key={shelterKey} style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 280 }}>              {sheltersLoading ? (
                <p className="evacHint">Loading shelters...</p>
              ) : shelters.length === 0 ? (
                <p className="evacHint">No shelters found in this area.</p>
              ) : (
                shelters.map((s) => (
                  <article key={s.id} className="evacShelterCard">
                    <h4>{s.name}</h4>
                    {s.address ? <address>{s.address}</address> : null}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{s.distanceMi.toFixed(1)} mi away</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${s.latitude},${s.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: "0.78rem", color: "var(--accent)", textDecoration: "none" }}
                      >
                        Open in Google Maps ↗
                      </a>
                    </div>
                  </article>
                ))
              )}
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
