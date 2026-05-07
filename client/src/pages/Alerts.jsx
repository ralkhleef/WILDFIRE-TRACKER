import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import "./Alerts.css";

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5050";

const DEFAULT_LAT = 34.0522;
const DEFAULT_LNG = -118.2437;
const DEFAULT_RADIUS = 100;

function getSeverity(fire) {
  if (isNasaHotspot(fire)) return "watch";
  if (!fire.containment || fire.containment < 20) return "critical";
  if (fire.containment < 60) return "warning";
  return "watch";
}

function isNasaHotspot(fire) {
  return String(fire?.source || "").toLowerCase().includes("nasa");
}

function getSourceBadgeKey(fire) {
  const src = String(fire?.source || "").toLowerCase();
  if (src.includes("cal fire")) return "cal";
  if (src.includes("nasa")) return "nasa";
  if (src.includes("seed")) return "seed";
  return "other";
}

function getShortSourceLabel(fire) {
  const src = String(fire?.source || "").toLowerCase();
  if (src.includes("cal fire")) return "CAL FIRE";
  if (src.includes("nasa")) return "NASA FIRMS";
  if (src.includes("seed")) return "SEED";
  return fire?.source || "SOURCE";
}

function getFireTitle(fire) {
  return fire?.name || fire?.location || "Wildfire record";
}

function getSeverityLabel(severity) {
  if (severity === "critical") return "CRITICAL";
  if (severity === "warning") return "WARNING";
  return "WATCH";
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

export default function AlertsPage() {
  const [fires, setFires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [sortBy, setSortBy] = useState("date");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterLocation, setFilterLocation] = useState("");
  const [userLat, setUserLat] = useState(DEFAULT_LAT);
  const [userLng, setUserLng] = useState(DEFAULT_LNG);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setUserLat(coords.latitude);
          setUserLng(coords.longitude);
        },
        () => {},
        { timeout: 8000 }
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadFires() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `${apiBase}/api/fires/nearby?latitude=${userLat}&longitude=${userLng}&radius=${DEFAULT_RADIUS}&includeExternal=true`
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.message || "Could not load alerts.");
        if (!cancelled) setFires(Array.isArray(body?.data) ? body.data : []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadFires();
    return () => { cancelled = true; };
  }, [userLat, userLng]);

  const filtered = useMemo(() => {
    let result = fires.map((f) => ({ ...f, severity: getSeverity(f) }));

    if (filterSeverity !== "all") {
      result = result.filter((f) => f.severity === filterSeverity);
    }

    if (filterLocation.trim()) {
      const term = filterLocation.trim().toLowerCase();
      result = result.filter(
        (f) =>
          f.name?.toLowerCase().includes(term) ||
          f.location?.toLowerCase().includes(term)
      );
    }

    if (sortBy === "date") {
      result.sort((a, b) => {
        const aTime = a.reportedAt ? new Date(a.reportedAt).getTime() : 0;
        const bTime = b.reportedAt ? new Date(b.reportedAt).getTime() : 0;
        return bTime - aTime;
      });
    } else if (sortBy === "severity") {
      const order = { critical: 0, warning: 1, watch: 2 };
      result.sort((a, b) => order[a.severity] - order[b.severity]);
    } else if (sortBy === "distance") {
      result.sort((a, b) => (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999));
    }

    return result;
  }, [fires, filterSeverity, filterLocation, sortBy]);

  return (
    <div className="alertsShell">
      <main className="alertsMain">
        <header className="alertsHeader">
          <h1 className="alertsTitle">Alerts</h1>
          <label className="alertsNotifToggle">
            Notifications
            <input
              type="checkbox"
              checked={notificationsOn}
              onChange={(e) => setNotificationsOn(e.target.checked)}
            />
            <span className="alertsToggleTrack">
              <span className="alertsToggleThumb" />
            </span>
            <span className="alertsNotifLabel">{notificationsOn ? "On" : "Off"}</span>
          </label>
        </header>

        <div className="alertsFilterBar">
          <span className="alertsFilterLabel">Filter &amp; sort</span>
          <select
            aria-label="Sort by"
            className="alertsFilterSelect"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">Date (sort)</option>
            <option value="severity">Severity (sort)</option>
            <option value="distance">Distance (sort)</option>
          </select>
          <select
            aria-label="Filter by severity"
            className="alertsFilterSelect"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="watch">Watch</option>
          </select>
          <input
            aria-label="Filter by location"
            className="alertsFilterInput"
            type="text"
            placeholder="Location"
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="alertsHint">Loading alerts...</p>
        ) : error ? (
          <p className="alertsError">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="alertsHint">No alerts found for your area.</p>
        ) : (
          <>
            <p className="alertsHint">Tap an alert to open Fire Details page</p>
            <div className="alertsList">
              {filtered.map((fire) => (
                <Link
                  key={fire.id}
                  to={`/fire/${encodeURIComponent(fire.id)}`}
                  className={`alertCard alertCard--${fire.severity}`}
                >
                  <div className="alertCardTop">
                    <div>
                      <h2 className="alertCardName">{getFireTitle(fire)}</h2>
                      <p className="alertCardLocation">{fire.location || "Unknown location"}</p>
                      <p className="alertCardSeverityText">
                        {isNasaHotspot(fire)
                          ? fire.subtitle || "Satellite hotspot detection, not confirmed incident"
                          : `Severity: ${getSeverityLabel(fire.severity).charAt(0) + getSeverityLabel(fire.severity).slice(1).toLowerCase()}`}
                      </p>
                    </div>
                    <div className="alertCardRight">
                      <span
                        className="alertSourceBadge"
                        data-source={getSourceBadgeKey(fire)}
                      >
                        {getShortSourceLabel(fire)}
                      </span>
                      <span className={`alertBadge alertBadge--${fire.severity}`}>
                        {getSeverityLabel(fire.severity)}
                      </span>
                      {timeAgo(fire.reportedAt) && (
                        <span className="alertCardTime">{timeAgo(fire.reportedAt)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="alertsSeverityLegend">
          <span className="alertsLegendTitle">Severity colors</span>
          <span className="alertsLegendItem">
            <span className="alertsLegendDot alertsLegendDot--critical" />
            Critical
          </span>
          <span className="alertsLegendItem">
            <span className="alertsLegendDot alertsLegendDot--warning" />
            Warning
          </span>
          <span className="alertsLegendItem">
            <span className="alertsLegendDot alertsLegendDot--watch" />
            Watch
          </span>
        </div>
      </main>
    </div>
  );
}
