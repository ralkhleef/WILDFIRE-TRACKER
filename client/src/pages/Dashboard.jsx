// src/pages/Dashboard.jsx
import { Link } from "react-router-dom";
export default function Dashboard() {
  return (
    <div className="page">
      <h1>Dashboard</h1>
      <div className="dashboard-links">
        <Link to="/map">Map View</Link>
        <Link to="/alerts">Alerts</Link>
        <Link to="/saved-locations">Saved Locations</Link>
        <Link to="/fire-data">Fire Data</Link>
      </div>
    </div>
    );
}