import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  Copy,
  ExternalLink,
  Flame,
  Mail,
  MapPin,
  MessageCircle,
  Share2,
  ShieldAlert,
} from "lucide-react";
import { apiBase, authHeaders, getToken } from "../api.js";
import "./Alerts.css";

const DEFAULT_LAT = 34.0522;
const DEFAULT_LNG = -118.2437;
const DEFAULT_RADIUS = 100;

function getSeverity(fire) {
  if (typeof fire?.containment === "number") {
    if (fire.containment < 20) return "critical";
    if (fire.containment < 60) return "warning";
    return "watch";
  }

  const status = String(fire?.status || "").toLowerCase();
  if (status.includes("active") || status.includes("new")) return "warning";
  return "watch";
}

function isCalFireIncident(fire) {
  const source = `${fire?.source || ""} ${fire?.sourceLabel || ""}`.toLowerCase();
  return (
    source.includes("cal fire") ||
    fire?.sourceType === "confirmed_incident" ||
    fire?.confirmed === true ||
    String(fire?.id || "").toLowerCase().startsWith("calfire-")
  );
}

function getAlertTitle(fire) {
  const text = `${fire?.incidentType || fire?.type || fire?.category || fire?.name || ""}`.toLowerCase();
  if (text.includes("brush")) return "Brush Fire";
  if (text.includes("vegetation")) return "Vegetation Fire";
  if (text.includes("wildland") || text.includes("wildfire")) return "Wildfire Incident";
  if (text.includes("fire")) return "Fire Activity";
  return "Wildfire Incident";
}

function getIncidentName(fire) {
  const name = String(fire?.name || "").trim();
  if (!name) return null;
  return name;
}

function getSeverityLabel(severity) {
  if (severity === "critical") return "Critical";
  if (severity === "warning") return "Warning";
  return "Watch";
}

