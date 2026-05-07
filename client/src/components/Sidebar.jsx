import { NavLink, useNavigate } from "react-router-dom";
import {
  Search,
  LayoutDashboard,
  Map as MapIcon,
  Bell,
  ShieldAlert,
  Settings,
  UserRound,
  LogIn,
  UserPlus,
  LogOut,
} from "lucide-react";
import "./Sidebar.css";

const navItems = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/map", label: "Map", Icon: MapIcon },
  { to: "/alerts", label: "Alerts", Icon: Bell },
  { to: "/resources", label: "Resources", Icon: ShieldAlert },
  { to: "/settings", label: "Settings", Icon: Settings },
];

export default function Sidebar({ open, onNavigate, isLoggedIn = false, onLogout }) {
  const navigate = useNavigate();

  function handleLogoutClick() {
    onLogout?.();
    onNavigate?.();
    navigate("/login");
  }

  return (
    <aside
      id="app-sidebar"
      className={`appSidebar ${open ? "isOpen" : "isCollapsed"}`}
      aria-label="Primary navigation"
    >
      <form
        className="sidebarSearch"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <Search size={15} strokeWidth={2} className="sidebarSearchIcon" aria-hidden />
        <input
          id="sidebar-fire-search"
          type="search"
          placeholder="Search fires"
          autoComplete="off"
          aria-label="Search fires"
        />
      </form>

      <nav className="sidebarNav">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebarNavLink ${isActive ? "active" : ""}`
            }
            onClick={onNavigate}
          >
            <Icon size={17} strokeWidth={2} className="sidebarNavIcon" aria-hidden />
            <span>{label}</span>
          </NavLink>
        ))}

        <div className="sidebarDivider" aria-hidden="true" />

        {isLoggedIn ? (
          <>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `sidebarNavLink ${isActive ? "active" : ""}`
              }
              onClick={onNavigate}
            >
              <UserRound size={17} strokeWidth={2} className="sidebarNavIcon" aria-hidden />
              <span>Profile</span>
            </NavLink>
            <button
              type="button"
              className="sidebarNavLink sidebarLogoutBtn"
              onClick={handleLogoutClick}
            >
              <LogOut size={17} strokeWidth={2} className="sidebarNavIcon" aria-hidden />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <>
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `sidebarNavLink ${isActive ? "active" : ""}`
              }
              onClick={onNavigate}
            >
              <LogIn size={17} strokeWidth={2} className="sidebarNavIcon" aria-hidden />
              <span>Login</span>
            </NavLink>
            <NavLink
              to="/signup"
              className={({ isActive }) =>
                `sidebarNavLink ${isActive ? "active" : ""}`
              }
              onClick={onNavigate}
            >
              <UserPlus size={17} strokeWidth={2} className="sidebarNavIcon" aria-hidden />
              <span>Register</span>
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
}
