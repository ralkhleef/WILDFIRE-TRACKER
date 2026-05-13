import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import "./FireDetails.css";

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5050";
const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";

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

function isNasaHotspot(fire) {
  return (
    fire?.sourceType === "thermal_detection" ||
    String(fire?.source || "").toLowerCase().includes("nasa")
  );
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

function getFireTitle(fire) {
  return fire?.name || fire?.location || "Wildfire record";
}

function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function getSeverityLabel(fire) {
  if (isNasaHotspot(fire)) return "Watch";
  if (!fire?.containment || fire.containment < 20) return "Critical";
  if (fire.containment < 60) return "Warning";
  return "Watch";
}

function fireMarkerIcon(googleMaps, fire) {
  if (!googleMaps) return undefined;
  const hotspot = isNasaHotspot(fire);
  const fill = hotspot ? "#f97316" : "#dc2626";
  const radius = hotspot ? 7 : 9;
  const svg = `\
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">\
<circle cx="14" cy="14" r="${radius + 4}" fill="${fill}" opacity="0.18"/>\
<circle cx="14" cy="14" r="${radius}" fill="${fill}" stroke="#ffffff" stroke-width="2"/>\
</svg>`;
  return {
    url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    scaledSize: new googleMaps.Size(28, 28),
    anchor: new googleMaps.Point(14, 14),
  };
}

function FireMiniMap({ fire }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: googleMapsKey,
  });

  const latitude = Number(fire.latitude);
  const longitude = Number(fire.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  if (!googleMapsKey) {
    return (
      <div className="mapMissingKey">
        <h3>Google Maps key missing</h3>
        <p>
          Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to <code>client/.env</code> to
          enable the location preview.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mapMissingKey">
        <h3>Google Maps failed to load</h3>
        <p>Check your API key restrictions and try again.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="mapLoading">Loading map…</div>;
  }

  return (
    <GoogleMap
      mapContainerClassName="fireGoogleMapCanvas"
      center={{ lat: latitude, lng: longitude }}
      zoom={8.4}
      mapTypeId="roadmap"
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        clickableIcons: false,
      }}
    >
      <Marker
        position={{ lat: latitude, lng: longitude }}
        icon={fireMarkerIcon(window.google?.maps, fire)}
        title={getFireTitle(fire)}
      />
    </GoogleMap>
  );
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

