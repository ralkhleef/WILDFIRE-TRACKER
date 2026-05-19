import { useEffect, useState } from "react";
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

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5050";

function ProtectedRoute({ isLoggedIn, isGuest, children }) {
  const location = useLocation();

  if (isGuest) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          authMessage: "Sign in or create an account to save locations and alerts.",
        }}
      />
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function AppLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem("token")));
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem("guestMode") === "true");
  const isAuthPage =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/register";
  const isMapPage = location.pathname === "/map";
  const isAlertsPage = location.pathname === "/alerts";
  const handleSidebarNavigate = () => {
    if (window.innerWidth <= 760) {
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoggedIn(false);
      setIsGuest(localStorage.getItem("guestMode") === "true");
      return;
    }

    let cancelled = false;

    async function confirmAuth() {
      try {
        const res = await fetch(`${apiBase}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(body?.message || "Not logged in.");
        if (cancelled) return;
        if (body?.data) {
          localStorage.setItem("user", JSON.stringify(body.data));
        }
        localStorage.removeItem("guestMode");
        setIsGuest(false);
        setIsLoggedIn(true);
      } catch {
        if (!cancelled) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setIsLoggedIn(false);
        }
      }
    }

    confirmAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    try {
      await fetch(`${apiBase}/api/auth/logout`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch {
      // JWT auth is client-side; still clear local auth if the logout ping fails.
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("guestMode");
    setIsLoggedIn(false);
    setIsGuest(false);
  };

  const handleGuestContinue = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.setItem("guestMode", "true");
    setIsLoggedIn(false);
    setIsGuest(true);
  };

  const handleAuthChange = () => {
    const hasToken = Boolean(localStorage.getItem("token"));
    if (hasToken) localStorage.removeItem("guestMode");
    setIsLoggedIn(hasToken);
    setIsGuest(!hasToken && localStorage.getItem("guestMode") === "true");
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
            <Route path="/" element={<LoginPage onAuthChange={handleAuthChange} onGuestContinue={handleGuestContinue} />} />
            <Route path="/login" element={<LoginPage onAuthChange={handleAuthChange} onGuestContinue={handleGuestContinue} />} />
            <Route path="/signup" element={<Signup onAuthChange={handleAuthChange} onGuestContinue={handleGuestContinue} />} />
            <Route path="/register" element={<Navigate to="/signup" replace />} />
            <Route path="/home" element={<Home />} />
            <Route
              path="/dashboard"
              element={(
                <ProtectedRoute isLoggedIn={isLoggedIn} isGuest={isGuest}>
                  <Dashboard />
                </ProtectedRoute>
              )}
            />
            <Route path="/map" element={<MapView />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route
              path="/profile"
              element={(
                <ProtectedRoute isLoggedIn={isLoggedIn} isGuest={isGuest}>
                  <Profile />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/settings"
              element={(
                <ProtectedRoute isLoggedIn={isLoggedIn} isGuest={isGuest}>
                  <Settings />
                </ProtectedRoute>
              )}
            />
            <Route path="/help" element={<HelpResources />} />
            <Route path="/resources" element={<EvacuationResources />} />
            <Route path="/offline" element={<Offline />} />
            <Route path="/fire/:id" element={<FireDetails />} />
            <Route path="/fires/:id" element={<FireDetails />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
      {!isMapPage && !isAlertsPage ? <Footer /> : null}
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
