import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function Navbar() {
  return (
    <nav style={{ display: "flex", gap: "20px", padding: "20px" }}>
      <Link to="/">Home</Link>
      <Link to="/map">Map</Link>
      <Link to="/alerts">Alerts</Link>
      <Link to="/about">About</Link>
    </nav>
  );
}

function Home() {
  return <h1>Wildfire Tracker Home</h1>;
}

function MapPage() {
  const [fires, setFires] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:5001/api/fires")
      .then((res) => res.json())
      .then((json) => setFires(json.data || []))
      .catch(() => setError("Could not load wildfire data."));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Wildfire Map</h1>

      {error && <p>{error}</p>}

      <MapContainer
        center={[36.7783, -119.4179]}
        zoom={6}
        style={{ height: "70vh", width: "100%", borderRadius: "12px" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {fires.map((fire) => (
          <Marker key={fire.id} position={[fire.latitude, fire.longitude]}>
            <Popup>
              <strong>{fire.name}</strong>
              <br />
              Location: {fire.location}
              <br />
              Size: {fire.size ?? "Unknown"} acres
              <br />
              Containment: {fire.containment ?? "Unknown"}%
              <br />
              Status: {fire.status}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function Alerts() {
  return <h1>Alerts Page</h1>;
}

function About() {
  return <h1>About Page</h1>;
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
