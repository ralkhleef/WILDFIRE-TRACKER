import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "./FireDetails.css";

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5050";

const mapTilerKey = import.meta.env.VITE_MAPTILER_KEY?.trim();
const OPENFREEMAP_MINI_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const OPENFREEMAP_MINI_MAP_FALLBACK_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const MAPTILER_MINI_MAP_STYLE = mapTilerKey
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(mapTilerKey)}`
  : null;
const MINI_MAP_STYLE = MAPTILER_MINI_MAP_STYLE || OPENFREEMAP_MINI_MAP_STYLE;
const MINI_MAP_FALLBACK_STYLES = MAPTILER_MINI_MAP_STYLE
  ? [OPENFREEMAP_MINI_MAP_STYLE, OPENFREEMAP_MINI_MAP_FALLBACK_STYLE]
  : [OPENFREEMAP_MINI_MAP_FALLBACK_STYLE];

function formatNumber(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return value.toLocaleString();
}

function getAirQualityLabel(fire) {
  if (fire?.brightness) {
    return `Elevated (${formatNumber(Number(fire.brightness))})`;
  }
  if (fire?.status === "active") return "Watch area";
  return "Unavailable";
}

function getWindSpeedLabel(fire) {
  if (fire?.source === "CAL FIRE") return "Check CAL FIRE updates";
  return "Unavailable";
}

function isNasaHotspot(fire) {
  return String(fire?.source || "").toLowerCase().includes("nasa");
}

function getFireTitle(fire) {
  return fire?.name || fire?.location || "Wildfire record";
}

function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function getMarkerStyle(fire) {
  if (isNasaHotspot(fire)) return "hotspot";
  if (String(fire?.source || "").toLowerCase().includes("seed")) return "demo";
  return "confirmed";
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

function getSeverityLabel(fire) {
  if (isNasaHotspot(fire)) return "Watch";
  if (!fire?.containment || fire.containment < 20) return "Critical";
  if (fire.containment < 60) return "Warning";
  return "Watch";
}

function FireMiniMap({ fire }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const latitude = Number(fire.latitude);
    const longitude = Number(fire.longitude);
    if (!containerRef.current || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return undefined;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MINI_MAP_STYLE,
      center: [longitude, latitude],
      zoom: 8.6,
      attributionControl: false,
      interactive: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    let fallbackIndex = 0;
    map.on("error", () => {
      const fallbackStyle = MINI_MAP_FALLBACK_STYLES[fallbackIndex];
      if (!fallbackStyle) return;
      fallbackIndex += 1;
      map.setStyle(fallbackStyle);
    });

    new maplibregl.Marker({
      element: createMarkerElement(getMarkerStyle(fire)),
      anchor: "bottom",
    })
      .setLngLat([longitude, latitude])
      .setPopup(
        new maplibregl.Popup({ offset: 30 }).setHTML(
          `<strong>${getFireTitle(fire)}</strong><br>${fire.location || "California"}<br>${fire.source || "Unknown source"}`,
        ),
      )
      .addTo(map);

    const timers = [0, 140, 320].map((delay) => window.setTimeout(() => map.resize(), delay));

    return () => {
      timers.forEach(window.clearTimeout);
      map.remove();
    };
  }, [fire]);

  return <div ref={containerRef} className="fireMapLibreCanvas" aria-label="Fire location map" />;
}

function getSatelliteUrl(fire) {
  if (
    typeof fire?.latitude !== "number" ||
    typeof fire?.longitude !== "number" ||
    !Number.isFinite(fire.latitude) ||
    !Number.isFinite(fire.longitude)
  ) {
    return null;
  }

  const lat = fire.latitude.toFixed(4);
  const lon = fire.longitude.toFixed(4);
  return `https://worldview.earthdata.nasa.gov/?v=${lon - 6},${lat - 4},${lon + 6},${lat + 4}`;
}

