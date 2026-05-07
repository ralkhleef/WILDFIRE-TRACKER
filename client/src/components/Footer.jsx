import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="appFooter" role="contentinfo">
      <div className="footerInner">
        <div className="footerBrand">
          <span className="footerLogo" aria-hidden="true"></span>
          <span className="footerName">WildFire Tracker</span>
          <span className="footerTagline">Stay informed. Stay safe.</span>
        </div>

        <nav className="footerNav" aria-label="Footer navigation">
          <div className="footerNavGroup">
            <p className="footerNavLabel">Monitor</p>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/map">Map view</Link>
            <Link to="/alerts">Alerts</Link>
          </div>
          <div className="footerNavGroup">
            <p className="footerNavLabel">Resources</p>
            <Link to="/resources">Evacuation resources</Link>
            <Link to="/help">Help & safety</Link>
            <Link to="/offline">Offline mode</Link>
          </div>
          <div className="footerNavGroup">
            <p className="footerNavLabel">Account</p>
            <Link to="/profile">Profile</Link>
            <Link to="/settings">Settings</Link>
          </div>
        </nav>

        <div className="footerExternal">
          <p className="footerNavLabel">External resources</p>
          <a href="https://www.fire.ca.gov/incidents" target="_blank" rel="noreferrer">CAL FIRE incidents ↗</a>
          <a href="https://www.readyforwildfire.org" target="_blank" rel="noreferrer">ReadyForWildfire.org ↗</a>
          <a href="https://firms.modaps.eosdis.nasa.gov" target="_blank" rel="noreferrer">NASA FIRMS ↗</a>
        </div>
      </div>

      <div className="footerBottom">
        <p>© {year} WildFire Tracker · Data from CAL FIRE, NASA FIRMS & OpenStreetMap contributors</p>
        <p>For life-threatening emergencies call <a href="tel:911">911</a></p>
      </div>
    </footer>
  );
}