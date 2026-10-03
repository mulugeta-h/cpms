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

// Admin Pages
import AdminDashboard from './pages/user/UserDashboard';
import AdminUsers from './pages/admin/AdminUsers';

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
  palette: {
    primary: {
      main: '#DAA520',
    },
    secondary: {
      main: '#000000',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

// =====================================================
// MENU CONFIGURATION WITH SUB-CATEGORIES AND TITLES
// =====================================================

// ADMIN Menu Items with Sub-categories (Includes Users)
const adminMenuItems = [
  { 
    name: "Dashboard", 
    path: "/dashboard", 
    icon: <DashboardIcon />,
    title: "Dashboard" 
  },
  { 
    name: "Users", 
    path: "/admin-users", 
    icon: <AdminPanelSettingsIcon />,
    title: "User Management" 
  },
  {
    name: "Requests",
    icon: <RequestPageIcon />,
    title: "Requests",
    subItems: [
      { name: "Estimation Request", path: "/estimation-request", title: "Estimation Request" },
      { name: "DC Request", path: "/dc-request", title: "Design & Construction Request" },
    ]
  },
  { 
    name: "Estimation", 
    path: "/estimation", 
    icon: <AssessmentIcon />,
    title: "Estimation Management" 
  },
  {
    name: "Construction",
    icon: <ConstructionIcon />,
    title: "Design & Construction",
    subItems: [
      { name: "Design", path: "/design", title: "Design Management" },
      { name: "Specification", path: "/specification", title: "Specification Management" },
      { name: "Construction", path: "/construction", title: "Construction Management" },
    ]
  },
  {
    name: "Reports",
    icon: <BarChartIcon />,
    title: "Reports",
    subItems: [
      { name: "Estimation Report", path: "/estimation-report", title: "Estimation Report" },
      { name: "DC Report", path: "/dc-report", title: "Design & Construction Report" },
    ]
  },
];

// USER Menu Items - Everything EXCEPT Users
const userMenuItems = [
  { 
    name: "Dashboard", 
    path: "/dashboard", 
    icon: <DashboardIcon />,
    title: "Dashboard" 
  },
  {
    name: "Requests",
    icon: <RequestPageIcon />,
    title: "Requests",
    subItems: [
      { name: "Estimation Request", path: "/estimation-request", title: "Estimation Request" },
      { name: "DC Request", path: "/dc-request", title: "Design & Construction Request" },
    ]
  },
  { 
    name: "Estimation", 
    path: "/estimation", 
    icon: <AssessmentIcon />,
    title: "Estimation Management" 
  },
  {
    name: "Construction",
    icon: <ConstructionIcon />,
    title: "Design & Construction",
    subItems: [
      { name: "Design", path: "/design", title: "Design Management" },
      { name: "Specification", path: "/specification", title: "Specification Management" },
      { name: "Construction", path: "/construction", title: "Construction Management" },
    ]
  },
  {
    name: "Reports",
    icon: <BarChartIcon />,
    title: "Reports",
    subItems: [
      { name: "Estimation Report", path: "/estimation-report", title: "Estimation Report" },
      { name: "DC Report", path: "/dc-report", title: "Design & Construction Report" },
    ]
  },
];

// SUPER_ADMIN Menu Items - Only Dashboard and Users
const superAdminMenuItems = [
  { 
    name: "Dashboard", 
    path: "/superDashboard", 
    icon: <DashboardIcon />,
    title: "Super Admin Dashboard" 
  },
  { 
    name: "Users", 
    path: "/super-admin-users", 
    icon: <AdminPanelSettingsIcon />,
    title: "User Management" 
  },
];

// Helper to get menu for a role
const getMenuByRole = (role) => {
  if (role === 'SUPER_ADMIN') {
    return superAdminMenuItems;
  } else if (role === 'USER') {
    return userMenuItems;  // USER gets everything EXCEPT Users
  }
  // ADMIN gets all menu items including Users
  return adminMenuItems;
};

// Helper to get dashboard title
const getTitleByRole = (role) => {
  const titles = {
    SUPER_ADMIN: "Super Admin Dashboard",
    ADMIN: "Admin Dashboard",
    USER: "User Dashboard"
  };
  return titles[role] || "Dashboard";
};

// Helper to get default route
const getDefaultRoute = (role) => {
  const routes = {
    SUPER_ADMIN: "/superDashboard",
    ADMIN: "/dashboard",
    USER: "/dashboard",
  };
  return routes[role] || "/dashboard";
};

// Protected Route Component
const PrivateRoute = ({ children, allowedRoles = null, allowPasswordChange = false }) => {
  const { user } = React.useContext(UserContext);
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRoute(user.role)} replace />;
  }
  
  if (!allowPasswordChange && user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  
  return children;
};

// Route wrapper for role-based access
const RoleBasedRoute = ({ children, allowedRoles }) => (
  <PrivateRoute allowedRoles={allowedRoles}>
    {children}
  </PrivateRoute>
);

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    const parsed = saved ? JSON.parse(saved) : null;
    const tokenUser = getUserFromToken();
    if (parsed && tokenUser?.mustChangePassword) {
      parsed.mustChangePassword = true;
    }
    return parsed;
  });
  const isMobile = useMediaQuery('(max-width:900px)');

  // Token validation and cleanup
  useEffect(() => {
    if (!user) {
      localStorage.removeItem("user");
      return;
    }

    localStorage.setItem("user", JSON.stringify(user));

    try {
      const token = user.token;
      if (!token) {
        setUser(null);
        return;
      }
      const payload = JSON.parse(atob(token.split(".")[1]));
      const expired = payload.exp * 1000 < Date.now();
      if (expired) {
        localStorage.removeItem("user");
        setUser(null);
      }
    } catch (err) {
      localStorage.removeItem("user");
      setUser(null);
    }
  }, [user]);

  // Memoize user context value
  const userContextValue = React.useMemo(() => ({ user, setUser }), [user]);

  // If user is logged in, show DashboardLayout with role-specific sidebar
  if (user) {
    const userRole = user.role || 'ADMIN';
    const currentMenu = getMenuByRole(userRole);
    const dashboardTitle = getTitleByRole(userRole);

    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <UserContext.Provider value={userContextValue}>
            <SessionManager>
              <ToastContainer 
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
                limit={3}
              />
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/change-password" element={
                  <PrivateRoute allowPasswordChange>
                    <ChangePassword />
                  </PrivateRoute>
                } />
                
                {/* Main dashboard layout */}
                <Route path="/" element={
                  <DashboardLayout 
                    menu={currentMenu} 
                    title={dashboardTitle} 
                    isMobile={isMobile} 
                  />
                }>
                  <Route index element={<Navigate to={getDefaultRoute(userRole)} replace />} />
                  
                  {/* SUPER_ADMIN specific routes - Only SUPER_ADMIN can access */}
                  <Route 
                    path="superDashboard" 
                    element={
                      <RoleBasedRoute allowedRoles={['SUPER_ADMIN']}>
                        <SuperDashboard />
                      </RoleBasedRoute>
                    } 
                  />
                  
                  <Route 
                    path="super-admin-users" 
                    element={
                      <RoleBasedRoute allowedRoles={['SUPER_ADMIN']}>
                        <SuperAdminAdmin />
                      </RoleBasedRoute>
                    } 
                  />
                  
                  {/* ADMIN Users route - Only ADMIN can access (USER cannot) */}
                  <Route 
                    path="admin-users" 
                    element={
                      <RoleBasedRoute allowedRoles={['ADMIN']}>
                        <AdminUsers />
                      </RoleBasedRoute>
                    } 
                  />
                  
                  {/* Dashboard route - ADMIN and USER can access */}
                  <Route 
                    path="dashboard" 
                    element={
                      <RoleBasedRoute allowedRoles={['ADMIN', 'USER']}>
                        <AdminDashboard />
                      </RoleBasedRoute>
                    } 
                  />
                  
                  {/* Request Routes - ADMIN and USER can access */}
                  <Route 
                    path="dc-request" 
                    element={
                      <RoleBasedRoute allowedRoles={['ADMIN', 'USER']}>
                        <DCRequest />
                      </RoleBasedRoute>
                    } 
                  />
                  
                  <Route 
                    path="estimation-request" 
                    element={
                      <RoleBasedRoute allowedRoles={['ADMIN', 'USER']}>
                        <EstimationRequest />
                      </RoleBasedRoute>
                    } 
                  />
                  
                  {/* Estimation Route - ADMIN and USER can access */}
                  <Route 
                    path="estimation" 
                    element={
                      <RoleBasedRoute allowedRoles={['ADMIN', 'USER']}>
                        <Estimation />
                      </RoleBasedRoute>
                    } 
                  />
                  
                  {/* Design & Construction Routes - ADMIN and USER can access */}
                  <Route 
                    path="construction" 
                    element={
                      <RoleBasedRoute allowedRoles={['ADMIN', 'USER']}>
                        <Construction />
                      </RoleBasedRoute>
                    } 
                  />
                  
                  <Route 
                    path="design" 
                    element={
                      <RoleBasedRoute allowedRoles={['ADMIN', 'USER']}>
                        <Design />
                      </RoleBasedRoute>
                    } 
                  />
                  
                  <Route 
                    path="specification" 
                    element={
                      <RoleBasedRoute allowedRoles={['ADMIN', 'USER']}>
                        <Specification />
                      </RoleBasedRoute>
                    } 
                  />
                  
                  {/* Report Routes - ADMIN and USER can access */}
                  <Route 
                    path="dc-report" 
                    element={
                      <RoleBasedRoute allowedRoles={['ADMIN', 'USER']}>
                        <DCReport />
                      </RoleBasedRoute>
                    } 
                  />
                  
                  <Route 
                    path="estimation-report" 
                    element={
                      <RoleBasedRoute allowedRoles={['ADMIN', 'USER']}>
                        <EstimationReport />
                      </RoleBasedRoute>
                    } 
                  />
                </Route>
                
                {/* Catch all */}
                <Route path="*" element={<Navigate to={getDefaultRoute(userRole)} replace />} />
              </Routes>
            </SessionManager>
          </UserContext.Provider>
        </Router>
      </ThemeProvider>
    );
  }

  // If no user, show login page
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <UserContext.Provider value={userContextValue}>
          <SessionManager>
            <ToastContainer 
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="colored"
              limit={3}
            />
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