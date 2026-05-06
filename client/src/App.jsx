import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MapView from "./pages/MapView.jsx";
import Profile from "./pages/Profile.jsx";
import Settings from "./pages/Settings.jsx";
import HelpResources from "./pages/HelpResources.jsx";
import EvacuationResources from "./pages/EvacuationResources.jsx";
import Offline from "./pages/Offline.jsx";
import FireDetails from "./pages/FireDetails.jsx";
import "./App.css";

function Placeholder({ title }) {
  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>{title}</h1>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="appShell">
        <Navbar />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/home" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/alerts" element={<Placeholder title="Alerts" />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<HelpResources />} />
          <Route path="/resources" element={<EvacuationResources />} />
          <Route path="/offline" element={<Offline />} />
          <Route path="/fire/:id" element={<FireDetails />} />
          <Route
            path="/saved-locations"
            element={<Placeholder title="Saved Locations" />}
          />
          <Route path="/fire-data" element={<Placeholder title="Fire Data" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
