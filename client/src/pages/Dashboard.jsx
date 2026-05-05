import "./Dashboard.css";
import WildfireMap from "../components/WildfireMap.jsx";

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
          <h2 className="widgetLabel">Recent alerts list</h2>
          <p className="widgetPlaceholder">
            Scrollable list of recent alerts and updates.
          </p>
        </article>
      </main>
    </div>
  );
}
