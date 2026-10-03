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
  Grid,
  Pagination,
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
  History as HistoryIcon,
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon,
  Person as UserIcon,
} from "@mui/icons-material";
import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL}/api/super-admin`;

const AdminManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "12345678",
    enabled: true,
    role: "ADMIN",
  });
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Password reset dialog
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  
  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success"
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const getContainerMargin = () => {
    if (isMobile) return "0px";
    return "4px";
  };

  const getContainerWidth = () => {
    if (isMobile) return "100%";
    return "calc(100% - 4px)";
  };

  // Get current user from token
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

  // Check if user is SUPER_ADMIN
  const isSuperAdmin = (user) => {
    return user?.role === "SUPER_ADMIN";
  };

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      
      const response = await axios.get(
        `${API_URL}/users`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
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

  // Handle search
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.username?.toLowerCase().includes(search) ||
      user.name?.toLowerCase().includes(search) ||
      user.role?.toLowerCase().includes(search)
    );
  });

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle form input change
  const handleFormChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "enabled" ? checked : value
    }));
  };

  // Open create dialog
  const handleOpenCreate = () => {
    setDialogMode("create");
    setFormData({
      name: "",
      username: "",
      password: "12345678",
      enabled: true,
      role: "ADMIN",
    });
    setSelectedUser(null);
    setDialogOpen(true);
  };

  // Open edit dialog
  const handleOpenEdit = (user) => {
    // If editing SUPER_ADMIN and current user is not the same SUPER_ADMIN
    if (isSuperAdmin(user) && currentUser?.id !== user._id) {
      setSnackbar({
        open: true,
        message: "Cannot edit other SUPER_ADMIN accounts",
        severity: "warning"
      });
      return;
    }
    
    setDialogMode("edit");
    setFormData({
      name: user.name || "",
      username: user.username || "",
      enabled: user.enabled !== undefined ? user.enabled : true,
      role: user.role || "ADMIN",
    });
    setSelectedUser(user);
    setDialogOpen(true);
  };

  // Close dialog
  const handleDialogClose = () => {
    setDialogOpen(false);
    setFormData({
      name: "",
      username: "",
      password: "12345678",
      enabled: true,
      role: "ADMIN",
    });
    setSelectedUser(null);
  };

  // Submit form (create/update)
  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      
      if (dialogMode === "create") {
        if (!formData.name || !formData.username) {
          setSnackbar({
            open: true,
            message: "Full name and username are required",
            severity: "error"
          });
          return;
        }
        
        const passwordToSend = "12345678";
        
        await axios.post(
          `${API_URL}/create-user`,
          {
            name: formData.name,
            username: formData.username,
            password: passwordToSend,
            role: formData.role,
            enabled: formData.enabled,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setSnackbar({
          open: true,
          message: `User created successfully! Password: 12345678`,
          severity: "success"
        });
      } else {
        // Check if editing SUPER_ADMIN
        const isEditingSuperAdmin = isSuperAdmin(selectedUser);
        
        let updateData = {};
        
        if (isEditingSuperAdmin) {
          // SUPER_ADMIN can ONLY update name
          updateData = {
            name: formData.name,
          };
        } else {
          // Non-SUPER_ADMIN can update everything EXCEPT username
          updateData = {
            name: formData.name,
            // username is NOT included here - it cannot be updated
            enabled: formData.enabled,
            role: formData.role,
          };
        }
        
        await axios.put(
          `${API_URL}/user/${selectedUser._id}`,
          updateData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setSnackbar({
          open: true,
          message: isEditingSuperAdmin ? "Name updated successfully" : "User updated successfully",
          severity: "success"
        });
      }
      
      handleDialogClose();
      fetchUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.msg || "Failed to save user",
        severity: "error"
      });
    }
  };

  // Toggle user status
  const handleToggleStatus = async (user) => {
    if (isSuperAdmin(user)) {
      setSnackbar({
        open: true,
        message: "Cannot toggle status of SUPER_ADMIN accounts",
        severity: "warning"
      });
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/toggle-status/${user._id}`,
        { enabled: !user.enabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSnackbar({
        open: true,
        message: `User ${!user.enabled ? 'activated' : 'deactivated'} successfully`,
        severity: "success"
      });
      
      fetchUsers();
    } catch (error) {
      console.error("Error toggling status:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.msg || "Failed to toggle status",
        severity: "error"
      });
    }
  };

  // Open reset password dialog
  const handleOpenResetPassword = (user) => {
    if (isSuperAdmin(user)) {
      setSnackbar({
        open: true,
        message: "Cannot reset password for SUPER_ADMIN accounts",
        severity: "warning"
      });
      return;
    }
    
    setResetUser(user);
    setNewPassword("12345678");
    setResetPasswordOpen(true);
  };

  // Reset password
  const handleResetPassword = async () => {
    const passwordToSend = "12345678";

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/user/${resetUser._id}`,
        { password: passwordToSend },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSnackbar({
        open: true,
        message: `Password reset successfully to: 12345678`,
        severity: "success"
      });
      
      setResetPasswordOpen(false);
      setResetUser(null);
      setNewPassword("");
    } catch (error) {
      console.error("Error resetting password:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.msg || "Failed to reset password",
        severity: "error"
      });
    }
  };

  // Open delete dialog
  const handleOpenDelete = (user) => {
    if (isSuperAdmin(user)) {
      setSnackbar({
        open: true,
        message: "Cannot delete SUPER_ADMIN accounts",
        severity: "warning"
      });
      return;
    }
    
    setDeleteUser(user);
    setDeleteDialogOpen(true);
  };

  // Delete user
  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_URL}/user/${deleteUser._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSnackbar({
        open: true,
        message: "User deleted successfully",
        severity: "success"
      });
      
      setDeleteDialogOpen(false);
      setDeleteUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.msg || "Failed to delete user",
        severity: "error"
      });
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (users.length === 0) return;
    
    const headers = [
      "ID",
      "Username",
      "Full Name",
      "Role",
      "Status",
      "Created At"
    ];

    const rows = users.map(user => [
      user._id,
      user.username,
      user.name,
      user.role || "USER",
      user.enabled ? "Active" : "Disabled",
      user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get role chip
  const getRoleChip = (role) => {
    if (role === "SUPER_ADMIN") {
      return (
        <Chip 
          label="SUPER ADMIN" 
          color="error" 
          size="small" 
          icon={<SecurityIcon />}
          sx={{ fontWeight: 'bold' }}
        />
      );
    }
    if (role === "ADMIN") {
      return (
        <Chip 
          label="ADMIN" 
          color="primary" 
          size="small" 
          icon={<AdminIcon />}
        />
      );
    }
    return (
      <Chip 
        label="USER" 
        color="default" 
        size="small" 
        icon={<UserIcon />}
      />
    );
  };

  // Get status chip
  const getStatusChip = (enabled) => {
    if (enabled) {
      return <Chip label="Active" color="success" size="small" icon={<CheckCircleIcon />} />;
    }
    return <Chip label="Disabled" color="error" size="small" icon={<CancelIcon />} />;
  };

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
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3, 
          flexWrap: 'wrap', 
          gap: 2,
          bgcolor: '#fff',
          p: 2,
          borderRadius: 2,
          boxShadow: 1,
        }}>
          <Typography
            variant={isMobile ? "h6" : "h5"}
            fontWeight="bold"
            color="#DAA520"
            sx={{ whiteSpace: 'nowrap' }}
          >
            User Management
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
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
            
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              Total: {totalUsers}
            </Typography>
            
            <Tooltip title="Export CSV">
              <IconButton
                size="small"
                onClick={exportToCSV}
                disabled={users.length === 0}
                sx={{ color: "#DAA520" }}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            
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
            
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              size="small"
              sx={{ 
                bgcolor: "#DAA520", 
                '&:hover': { bgcolor: '#b8860b' },
                whiteSpace: 'nowrap',
                minWidth: 'auto',
              }}
            >
              Add User
            </Button>
          </Box>
        </Box>

        {/* Users Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: "#DAA520" }} />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography color="error">{error}</Typography>
            <Button onClick={fetchUsers} sx={{ mt: 2 }}>Retry</Button>
          </Paper>
        ) : users.length === 0 ? (
          <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h6" color="text.secondary">
              No users found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Click "Add User" to create a new user
            </Typography>
          </Paper>
        ) : (
          <>
            <TableContainer 
              component={Paper} 
              sx={{ 
                borderRadius: 2, 
                overflow: 'auto',
                maxHeight: '500px',
              }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 60 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 120 }}>Username</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 150 }}>Full Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 130 }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 100 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 150 }}>Created At</TableCell>
                    <TableCell sx={{ fontWeight: "bold", minWidth: 280, textAlign: 'center' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((user) => {
                      const isSuper = isSuperAdmin(user);
                      return (
                        <TableRow 
                          key={user._id}
                          sx={{ 
                            '&:hover': { bgcolor: '#fafafa' },
                            bgcolor: isSuper ? '#fff3e0' : (user.enabled ? 'inherit' : '#fff5f5')
                          }}
                        >
                          <TableCell>{user._id}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ 
                                width: 28, 
                                height: 28, 
                                bgcolor: isSuper ? '#f44336' : (user.role === 'ADMIN' ? '#1976d2' : '#757575')
                              }}>
                                {user.username?.charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography variant="body2">{user.username}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{getRoleChip(user.role)}</TableCell>
                          <TableCell>{getStatusChip(user.enabled)}</TableCell>
                          <TableCell>
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                              <Tooltip title={isSuper ? "SUPER_ADMIN cannot be toggled" : (user.enabled ? "Disable" : "Enable")}>
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleToggleStatus(user)}
                                    disabled={isSuper}
                                    sx={{ 
                                      color: isSuper ? '#999' : (user.enabled ? '#4caf50' : '#f44336'),
                                    }}
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
                                    sx={{ color: isSuper ? '#ff9800' : '#1976d2' }}
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
                                    sx={{ color: isSuper ? '#999' : '#ff9800' }}
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
                                    sx={{ color: isSuper ? '#999' : '#f44336' }}
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
                borderTop: '1px solid #e0e0e0',
                '& .MuiTablePagination-selectIcon': { color: '#DAA520' },
                '& .MuiIconButton-root': { color: '#DAA520' },
              }}
            />
          </>
        )}

        {/* Create/Edit Dialog */}
        <Dialog 
          open={dialogOpen} 
          onClose={handleDialogClose}
          maxWidth="sm"
          fullWidth
        >
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
              {/* Full Name - Always first and always editable */}
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
                // ═══════════════════════════════════════════════════════
                // SUPER_ADMIN Edit Mode - ONLY Full Name
                // Username, Role, Status are NOT editable - only showing info
                // ═══════════════════════════════════════════════════════
                <>
                  <Alert severity="info" sx={{ mt: 1 }}>
                    <strong>SUPER_ADMIN</strong> users can only update their <strong>Full Name</strong>.
                  </Alert>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
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
                // ═══════════════════════════════════════════════════════
                // ADMIN/USER Edit Mode - All fields editable EXCEPT username
                // ═══════════════════════════════════════════════════════
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
                    disabled  // <-- DISABLED/READ-ONLY when editing
                    InputProps={{
                      readOnly: true,
                    }}
                    helperText="Username cannot be changed"
                    sx={{
                      '& .MuiInputBase-input.Mui-disabled': {
                        WebkitTextFillColor: '#9e9e9e',
                      },
                    }}
                  />
                  
                  <TextField
                    fullWidth
                    select
                    label="Role"
                    name="role"
                    value={formData.role}
                    onChange={handleFormChange}
                    size="small"
                  >
                    <MenuItem value="ADMIN">ADMIN</MenuItem>
                    <MenuItem value="USER">USER</MenuItem>
                  </TextField>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        name="enabled"
                        checked={formData.enabled}
                        onChange={handleFormChange}
                        color="success"
                      />
                    }
                    label={formData.enabled ? "Enabled" : "Disabled"}
                  />
                </>
              ) : (
                // ═══════════════════════════════════════════════════════
                // CREATE Mode - All fields editable
                // ═══════════════════════════════════════════════════════
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
                  
                  <TextField
                    fullWidth
                    select
                    label="Role"
                    name="role"
                    value={formData.role}
                    onChange={handleFormChange}
                    size="small"
                  >
                    <MenuItem value="ADMIN">ADMIN</MenuItem>
                    <MenuItem value="USER">USER</MenuItem>
                  </TextField>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        name="enabled"
                        checked={formData.enabled}
                        onChange={handleFormChange}
                        color="success"
                      />
                    }
                    label={formData.enabled ? "Enabled" : "Disabled"}
                  />
                  
                  <TextField
                    fullWidth
                    label="Password"
                    name="password"
                    type="text"
                    value="12345678"
                    disabled
                    size="small"
                    InputProps={{
                      readOnly: true,
                    }}
                    helperText="Password is fixed to: 12345678"
                  />
                  <Alert severity="info" sx={{ mt: 1 }}>
                    <strong>Default Password:</strong> 12345678
                  </Alert>
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={handleDialogClose} variant="outlined" sx={{ borderColor: '#666', color: '#666' }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              sx={{ bgcolor: "#DAA520", '&:hover': { bgcolor: '#b8860b' } }}
            >
              {dialogMode === "create" ? "Create" : "Update"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog
          open={resetPasswordOpen}
          onClose={() => setResetPasswordOpen(false)}
          maxWidth="sm"
          fullWidth
        >
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
              <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
                <Typography variant="body2">
                  <strong>Username:</strong> {resetUser?.username}
                </Typography>
                <Typography variant="body2">
                  <strong>Full Name:</strong> {resetUser?.name}
                </Typography>
                <Typography variant="body2">
                  <strong>Role:</strong> {resetUser?.role}
                </Typography>
              </Box>
              <TextField
                fullWidth
                label="New Password"
                type="text"
                value="12345678"
                disabled
                size="small"
                InputProps={{
                  readOnly: true,
                }}
                helperText="Password is fixed to: 12345678"
              />
              <Alert severity="info">
                Password will be reset to: <strong>12345678</strong>
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setResetPasswordOpen(false)} variant="outlined" sx={{ borderColor: '#666', color: '#666' }}>
              Cancel
            </Button>
            <Button 
              onClick={handleResetPassword} 
              variant="contained"
              sx={{ bgcolor: "#ff9800", '&:hover': { bgcolor: '#f57c00' } }}
            >
              Reset Password
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6" color="error">Confirm Delete</Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ py: 2 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Are you sure you want to delete this user?
              </Alert>
              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="body2">
                  <strong>Username:</strong> {deleteUser?.username}
                </Typography>
                <Typography variant="body2">
                  <strong>Full Name:</strong> {deleteUser?.name}
                </Typography>
                <Typography variant="body2">
                  <strong>Role:</strong> {deleteUser?.role}
                </Typography>
              </Box>
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 2 }}>
                This action cannot be undone!
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined" sx={{ borderColor: '#666', color: '#666' }}>
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
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default AdminManagement;