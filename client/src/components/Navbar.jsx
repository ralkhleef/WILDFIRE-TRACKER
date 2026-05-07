import { Link } from "react-router-dom";
import { Menu, Settings, LifeBuoy, UserRound } from "lucide-react";
import "./Navbar.css";

const wildfireLogo = "/wildfire-tracker-logo.svg";

export default function Navbar({ sidebarOpen = false, onMenuToggle }) {
  return (
    <header className="navbar">
      <div className="navbarLeft">
        <button
          type="button"
          className="iconBtn"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
          onClick={onMenuToggle}
        >
          <Menu size={20} strokeWidth={2} />
        </button>
        <Link to="/dashboard" className="navbarBrand" aria-label="Wildfire Tracker home">
          <img
            src={wildfireLogo}
            alt=""
            width={48}
            height={48}
            className="logoImg"
          />
        </Link>
        <p className="greeting">Hi, there!</p>
      </div>
      <div className="navbarRight">
        <Link to="/settings" className="iconLink" aria-label="Settings">
          <Settings size={20} strokeWidth={2} />
        </Link>
        <Link to="/help" className="iconLink" aria-label="Help">
          <LifeBuoy size={20} strokeWidth={2} />
        </Link>
        <Link to="/profile" className="iconLink" aria-label="Profile">
          <UserRound size={20} strokeWidth={2} />
        </Link>
      </div>
    </header>
  );
}
