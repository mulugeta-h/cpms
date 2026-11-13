// App.jsx
import './App.css';
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';

import { UserContext } from './context/UserContext';
import { getUserFromToken } from './api/authApi';

// Pages
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import SessionManager from './components/SessionManager';

// Dashboards & Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ALLDashboard from './pages/ALLDashboard'; 
import DCDashboard from './pages/designAndConstruction/DCDashboard';
import EstimationDashboard from './pages/estimation/EstimationDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import UserDashboard from './pages/user/UserDashboard';

// Super Admin Pages
import SuperDashboard from './pages/superAdmin/SuperDashboard';
import SuperAdminAdmin from './pages/superAdmin/SuperUsers';

// Design & Construction Pages
import Construction from './pages/designAndConstruction/Construction';
import Design from './pages/designAndConstruction/Design';
import Specification from './pages/designAndConstruction/Specification';

// Estimation Pages
import Estimation from './pages/estimation/Estimation';

// Request Pages
import DCRequest from './pages/request/DCRequest';
import EstimationRequest from './pages/request/EstimationRequest';

// Report Pages
import DCReport from './pages/reports/DCReport';
import EstimationReport from './pages/reports/EstimationReport';

// Layout Components
import DashboardLayout from './components/layout/DashboardLayout';

// Icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ConstructionIcon from "@mui/icons-material/Construction";
import AssessmentIcon from "@mui/icons-material/Assessment";
import RequestPageIcon from "@mui/icons-material/RequestPage";
import BarChartIcon from "@mui/icons-material/BarChart";

