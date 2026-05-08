import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Sidebar from "./components/Sidebar.jsx";
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
import Alerts from "./pages/Alerts.jsx";
import Footer from "./components/Footer";

function AppLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem("token")));
  const isAuthPage =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/register";
  const isMapPage = location.pathname === "/map";
  const handleSidebarNavigate = () => {
    if (window.innerWidth <= 760) {
      setSidebarOpen(false);
    }
  };
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
  };
  const handleAuthChange = () => {
    setIsLoggedIn(Boolean(localStorage.getItem("token")));
  };

  return (
    <div className={`appShell ${isAuthPage ? "authShell" : ""} ${isMapPage ? "mapShell" : ""}`}>
      <Navbar
        sidebarOpen={sidebarOpen}
        onMenuToggle={() => setSidebarOpen((open) => !open)}
      />
      <div className="appBody">
        {!isAuthPage ? (
          <Sidebar
            open={sidebarOpen}
            onNavigate={handleSidebarNavigate}
            isLoggedIn={isLoggedIn}
            onLogout={handleLogout}
          />
        ) : null}
        <div className="appRouteContent">
          <Routes>
            <Route path="/" element={<LoginPage onAuthChange={handleAuthChange} />} />
            <Route path="/login" element={<LoginPage onAuthChange={handleAuthChange} />} />
            <Route path="/signup" element={<Signup onAuthChange={handleAuthChange} />} />
            <Route path="/register" element={<Navigate to="/signup" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<HelpResources />} />
            <Route path="/resources" element={<EvacuationResources />} />
            <Route path="/offline" element={<Offline />} />
            <Route path="/fire/:id" element={<FireDetails />} />
            <Route path="/fires/:id" element={<FireDetails />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
      {!isMapPage ? <Footer /> : null}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
