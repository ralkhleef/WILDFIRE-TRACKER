import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Copy, ExternalLink, MapPin, Share2 } from "lucide-react";
import calFireLogo from "../assets/calfirelogo.png";
import "./FireDetails.css";

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5050";
const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";

function formatNumber(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return value.toLocaleString();
}

function isNasaHotspot(fire) {
  return (
    fire?.sourceType === "thermal_detection" ||
    String(fire?.source || "").toLowerCase().includes("nasa")
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

function getShareMessage(fire) {
  const where = fire?.location || "this area";
  const name = fire?.name ? `${fire.name} - ` : "";
  const status = fire?.status ? ` Status: ${fire.status}.` : "";
  return `${name}Wildfire reported near ${where}.${status} Stay alert, follow evacuation guidance, and stay safe.`;
}

function buildShareLinks(fire) {
  const message = getShareMessage(fire);
  const url = typeof window !== "undefined" ? window.location.href : "";
  return {
    message,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(message)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`,
    template: `${message}\n\nMap/details: ${url}\n\n#WildfireSafety #EvacuationReady`,
  };
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

  const share = useMemo(() => buildShareLinks(fire), [fire]);

  async function handleCopyShare() {
    await navigator.clipboard?.writeText(share.template);
  }

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

  const coordinates =
    Number.isFinite(Number(fire.latitude)) && Number.isFinite(Number(fire.longitude))
      ? `${Number(fire.latitude).toFixed(4)}, ${Number(fire.longitude).toFixed(4)}`
      : "N/A";
  const sourceValue = fire.sourceLabel || fire.source || "Unknown";
  const statusValue = fire.status || "Unknown";
  const summaryFields = [
    ["Location", fire.location || "Unknown"],
    ["Coordinates", coordinates],
    ["Reported time", formatDateTime(fire.reportedAt)],
    ["Acreage", typeof fire.size === "number" ? `${formatNumber(fire.size)} acres` : "N/A"],
    ["Containment", typeof fire.containment === "number" ? `${formatNumber(fire.containment)}%` : "N/A"],
    ["Status", statusValue],
    ["Source", sourceValue],
  ];

  return (
    <main className="fireDetailsPage">
      <section className="fireMainPanel">
        <header className="fireDetailsHeader">
          <div className="fireHeroIdentity">
            <div className="calFireLogoBadge">
              <img className="calFireLogo" src={calFireLogo} alt="CAL FIRE" />
            </div>
            <div className="fireHeroCopy">
              <div className="fireBadgeRow">
                <span className="fireSourceBadge">{sourceValue}</span>
                <span className="fireStatusBadge">{statusValue}</span>
              </div>
              <h1 className="fireDetailsTitle">{getFireTitle(fire)}</h1>
              <p className="fireDetailsSubhead">{fire.location || "Unknown location"}</p>
            </div>
          </div>
          <Link className="backToMapBtn" to="/map">
            Back to Map
          </Link>
        </header>

        <section className="fireSummaryPanel" aria-label="Fire summary">
          <div className="fireSummaryHeader">
            <h2>Incident Summary</h2>
            <span className="fireSummaryAccent" aria-hidden="true" />
          </div>
          <dl className="fireSummaryGrid">
            {summaryFields.map(([label, value]) => (
              <div key={label} className="fireSummaryItem">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="fireSharePanel" aria-label="Share fire details">
          <div className="fireShareCopy">
            <Share2 size={16} strokeWidth={2.2} />
            <p>Share this CAL FIRE incident update.</p>
          </div>
          <div className="fireShareActions">
            <a className="fireShareButton" href={share.facebook} target="_blank" rel="noreferrer">
              <ExternalLink size={14} strokeWidth={2.2} />
              Facebook
            </a>
            <a className="fireShareButton" href={share.x} target="_blank" rel="noreferrer">
              <ExternalLink size={14} strokeWidth={2.2} />
              X
            </a>
            <button type="button" className="fireShareButton" onClick={handleCopyShare}>
              <Copy size={14} strokeWidth={2.2} />
              Copy
            </button>
          </div>
        </section>

        <section className="fireMapPanel">
          <div className="fireMapHeader">
            <h2>Map</h2>
            <span>
              <MapPin size={14} strokeWidth={2.2} />
              {coordinates}
            </span>
          </div>
          {Number.isFinite(Number(fire.latitude)) && Number.isFinite(Number(fire.longitude)) ? (
            <div className="fireMapPreview">
              <FireMiniMap fire={fire} />
            </div>
          ) : (
            <p className="fireStatusText">Map view unavailable for this record.</p>
          )}
        </section>

        {nearby.length ? (
          <section className="nearbyFiresPanel">
            <h2>Nearby Official Fires</h2>
            <ul className="nearbyFireList">
              {nearby.map((item) => (
                <li key={item.id}>
                  <Link to={`/fire/${encodeURIComponent(item.id)}`}>{getFireTitle(item)}</Link>
                  <span>{item.location || "Unknown location"}</span>
                  <ExternalLink size={13} strokeWidth={2.2} aria-hidden="true" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>
    </main>
  );
}
