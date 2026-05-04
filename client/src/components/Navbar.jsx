// src/components/Navbar.jsx
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav>
      <h2>Wildfire Tracker</h2>
      <Link to="/">Home</Link>
      <Link to="/login">Login</Link>
      <Link to="/dashboard">/Dashboard</Link>
      <Link to="/help">Help Resources</Link>
      <Link to="/profile">Profile</Link>
      <Link to="/offline">Offline</Link>
      <Link to="/settings">Settings</Link>
    </nav>
  );
}