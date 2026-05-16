import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Copy, Mail, MessageCircle, Share2 } from "lucide-react";
import { apiBase, authHeaders, getToken } from "../api.js";
import "./Alerts.css";

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
  return (
    fire?.sourceType === "thermal_detection" ||
    String(fire?.source || "").toLowerCase().includes("nasa")
  );
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

function getAlertUrl(fire) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/fire/${encodeURIComponent(fire.id)}`;
}

function buildShareText(fire) {
  const parts = [
    fire?.name ? `${fire.name}` : null,
    `Wildfire reported near ${fire?.location || "this area"}.`,
    typeof fire?.distanceMiles === "number"
      ? `${fire.distanceMiles.toFixed(1)} miles away.`
      : `Within the ${DEFAULT_RADIUS} mile alert radius.`,
    typeof fire?.containment === "number" ? `Containment: ${fire.containment}%.` : null,
    fire?.status ? `Status: ${fire.status}.` : null,
    "Stay alert, follow evacuation guidance, and stay safe.",
  ];
  return parts.filter(Boolean).join(" ");
}

function buildShareLinks(fire) {
  const text = buildShareText(fire);
  const url = getAlertUrl(fire);
  const emailSubject = `Wildfire alert near ${fire?.location || "your area"}`;
  const emailBody = `${text}\n\nDetails: ${url}`;
  return {
    text,
    url,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
    email: `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`,
    template: `${text}\n\nDetails: ${url}\n\n#WildfireSafety #EvacuationReady`,
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
  const [serverMessage, setServerMessage] = useState("");
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
        { timeout: 8000 }
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadFires() {
      setLoading(true);
      setError("");
      setServerMessage("");
      try {
        const url = isLoggedIn
          ? `${apiBase}/api/alerts/local?latitude=${userLat}&longitude=${userLng}&radius=${DEFAULT_RADIUS}`
          : `${apiBase}/api/fires/nearby?latitude=${userLat}&longitude=${userLng}&radius=${DEFAULT_RADIUS}&source=calfire`;
        const res = await fetch(url, {
          headers: isLoggedIn ? authHeaders() : undefined,
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.message || "Could not load alerts.");
        if (!cancelled) {
          const data = body?.data;
          setFires(Array.isArray(data?.fires) ? data.fires : Array.isArray(data) ? data : []);
          setServerMessage(data?.message || body?.message || "");
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadFires();
    return () => { cancelled = true; };
  }, [isLoggedIn, userLat, userLng]);

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

  useEffect(() => {
    if (!notificationsOn || !("Notification" in window) || Notification.permission !== "granted") return;
    const first = fires[0];
    if (!first) return;
    const key = `wf_notified_${first.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "true");
    new Notification(`Wildfire reported near ${first.location || "your area"}`, {
      body: `Status: ${first.status || "unknown"}. Stay alert, follow evacuation guidance, and stay safe.`,
    });
  }, [fires, notificationsOn]);

  async function handleCopyShare(fire, instagramMode = false) {
    const share = buildShareLinks(fire);
    await navigator.clipboard?.writeText(instagramMode ? share.template : share.text);
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
      title: getFireTitle(fire),
      text: share.text,
      url: share.url,
    }).catch(() => {});
  }

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
              onChange={(e) => handleNotificationToggle(e.target.checked)}
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

        {serverMessage ? <p className="alertsHint">{serverMessage}</p> : null}

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
              {filtered.map((fire) => {
                const share = buildShareLinks(fire);
                const shareOpen = shareOpenId === fire.id;
                return (
                <article
                  key={fire.id}
                  className={`alertCard alertCard--${fire.severity}`}
                >
                  <div className="alertCardTop">
                    <Link
                      to={`/fire/${encodeURIComponent(fire.id)}`}
                      className="alertCardLinkBody"
                    >
                      <span>
                        <h2 className="alertCardName">{getFireTitle(fire)}</h2>
                        <p className="alertCardLocation">{fire.location || "Unknown location"}</p>
                        <p className="alertCardSeverityText">
                          {isNasaHotspot(fire)
                            ? fire.subtitle || "Satellite thermal detection, not a confirmed incident"
                            : `Severity: ${getSeverityLabel(fire.severity).charAt(0) + getSeverityLabel(fire.severity).slice(1).toLowerCase()}`}
                        </p>
                      </span>
                    </Link>
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
                  </div>
                  {shareOpen ? (
                    <div className="alertSharePanel">
                      <div className="alertShareHeader">
                        <span>Share this alert</span>
                        <p>{share.text}</p>
                      </div>
                      <div className="alertShareActions" aria-label="Share options">
                        <button type="button" className="shareAction shareAction--copy" onClick={() => handleCopyShare(fire)}>
                          <span className="shareActionIcon"><Copy size={17} strokeWidth={2.4} /></span>
                          <span>{copiedShareId === fire.id ? "Copied" : "Copy"}</span>
                        </button>
                        <button type="button" className="shareAction shareAction--native" onClick={() => handleNativeShare(fire)}>
                          <span className="shareActionIcon"><MessageCircle size={17} strokeWidth={2.4} /></span>
                          <span>Messages</span>
                        </button>
                        <a className="shareAction shareAction--x" href={share.x} target="_blank" rel="noreferrer">
                          <span className="shareActionIcon shareActionIcon--letter">X</span>
                          <span>X</span>
                        </a>
                        <a className="shareAction shareAction--facebook" href={share.facebook} target="_blank" rel="noreferrer">
                          <span className="shareActionIcon shareActionIcon--letter">f</span>
                          <span>Facebook</span>
                        </a>
                        <button type="button" className="shareAction shareAction--instagram" onClick={() => handleCopyShare(fire, true)}>
                          <span className="shareActionIcon shareActionIcon--letter">◎</span>
                          <span>Instagram</span>
                        </button>
                        <button type="button" className="shareAction shareAction--tiktok" onClick={() => handleCopyShare(fire, true)}>
                          <span className="shareActionIcon shareActionIcon--letter">♪</span>
                          <span>TikTok</span>
                        </button>
                        <a className="shareAction shareAction--email" href={share.email}>
                          <span className="shareActionIcon"><Mail size={17} strokeWidth={2.4} /></span>
                          <span>Email</span>
                        </a>
                      </div>
                    </div>
                  ) : null}
                </article>
              )})}
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
