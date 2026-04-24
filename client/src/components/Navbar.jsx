// src/components/Navbar.jsx
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/map">Map</Link>
      <Link to="/alerts">Alerts</Link>
      <Link to="/about">About</Link>
    </nav>
  );
}