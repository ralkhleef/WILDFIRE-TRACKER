import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./FireDetails.css";

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5001";

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
          <li><strong>{fire.name || "Unnamed wildfire"}</strong></li>
          <li>Status: {fire.status || "Unknown"}</li>
          <li>Source: {fire.source || "Unknown"}</li>
          <li>Location: {fire.location || "Unknown"}</li>
          <li>Acreage: {typeof fire.size === "number" ? `${fire.size.toLocaleString()} acres` : "N/A"}</li>
          <li>Containment: {typeof fire.containment === "number" ? `${fire.containment}%` : "N/A"}</li>
          <li>Reported: {fire.reportedAt ? new Date(fire.reportedAt).toLocaleDateString() : "N/A"}</li>
          <li>Nearby fires: {nearby.length}</li>
        </ul>
      </aside>

      <section className="fireMainPanel">
        <header className="fireDetailsHeader">
          <h1 className="fireDetailsTitle">Fire Details</h1>
          <Link className="backToMapBtn" to="/map">
            Back to Map
          </Link>
        </header>

        <section className="fireStatsGrid">
          <article className="fireStatCard">
            <h3>Acreage</h3>
            <p>{typeof fire.size === "number" ? `${formatNumber(fire.size)} acres` : "N/A"}</p>
          </article>
          <article className="fireStatCard">
            <h3>Containment</h3>
            <p>
              {typeof fire.containment === "number"
                ? `${formatNumber(fire.containment)}%`
                : "N/A"}
            </p>
          </article>
          <article className="fireStatCard">
            <h3>Air Quality</h3>
            <p>{getAirQualityLabel(fire)}</p>
          </article>
          <article className="fireStatCard">
            <h3>Wind Speed</h3>
            <p>{getWindSpeedLabel(fire)}</p>
          </article>
        </section>

        <section className="fireLowerGrid">
          <article className="fireLargeCard">
            <h3>NASA satellite image</h3>
            <p className="fireMetaLine">
              Source: {fire.source || "Unknown"} {fire.status ? `• ${fire.status}` : ""}
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
            ) : (
              <p className="fireStatusText">Satellite view unavailable for this record.</p>
            )}
          </article>

          <article className="fireRightStack">
            <h3>Evacuation resources</h3>
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
          </article>
        </section>

        <section className="nearbyFiresSection">
          <h3>Nearby fires (60 mi, includes external sources)</h3>
          {nearby.length ? (
            <ul className="nearbyFireList">
              {nearby.map((item) => (
                <li key={item.id}>
                  <Link to={`/fire/${item.id}`}>{item.name || "Unnamed wildfire"}</Link>
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
