import { useState } from "react";
import { useTheme } from "./UseTheme";
import {
  Home,
  BookOpen,
  ClipboardList,
  Calendar,
  Sparkles,
  StickyNote,
  Compass,
  Users,
  BarChart3,
  Settings,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  GraduationCap,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import "./Sidebar.css";

const navItems = [
  { label: "Dashboard", icon: Home },
  { label: "My Units", icon: BookOpen },
  { label: "Assignments", icon: ClipboardList },
  { label: "Calendar", icon: Calendar },
  { label: "AI Assistant", icon: Sparkles },
  { label: "Notes", icon: StickyNote },
  { label: "Resources", icon: Compass },
  { label: "Study Sessions", icon: Users },
  { label: "Grades", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function Sidebar({ user, onLogout }) {
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  function handleNavClick(label) {
    setActiveItem(label);
    setIsMobileOpen(false);
  }

  return (
    <>
      <button
        className="sidebar-hamburger"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {isMobileOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileOpen(false)} />
      )}

      <div className={`sidebar${isMobileOpen ? " open" : ""}`}>
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <GraduationCap size={20} color="#fff" />
            </div>
            <span className="sidebar-logo-text">EduMate</span>
            <button
              className="sidebar-close-btn"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          <ul className="sidebar-nav">
            {navItems.map(({ label, icon: Icon }) => {
              const isActive = activeItem === label;
              return (
                <li key={label}>
                  <button
                    className={`sidebar-nav-item${isActive ? " active" : ""}`}
                    onClick={() => handleNavClick(label)}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="sidebar-bottom">
          <button className="sidebar-profile">
            <span className="sidebar-avatar sidebar-avatar-initials">
              {getInitials(user.name)}
            </span>
            <div className="sidebar-profile-text">
              <p className="sidebar-profile-name">{user.name}</p>
              <p className="sidebar-profile-link" title={user.email}>{user.email}</p>
            </div>
            <ChevronRight size={16} className="sidebar-chevron" />
          </button>

          <button
            className="sidebar-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            <span className="sidebar-theme-label">
              {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
              {theme === "dark" ? "Dark Mode" : "Light Mode"}
            </span>
            <ChevronDown size={16} className="sidebar-chevron" />
          </button>

          <button className="sidebar-logout" onClick={onLogout}>
            <span className="sidebar-theme-label">
              <LogOut size={16} />
              Log out
            </span>
          </button>
        </div>
      </div>
    </>
  );
}

export default Sidebar;