function formatStatus(status) {
  if (!status) return null;
  return String(status)
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (!Number.isFinite(mins)) return null;
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

function getAlertUrl(fire) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/fire/${encodeURIComponent(fire.id)}`;
}

function getAlertSummary(fire) {
  const details = [
    getIncidentName(fire),
    fire?.location || "Unknown location",
    typeof fire?.distanceMiles === "number" ? `${fire.distanceMiles.toFixed(1)} mi away` : null,
    typeof fire?.containment === "number" ? `${fire.containment}% contained` : null,
    formatStatus(fire?.status),
  ];
  return details.filter(Boolean).join(" | ");
}

function buildShareText(fire) {
  const parts = [
    `${getAlertTitle(fire)}${getIncidentName(fire) ? `: ${getIncidentName(fire)}` : ""}.`,
    fire?.location ? `Location: ${fire.location}.` : null,
    typeof fire?.distanceMiles === "number"
      ? `${fire.distanceMiles.toFixed(1)} miles away.`
      : null,
    typeof fire?.containment === "number" ? `Containment: ${fire.containment}%.` : null,
    "Source: CAL FIRE.",
  ];
  return parts.filter(Boolean).join(" ");
}

function buildShareLinks(fire) {
  const text = buildShareText(fire);
  const url = getAlertUrl(fire);
  const emailSubject = `CAL FIRE alert near ${fire?.location || "your area"}`;
  const emailBody = `${text}\n\nDetails: ${url}`;
  return {
    text,
    url,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
    email: `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`,
  };
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
  const [shareOpenId, setShareOpenId] = useState(null);
  const [copiedShareId, setCopiedShareId] = useState(null);
  const isLoggedIn = Boolean(getToken());

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setUserLat(coords.latitude);
          setUserLng(coords.longitude);
        },
        () => {},
        { timeout: 8000 },
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadFires() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          latitude: String(userLat),
          longitude: String(userLng),
          radius: String(DEFAULT_RADIUS),
          source: "calfire",
        });
        const res = await fetch(`${apiBase}/api/fires/nearby?${params.toString()}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.message || "Could not load CAL FIRE alerts.");
        if (!cancelled) {
          const data = Array.isArray(body?.data) ? body.data : [];
          setFires(
            data
              .filter(isCalFireIncident)
              .map((fire) => ({
                ...fire,
                source: "CAL FIRE",
                sourceLabel: "CAL FIRE",
                severity: getSeverity(fire),
              })),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setFires([]);
          setError(
            err.message === "Failed to fetch"
              ? "CAL FIRE alerts are temporarily unavailable."
              : err.message,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadFires();
    return () => {
      cancelled = true;
    };
  }, [userLat, userLng]);

  async function handleNotificationToggle(checked) {
    setNotificationsOn(checked);
    if (checked && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (isLoggedIn) {
      await fetch(`${apiBase}/api/alerts`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ radius: DEFAULT_RADIUS, enabled: checked }),
      }).catch(() => {});
    }
  }

  const filtered = useMemo(() => {
    let result = fires;

    if (filterSeverity !== "all") {
      result = result.filter((f) => f.severity === filterSeverity);
    }

    if (filterLocation.trim()) {
      const term = filterLocation.trim().toLowerCase();
      result = result.filter(
        (f) =>
          getAlertTitle(f).toLowerCase().includes(term) ||
          f.name?.toLowerCase().includes(term) ||
          f.location?.toLowerCase().includes(term),
      );
    }

    result = [...result];
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

  useEffect(() => {
    if (!notificationsOn || !("Notification" in window) || Notification.permission !== "granted") return;
    const first = fires[0];
    if (!first) return;
    const key = `wf_notified_${first.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "true");
    new Notification(`${getAlertTitle(first)} near ${first.location || "your area"}`, {
      body: `${getAlertSummary(first)}. Source: CAL FIRE.`,
    });
  }, [fires, notificationsOn]);

  async function handleCopyShare(fire) {
    const share = buildShareLinks(fire);
    await navigator.clipboard?.writeText(`${share.text} ${share.url}`);
    setCopiedShareId(fire.id);
    setTimeout(() => setCopiedShareId(null), 1800);
  }

  async function handleNativeShare(fire) {
    const share = buildShareLinks(fire);
    if (!navigator.share) {
      await handleCopyShare(fire);
      return;
    }
    await navigator.share({
      title: getAlertTitle(fire),
      text: share.text,
      url: share.url,
    }).catch(() => {});
  }

  return (
    <div className="alertsShell">
      <main className="alertsMain">
        <section className="alertsHeroCard">
          <div className="alertsHeroText">
            <span className="alertsHeroIcon" aria-hidden="true">
              <ShieldAlert size={20} strokeWidth={2.2} />
            </span>
            <div>
              <h1 className="alertsTitle">CAL FIRE Alerts</h1>
              <p>Official wildfire incidents and fire activity from CAL FIRE.</p>
            </div>
          </div>
          <label className="alertsNotifToggle">
            Notifications
            <input
              type="checkbox"
              checked={notificationsOn}
              onChange={(e) => handleNotificationToggle(e.target.checked)}
            />
            <span className="alertsToggleTrack">
              <span className="alertsToggleThumb" />
            </span>
            <span className="alertsNotifLabel">{notificationsOn ? "On" : "Off"}</span>
          </label>
        </section>

        <div className="alertsFilterBar" aria-label="Alert filters">
          <label className="alertsFilterGroup">
            <span>Date</span>
            <select
              aria-label="Sort by date"
              className="alertsFilterSelect"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date">Newest first</option>
              <option value="severity">Highest severity</option>
              <option value="distance">Nearest first</option>
            </select>
          </label>
          <label className="alertsFilterGroup">
            <span>Severity</span>
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
          </label>
          <label className="alertsFilterGroup alertsFilterGroup--location">
            <span>Location</span>
            <input
              aria-label="Filter by location"
              className="alertsFilterInput"
              type="text"
              placeholder="City, county, or incident"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            />
          </label>
        </div>

        <p className="alertsHint">
          {loading
            ? "Loading CAL FIRE wildfire alerts..."
            : `Showing ${filtered.length} CAL FIRE wildfire alert${filtered.length === 1 ? "" : "s"}.`}
        </p>

        {loading ? null : error ? (
          <p className="alertsError">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="alertsEmpty">No CAL FIRE wildfire alerts found for your area.</p>
        ) : (
          <div className="alertsList">
            {filtered.map((fire) => {
              const share = buildShareLinks(fire);
              const shareOpen = shareOpenId === fire.id;
              const alertTime = timeAgo(fire.reportedAt);
              return (
                <article
                  key={fire.id}
                  className={`alertCard alertCard--${fire.severity}`}
                >
                  <Link
                    to={`/fire/${encodeURIComponent(fire.id)}`}
                    className="alertCardLinkBody"
                  >
                    <div className="alertCardTitleRow">
                      <span className="alertFireIcon" aria-hidden="true">
                        <Flame size={16} strokeWidth={2.3} />
                      </span>
                      <h2 className="alertCardName">{getAlertTitle(fire)}</h2>
                      <span className="alertSourceBadge">CAL FIRE</span>
                    </div>
                    <p className="alertCardSummary">{getAlertSummary(fire)}</p>
                    <div className="alertCardMeta">
                      <span>
                        <MapPin size={13} strokeWidth={2.2} />
                        {fire.location || "Unknown location"}
                      </span>
                      {alertTime ? (
                        <span>
                          <Clock size={13} strokeWidth={2.2} />
                          {alertTime}
                        </span>
                      ) : null}
                      <span>
                        <ShieldAlert size={13} strokeWidth={2.2} />
                        {getSeverityLabel(fire.severity)}
                      </span>
                    </div>
                  </Link>

                  <div className="alertCardActions">
                    <span className={`alertBadge alertBadge--${fire.severity}`}>
                      {getSeverityLabel(fire.severity)}
                    </span>
                    <button
                      type="button"
                      className="alertShareBtn"
                      onClick={() => setShareOpenId((current) => current === fire.id ? null : fire.id)}
                      aria-expanded={shareOpen}
                    >
                      <Share2 size={13} strokeWidth={2.4} />
                      Share
                    </button>
                  </div>

                  {shareOpen ? (
                    <div className="alertSharePanel">
                      <p className="alertShareText">{share.text}</p>
                      <div className="alertShareActions" aria-label="Share options">
                        <button type="button" className="shareAction" onClick={() => handleCopyShare(fire)}>
                          <Copy size={14} strokeWidth={2.3} />
                          <span>{copiedShareId === fire.id ? "Copied" : "Copy"}</span>
                        </button>
                        <button type="button" className="shareAction" onClick={() => handleNativeShare(fire)}>
                          <MessageCircle size={14} strokeWidth={2.3} />
                          <span>Messages</span>
                        </button>
                        <a className="shareAction" href={share.x} target="_blank" rel="noreferrer">
                          <ExternalLink size={14} strokeWidth={2.3} />
                          <span>X</span>
                        </a>
                        <a className="shareAction" href={share.facebook} target="_blank" rel="noreferrer">
                          <ExternalLink size={14} strokeWidth={2.3} />
                          <span>Facebook</span>
                        </a>
                        <a className="shareAction" href={share.email}>
                          <Mail size={14} strokeWidth={2.3} />
                          <span>Email</span>
                        </a>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        <div className="alertsSeverityLegend">
          <span className="alertsLegendTitle">Severity</span>
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
