import { useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { logout } from "../../store/slices/authSlice";
import { toggleSidebar } from "../../store/slices/uiSlice";
import { Avatar } from "../ui/UI";
import NotificationBell from "../ui/NotificationBell";
import Chatbot from "../chatbot/Chatbot";
import styles from "./AppLayout.module.css";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  BookmarkCheck,
  User,
  Building2,
  Users,
  LogOut,
  Menu,
  BarChart3,
  Plus,
  X,
  ChevronRight,
  Settings,
  Tag
} from "lucide-react";
import ThemeToggle from "../ui/ThemeToggle";

const seekerNav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/jobs", icon: Briefcase, label: "Browse Jobs" },
  { to: "/applications", icon: FileText, label: "Applications" },
  { to: "/saved", icon: BookmarkCheck, label: "Saved Jobs" },
  { to: "/profile", icon: User, label: "Profile" },
];

const employerNav = [
  { to: "/employer/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/jobs/manage", icon: Briefcase, label: "My Jobs" },
  { to: "/jobs/post", icon: Plus, label: "Post Job" },
  { to: "/applicants", icon: Users, label: "Applicants" },
  { to: "/profile", icon: Building2, label: "Company" },
];

const adminNav = [
  { to: '/admin?tab=overview', icon: LayoutDashboard, label: 'Overview' },
  { to: '/admin?tab=users',    icon: Users,           label: 'Users' },
  { to: '/admin?tab=skills',   icon: Tag,             label: 'Skills' },   // ← was Analytics
]
// Mobile bottom nav items (max 5)
const seekerBottomNav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { to: "/jobs", icon: Briefcase, label: "Jobs" },
  { to: "/applications", icon: FileText, label: "Applied" },
  { to: "/saved", icon: BookmarkCheck, label: "Saved" },
  { to: "/profile", icon: User, label: "Profile" },
];

const employerBottomNav = [
  { to: "/employer/dashboard", icon: LayoutDashboard, label: "Home" },
  { to: "/jobs/manage", icon: Briefcase, label: "Jobs" },
  { to: "/jobs/post", icon: Plus, label: "Post" },
  { to: "/applicants", icon: Users, label: "Applicants" },
  { to: "/profile", icon: Building2, label: "Profile" },
];

export default function AppLayout({ children }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);
  const { sidebarCollapsed } = useSelector((s) => s.ui);
  const overlayRef = useRef(null);

  const navItems =
    user?.role === "employer"
      ? employerNav
      : user?.role === "admin"
        ? adminNav
        : seekerNav;
 const bottomNavItems = (() => {
  if (!user || !user.role) return [];

  if (user.role === "employer") return employerBottomNav;
  if (user.role === "admin") return [];

  return seekerBottomNav;
})();

  // Close mobile drawer on route change
  useEffect(() => {
    if (sidebarCollapsed === false && window.innerWidth < 1024) {
      dispatch(toggleSidebar());
    }
  }, [location.pathname]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  // Current page title for topbar
  const allItems = [...seekerNav, ...employerNav, ...adminNav];
  const currentItem =
    allItems.find(
      (n) => location.pathname.startsWith(n.to) && n.to !== "/dashboard",
    ) || allItems.find((n) => location.pathname === n.to);
  const pageTitle = currentItem?.label || "TalentBridge";

  return (
    <div className={styles.layout}>
      {/* ── Mobile overlay ─────────────────────────────── */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            ref={overlayRef}
            className={styles.mobileOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => dispatch(toggleSidebar())}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ────────────────────────────────────── */}
      <motion.aside
        className={`${styles.sidebar} ${!sidebarCollapsed ? styles.sidebarOpen : ""}`}
        animate={{
          x: 0,
          width:
            typeof window !== "undefined" && window.innerWidth < 1024
              ? 260
              : sidebarCollapsed
                ? 68
                : 240,
        }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>TB</div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                className={styles.logoMeta}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <span className={styles.logoText}>TalentBridge</span>
                <span className={styles.logoSub}>AI Job Portal</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            className={styles.mobileCloseBtn}
            onClick={() => dispatch(toggleSidebar())}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={`${to}-${label}`}
              to={to}
              end={
               false
              }
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navActive : ""}`
              }
            >
              <Icon size={18} className={styles.navIcon} />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!sidebarCollapsed && (
                <ChevronRight size={13} className={styles.navChevron} />
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <Avatar name={user?.email} size="sm" />

            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  className={styles.userMeta}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <span className={styles.userEmail}>{user?.email}</span>
                  <span className={styles.userRole}>{user?.role}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </motion.aside>

      {/* ── Main ───────────────────────────────────────── */}
      <div
        className={`${styles.main} ${sidebarCollapsed ? styles.mainCollapsed : ""}`}
      >
        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={styles.menuBtn}
              onClick={() => dispatch(toggleSidebar())}
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
            <div className={styles.topbarTitle}>
              <span className={styles.pageTitle}>{pageTitle}</span>
            </div>
          </div>

          <div className={styles.topbarRight}>
              <ThemeToggle />
              <NotificationBell />
            <div className={styles.topbarAvatar}>
             
              <Avatar name={user?.email} size="sm" />
             
            </div>
          </div>
        </header>

        {/* Content */}
        <main className={styles.content}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={styles.pageWrapper}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* ── Mobile Bottom Nav ───────────────────────────── */}
      <nav className={styles.bottomNav}>
        {bottomNavItems?.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={`bn-${to}-${label}`}
            to={to}
            end={to === "/dashboard" || to === "/employer/dashboard"}
            className={({ isActive }) =>
              `${styles.bottomNavItem} ${isActive ? styles.bottomNavActive : ""}`
            }
          >
            {({ isActive }) => (
              <>
                <motion.div
                  className={styles.bottomNavIcon}
                  animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Icon size={20} />
                  {isActive && (
                    <motion.div
                      className={styles.bottomNavDot}
                      layoutId="bottomNavDot"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                </motion.div>
                <span className={styles.bottomNavLabel}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <Chatbot />
    </div>
  );
}
