// pages/superAdmin/SuperDashboard.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Stack,
  Avatar,
  Chip,
  Alert,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Circle as CircleIcon,
  Devices as DevicesIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = `${import.meta.env.VITE_API_URL}/api/super-admin/dashboard`;

// ─── Role metadata (labels only, no colors/icons) ─────────────────────
const ROLE_META = {
  superAdmins: { label: "Super Admins", enum: "SUPER_ADMIN" },
  allAdmins:   { label: "All Admins",   enum: "ALL_ADMIN" },
  allViews:    { label: "All Views",    enum: "ALL_VIEW" },
  estAdmins:   { label: "Est Admins",   enum: "EST_ADMIN" },
  dcAdmins:    { label: "DC Admins",    enum: "DC_ADMIN" },
  users:       { label: "Users",        enum: "USER" },
};

const ENUM_TO_KEY = Object.fromEntries(
  Object.entries(ROLE_META).map(([key, meta]) => [meta.enum, key])
);

// ─── Status chip (user active/inactive) ───────────────────────────────
const StatusChip = ({ value, variant = "filled" }) => {
  const isActive = value === "active";
  return (
    <Chip
      label={isActive ? "Active" : "Inactive"}
      size="small"
      color={isActive ? "success" : "error"}
      variant={variant}
      sx={{ fontWeight: 600, minWidth: 70 }}
    />
  );
};

// ─── Session status chip (active / logged out / idle timeout / …) ─────
const SESSION_STATUS_META = {
  active:     { label: "Active",        color: "success" },
  manual:     { label: "Logged out",    color: "default" },
  inactivity: { label: "Idle timeout",  color: "warning" },
  security:   { label: "Security",      color: "warning" },
  admin:      { label: "Admin kill",    color: "warning" },
  stale:      { label: "Stale",         color: "warning" },
  ended:      { label: "Ended",         color: "default" },
};

const SessionStatusChip = ({ status }) => {
  const meta = SESSION_STATUS_META[status] || SESSION_STATUS_META.ended;
  const filled = status === "active";
  return (
    <Chip
      label={meta.label}
      size="small"
      color={meta.color}
      variant={filled ? "filled" : "outlined"}
      sx={{ fontWeight: 600, minWidth: 100 }}
    />
  );
};

// ─── One role's status card ───────────────────────────────────────────
const StatusCard = ({ title, data }) => {
  const section = data || { total: 0, active: 0, inactive: 0 };
  return (
    <Paper sx={{ p: 2, borderRadius: 2, height: "100%" }}>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1.5, color: "#424242" }}>
        {title} Status
      </Typography>

      <Stack spacing={1}>
        {/* Total */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 1,
            bgcolor: "#fafafa",
            borderRadius: 1,
            border: "1px solid #eee",
          }}
        >
          <Typography variant="body2" fontWeight="bold" color="text.secondary">
            Total
          </Typography>
          <Typography variant="body1" fontWeight="bold" color="#424242">
            {section.total || 0}
          </Typography>
        </Box>

        {/* Active */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 1,
            bgcolor: "#f5f5f5",
            borderRadius: 1,
          }}
        >
          <Typography variant="body2">Active</Typography>
          <Chip
            label={section.active || 0}
            size="small"
            color="success"
            sx={{ minWidth: 40, fontWeight: "bold" }}
          />
        </Box>

        {/* Inactive */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 1,
            bgcolor: "#f5f5f5",
            borderRadius: 1,
          }}
        >
          <Typography variant="body2">Inactive</Typography>
          <Chip
            label={section.inactive || 0}
            size="small"
            color="error"
            sx={{ minWidth: 40, fontWeight: "bold" }}
          />
        </Box>
      </Stack>
    </Paper>
  );
};

