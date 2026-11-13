import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Chip,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Button,
  Tooltip,
  IconButton,
  Avatar,
  TablePagination,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL}/api/super-admin`;

const ROLE_LABEL = {
  SUPER_ADMIN: "SUPER ADMIN",
  ALL_ADMIN: "ALL ADMIN",
  ALL_VIEW: "ALL VIEW",
  EST_ADMIN: "EST ADMIN",
  DC_ADMIN: "DC ADMIN",
  USER: "USER",
};

const AdminManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [error, setError] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const getContainerMargin = () => (isMobile ? "0px" : "4px");
  const getContainerWidth = () => (isMobile ? "100%" : "calc(100% - 4px)");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = response.data.data || [];
      setUsers(userData);
      setTotalUsers(userData.length);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError(error.response?.data?.msg || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.username?.toLowerCase().includes(search) ||
      user.name?.toLowerCase().includes(search) ||
      user.role?.toLowerCase().includes(search)
    );
  });

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Neutral role chip — no color, just a label
  const getRoleChip = (role) => (
    <Chip
      label={ROLE_LABEL[role] || role || "USER"}
      size="small"
      variant="outlined"
      sx={{
        borderColor: "#bdbdbd",
        color: "#424242",
        fontWeight: role === "SUPER_ADMIN" ? "bold" : "normal",
      }}
    />
  );

  // The only colored element on the row
  const getStatusChip = (enabled) =>
    enabled ? (
      <Chip label="Active" color="success" size="small" icon={<CheckCircleIcon />} />
    ) : (
      <Chip label="Disabled" color="error" size="small" icon={<CancelIcon />} />
    );

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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
            flexWrap: "wrap",
            gap: 2,
            bgcolor: "#fff",
            p: 2,
            borderRadius: 2,
            boxShadow: 1,
          }}
        >
          <Typography
            variant={isMobile ? "h6" : "h5"}
            fontWeight="bold"
            color="#DAA520"
            sx={{ whiteSpace: "nowrap" }}
          >
            User Management
          </Typography>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <TextField
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ width: isMobile ? 150 : 200 }}
            />

            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
              Total: {totalUsers}
            </Typography>

            <Tooltip title="Refresh">
              <IconButton
                size="small"
                onClick={fetchUsers}
                disabled={loading}
                sx={{ color: "#DAA520" }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Users Table */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress sx={{ color: "#DAA520" }} />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
            <Typography color="error">{error}</Typography>
            <Button onClick={fetchUsers} sx={{ mt: 2 }}>
              Retry
            </Button>
          </Paper>
        ) : users.length === 0 ? (
          <Paper sx={{ p: 8, textAlign: "center", borderRadius: 2 }}>
            <Typography variant="h6" color="text.secondary">
              No users found
            </Typography>
          </Paper>
        ) : (
          <>
            <TableContainer
              component={Paper}
              sx={{ borderRadius: 2, overflow: "auto", maxHeight: "500px" }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 80 }}>RNO/#</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 120 }}>Username</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 150 }}>Full Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 130 }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 110 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 130 }}>Created At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((user, index) => {
                      const rowNumber = page * rowsPerPage + index + 1;

                      return (
                        <TableRow
                          key={user._id}
                          sx={{ "&:hover": { bgcolor: "#fafafa" } }}
                        >
                          <TableCell>{rowNumber}</TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Avatar
                                sx={{
                                  width: 28,
                                  height: 28,
                                  bgcolor: "#9e9e9e",
                                  fontSize: 13,
                                }}
                              >
                                {user.username?.charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography variant="body2">{user.username}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{getRoleChip(user.role)}</TableCell>
                          <TableCell>{getStatusChip(user.enabled)}</TableCell>
                          <TableCell>
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString()
                              : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              component="div"
              count={filteredUsers.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                borderTop: "1px solid #e0e0e0",
                "& .MuiTablePagination-selectIcon": { color: "#DAA520" },
                "& .MuiIconButton-root": { color: "#DAA520" },
              }}
            />
          </>
        )}
      </Container>
    </Box>
  );
};

export default AdminManagement;