const theme = createTheme({
  palette: { primary: { main: '#DAA520' }, secondary: { main: '#000000' } },
  typography: { fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif' },
  shape: { borderRadius: 8 },
  components: {
    MuiPaper: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
  },
});

// =====================================================
// ROLE NORMALIZER
// =====================================================
const normalizeRole = (role) => {
  if (!role) return "ALL_ADMIN";
  if (role === "USER") return "USER";
  if (role === "ALL_ADMIN") return "ALL_ADMIN";
  if (role === "ALL_VIEW") return "ALL_VIEW";
  return role; // SUPER_ADMIN | DC_ADMIN | EST_ADMIN
};

// =====================================================
// MENU BLOCKS
// =====================================================
const MENU = {
  // Specific Dashboards
  superDashboard: { name: "Dashboard", path: "/super-dashboard", icon: <DashboardIcon />, title: "Super Admin Dashboard" },
  adminDashboard: { name: "Dashboard", path: "/admin-dashboard", icon: <DashboardIcon />, title: "Admin Dashboard" },
  allDashboard:   { name: "Dashboard", path: "/all-dashboard",   icon: <DashboardIcon />, title: "Viewer Dashboard" },
  dcDashboard:    { name: "Dashboard", path: "/dc-dashboard",    icon: <DashboardIcon />, title: "Design & Construction Dashboard" },
  estDashboard:   { name: "Dashboard", path: "/est-dashboard",   icon: <DashboardIcon />, title: "Estimation Dashboard" },
  userDashboard:  { name: "Dashboard", path: "/user-dashboard",  icon: <DashboardIcon />, title: "User Dashboard" },

  users:      { name: "Users", path: "/admin-users", icon: <AdminPanelSettingsIcon />, title: "User Management" },
  superUsers: { name: "Users", path: "/super-admin-users", icon: <AdminPanelSettingsIcon />, title: "User Management" },
  
  estimationRequest: { name: "Estimation Request", path: "/estimation-request", title: "Estimation Request" },
  dcRequest:         { name: "DC Request",         path: "/dc-request",         title: "Design & Construction Request" },
  estimation:        { name: "Estimation",  path: "/estimation",  icon: <AssessmentIcon />, title: "Estimation Management" },
  design:            { name: "Design",       path: "/design",       title: "Design Management" },
  specification:     { name: "Specification", path: "/specification", title: "Specification Management" },
  construction:      { name: "Construction", path: "/construction", title: "Construction Management" },
  estimationReport:  { name: "Estimation Report", path: "/estimation-report", title: "Estimation Report" },
  dcReport:          { name: "DC Report",          path: "/dc-report",          title: "Design & Construction Report" },
};

const superAdminMenuItems = [MENU.superDashboard, MENU.superUsers];

// ALL_VIEW gets everything (dashboard + modules) PLUS Users
const viewOnlyMenuItems = [
  MENU.allDashboard,
  MENU.users,
  { name: "Requests", icon: <RequestPageIcon />, title: "Requests", subItems: [MENU.estimationRequest, MENU.dcRequest] },
  MENU.estimation,
  { name: "Construction", icon: <ConstructionIcon />, title: "Design & Construction", subItems: [MENU.design, MENU.specification, MENU.construction] },
  { name: "Reports", icon: <BarChartIcon />, title: "Reports", subItems: [MENU.estimationReport, MENU.dcReport] },
];

const fullMenuItems = [
  MENU.adminDashboard,
  { name: "Requests", icon: <RequestPageIcon />, title: "Requests", subItems: [MENU.estimationRequest, MENU.dcRequest] },
  MENU.estimation,
  { name: "Construction", icon: <ConstructionIcon />, title: "Design & Construction", subItems: [MENU.design, MENU.specification, MENU.construction] },
  { name: "Reports", icon: <BarChartIcon />, title: "Reports", subItems: [MENU.estimationReport, MENU.dcReport] },
];

const userMenuItems = [
  MENU.userDashboard,
  { name: "Requests", icon: <RequestPageIcon />, title: "Requests", subItems: [MENU.estimationRequest, MENU.dcRequest] },
  MENU.estimation,
  { name: "Construction", icon: <ConstructionIcon />, title: "Design & Construction", subItems: [MENU.design, MENU.specification, MENU.construction] },
  { name: "Reports", icon: <BarChartIcon />, title: "Reports", subItems: [MENU.estimationReport, MENU.dcReport] },
];

const dcAdminMenuItems = [
  MENU.dcDashboard,
  { name: "Requests", icon: <RequestPageIcon />, title: "Requests", subItems: [MENU.dcRequest] },
  { name: "Construction", icon: <ConstructionIcon />, title: "Design & Construction", subItems: [MENU.design, MENU.specification, MENU.construction] },
  { name: "Reports", icon: <BarChartIcon />, title: "Reports", subItems: [MENU.dcReport] },
];

const estAdminMenuItems = [
  MENU.estDashboard,
  { name: "Requests", icon: <RequestPageIcon />, title: "Requests", subItems: [MENU.estimationRequest] },
  MENU.estimation,
  { name: "Reports", icon: <BarChartIcon />, title: "Reports", subItems: [MENU.estimationReport] },
];

const getMenuByRole = (role) => {
  switch (normalizeRole(role)) {
    case "SUPER_ADMIN": return superAdminMenuItems;
    case "ALL_VIEW":    return viewOnlyMenuItems;
    case "ALL_ADMIN":   return fullMenuItems; 
    case "USER":        return userMenuItems; 
    case "DC_ADMIN":    return dcAdminMenuItems;
    case "EST_ADMIN":   return estAdminMenuItems;
    default:            return fullMenuItems;
  }
};

const getTitleByRole = (role) => {
  const titles = {
    SUPER_ADMIN: "Super Admin Dashboard",
    ALL_ADMIN:   "Admin Dashboard",
    ALL_VIEW:    "Viewer Dashboard",
    DC_ADMIN:    "Design & Construction Dashboard",
    EST_ADMIN:   "Estimation Dashboard",
    USER:        "User Dashboard",
  };
  return titles[normalizeRole(role)] || "Dashboard";
};

const getDefaultRoute = (role) => {
  const routes = {
    SUPER_ADMIN: "/super-dashboard",
    ALL_ADMIN:   "/admin-dashboard",
    ALL_VIEW:    "/all-dashboard",
    DC_ADMIN:    "/dc-dashboard",
    EST_ADMIN:   "/est-dashboard",
    USER:        "/user-dashboard",
  };
  return routes[normalizeRole(role)] || "/admin-dashboard";
};

// =====================================================
// ROUTE GUARDS
// =====================================================
const PrivateRoute = ({ children, allowedRoles = null, allowPasswordChange = false }) => {
  const { user } = React.useContext(UserContext);
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles) {
    const normalized = normalizeRole(user.role);
    if (!allowedRoles.includes(normalized)) {
      return <Navigate to={getDefaultRoute(user.role)} replace />;
    }
  }

  if (!allowPasswordChange && user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  return children;
};

const RoleBasedRoute = ({ children, allowedRoles }) => (
  <PrivateRoute allowedRoles={allowedRoles}>{children}</PrivateRoute>
);

const ROLES = {
  SUPER_ADMIN: ["SUPER_ADMIN"],
  ADMIN_USERS: ["ALL_VIEW"],                             
  DASHBOARD:   ["ALL_ADMIN", "ALL_VIEW", "DC_ADMIN", "EST_ADMIN", "USER"], 
  DC_MODULE:   ["ALL_ADMIN", "ALL_VIEW", "DC_ADMIN", "USER"],   // 👈 Added ALL_VIEW     
  EST_MODULE:  ["ALL_ADMIN", "ALL_VIEW", "EST_ADMIN", "USER"],  // 👈 Added ALL_VIEW       
};

// =====================================================
// APP
// =====================================================
function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    const parsed = saved ? JSON.parse(saved) : null;
    const tokenUser = getUserFromToken();
    if (parsed && tokenUser?.mustChangePassword) parsed.mustChangePassword = true;
    return parsed;
  });
  const isMobile = useMediaQuery('(max-width:900px)');

  useEffect(() => {
    if (!user) { localStorage.removeItem("user"); return; }
    localStorage.setItem("user", JSON.stringify(user));
    try {
      const token = user.token;
      if (!token) { setUser(null); return; }
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("user");
        setUser(null);
      }
    } catch {
      localStorage.removeItem("user");
      setUser(null);
    }
  }, [user]);

  const userContextValue = React.useMemo(() => ({ user, setUser }), [user]);

  if (user) {
    const userRole = user.role || "ALL_ADMIN";
    const currentMenu = getMenuByRole(userRole);
    const dashboardTitle = getTitleByRole(userRole);

    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <UserContext.Provider value={userContextValue}>
            <SessionManager>
              <ToastContainer position="top-right" autoClose={3000}
                hideProgressBar={false} newestOnTop closeOnClick rtl={false}
                pauseOnFocusLoss draggable pauseOnHover theme="colored" limit={3} />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/change-password" element={
                  <PrivateRoute allowPasswordChange><ChangePassword /></PrivateRoute>
                } />

                <Route path="/" element={
                  <DashboardLayout menu={currentMenu} title={dashboardTitle} isMobile={isMobile} />
                }>
                  {/* Root redirects to role's specific dashboard */}
                  <Route index element={<Navigate to={getDefaultRoute(userRole)} replace />} />

                  {/* ══════════ Specific Dashboards ══════════ */}
                  <Route path="super-dashboard" element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN"]}><SuperDashboard /></RoleBasedRoute>
                  } />
                  <Route path="admin-dashboard" element={
                    <RoleBasedRoute allowedRoles={["ALL_ADMIN"]}><AdminDashboard /></RoleBasedRoute>
                  } />
                  <Route path="all-dashboard" element={
                    <RoleBasedRoute allowedRoles={["ALL_VIEW"]}><ALLDashboard /></RoleBasedRoute>
                  } />
                  <Route path="dc-dashboard" element={
                    <RoleBasedRoute allowedRoles={["DC_ADMIN"]}><DCDashboard /></RoleBasedRoute>
                  } />
                  <Route path="est-dashboard" element={
                    <RoleBasedRoute allowedRoles={["EST_ADMIN"]}><EstimationDashboard /></RoleBasedRoute>
                  } />
                  <Route path="user-dashboard" element={
                    <RoleBasedRoute allowedRoles={["USER"]}><UserDashboard /></RoleBasedRoute>
                  } />

                  {/* ══════════ User Management ══════════ */}
                  <Route path="super-admin-users" element={
                    <RoleBasedRoute allowedRoles={ROLES.SUPER_ADMIN}><SuperAdminAdmin /></RoleBasedRoute>
                  } />
                  <Route path="admin-users" element={
                    <RoleBasedRoute allowedRoles={ROLES.ADMIN_USERS}><AdminUsers /></RoleBasedRoute>
                  } />

                  {/* ══════════ Modules ══════════ */}
                  <Route path="dc-request" element={
                    <RoleBasedRoute allowedRoles={ROLES.DC_MODULE}><DCRequest /></RoleBasedRoute>
                  } />
                  <Route path="design" element={
                    <RoleBasedRoute allowedRoles={ROLES.DC_MODULE}><Design /></RoleBasedRoute>
                  } />
                  <Route path="specification" element={
                    <RoleBasedRoute allowedRoles={ROLES.DC_MODULE}><Specification /></RoleBasedRoute>
                  } />
                  <Route path="construction" element={
                    <RoleBasedRoute allowedRoles={ROLES.DC_MODULE}><Construction /></RoleBasedRoute>
                  } />
                  <Route path="dc-report" element={
                    <RoleBasedRoute allowedRoles={ROLES.DC_MODULE}><DCReport /></RoleBasedRoute>
                  } />

                  <Route path="estimation-request" element={
                    <RoleBasedRoute allowedRoles={ROLES.EST_MODULE}><EstimationRequest /></RoleBasedRoute>
                  } />
                  <Route path="estimation" element={
                    <RoleBasedRoute allowedRoles={ROLES.EST_MODULE}><Estimation /></RoleBasedRoute>
                  } />
                  <Route path="estimation-report" element={
                    <RoleBasedRoute allowedRoles={ROLES.EST_MODULE}><EstimationReport /></RoleBasedRoute>
                  } />
                </Route>

                <Route path="*" element={<Navigate to={getDefaultRoute(userRole)} replace />} />
              </Routes>
            </SessionManager>
          </UserContext.Provider>
        </Router>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <UserContext.Provider value={userContextValue}>
          <SessionManager>
            <ToastContainer position="top-right" autoClose={3000}
              hideProgressBar={false} newestOnTop closeOnClick rtl={false}
              pauseOnFocusLoss draggable pauseOnHover theme="colored" limit={3} />
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </SessionManager>
        </UserContext.Provider>
      </Router>
    </ThemeProvider>
  );
}

export default App;