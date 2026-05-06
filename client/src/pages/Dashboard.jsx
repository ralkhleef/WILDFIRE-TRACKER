import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Dashboard.css";
import WildfireMap from "../components/WildfireMap.jsx";

const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5001";

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
            <p className="widgetPlaceholder">
              Key metrics at a glance (counts, severity, etc.).
            </p>
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
