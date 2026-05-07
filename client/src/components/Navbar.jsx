import { useState } from "react";
import { Link } from "react-router-dom";
import wildfireLogo from "../assets/wildfire.svg";
import "./Navbar.css";

function HamburgerIcon() {
  return (
    <svg className="iconSvg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 7h14M5 12h14M5 17h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SettingsGearIcon() {
  return (
    <svg className="iconSvg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M22 12h-2M4 12H2m16.364-8.364-1.414 1.414M7.05 18.293l-1.414 1.414M19.778 19.778l-1.414-1.414M6.636 6.636 5.222 5.222M19.778 4.222l-1.414 1.414M6.636 17.364l-1.414 1.414"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HelpCircleIcon() {
  return (
    <svg className="iconSvg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M9.5 9a2.5 2.5 0 015 0c0 2-3 2-3 5M12 17h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="iconSvg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M6 21v-2a6 6 0 0112 0v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/map", label: "Map" },
    { to: "/alerts", label: "Alerts" },
    { to: "/resources", label: "Evacuation resources" },
    { to: "/profile", label: "Profile" },
    { to: "/settings", label: "Settings" },
    { to: "/help", label: "Help Resources" },
    { to: "/offline", label: "Offline" },
    { to: "/", label: "Login" },
    { to: "/signup", label: "Signup" },
    
  ];

  return (
    <header className="navbar">
      <div className="navbarLeft menuWrap">
        <button
          type="button"
          className="iconBtn"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="hamburger-route-menu"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <HamburgerIcon />
        </button>
        {menuOpen ? (
          <nav id="hamburger-route-menu" className="menuDropdown" aria-label="All routes">
            {menuItems.map((item) => (
              <Link
                key={`${item.to}:${item.label}`}
                to={item.to}
                className="menuItem"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
        <img src={wildfireLogo} alt="" width={36} height={36} className="logoImg" />
        <p className="greeting">Hi, there!</p>
      </div>
      <div className="navbarRight">
        <Link to="/settings" className="iconLink" aria-label="Settings">
          <SettingsGearIcon />
        </Link>
        <Link to="/help" className="iconLink" aria-label="Help">
          <HelpCircleIcon />
        </Link>
        <Link to="/profile" className="iconLink" aria-label="Profile">
          <ProfileIcon />
        </Link>
      </div>
    </header>
  );
}