export default function FireDetails() {
  const { id } = useParams();
  const [fire, setFire] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFireDetails() {
      if (!id) {
        setError("Missing fire ID.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const detailsResponse = await fetch(`${apiBase}/api/fires/${id}`);
        const detailsBody = await detailsResponse.json().catch(() => ({}));

        if (!detailsResponse.ok) {
          const message =
            detailsBody?.errors?.[0]?.msg ||
            detailsBody?.message ||
            "Could not load fire details.";
          if (!cancelled) {
            setError(message);
            setFire(null);
            setNearby([]);
            setLoading(false);
          }
          return;
        }

        const nextFire = detailsBody?.data || null;
        if (!nextFire) {
          if (!cancelled) {
            setError("Fire details response was empty.");
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setFire(nextFire);
        }

        if (
          typeof nextFire.latitude === "number" &&
          typeof nextFire.longitude === "number" &&
          Number.isFinite(nextFire.latitude) &&
          Number.isFinite(nextFire.longitude)
        ) {
          const nearbyResponse = await fetch(
            `${apiBase}/api/fires/nearby?latitude=${nextFire.latitude}&longitude=${nextFire.longitude}&radius=60&includeExternal=true`,
          );
          const nearbyBody = await nearbyResponse.json().catch(() => ({}));
          const nearbyData = Array.isArray(nearbyBody?.data) ? nearbyBody.data : [];

          if (!cancelled) {
            setNearby(nearbyData.filter((item) => item.id !== nextFire.id).slice(0, 8));
          }
        } else if (!cancelled) {
          setNearby([]);
        }
      } catch {
        if (!cancelled) {
          setError("Network error while loading fire details.");
          setFire(null);
          setNearby([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFireDetails();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const satelliteUrl = useMemo(() => getSatelliteUrl(fire), [fire]);

  if (loading) {
    return (
      <main className="fireDetailsPage">
        <p className="fireStatusText">Loading fire details...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="fireDetailsPage">
        <p className="fireErrorText">{error}</p>
      </main>
    );
  }

  if (!fire) {
    return (
      <main className="fireDetailsPage">
        <p className="fireStatusText">No fire data available.</p>
      </main>
    );
  }

  return (
    <main className="fireDetailsPage">
      <aside className="fireSidebar" aria-label="Fire details sidebar">
        <h2 className="fireSidebarTitle">Fire Details</h2>
        <ul className="fireSidebarList">
          <li><strong>{getFireTitle(fire)}</strong></li>
          <li>Status: {fire.status || "Unknown"}</li>
          <li>Source: {fire.source || "Unknown"}</li>
          <li>Location: {fire.location || "Unknown"}</li>
          <li>Coordinates: {Number.isFinite(Number(fire.latitude)) && Number.isFinite(Number(fire.longitude)) ? `${Number(fire.latitude).toFixed(4)}, ${Number(fire.longitude).toFixed(4)}` : "N/A"}</li>
          <li>Acreage: {typeof fire.size === "number" ? `${fire.size.toLocaleString()} acres` : "N/A"}</li>
          <li>Containment: {typeof fire.containment === "number" ? `${fire.containment}%` : "N/A"}</li>
          <li>{isNasaHotspot(fire) ? "Detected" : "Reported"}: {formatDateTime(fire.reportedAt)}</li>
          <li>Nearby fires: {nearby.length}</li>
        </ul>
      </aside>

      <section className="fireMainPanel">
        <header className="fireDetailsHeader">
          <div>
            <h1 className="fireDetailsTitle">{getFireTitle(fire)}</h1>
            <p className="fireDetailsSubhead">{fire.location || "Unknown location"}</p>
            <div className="fireBadgeRow">
              <span className="fireSourceBadge">{fire.source || "Unknown source"}</span>
              <span className={`fireSeverityBadge fireSeverityBadge--${getSeverityLabel(fire).toLowerCase()}`}>
                {getSeverityLabel(fire)}
              </span>
              {fire.status ? <span className="fireStatusBadge">{fire.status}</span> : null}
            </div>
          </div>
          <Link className="backToMapBtn" to="/map">
            Back to Map
          </Link>
        </header>

        {isNasaHotspot(fire) ? (
          <p className="fireSourceNote">
            Satellite hotspot detection. Not a confirmed incident unless matched with CAL FIRE.
          </p>
        ) : null}

        <section className="fireInfoGrid">
          {[
            ["Location", fire.location || "Unknown"],
            [
              "Coordinates",
              Number.isFinite(Number(fire.latitude)) && Number.isFinite(Number(fire.longitude))
                ? `${Number(fire.latitude).toFixed(4)}, ${Number(fire.longitude).toFixed(4)}`
                : "N/A",
            ],
            [isNasaHotspot(fire) ? "Detected" : "Reported", formatDateTime(fire.reportedAt)],
            ["Source", fire.source || "Unknown"],
            ["Acreage", typeof fire.size === "number" ? `${formatNumber(fire.size)} acres` : "N/A"],
            ["Containment", typeof fire.containment === "number" ? `${formatNumber(fire.containment)}%` : "N/A"],
            ["Status", fire.status || "Unknown"],
            ["Air quality", getAirQualityLabel(fire)],
          ].map(([label, value]) => (
            <article key={label} className="fireInfoCard">
              <h3>{label}</h3>
              <p>{value}</p>
            </article>
          ))}
        </section>

        <section className="fireLowerGrid">
          <article className="fireLargeCard">
            <h3>Map preview</h3>
            <p className="fireMetaLine">
              Source: {fire.source || "Unknown"} {fire.status ? `• ${fire.status}` : ""}
            </p>
            {Number.isFinite(Number(fire.latitude)) && Number.isFinite(Number(fire.longitude)) ? (
              <>
                <div className="fireMapPreview">
                  <FireMiniMap fire={fire} />
                </div>
                <p className="fireMetaLine">
                  Coordinates: {Number(fire.latitude).toFixed(4)}, {Number(fire.longitude).toFixed(4)}
                </p>
                <p className="fireMetaLine">
                  {isNasaHotspot(fire) ? "Detected" : "Reported"}: {formatDateTime(fire.reportedAt)}
                </p>
                {satelliteUrl ? (
                  <a
                    className="externalLinkBtn"
                    href={satelliteUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open NASA Worldview for this area
                  </a>
                ) : null}
              </>
            ) : (
              <p className="fireStatusText">Map view unavailable for this record.</p>
            )}
          </article>

          <article className="fireRightStack">
            <h3>Action resources</h3>
            <p className="fireMetaLine">
              Use official sources for evacuation, air quality, and incident updates.
            </p>
            <a
              className="resourcePill"
              href="https://www.ready.gov/evacuation"
              target="_blank"
              rel="noreferrer"
            >
              Ready.gov evacuation guide
            </a>
            <a
              className="resourcePill"
              href="https://www.fire.ca.gov/incidents"
              target="_blank"
              rel="noreferrer"
            >
              CAL FIRE incidents dashboard
            </a>
            <a
              className="resourcePill"
              href="https://www.airnow.gov/"
              target="_blank"
              rel="noreferrer"
            >
              AirNow local air quality
            </a>
            <a
              className="resourcePill"
              href="https://cameras.alertcalifornia.org/"
              target="_blank"
              rel="noreferrer"
            >
              ALERTCalifornia camera network
            </a>
            <a
              className="resourcePill"
              href="https://firemap.sdsc.edu/"
              target="_blank"
              rel="noreferrer"
            >
              WIFIRE Firemap
            </a>
          </article>
        </section>

        <section className="nearbyFiresSection">
          <h3>Nearby fires (60 mi, includes external sources)</h3>
          {nearby.length ? (
            <ul className="nearbyFireList">
              {nearby.map((item) => (
                <li key={item.id}>
                  <Link to={`/fire/${encodeURIComponent(item.id)}`}>{getFireTitle(item)}</Link>
                  <span>{item.location || "Unknown location"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fireStatusText">No additional nearby fires found.</p>
          )}
        </section>
      </section>
    </main>
  );
}
