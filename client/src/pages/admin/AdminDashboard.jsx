// pages/superAdmin/SuperDashboard.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Stack,
  Avatar,
  Chip,
  Alert,
  Button,
} from "@mui/material";
import {
  People as PeopleIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = `${import.meta.env.VITE_API_URL}/api/super-admin/dashboard`;

// Stat Card Component
const StatCard = ({ title, value, icon, color, subtitle }) => (
  <Card sx={{ bgcolor: "#fff", borderRadius: 2, boxShadow: 1, height: "100%" }}>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" color={color}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar
          sx={{
            bgcolor: `${color}15`,
            width: 48,
            height: 48,
          }}
        >
          {icon}
        </Avatar>
      </Stack>
    </CardContent>
  </Card>
);

const SuperDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();

  const getContainerMargin = () => isMobile ? "0px" : "4px";
  const getContainerWidth = () => isMobile ? "100%" : "calc(100% - 6px)";

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("No authentication token found. Please login again.");
        setLoading(false);
        return;
      }

      console.log("Fetching from URL:", API_URL);
      
      const response = await axios.get(API_URL, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log("Response status:", response.status);
      console.log("Response data:", response.data);
      
      if (response.data) {
        setData(response.data);
      } else {
        setError("Failed to load dashboard data");
      }
      
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      
      if (error.response) {
        console.error("Response error:", error.response.data);
        console.error("Status:", error.response.status);
        
        if (error.response.status === 401) {
          setError("Session expired. Please login again.");
          localStorage.removeItem("token");
          setTimeout(() => {
            navigate("/login");
          }, 2000);
        } else {
          setError(error.response.data?.message || "Failed to load dashboard data");
        }
      } else if (error.request) {
        setError("Network error. Please check your connection.");
      } else {
        setError(error.message || "An unexpected error occurred");
      }
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = () => {
    fetchData();
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5", py: 2 }}>
        <Container maxWidth={false} sx={{ width: getContainerWidth(), ml: getContainerMargin() }}>
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
            <CircularProgress sx={{ color: "#DAA520" }} />
          </Box>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5", py: 2 }}>
        <Container maxWidth={false} sx={{ width: getContainerWidth(), ml: getContainerMargin() }}>
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRetry}
              sx={{ bgcolor: "#DAA520", "&:hover": { bgcolor: "#b8860b" } }}
            >
              Retry
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5", py: 2 }}>
        <Container maxWidth={false} sx={{ width: getContainerWidth(), ml: getContainerMargin() }}>
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
            <Typography color="text.secondary">No data available</Typography>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRetry}
              sx={{ mt: 2, bgcolor: "#DAA520", "&:hover": { bgcolor: "#b8860b" } }}
            >
              Refresh
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  // Extract data from response
  const { users, admins, superAdmins, totalRecords, summary } = data;

  // Get user info from localStorage
  const userInfo = JSON.parse(localStorage.getItem("user") || "{}");
  const adminName = userInfo?.name || "Super Admin";
  const adminUsername = userInfo?.username || "superadmin";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5", py: isMobile ? 1 : 2 }}>
      <Container
        maxWidth={false}
        sx={{
          width: getContainerWidth(),
          ml: getContainerMargin(),
          mr: isMobile ? 0 : "12px",
          px: { xs: 1, sm: 2, md: 0.5 },
        }}
      >
        {/* Header */}
        <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" color="#DAA520" gutterBottom>
          Super Admin Dashboard
        </Typography>

        {/* Welcome */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2, background: "linear-gradient(135deg, #DAA520, #b8860b)", color: "white" }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: "rgba(255,255,255,0.2)" }}>
                <SecurityIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="bold">Welcome, {adminName}!</Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  {adminUsername} • SUPER_ADMIN
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Chip
                icon={<DashboardIcon />}
                label={`Total Records: ${totalRecords || 0}`}
                sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", "& .MuiChip-icon": { color: "white" } }}
              />
              <Chip
                icon={<CheckCircleIcon />}
                label="Active"
                sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", "& .MuiChip-icon": { color: "white" } }}
              />
            </Stack>
          </Stack>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Users"
              value={users?.total || 0}
              icon={<PeopleIcon sx={{ color: "#1890ff" }} />}
              color="#1890ff"
              subtitle={`Active: ${users?.status?.active || 0} | Inactive: ${users?.status?.inactive || 0}`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Admins"
              value={admins?.total || 0}
              icon={<AdminPanelSettingsIcon sx={{ color: "#DAA520" }} />}
              color="#DAA520"
              subtitle={`Active: ${admins?.status?.active || 0} | Inactive: ${admins?.status?.inactive || 0}`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Super Admins"
              value={superAdmins?.total || 0}
              icon={<SecurityIcon sx={{ color: "#f44336" }} />}
              color="#f44336"
              subtitle={`Active: ${superAdmins?.status?.active || 0} | Inactive: ${superAdmins?.status?.inactive || 0}`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Records"
              value={totalRecords || 0}
              icon={<PersonIcon sx={{ color: "#722ed1" }} />}
              color="#722ed1"
              subtitle={`Total: ${summary?.totalAllUsers || 0}`}
            />
          </Grid>
        </Grid>

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ p: 2, borderRadius: 2, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">Total Active Users</Typography>
              <Typography variant="h4" fontWeight="bold" color="#52c41a">
                {summary?.totalActive || 0}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ p: 2, borderRadius: 2, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">Total Inactive Users</Typography>
              <Typography variant="h4" fontWeight="bold" color="#ff4d4f">
                {summary?.totalInactive || 0}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ p: 2, borderRadius: 2, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">Users + Admins</Typography>
              <Typography variant="h4" fontWeight="bold" color="#DAA520">
                {summary?.totalUsersAndAdmins || 0}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Status Distribution Tables */}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: "#1890ff" }}>
                Users Status
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                  <Typography variant="body2">Active</Typography>
                  <Chip label={users?.status?.active || 0} size="small" sx={{ bgcolor: "#52c41a", color: "white" }} />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                  <Typography variant="body2">Inactive</Typography>
                  <Chip label={users?.status?.inactive || 0} size="small" sx={{ bgcolor: "#ff4d4f", color: "white" }} />
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: "#DAA520" }}>
                Admins Status
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                  <Typography variant="body2">Active</Typography>
                  <Chip label={admins?.status?.active || 0} size="small" sx={{ bgcolor: "#52c41a", color: "white" }} />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                  <Typography variant="body2">Inactive</Typography>
                  <Chip label={admins?.status?.inactive || 0} size="small" sx={{ bgcolor: "#ff4d4f", color: "white" }} />
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: "#f44336" }}>
                Super Admins Status
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                  <Typography variant="body2">Active</Typography>
                  <Chip label={superAdmins?.status?.active || 0} size="small" sx={{ bgcolor: "#52c41a", color: "white" }} />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                  <Typography variant="body2">Inactive</Typography>
                  <Chip label={superAdmins?.status?.inactive || 0} size="small" sx={{ bgcolor: "#ff4d4f", color: "white" }} />
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Summary Footer */}
        <Paper sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: "#fafafa" }}>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary">Total Users</Typography>
                <Typography variant="h6" fontWeight="bold" color="#1890ff">{users?.total || 0}</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary">Total Admins</Typography>
                <Typography variant="h6" fontWeight="bold" color="#DAA520">{admins?.total || 0}</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary">Super Admins</Typography>
                <Typography variant="h6" fontWeight="bold" color="#f44336">{superAdmins?.total || 0}</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary">Grand Total</Typography>
                <Typography variant="h6" fontWeight="bold" color="#722ed1">{totalRecords || 0}</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

      </Container>
    </Box>
  );
};

export default SuperDashboard;