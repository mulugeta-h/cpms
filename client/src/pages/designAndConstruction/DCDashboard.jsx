// pages/admin/AdminDashboard.jsx
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
  Divider,
  LinearProgress,
} from "@mui/material";
import {
  Assignment as AssignmentIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Engineering as EngineeringIcon,
  Draw as DrawIcon,
  Build as BuildIcon,
  Security as SecurityIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Person as PersonIcon,
  FiberManualRecord as DotIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = `${import.meta.env.VITE_API_URL}/api/dashboard`;

const STATUS_COLORS = {
  "In Progress": "#DAA520",
  Completed: "#52c41a",
  Rejected: "#ff4d4f",
};

/* ---------- Card design---------- */
const StatCard = ({ title, value, icon, color, subtitle }) => (
  <Card sx={{ bgcolor: "#fff", borderRadius: 2, boxShadow: 1, height: "100%" }}>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" color={color}>
            {value ?? 0}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}15`, width: 48, height: 48 }}>
          {icon}
        </Avatar>
      </Stack>
    </CardContent>
  </Card>
);

/* ---------- Number row ---------- */
const NumRow = ({ label, value, color = "text.primary", bold = false }) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
    sx={{ py: 0.75 }}
  >
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography
      variant="body2"
      fontWeight={bold ? "bold" : "normal"}
      color={color}
    >
      {value ?? 0}
    </Typography>
  </Stack>
);

/* ---------- Status block ---------- */
const StatusBlock = ({ title, data, color }) => {
  const total = data?.total || 0;
  return (
    <Paper sx={{ p: 2, borderRadius: 2, height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" mb={1}>
        <Typography variant="subtitle2" fontWeight="bold" color={color}>
          {title}
        </Typography>
        <Chip
          label={`Total: ${total}`}
          size="small"
          sx={{ bgcolor: `${color}20`, color, fontWeight: 600 }}
        />
      </Stack>
      <Divider sx={{ mb: 1 }} />
      <NumRow label="In Progress" value={data?.["In Progress"]} color="#b8860b" />
      <NumRow label="Completed" value={data?.Completed} color="#389e0d" />
      <NumRow label="Rejected" value={data?.Rejected} color="#cf1322" />
      {data?.today !== undefined && (
        <NumRow label="Today" value={data.today} bold />
      )}
      {data?.thisWeek !== undefined && (
        <NumRow label="This week" value={data.thisWeek} />
      )}
      {data?.assigned !== undefined && (
        <NumRow label="Assigned" value={data.assigned} />
      )}

      {total > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <LinearProgress
            variant="determinate"
            value={Math.round(((data.Completed || 0) / total) * 100)}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: "#f0f0f0",
              "& .MuiLinearProgress-bar": { bgcolor: "#52c41a" },
            }}
          />
        </Box>
      )}
    </Paper>
  );
};

/* ---------- Construction field row ---------- */
const ConstructionRow = ({ label, data }) => {
  const c = data?.Completed || 0;
  const p = data?.Pending || 0;
  const n = data?.["Not Required"] || 0;
  const total = c + p + n;
  return (
    <Box sx={{ py: 1, borderBottom: "1px solid #f0f0f0" }}>
      <Stack direction="row" justifyContent="space-between" mb={0.5}>
        <Typography variant="caption">{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          {c}/{total}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={total ? Math.round((c / total) * 100) : 0}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: "#f0f0f0",
          "& .MuiLinearProgress-bar": { bgcolor: "#52c41a" },
        }}
      />
      <Stack direction="row" spacing={2} mt={0.5}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <DotIcon sx={{ fontSize: 10, color: "#52c41a" }} />
          <Typography variant="caption" color="text.secondary">
            {c} done
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <DotIcon sx={{ fontSize: 10, color: "#DAA520" }} />
          <Typography variant="caption" color="text.secondary">
            {p} pending
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <DotIcon sx={{ fontSize: 10, color: "#999" }} />
          <Typography variant="caption" color="text.secondary">
            {n} N/A
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
};

/* ---------- Main ---------- */
const AdminDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();

  const userInfo = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

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

      const cfg = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      const s = await axios.get(`${API_BASE}/summary`, cfg);
      setSummary(s.data?.data || null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
        localStorage.removeItem("token");
        setTimeout(() => navigate("/login"), 2000);
      } else if (err.response) {
        setError(err.response.data?.message || "Failed to load dashboard data");
      } else if (err.request) {
        setError("Network error. Please check your connection.");
      } else {
        setError(err.message || "An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !summary) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5", py: 2 }}>
        <Container maxWidth={false}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 400,
            }}
          >
            <CircularProgress sx={{ color: "#DAA520" }} />
          </Box>
        </Container>
      </Box>
    );
  }

  if (error && !summary) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5", py: 2 }}>
        <Container maxWidth={false}>
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchData}
              sx={{ bgcolor: "#DAA520", "&:hover": { bgcolor: "#b8860b" } }}
            >
              Retry
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (!summary) return null;

  const dc = summary.dcRequests || {};
  const est = summary.estimationRequests || {};
  const users = summary.users || {};
  const roles = users.roles || {};
  const construction = summary.construction || { total: 0, fields: {} };
  const design = summary.design || {};
  const specification = summary.specification || {};
  const sessions = summary.sessions || {};

  const userName = userInfo?.name || "User";
  const username = userInfo?.username || "user";
  const roleLabel = userInfo?.role || "USER";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5", py: isMobile ? 1 : 2 }}>
      <Container maxWidth={false} sx={{ px: { xs: 1, sm: 2 } }}>
        <Typography
          variant={isMobile ? "h5" : "h4"}
          fontWeight="bold"
          color="#DAA520"
          gutterBottom
        >
          Dashboard
        </Typography>

        {/* Welcome banner */}
        <Paper
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            background: "linear-gradient(135deg, #DAA520, #b8860b)",
            color: "white",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                sx={{ width: 56, height: 56, bgcolor: "rgba(255,255,255,0.2)" }}
              >
                <DashboardIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  Welcome, {userName}!
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  {username} • {roleLabel}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                icon={<CheckCircleIcon />}
                label={
                  lastUpdated
                    ? `Updated ${lastUpdated.toLocaleTimeString()}`
                    : "Live"
                }
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "white",
                  "& .MuiChip-icon": { color: "white" },
                }}
              />
            </Stack>
          </Stack>
        </Paper>

        {error && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* KPI cards */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="DC Requests"
              value={dc.total}
              icon={<AssignmentIcon sx={{ color: "#1890ff" }} />}
              color="#1890ff"
              subtitle={`In Progress: ${dc["In Progress"] || 0} | Done: ${
                dc.Completed || 0
              }`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Estimation Requests"
              value={est.total}
              icon={<DescriptionIcon sx={{ color: "#DAA520" }} />}
              color="#DAA520"
              subtitle={`In Progress: ${est["In Progress"] || 0} | Done: ${
                est.Completed || 0
              }`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Construction Records"
              value={construction.total}
              icon={<BuildIcon sx={{ color: "#13c2c2" }} />}
              color="#13c2c2"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Design / Spec"
              value={(design.total || 0) + (specification.total || 0)}
              icon={<DrawIcon sx={{ color: "#722ed1" }} />}
              color="#722ed1"
              subtitle={`Design: ${design.total || 0} | Spec: ${
                specification.total || 0
              }`}
            />
          </Grid>
        </Grid>

        {/* Status blocks */}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatusBlock title="DC Status" data={dc} color="#1890ff" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatusBlock title="Estimation Status" data={est} color="#DAA520" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, borderRadius: 2, height: "100%" }}>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  color="#1890ff"
                >
                  Users
                </Typography>
                <Chip
                  label={`Total: ${users.total || 0}`}
                  size="small"
                  sx={{
                    bgcolor: "#1890ff20",
                    color: "#1890ff",
                    fontWeight: 600,
                  }}
                />
              </Stack>
              <Divider sx={{ mb: 1 }} />
              <NumRow label="Enabled" value={users.enabled} color="#389e0d" />
              <NumRow label="Disabled" value={users.disabled} color="#cf1322" />
              <NumRow label="SUPER_ADMIN" value={roles.SUPER_ADMIN} />
              <NumRow label="ADMIN" value={roles.ADMIN} />
              <NumRow label="USER" value={roles.USER} />
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, borderRadius: 2, height: "100%" }}>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  color="#722ed1"
                >
                  Sessions
                </Typography>
                <Chip
                  label={`Total: ${sessions.total || 0}`}
                  size="small"
                  sx={{
                    bgcolor: "#722ed120",
                    color: "#722ed1",
                    fontWeight: 600,
                  }}
                />
              </Stack>
              <Divider sx={{ mb: 1 }} />
              <NumRow
                label="Active"
                value={sessions.active}
                color="#389e0d"
                bold
              />
              <NumRow
                label="Inactive"
                value={(sessions.total || 0) - (sessions.active || 0)}
              />
            </Paper>
          </Grid>
        </Grid>

        {/* Construction breakdown */}
        <Paper sx={{ p: 2, mt: 2, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" mb={1}>
            <Typography variant="h6" fontWeight="bold" color="#13c2c2">
              Construction Work Breakdown
            </Typography>
            <Chip
              label={`Total: ${construction.total || 0}`}
              size="small"
              sx={{ bgcolor: "#13c2c220", color: "#13c2c2", fontWeight: 600 }}
            />
          </Stack>
          <Divider sx={{ mb: 1 }} />
          {construction.total === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No construction records.
            </Typography>
          ) : (
            Object.entries(construction.fields || {}).map(([key, val]) => (
              <ConstructionRow
                key={key}
                label={key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (c) => c.toUpperCase())}
                data={val}
              />
            ))
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default AdminDashboard;