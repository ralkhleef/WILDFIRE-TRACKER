import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Dashboard.css";
import WildfireMap from "../components/WildfireMap.jsx";

const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5050";

function RecentFires() {
  const [fires, setFires] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiBase}/api/fires`)
      .then((r) => r.json())
      .then((b) => setFires(Array.isArray(b?.data) ? b.data.slice(0, 5) : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ margin: 0, color: "var(--text)", fontSize: "0.9rem" }}>Loading fires...</p>;
  if (!fires.length) return <p style={{ margin: 0, color: "var(--text)", fontSize: "0.9rem" }}>No fires found.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {fires.map((fire) => (
        <Link
          key={fire.id}
          to={`/fire/${fire.id}`}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.75rem", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--code-bg)", textDecoration: "none", color: "var(--text-h)" }}
        >
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{fire.name || "Unnamed fire"}</span>
          <span style={{ fontSize: "0.82rem", color: "var(--text)" }}>{fire.location || "Unknown"}</span>
          <span style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 600 }}>{typeof fire.containment === "number" ? `${fire.containment}% contained` : fire.status || ""}</span>
        </Link>
      ))}
    </div>
  );
}
function QuickStats() {
  const [fires, setFires] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiBase}/api/fires`)
      .then((r) => r.json())
      .then((b) => setFires(Array.isArray(b?.data) ? b.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text)" }}>Loading stats...</p>;
  if (!fires.length) return <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text)" }}>No fire data.</p>;

  const total = fires.length;
  const avgContainment = Math.round(
    fires.reduce((sum, f) => sum + (typeof f.containment === "number" ? f.containment : 0), 0) / total
  );
  const critical = fires.filter((f) => !f.containment || f.containment < 20).length;
  const warning = fires.filter((f) => f.containment >= 20 && f.containment < 60).length;
  const watch = fires.filter((f) => f.containment >= 60 && f.containment < 100).length;
  const contained = fires.filter((f) => f.containment >= 100).length;
  const newest = fires.reduce((a, b) =>
    new Date(a.reportedAt || 0) > new Date(b.reportedAt || 0) ? a : b, fires[0]
  );

  const statCard = (value, label, color) => (
    <div style={{
      background: "var(--code-bg)",
      border: "1px solid var(--border)",
      borderRadius: "10px",
      padding: "0.75rem 1rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.15rem",
    }}>
      <span style={{ fontSize: "1.5rem", fontWeight: 700, color: color || "var(--text-h)", lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: "0.72rem", color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Top row: total + avg containment */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        {statCard(total, "Active fires", "var(--text-h)")}
        {statCard(`${avgContainment}%`, "Avg containment", avgContainment < 30 ? "#ef4444" : avgContainment < 70 ? "#f97316" : "#22c55e")}
      </div>

      {/* Severity breakdown */}
      <div style={{
        background: "var(--code-bg)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "0.75rem 1rem",
      }}>
        <p style={{ margin: "0 0 0.5rem", fontSize: "0.72rem", color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Severity breakdown
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {[
            { count: critical, label: "Critical", color: "#ef4444" },
            { count: warning, label: "Warning", color: "#f97316" },
            { count: watch, label: "Watch", color: "#eab308" },
            { count: contained, label: "Contained", color: "#22c55e" },
          ].map(({ count, label, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-h)" }}>{count}</span>
              <span style={{ fontSize: "0.78rem", color: "var(--text)" }}>{label}</span>
            </div>
          ))}
        </div>
        {/* Containment bar */}
        <div style={{ marginTop: "0.6rem", height: 6, borderRadius: 4, background: "var(--border)", overflow: "hidden", display: "flex" }}>
          {critical > 0 && <div style={{ flex: critical, background: "#ef4444" }} />}
          {warning > 0 && <div style={{ flex: warning, background: "#f97316" }} />}
          {watch > 0 && <div style={{ flex: watch, background: "#eab308" }} />}
          {contained > 0 && <div style={{ flex: contained, background: "#22c55e" }} />}
        </div>
      </div>

      {/* Most recent fire */}
      {newest && (
        <div style={{
          background: "var(--code-bg)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "0.75rem 1rem",
        }}>
          <p style={{ margin: "0 0 0.2rem", fontSize: "0.72rem", color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Most recent
          </p>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem", color: "var(--text-h)" }}>{newest.name}</p>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text)" }}>{newest.location}</p>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="dashboardShell">
      <aside className="dashboardSidebar" aria-label="Dashboard sidebar">
        <section className="sidebarSection">
          <h2 className="sidebarHeading">Fire details</h2>
          <p className="sidebarBody">
            Summary and status for the selected fire will appear here.
          </p>
        </section>
        <section className="sidebarSection">
          <h2 className="sidebarHeading">Recent notifications</h2>
          <p className="sidebarBody">
            Your latest alerts and system messages will show up here.
          </p>
        </section>
        <section className="sidebarSection">
          <h2 className="sidebarHeading">Nearby fires</h2>
          <p className="sidebarBody">
            Incidents near your saved locations will be listed here.
          </p>
        </section>
      </aside>

      <main className="dashboardMain">
        <h1 className="dashboardPageTitle">Dashboard</h1>

        <div className="dashboardWidgetRow">
          <article className="dashboardWidget">
            <h2 className="widgetLabel">Interactive map</h2>
            <WildfireMap compact title="" />
          </article>
          <article className="dashboardWidget">
            <h2 className="widgetLabel">Quick stats</h2>
            <QuickStats />
          </article>
        </div>

        <article className="dashboardWidget dashboardWidgetWide">
            <h2 className="widgetLabel">Recent fires, click for details</h2>
            <RecentFires />
          </article>
      </main>
    </div>
  );
}
