// pages/superAdmin/AdminManagement.jsx
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel,
  Avatar,
  Stack,
  TablePagination,
  MenuItem,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  LockReset as LockResetIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL}/api/super-admin`;
const DEFAULT_PASSWORD = "12345678";

const ASSIGNABLE_ROLES = ["ALL_ADMIN", "ALL_VIEW", "EST_ADMIN", "DC_ADMIN", "USER"];

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
  const [currentUser, setCurrentUser] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: DEFAULT_PASSWORD,
    enabled: true,
    role: "USER",
  });
  const [selectedUser, setSelectedUser] = useState(null);

  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const getContainerMargin = () => (isMobile ? "0px" : "4px");
  const getContainerWidth = () => (isMobile ? "100%" : "calc(100% - 4px)");

  const getCurrentUser = () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const user = JSON.parse(atob(token.split(".")[1]));
        setCurrentUser(user);
        return user;
      }
    } catch (err) {
      console.error("Error parsing token:", err);
    }
    return null;
  };

  const isSuperAdmin = (user) => user?.role === "SUPER_ADMIN";

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
    getCurrentUser();
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

  const handleFormChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === "enabled" ? checked : value }));
  };

  const handleOpenCreate = () => {
    setDialogMode("create");
    setFormData({
      name: "",
      username: "",
      password: DEFAULT_PASSWORD,
      enabled: true,
      role: "USER",
    });
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (user) => {
    if (isSuperAdmin(user) && currentUser?.id !== user._id) {
      setSnackbar({ open: true, message: "Cannot edit other SUPER_ADMIN accounts", severity: "warning" });
      return;
    }
    setDialogMode("edit");
    setFormData({
      name: user.name || "",
      username: user.username || "",
      enabled: user.enabled !== undefined ? user.enabled : true,
      role: user.role || "USER",
    });
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setFormData({ name: "", username: "", password: DEFAULT_PASSWORD, enabled: true, role: "USER" });
    setSelectedUser(null);
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");

      if (dialogMode === "create") {
        if (!formData.name || !formData.username) {
          setSnackbar({ open: true, message: "Full name and username are required", severity: "error" });
          return;
        }
        await axios.post(
          `${API_URL}/create-user`,
          {
            name: formData.name,
            username: formData.username,
            password: DEFAULT_PASSWORD,
            role: formData.role,
            enabled: formData.enabled,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSnackbar({ open: true, message: `User created successfully! Password: ${DEFAULT_PASSWORD}`, severity: "success" });
      } else {
        const isEditingSuperAdmin = isSuperAdmin(selectedUser);

        const updateData = isEditingSuperAdmin
          ? { name: formData.name }
          : { name: formData.name, enabled: formData.enabled, role: formData.role };

        await axios.put(`${API_URL}/user/${selectedUser._id}`, updateData, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setSnackbar({
          open: true,
          message: isEditingSuperAdmin ? "Name updated successfully" : "User updated successfully",
          severity: "success",
        });
      }

      handleDialogClose();
      fetchUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      setSnackbar({ open: true, message: error.response?.data?.msg || "Failed to save user", severity: "error" });
    }
  };

  const handleToggleStatus = async (user) => {
    if (isSuperAdmin(user)) {
      setSnackbar({ open: true, message: "Cannot toggle status of SUPER_ADMIN accounts", severity: "warning" });
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/toggle-status/${user._id}`,
        { enabled: !user.enabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSnackbar({ open: true, message: `User ${!user.enabled ? "activated" : "deactivated"} successfully`, severity: "success" });
      fetchUsers();
    } catch (error) {
      setSnackbar({ open: true, message: error.response?.data?.msg || "Failed to toggle status", severity: "error" });
    }
  };

  const handleOpenResetPassword = (user) => {
    if (isSuperAdmin(user)) {
      setSnackbar({ open: true, message: "Cannot reset password for SUPER_ADMIN accounts", severity: "warning" });
      return;
    }
    setResetUser(user);
    setResetPasswordOpen(true);
  };

  const handleResetPassword = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/user/${resetUser._id}`,
        { password: DEFAULT_PASSWORD },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSnackbar({ open: true, message: `Password reset successfully to: ${DEFAULT_PASSWORD}`, severity: "success" });
      setResetPasswordOpen(false);
      setResetUser(null);
    } catch (error) {
      setSnackbar({ open: true, message: error.response?.data?.msg || "Failed to reset password", severity: "error" });
    }
  };

  const handleOpenDelete = (user) => {
    if (isSuperAdmin(user)) {
      setSnackbar({ open: true, message: "Cannot delete SUPER_ADMIN accounts", severity: "warning" });
      return;
    }
    setDeleteUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/user/${deleteUser._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSnackbar({ open: true, message: "User deleted successfully", severity: "success" });
      setDeleteDialogOpen(false);
      setDeleteUser(null);
      fetchUsers();
    } catch (error) {
      setSnackbar({ open: true, message: error.response?.data?.msg || "Failed to delete user", severity: "error" });
    }
  };

  const exportToCSV = () => {
    if (users.length === 0) return;
    const headers = ["RNO", "Username", "Full Name", "Role", "Status", "Created At"];
    const rows = users.map((user, index) => [
      index + 1,
      user.username,
      user.name,
      ROLE_LABEL[user.role] || user.role || "USER",
      user.enabled ? "Active" : "Disabled",
      user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
          <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold" color="#DAA520" sx={{ whiteSpace: "nowrap" }}>
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

            <Tooltip title="Export CSV">
              <IconButton size="small" onClick={exportToCSV} disabled={users.length === 0} sx={{ color: "#DAA520" }}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Refresh">
              <IconButton size="small" onClick={fetchUsers} disabled={loading} sx={{ color: "#DAA520" }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              size="small"
              sx={{ bgcolor: "#DAA520", "&:hover": { bgcolor: "#b8860b" }, whiteSpace: "nowrap", minWidth: "auto" }}
            >
              Add User
            </Button>
          </Box>
        </Box>

        {/* Table */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress sx={{ color: "#DAA520" }} />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
            <Typography color="error">{error}</Typography>
            <Button onClick={fetchUsers} sx={{ mt: 2 }}>Retry</Button>
          </Paper>
        ) : users.length === 0 ? (
          <Paper sx={{ p: 8, textAlign: "center", borderRadius: 2 }}>
            <Typography variant="h6" color="text.secondary">No users found</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Click "Add User" to create a new user
            </Typography>
          </Paper>
        ) : (
          <>
            <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: "auto", maxHeight: "500px" }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 70 }}>RNO/#</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 130 }}>Username</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 150 }}>Full Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 130 }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 110 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 130 }}>Created At</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 220, textAlign: "center" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((user, index) => {
                      const isSuper = isSuperAdmin(user);
                      const rowNumber = page * rowsPerPage + index + 1;

                      return (
                        <TableRow key={user._id} sx={{ "&:hover": { bgcolor: "#fafafa" } }}>
                          <TableCell>{rowNumber}</TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Avatar sx={{ width: 28, height: 28, bgcolor: "#9e9e9e", fontSize: 13 }}>
                                {user.username?.charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography variant="body2">{user.username}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{getRoleChip(user.role)}</TableCell>
                          <TableCell>{getStatusChip(user.enabled)}</TableCell>
                          <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "center" }}>
                              <Tooltip title={isSuper ? "SUPER_ADMIN cannot be toggled" : user.enabled ? "Disable" : "Enable"}>
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleToggleStatus(user)}
                                    disabled={isSuper}
                                    sx={{ color: isSuper ? "#999" : user.enabled ? "#4caf50" : "#f44336" }}
                                  >
                                    {user.enabled ? <ToggleOnIcon /> : <ToggleOffIcon />}
                                  </IconButton>
                                </span>
                              </Tooltip>

                              <Tooltip title={isSuper ? "SUPER_ADMIN can only edit name" : "Edit"}>
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenEdit(user)}
                                    sx={{ color: isSuper ? "#ff9800" : "#1976d2" }}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>

                              <Tooltip title={isSuper ? "SUPER_ADMIN password cannot be reset" : "Reset Password"}>
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenResetPassword(user)}
                                    disabled={isSuper}
                                    sx={{ color: isSuper ? "#999" : "#ff9800" }}
                                  >
                                    <LockResetIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>

                              <Tooltip title={isSuper ? "SUPER_ADMIN cannot be deleted" : "Delete"}>
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenDelete(user)}
                                    disabled={isSuper}
                                    sx={{ color: isSuper ? "#999" : "#f44336" }}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Box>
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

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                {dialogMode === "create" ? "Create New User" : "Edit User"}
              </Typography>
              <IconButton onClick={handleDialogClose}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                required
                size="small"
                placeholder="Enter full name"
                autoFocus
              />

              {dialogMode === "edit" && isSuperAdmin(selectedUser) ? (
                <>
                  <Alert severity="info">
                    <strong>SUPER_ADMIN</strong> users can only update their <strong>Full Name</strong>.
                  </Alert>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: "#f5f5f5" }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      <strong>Username:</strong> {selectedUser?.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      <strong>Role:</strong> {selectedUser?.role}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      <strong>Status:</strong> {selectedUser?.enabled ? "Enabled" : "Disabled"}
                    </Typography>
                  </Paper>
                </>
              ) : dialogMode === "edit" ? (
                <>
                  <TextField
                    fullWidth
                    label="Username"
                    name="username"
                    value={formData.username}
                    size="small"
                    disabled
                    InputProps={{ readOnly: true }}
                    helperText="Username cannot be changed"
                  />
                  <TextField fullWidth select label="Role" name="role" value={formData.role} onChange={handleFormChange} size="small">
                    {ASSIGNABLE_ROLES.map((r) => (
                      <MenuItem key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </MenuItem>
                    ))}
                  </TextField>
                  <FormControlLabel
                    control={<Switch name="enabled" checked={formData.enabled} onChange={handleFormChange} color="success" />}
                    label={formData.enabled ? "Enabled" : "Disabled"}
                  />
                </>
              ) : (
                <>
                  <TextField
                    fullWidth
                    label="Username"
                    name="username"
                    value={formData.username}
                    onChange={handleFormChange}
                    required
                    size="small"
                    placeholder="Enter username"
                  />
                  <TextField fullWidth select label="Role" name="role" value={formData.role} onChange={handleFormChange} size="small">
                    {ASSIGNABLE_ROLES.map((r) => (
                      <MenuItem key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </MenuItem>
                    ))}
                  </TextField>
                  <FormControlLabel
                    control={<Switch name="enabled" checked={formData.enabled} onChange={handleFormChange} color="success" />}
                    label={formData.enabled ? "Enabled" : "Disabled"}
                  />
                  <TextField
                    fullWidth
                    label="Password"
                    type="text"
                    value={DEFAULT_PASSWORD}
                    disabled
                    size="small"
                    InputProps={{ readOnly: true }}
                    helperText={`Password is fixed to: ${DEFAULT_PASSWORD}`}
                  />
                  <Alert severity="info">
                    <strong>Default Password:</strong> {DEFAULT_PASSWORD}
                  </Alert>
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={handleDialogClose} variant="outlined" sx={{ borderColor: "#666", color: "#666" }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} variant="contained" sx={{ bgcolor: "#DAA520", "&:hover": { bgcolor: "#b8860b" } }}>
              {dialogMode === "create" ? "Create" : "Update"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={resetPasswordOpen} onClose={() => setResetPasswordOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Reset Password</Typography>
              <IconButton onClick={() => setResetPasswordOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Box sx={{ p: 2, bgcolor: "#f5f5f5", borderRadius: 2 }}>
                <Typography variant="body2"><strong>Username:</strong> {resetUser?.username}</Typography>
                <Typography variant="body2"><strong>Full Name:</strong> {resetUser?.name}</Typography>
                <Typography variant="body2"><strong>Role:</strong> {resetUser?.role}</Typography>
              </Box>
              <TextField
                fullWidth
                label="New Password"
                type="text"
                value={DEFAULT_PASSWORD}
                disabled
                size="small"
                InputProps={{ readOnly: true }}
                helperText={`Password is fixed to: ${DEFAULT_PASSWORD}`}
              />
              <Alert severity="info">
                Password will be reset to: <strong>{DEFAULT_PASSWORD}</strong>
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setResetPasswordOpen(false)} variant="outlined" sx={{ borderColor: "#666", color: "#666" }}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} variant="contained" sx={{ bgcolor: "#DAA520", "&:hover": { bgcolor: "#b8860b" } }}>
              Reset Password
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Typography variant="h6" color="error">Confirm Delete</Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ py: 2 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Are you sure you want to delete this user?
              </Alert>
              <Box sx={{ p: 2, bgcolor: "#f5f5f5", borderRadius: 2 }}>
                <Typography variant="body2"><strong>Username:</strong> {deleteUser?.username}</Typography>
                <Typography variant="body2"><strong>Full Name:</strong> {deleteUser?.name}</Typography>
                <Typography variant="body2"><strong>Role:</strong> {deleteUser?.role}</Typography>
              </Box>
              <Typography variant="caption" color="error" sx={{ display: "block", mt: 2 }}>
                This action cannot be undone!
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined" sx={{ borderColor: "#666", color: "#666" }}>
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="contained" color="error">
              Delete User
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default AdminManagement;