import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./Dashboard.css";
import WildfireMap from "../components/WildfireMap.jsx";

const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5050";

function getFireTitle(fire) {
  return fire?.name || fire?.location || "Wildfire record";
}

function isNasaHotspot(fire) {
  return (
    fire?.sourceType === "thermal_detection" ||
    String(fire?.source || "").toLowerCase().includes("nasa")
  );
}

function getSourceBadgeClass(fire) {
  const src = String(fire?.source || "").toLowerCase();
  if (src.includes("cal fire")) return "sourceBadge sourceBadge--cal";
  if (src.includes("nasa")) return "sourceBadge sourceBadge--nasa";
  return "sourceBadge sourceBadge--seed";
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

function DashboardStat({ value, label, tone = "default" }) {
  return (
    <article className={`dashboardStat dashboardStat--${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

export default function Dashboard() {
  const [fires, setFires] = useState([]);
  const [loading, setLoading] = useState(true);
  const demoMode = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("demo") === "true"
    : false;

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ source: "calfire" });
    if (demoMode) params.set("demo", "true");

    fetch(`${apiBase}/api/fires?${params.toString()}`)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled) setFires(Array.isArray(body?.data) ? body.data : []);
      })
      .catch(() => {
        if (!cancelled) setFires([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [demoMode]);

  const stats = useMemo(() => {
    const incidentFires = fires.filter((fire) => !isNasaHotspot(fire));
    const containmentRecords = incidentFires.filter((fire) => typeof fire.containment === "number");
    const avgContainment = containmentRecords.length
      ? Math.round(
          containmentRecords.reduce((sum, fire) => sum + fire.containment, 0) /
            containmentRecords.length,
        )
      : null;

    return {
      total: fires.length,
      confirmed: incidentFires.length,
      thermalDetections: fires.filter(isNasaHotspot).length,
      avgContainment,
    };
  }, [fires]);

  const recent = fires.slice(0, 6);

  return (
    <main className="dashboardMain">
      <header className="pageHeader">
        <div>
          <p className="pageEyebrow">California active feed</p>
          <h1 className="dashboardPageTitle">Dashboard</h1>
        </div>
      </header>

      <section className="dashboardStatsGrid" aria-label="Fire summary">
        <DashboardStat value={loading ? "..." : stats.total} label="Tracked records" />
        <DashboardStat value={loading ? "..." : stats.confirmed} label="Confirmed incidents" tone="danger" />
        <DashboardStat value={loading ? "..." : stats.thermalDetections} label="Thermal detections" tone="orange" />
        <DashboardStat
          value={loading ? "..." : stats.avgContainment === null ? "N/A" : `${stats.avgContainment}%`}
          label="Avg containment"
        />
      </section>

      <section className="dashboardGrid">
        <article className="dashboardPanel dashboardMapPanel">
          <div className="panelHeader">
            <h2>Live California map</h2>
            <Link className="panelLink" to="/map">Open full map</Link>
          </div>
          <WildfireMap compact title="" />
        </article>

        <aside className="dashboardSideStack">
          <article className="dashboardPanel">
            <div className="panelHeader">
              <h2>Recent fires</h2>
            </div>
            {loading ? (
              <p className="emptyState">Loading active feed...</p>
            ) : recent.length ? (
              <div className="recentFireList">
                {recent.map((fire) => (
                  <Link
                    key={fire.id}
                    className="recentFireRow"
                    to={`/fire/${encodeURIComponent(fire.id)}`}
                  >
                    <span className="recentFireMarker" data-source={isNasaHotspot(fire) ? "nasa" : "incident"} />
                    <span className="recentFireBody">
                      <strong>{getFireTitle(fire)}</strong>
                      <small>{fire.location || "Unknown location"}</small>
                    </span>
                    <span className="recentFireMeta">
                      <span className={getSourceBadgeClass(fire)}>{fire.sourceLabel || fire.source || "Source"}</span>
                      <small>{timeAgo(fire.reportedAt)}</small>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="emptyState">No current California records found.</p>
            )}
          </article>
        </aside>
      </section>
    </main>
  );
}