// ─── Main dashboard ───────────────────────────────────────────────────
const SuperDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();

  const getContainerMargin = () => (isMobile ? "0px" : "4px");
  const getContainerWidth = () => (isMobile ? "100%" : "calc(100% - 6px)");

  const fetchData = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found. Please login again.");
        return;
      }

      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data) setData(response.data);
      else setError("Failed to load dashboard data");
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      if (err.response) {
        if (err.response.status === 401) {
          setError("Session expired. Please login again.");
          localStorage.removeItem("token");
          setTimeout(() => navigate("/login"), 2000);
        } else {
          setError(err.response.data?.msg || "Failed to load dashboard data");
        }
      } else if (err.request) {
        setError("Network error. Please check your connection.");
      } else {
        setError(err.message || "An unexpected error occurred");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Loading ──
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

  // ── Error ──
  if (error) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5", py: 2 }}>
        <Container maxWidth={false} sx={{ width: getContainerWidth(), ml: getContainerMargin() }}>
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={() => fetchData()}
              sx={{ bgcolor: "#DAA520", "&:hover": { bgcolor: "#b8860b" } }}
            >
              Retry
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  // ── No data ──
  if (!data) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5", py: 2 }}>
        <Container maxWidth={false} sx={{ width: getContainerWidth(), ml: getContainerMargin() }}>
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
            <Typography color="text.secondary">No data available</Typography>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={() => fetchData()}
              sx={{ mt: 2, bgcolor: "#DAA520", "&:hover": { bgcolor: "#b8860b" } }}
            >
              Refresh
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  const { activeSessions, recentSessions } = data;

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
        {/* ─── Header ─── */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" color="#DAA520">
            Super Admin Dashboard
          </Typography>
          <Tooltip title="Refresh now">
            <span>
              <Button
                variant="outlined"
                size="small"
                startIcon={
                  refreshing ? (
                    <CircularProgress size={14} sx={{ color: "#DAA520" }} />
                  ) : (
                    <RefreshIcon />
                  )
                }
                onClick={() => fetchData(true)}
                disabled={refreshing}
                sx={{ borderColor: "#DAA520", color: "#DAA520" }}
              >
                Refresh
              </Button>
            </span>
          </Tooltip>
        </Box>

        {/* ══════════ Role Status Cards ══════════ */}
        <Grid container spacing={2}>
          {Object.entries(ROLE_META).map(([key, meta]) => (
            <Grid item xs={12} sm={6} md={4} key={key}>
              <StatusCard title={meta.label} data={data[key]} />
            </Grid>
          ))}
        </Grid>

        {/* ══════════ Active Sessions ══════════ */}
        <Paper sx={{ p: 2, mt: 3, borderRadius: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircleIcon sx={{ color: "#52c41a", fontSize: 14 }} />
              <Typography variant="h6" fontWeight="bold" color="#424242">
                Active Sessions
              </Typography>
              <Chip
                label={`${activeSessions?.total || 0} online`}
                size="small"
                color="success"
                sx={{ fontWeight: "bold" }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Only enabled users with a live session are counted
            </Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Per-role active counts */}
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {Object.entries(ROLE_META).map(([key, meta]) => {
              const count = activeSessions?.byRole?.[meta.enum] || 0;
              return (
                <Grid item xs={6} sm={4} md={2} key={key}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: "#fafafa",
                      border: "1px solid #eee",
                      textAlign: "center",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {meta.label}
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="#424242">
                      {count}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>

          {activeSessions?.list?.length > 0 ? (
            <TableContainer sx={{ maxHeight: 420 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#fafafa" }}>Username</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#fafafa" }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#fafafa" }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#fafafa" }}>Device</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#fafafa" }}>IP</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#fafafa" }}>Last Login</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#fafafa" }}>Last Activity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeSessions.list.map((s) => {
                    const roleKey = ENUM_TO_KEY[s.role];
                    const label = ROLE_META[roleKey]?.label || s.role || "USER";

                    return (
                      <TableRow key={s.sessionId} hover>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Avatar
                              sx={{ width: 26, height: 26, bgcolor: "#9e9e9e", fontSize: 13 }}
                            >
                              {s.username?.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="body2" fontWeight="medium">
                              {s.username}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{s.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={label}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: "#bdbdbd",
                              color: "#424242",
                              fontWeight: s.role === "SUPER_ADMIN" ? "bold" : "normal",
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <DevicesIcon sx={{ fontSize: 14, color: "#888" }} />
                            <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                              {s.deviceId ? s.deviceId.slice(0, 10) : "—"}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                            {s.ipAddress || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {s.lastIn ? new Date(s.lastIn).toLocaleString() : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {s.lastActivity ? new Date(s.lastActivity).toLocaleString() : "—"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <CircleIcon sx={{ color: "#ccc", fontSize: 40, mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No users are currently logged in.
              </Typography>
            </Box>
          )}
        </Paper>

        {/* ══════════ Recent Sessions (last 100) ══════════ */}
        <Paper sx={{ p: 2, mt: 3, borderRadius: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <HistoryIcon sx={{ color: "#DAA520", fontSize: 20 }} />
              <Typography variant="h6" fontWeight="bold" color="#424242">
                Recent Sessions
              </Typography>
              <Chip
                label={`${recentSessions?.total || 0} of last ${recentSessions?.limit || 100}`}
                size="small"
                sx={{ fontWeight: "bold" }}
              />
              {recentSessions?.byStatus &&
                Object.entries(recentSessions.byStatus).map(([status, count]) => {
                  const meta = SESSION_STATUS_META[status] || SESSION_STATUS_META.ended;
                  return (
                    <Chip
                      key={status}
                      label={`${meta.label}: ${count}`}
                      size="small"
                      variant="outlined"
                      color={meta.color}
                      sx={{ fontWeight: 500 }}
                    />
                  );
                })}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Newest activity first — includes active and ended sessions
            </Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {recentSessions?.list?.length > 0 ? (
            <TableContainer sx={{ maxHeight: 480 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#fafafa" }}>Username</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#fafafa" }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#fafafa" }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#fafafa" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#fafafa" }}>Device</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#fafafa" }}>IP</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#fafafa" }}>Last Login</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#fafafa" }}>Last Activity</TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "#fafafa" }}>Ended At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentSessions.list.map((s) => {
                    const roleKey = ENUM_TO_KEY[s.role];
                    const roleLabel = ROLE_META[roleKey]?.label || s.role || "USER";
                    const userDisabled = s.userEnabled === false;

                    return (
                      <TableRow key={s.sessionId} hover>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Avatar
                              sx={{ width: 26, height: 26, bgcolor: "#9e9e9e", fontSize: 13 }}
                            >
                              {s.username?.charAt(0)?.toUpperCase() || "?"}
                            </Avatar>
                            <Typography variant="body2" fontWeight="medium">
                              {s.username}
                              {userDisabled && (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  sx={{ ml: 0.5, color: "error.main" }}
                                >
                                  (disabled)
                                </Typography>
                              )}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{s.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={roleLabel}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: "#bdbdbd",
                              color: "#424242",
                              fontWeight: s.role === "SUPER_ADMIN" ? "bold" : "normal",
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <SessionStatusChip status={s.status} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <DevicesIcon sx={{ fontSize: 14, color: "#888" }} />
                            <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                              {s.deviceId ? s.deviceId.slice(0, 10) : "—"}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                            {s.ipAddress || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {s.lastIn ? new Date(s.lastIn).toLocaleString() : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {s.lastActivity ? new Date(s.lastActivity).toLocaleString() : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {s.expiredAt ? new Date(s.expiredAt).toLocaleString() : "—"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <HistoryIcon sx={{ color: "#ccc", fontSize: 40, mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No sessions recorded yet.
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default SuperDashboard;