function getGoogleMapsSearchUrl(fire, query) {
  const latitude = Number(fire?.latitude);
  const longitude = Number(fire?.longitude);
  const encodedQuery = encodeURIComponent(query);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `https://www.google.com/maps/search/${encodedQuery}/@${latitude},${longitude},11z`;
  }
  const location = encodeURIComponent(fire?.location || "California");
  return `https://www.google.com/maps/search/${encodedQuery}+near+${location}`;
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
            `${apiBase}/api/fires/nearby?latitude=${nextFire.latitude}&longitude=${nextFire.longitude}&radius=60&source=calfire`,
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
      <section className="fireMainPanel">
        <header className="fireDetailsHeader">
          <div>
            <h1 className="fireDetailsTitle">{getFireTitle(fire)}</h1>
            <p className="fireDetailsSubhead">{fire.location || "Unknown location"}</p>
            <div className="fireBadgeRow">
              <span className="fireSourceBadge">{fire.sourceLabel || fire.source || "Unknown source"}</span>
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
            Satellite thermal detection. Not a confirmed wildfire incident unless matched with an official incident source.
          </p>
        ) : null}

        <section className="fireInfoGrid" aria-label="Fire summary">
          {[
            ["Location", fire.location || "Unknown"],
            [
              "Coordinates",
              Number.isFinite(Number(fire.latitude)) && Number.isFinite(Number(fire.longitude))
                ? `${Number(fire.latitude).toFixed(4)}, ${Number(fire.longitude).toFixed(4)}`
                : "N/A",
            ],
            [isNasaHotspot(fire) ? "Detected" : "Reported", formatDateTime(fire.reportedAt)],
            ["Source", fire.sourceLabel || fire.source || "Unknown"],
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

        <section className="fireContentCard">
          <h2>Reports</h2>
          {isDemoFire(fire) ? (
            <div className="fireReportGrid">
              <article className="fireReportCard">
                <h4>Demo field report</h4>
                <p>Demo data — 4 engines, 1 helicopter, and 1 hand crew assigned for layout testing.</p>
              </article>
              <article className="fireReportCard">
                <h4>Location accuracy</h4>
                <p>Approximate — verify with an official incident source during real use.</p>
              </article>
              <article className="fireReportCard">
                <h4>Last updated</h4>
                <p>{formatDateTime(fire.updatedAt || fire.reportedAt)}</p>
              </article>
            </div>
          ) : (
            <p className="fireStatusText">
              No field reports available yet. Check official resources below for the latest updates.
            </p>
          )}
        </section>

        <section className="fireContentCard">
          <h2>Imagery / Camera View</h2>
          {isDemoFire(fire) ? (
            <>
              <p className="fireMetaLine">
                Demo camera placeholder for layout testing. Use official sources for real incident imagery.
              </p>
              <div className="fireImageryLinks">
                {satelliteUrl ? (
                  <a className="externalLinkBtn" href={satelliteUrl} target="_blank" rel="noreferrer">
                    NASA Worldview (satellite)
                  </a>
                ) : null}
                <a
                  className="externalLinkBtn"
                  href="https://cameras.alertcalifornia.org/"
                  target="_blank"
                  rel="noreferrer"
                >
                  ALERTCalifornia cameras
                </a>
              </div>
            </>
          ) : (
            <p className="fireStatusText">No camera imagery is available for this incident yet.</p>
          )}
        </section>

        <section className="fireContentCard">
          <h2>Map</h2>
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
            </>
          ) : (
            <p className="fireStatusText">Map view unavailable for this record.</p>
          )}
        </section>

        <section className="fireContentCard">
          <h2>Action Resources</h2>
          <p className="fireMetaLine">
            Use official sources for evacuation, air quality, and incident updates near this fire.
          </p>
          <div className="resourceGrid">
            <a
              className="resourcePill"
              href="https://www.fire.ca.gov/incidents"
              target="_blank"
              rel="noreferrer"
            >
              CAL FIRE incident dashboard
            </a>
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
              href="https://www.airnow.gov/"
              target="_blank"
              rel="noreferrer"
            >
              AirNow local air quality
            </a>
            <a
              className="resourcePill"
              href={getGoogleMapsSearchUrl(fire, "evacuation shelter")}
              target="_blank"
              rel="noreferrer"
            >
              Google Maps evacuation / shelter resources
            </a>
            <a
              className="resourcePill"
              href="https://cameras.alertcalifornia.org/"
              target="_blank"
              rel="noreferrer"
            >
              ALERTCalifornia camera network
            </a>
          </div>
        </section>

        <section className="fireContentCard">
          <h2>Nearby Resources</h2>
          <p className="fireMetaLine">
            These links open Google Maps searches centered near the incident when coordinates are available.
          </p>
          <div className="resourceGrid">
            <a
              className="resourcePill"
              href={getGoogleMapsSearchUrl(fire, "hospitals")}
              target="_blank"
              rel="noreferrer"
            >
              Nearby hospitals
            </a>
            <a
              className="resourcePill"
              href={getGoogleMapsSearchUrl(fire, "emergency shelters")}
              target="_blank"
              rel="noreferrer"
            >
              Nearby shelters
            </a>
            <a
              className="resourcePill"
              href={getGoogleMapsSearchUrl(fire, "evacuation centers")}
              target="_blank"
              rel="noreferrer"
            >
              Evacuation centers
            </a>
          </div>
        </section>

        <section className="fireContentCard">
          <h3>Nearby official fires (60 mi)</h3>
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
