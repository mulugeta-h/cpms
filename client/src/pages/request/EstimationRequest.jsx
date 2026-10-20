// pages/EstimationRequest.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  Snackbar,
  Alert,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  useMediaQuery,
  useTheme,
  TablePagination,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Slide,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  Engineering as EngineeringIcon,
  Place as PlaceIcon,
  Business as BusinessIcon,
  Event as EventIcon,
  HomeWork as HomeWorkIcon,
  Gavel as GavelIcon,
  Apartment as ApartmentIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const API_URL = `${import.meta.env.VITE_API_URL}/api/estimation-requests`;
const USERS_URL = `${import.meta.env.VITE_API_URL}/api/estimation-requests/getUsers`;

const PURPOSE_OPTIONS = ["Guarantee", "Foreclosure", "Loan"];

const TYPE_OPTIONS = [
  "Villa House & Service Quarter",
  "Condominium/Apartment House",
  "Multi Story Building (G+1 & Above)",
  "Multi Store",
  "Fuel Station",
  "Coffee Wash / Cattle Fattening",
  "Other"
];

const EMPTY_REQUEST = {
  requestingOrgan: "",
  requestDate: new Date().toISOString().split("T")[0],
  applicantName: "",
  propertyOwner: "",
  propertyAddress: "",
  purposeOfValuation: "",
  typeOfProperty: "",
  assignedBy: "",
  assignedTo: "",
  status: "In Progress",
};

const STATUS_OPTIONS = ["In Progress", "Completed", "Rejected"];

const STATUS_COLORS = {
  "In Progress": "info",
  Completed: "success",
  Rejected: "error",
  Cancelled: "default",
  Pending: "warning",
};

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const yellowButton = {
  background: "#FFD600",
  color: "#000000",
  fontWeight: "bold",
  "&:hover": {
    background: "#ffcc00",
    boxShadow: "0 4px 12px rgba(255, 214, 0, 0.5)",
  },
};

const FIELD_HEIGHT = 40;

const lightStyles = {
  paper: {
    bgcolor: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    color: "#000000",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
  },
  dialogPaper: {
    bgcolor: "#ffffff",
    border: "1px solid #FFD600",
    color: "#000000",
    borderRadius: "12px",
  },
  input: {
    "& .MuiOutlinedInput-root": {
      color: "#000000",
      backgroundColor: "#ffffff",
      minHeight: FIELD_HEIGHT,
      "& fieldset": { borderColor: "#e0e0e0" },
      "&:hover fieldset": { borderColor: "#FFD600" },
      "&.Mui-focused fieldset": { borderColor: "#FFD600" },
    },
    "& .MuiOutlinedInput-input": {
      padding: "8.5px 12px",
    },
    "& .MuiInputLabel-root": { color: "#666666" },
    "& .MuiSelect-icon": { color: "#FFD600" },
    "& .MuiSelect-select": {
      padding: "8.5px 12px",
      display: "flex",
      alignItems: "center",
    },
  },
  tableHeader: {
    color: "#000000",
    fontWeight: "bold",
    borderBottom: "2px solid #FFD600",
    backgroundColor: "#f5f5f5",
    position: "sticky",
    top: 0,
    zIndex: 2,
    whiteSpace: "nowrap",
  },
  tableCell: {
    color: "#000000",
    borderBottom: "1px solid #e0e0e0",
    whiteSpace: "nowrap",
  },
  actionBtn: {
    background: "#FFD600",
    color: "#000000",
    fontWeight: "bold",
    "&:hover": {
      background: "#ffcc00",
      boxShadow: "0 0 15px #FFD600",
    },
  },
  yellowBorder: {
    borderColor: "#FFD600",
    "&:hover": {
      borderColor: "#ffcc00",
      backgroundColor: "rgba(255, 214, 0, 0.1)",
    },
  },
  dialogContent: { px: 3, py: 2.5 },
  dialogActions: {
    px: 3,
    py: 2,
    borderTop: "1px solid #eee",
    gap: 1,
  },
};

const scrollbarStyles = {
  "&::-webkit-scrollbar": { width: "8px", height: "8px" },
  "&::-webkit-scrollbar-track": {
    backgroundColor: "#f1f1f1",
    borderRadius: "4px",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "#DAA520",
    borderRadius: "4px",
    "&:hover": { backgroundColor: "#b8860b" },
  },
};

// =====================================================
// Reusable Select value row (icon + text + placeholder)
// =====================================================
const SelectValueRow = ({ icon, text, placeholder }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    <Box
      component="span"
      sx={{ display: "inline-flex", alignItems: "center", color: "#FFD600" }}
    >
      {icon}
    </Box>
    {text ? (
      <span>{text}</span>
    ) : (
      <em style={{ color: "#999" }}>{placeholder}</em>
    )}
  </Box>
);

// Icon for a given status
const statusIcon = (status, fontSize = 18) => {
  switch (status) {
    case "Completed":
      return <CheckCircleIcon sx={{ fontSize, color: "#4caf50" }} />;
    case "Rejected":
      return <CancelIcon sx={{ fontSize, color: "#f44336" }} />;
    case "Cancelled":
      return <CancelIcon sx={{ fontSize, color: "#ff9800" }} />;
    case "In Progress":
      return <PendingIcon sx={{ fontSize, color: "#2196f3" }} />;
    case "Pending":
      return <PendingIcon sx={{ fontSize, color: "#ff9800" }} />;
    default:
      return <PendingIcon sx={{ fontSize, color: "#FFD600" }} />;
  }
};

const EstimationRequest = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const getLoggedInUserFromToken = useCallback(() => {
    try {
      if (!token) return null;
      const decoded = jwtDecode(token);
      const userData = decoded.user || decoded;
      return {
        id: userData.id || userData._id || userData.sub,
        name: userData.name || userData.fullName || userData.username,
        username: userData.username || userData.name,
        role: userData.role || userData.userRole,
        email: userData.email,
        fullName: userData.fullName || userData.name,
      };
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  }, [token]);

  const loggedInUser = getLoggedInUserFromToken();

  const getLoggedInDisplayName = useCallback(
    () =>
      loggedInUser?.fullName ||
      loggedInUser?.name ||
      loggedInUser?.username ||
      "",
    [loggedInUser]
  );

  const [requests, setRequests] = useState([]);
  const [newRequest, setNewRequest] = useState({
    ...EMPTY_REQUEST,
    assignedBy: getLoggedInDisplayName(),
  });
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [users, setUsers] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [statusUpdateDialogOpen, setStatusUpdateDialogOpen] = useState(false);
  const [statusUpdateRecord, setStatusUpdateRecord] = useState(null);
  const [newStatusValue, setNewStatusValue] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [statusFilter, setStatusFilter] = useState("In Progress");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const showSnackbar = (msg, severity = "success") =>
    setSnackbar({ open: true, message: msg, severity });

  /* ---------------- Fetch users ---------------- */
  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(USERS_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let userList = [];
      if (res.data?.data && Array.isArray(res.data.data)) {
        userList = res.data.data;
      } else if (res.data?.users && Array.isArray(res.data.users)) {
        userList = res.data.users;
      } else if (Array.isArray(res.data)) {
        userList = res.data;
      } else if (res.data && typeof res.data === "object") {
        const foundArray = Object.values(res.data).find((v) =>
          Array.isArray(v)
        );
        if (foundArray) userList = foundArray;
      }

      setUsers(userList.filter((u) => u && u.username));
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setUsers([]);
    }
  }, [token]);

  /* ---------------- Fetch requests ---------------- */
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      showSnackbar("Failed to fetch estimation requests", "error");
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    (async () => {
      await fetchUsers();
      await fetchRequests();
    })();
  }, [fetchUsers, fetchRequests]);

  /* ---------------- Form handlers ---------------- */
  const handleRequestChange = (e) => {
    const { name, value } = e.target;
    setNewRequest((prev) => ({ ...prev, [name]: value }));
  };

  const saveRequest = async () => {
    if (
      !newRequest.requestingOrgan ||
      !newRequest.applicantName ||
      !newRequest.propertyOwner ||
      !newRequest.propertyAddress
    ) {
      return showSnackbar(
        "Required fields missing: requestingOrgan, applicantName, propertyOwner, propertyAddress",
        "error"
      );
    }

    try {
      setLoading(true);

      const requestData = {
        requestingOrgan: newRequest.requestingOrgan,
        requestDate: newRequest.requestDate
          ? new Date(newRequest.requestDate)
          : new Date(),
        applicantName: newRequest.applicantName,
        propertyOwner: newRequest.propertyOwner,
        propertyAddress: newRequest.propertyAddress,
        purposeOfValuation:
          newRequest.purposeOfValuation || "not described",
        typeOfProperty: newRequest.typeOfProperty || "not described",
        assignedBy: getLoggedInDisplayName(),
        assignedTo: newRequest.assignedTo || "",
        status: editId ? newRequest.status : "In Progress",
      };

      let response;
      if (editId) {
        response = await axios.put(`${API_URL}/${editId}`, requestData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showSnackbar(response.data.message || "Request updated successfully");
      } else {
        response = await axios.post(API_URL, requestData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showSnackbar(response.data.message || "Request created successfully");
      }

      setFormOpen(false);
      setEditId(null);
      setNewRequest({
        ...EMPTY_REQUEST,
        assignedBy: getLoggedInDisplayName(),
      });
      fetchRequests();
    } catch (err) {
      const serverMsg = err.response?.data?.message || "Operation Failed";
      showSnackbar(serverMsg, "error");
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Status update ---------------- */
  const handleStatusUpdateClick = (record) => {
    setStatusUpdateRecord(record);
    setNewStatusValue(record.status || "In Progress");
    setStatusUpdateDialogOpen(true);
  };

  const handleConfirmStatusUpdate = async () => {
    if (!statusUpdateRecord) return;

    try {
      setLoading(true);
      const response = await axios.put(
        `${API_URL}/${statusUpdateRecord._id}`,
        { status: newStatusValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showSnackbar(
        response.data.message || `Status updated to ${newStatusValue}`,
        "success"
      );
      fetchRequests();
      setStatusUpdateDialogOpen(false);
      setStatusUpdateRecord(null);
    } catch (err) {
      showSnackbar(
        err.response?.data?.message || "Failed to update status",
        "error"
      );
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdateDialogClose = () => {
    setStatusUpdateDialogOpen(false);
    setStatusUpdateRecord(null);
    setNewStatusValue("");
  };

  /* ---------------- Delete ---------------- */
  const handleDeleteClick = (record) => {
    setSelectedRecord(record);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setSelectedRecord(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRecord) return;

    try {
      const res = await axios.delete(`${API_URL}/${selectedRecord._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showSnackbar(
        res.data.message || "Request deleted successfully",
        "warning"
      );
      fetchRequests();
    } catch (err) {
      showSnackbar(err.response?.data?.message || "Delete Failed", "error");
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      handleDeleteDialogClose();
    }
  };

  /* ---------------- Filter + paginate ---------------- */
  const filteredRequests = useMemo(() => {
    let filtered = requests;

    if (statusFilter && statusFilter !== "All Statuses") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((r) =>
        Object.values(r).some((val) =>
          String(val).toLowerCase().includes(searchLower)
        )
      );
    }

    return filtered;
  }, [requests, searchTerm, statusFilter]);

  const paginatedRequests = useMemo(
    () =>
      filteredRequests.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [filteredRequests, page, rowsPerPage]
  );

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /* ---------------- Helpers ---------------- */
  const getTableHeight = () => {
    const availableHeight = window.innerHeight - (isMobile ? 360 : 300);
    return `${Math.max(availableHeight, 400)}px`;
  };

  const getStatusColor = (status) => STATUS_COLORS[status] || "default";

  const handleEditRequest = (request) => {
    const formattedRequest = {
      ...request,
      requestDate: request.requestDate
        ? new Date(request.requestDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    };
    setEditId(request._id);
    setNewRequest(formattedRequest);
    setFormOpen(true);
  };

  const handleCreateRequest = () => {
    setEditId(null);
    setNewRequest({
      ...EMPTY_REQUEST,
      assignedBy: getLoggedInDisplayName(),
    });
    setFormOpen(true);
  };

  const getUserFullName = (user) => {
    if (!user) return "";
    return user.fullName || user.name || user.username || user.email || "";
  };

  const getAssignedToDisplay = (assignedTo) => {
    if (!assignedTo) return "Unassigned";

    const user = users.find(
      (u) => u.username === assignedTo || u._id === assignedTo
    );

    return user ? getUserFullName(user) || user.username : assignedTo;
  };

  /* ---------------- Status chip ---------------- */
  const renderStatusChip = (record) => {
    const status = record.status || "In Progress";
    return (
      <Chip
        label={status}
        color={getStatusColor(status)}
        size="small"
        sx={{
          fontWeight: "bold",
          cursor: "pointer",
          "&:hover": {
            opacity: 0.8,
            transform: "scale(1.05)",
            transition: "all 0.2s",
          },
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleStatusUpdateClick(record);
        }}
        icon={
          status === "Completed" ? (
            <CheckCircleIcon />
          ) : status === "Rejected" || status === "Cancelled" ? (
            <CancelIcon />
          ) : (
            <PendingIcon />
          )
        }
      />
    );
  };

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f5f5f5",
        py: isMobile ? 1 : 2,
        width: "100%",
        maxWidth: "100%",
      }}
    >
      <Box sx={{ width: "100%", px: { xs: 1, sm: 1, md: 0.5 } }}>
        {/* --- SEARCH & FILTER BAR --- */}
        <Paper
          sx={{
            p: 1.5,
            mb: 2,
            ...lightStyles.paper,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ flexGrow: 1, flexWrap: "wrap" }}
          >
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={lightStyles.actionBtn}
              onClick={handleCreateRequest}
            >
              New Request
            </Button>

            <TextField
              placeholder="🔍 Universal search..."
              size="small"
              sx={{
                ...lightStyles.input,
                minWidth: isMobile ? "100%" : "400px",
                flexGrow: 1,
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#FFD600" }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchTerm("")}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <IconButton
              onClick={() => {
                fetchRequests();
                showSnackbar("✅ Table updated", "success");
              }}
              sx={{
                ...yellowButton,
                background: "transparent",
                border: "1px solid #FFD600",
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>

            {/* Status filter — icon inside the value */}
            <FormControl
              size="small"
              sx={{ minWidth: isMobile ? "100%" : "180px" }}
            >
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
                sx={lightStyles.input}
                renderValue={(selected) => (
                  <SelectValueRow
                    icon={<FilterListIcon sx={{ fontSize: 18 }} />}
                    text={selected}
                    placeholder="Select status…"
                  />
                )}
              >
                <MenuItem value="All Statuses">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FilterListIcon
                      fontSize="small"
                      sx={{ color: "#FFD600" }}
                    />
                    <Typography>All Statuses</Typography>
                  </Stack>
                </MenuItem>
                {STATUS_OPTIONS.map((status) => (
                  <MenuItem key={status} value={status}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {statusIcon(status, 18)}
                      <Typography>{status}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              variant="caption"
              sx={{
                color: "#000000",
                fontWeight: "bold",
                border: "1px solid #e0e0e0",
                px: 1.5,
                py: 0.5,
                borderRadius: "4px",
                bgcolor: "rgba(255,214,0,0.05)",
              }}
            >
              {filteredRequests.length} records
            </Typography>
          </Stack>
        </Paper>

        {/* --- DATA TABLE --- */}
        <Paper
          sx={{
            borderRadius: "8px",
            overflow: "hidden",
            border: "1px solid #e0e0e0",
          }}
        >
          <TableContainer
            sx={{
              height: getTableHeight(),
              maxHeight: getTableHeight(),
              overflow: "auto",
              ...scrollbarStyles,
            }}
          >
            {loading ? (
              <Box p={10} textAlign="center">
                <CircularProgress sx={{ color: "#FFD600" }} />
              </Box>
            ) : (
              <Table
                size="small"
                stickyHeader
                sx={{
                  minWidth: 1300,
                  width: "100%",
                  "& .MuiTableCell-root": {
                    whiteSpace: "nowrap",
                    padding: "10px 12px",
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    {[
                      "#",
                      "Estimation ID",
                      "Requesting Organ",
                      "Request Date",
                      "Applicant Name",
                      "Property Owner",
                      "Property Address",
                      "Purpose",
                      "Type",
                      "Assigned By",
                      "Assigned To",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <TableCell key={h} sx={lightStyles.tableHeader}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginatedRequests.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={13}
                        sx={{ textAlign: "center", py: 4, color: "#666" }}
                      >
                        No estimation requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRequests.map((r, i) => (
                      <TableRow
                        key={r._id}
                        onClick={() =>
                          setSelectedRowId(
                            selectedRowId === r._id ? null : r._id
                          )
                        }
                        sx={{
                          cursor: "pointer",
                          backgroundColor:
                            selectedRowId === r._id
                              ? "#a5d6a7f3"          // selected — soft green
                              : "transparent",
                          "&:hover": {
                            bgcolor:
                              selectedRowId === r._id
                                ? "#66bb6a"          // selected + hover — deeper green
                                : "rgba(76, 175, 80, 0.12)", // unselected hover — faint green
                          },
                          transition: "background-color 0.2s ease",
                        }}
                      >
                        <TableCell sx={lightStyles.tableCell}>
                          {page * rowsPerPage + i + 1}
                        </TableCell>

                        <TableCell
                          sx={{
                            ...lightStyles.tableCell,
                            fontWeight: "bold",
                            color: "#242321",
                          }}
                        >
                          {r.estimationId}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                          >
                            <PersonIcon
                              fontSize="small"
                              sx={{ color: "#FFD600" }}
                            />
                            <Typography variant="body2">
                              {r.requestingOrgan || "—"}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.requestDate
                            ? new Date(r.requestDate).toLocaleDateString()
                            : "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                          >
                            <PersonIcon
                              fontSize="small"
                              sx={{ color: "#FFD600" }}
                            />
                            <Typography variant="body2">
                              {r.applicantName || "—"}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                          >
                            <PersonIcon
                              fontSize="small"
                              sx={{ color: "#FFD600" }}
                            />
                            <Typography variant="body2">
                              {r.propertyOwner || "—"}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          <Tooltip title={r.propertyAddress || "—"}>
                            <Stack
                              direction="row"
                              spacing={0.5}
                              alignItems="center"
                            >
                              <PlaceIcon
                                fontSize="small"
                                sx={{ color: "#FFD600" }}
                              />
                              <Typography
                                variant="body2"
                                sx={{
                                  maxWidth: 150,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {r.propertyAddress || "—"}
                              </Typography>
                            </Stack>
                          </Tooltip>
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          <Tooltip
                            title={r.purposeOfValuation || "Not described"}
                          >
                            <Stack
                              direction="row"
                              spacing={0.5}
                              alignItems="center"
                            >
                              <GavelIcon
                                fontSize="small"
                                sx={{ color: "#FFD600" }}
                              />
                              <Typography
                                variant="body2"
                                sx={{
                                  maxWidth: 120,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {r.purposeOfValuation || "Not described"}
                              </Typography>
                            </Stack>
                          </Tooltip>
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          <Tooltip
                            title={r.typeOfProperty || "Not described"}
                          >
                            <Stack
                              direction="row"
                              spacing={0.5}
                              alignItems="center"
                            >
                              <ApartmentIcon
                                fontSize="small"
                                sx={{ color: "#FFD600" }}
                              />
                              <Typography
                                variant="body2"
                                sx={{
                                  maxWidth: 240,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {r.typeOfProperty || "Not described"}
                              </Typography>
                            </Stack>
                          </Tooltip>
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.assignedBy || "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          <Tooltip
                            title={
                              r.assignedTo
                                ? `Username: ${r.assignedTo}`
                                : "Unassigned"
                            }
                          >
                            <Stack
                              direction="row"
                              spacing={0.5}
                              alignItems="center"
                            >
                              <EngineeringIcon
                                fontSize="small"
                                sx={{ color: "#FFD600" }}
                              />
                              <Typography variant="body2">
                                {getAssignedToDisplay(r.assignedTo)}
                              </Typography>
                            </Stack>
                          </Tooltip>
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {renderStatusChip(r)}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          <IconButton
                            size="small"
                            sx={{
                              color: "#000000",
                              "&:hover": {
                                bgcolor: "#FFD600",
                                color: "#000000",
                              },
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditRequest(r);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            sx={{
                              color: "#ff4444",
                              "&:hover": {
                                bgcolor: "#ff0000",
                                color: "#ffffff",
                              },
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(r);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filteredRequests.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              color: "#000000",
              borderTop: "1px solid #e0e0e0",
              bgcolor: "#ffffff",
              "& .MuiTablePagination-selectIcon": { color: "#FFD600" },
              "& .MuiIconButton-root": { color: "#FFD600" },
            }}
          />
        </Paper>

        {/* --- CREATE/EDIT DIALOG --- */}
        <Dialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          TransitionComponent={Transition}
          fullWidth
          maxWidth="md"
          PaperProps={{
            sx: {
              ...lightStyles.dialogPaper,
              borderRadius: "12px",
              width: { xs: "95%", sm: "640px" },
              margin: "auto",
              overflowX: "hidden",
            },
          }}
        >
          <DialogTitle
            sx={{
              bgcolor: "#fafafa",
              color: "#000000",
              fontWeight: "900",
              borderBottom: "1px solid #eee",
              py: 1.5,
              px: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" fontWeight="900">
              {editId !== null
                ? "EDIT ESTIMATION REQUEST"
                : "CREATE ESTIMATION REQUEST"}
            </Typography>
            <IconButton
              onClick={() => setFormOpen(false)}
              size="small"
              sx={{
                color: "#999",
                transition: "0.2s",
                "&:hover": {
                  color: "#ff0000",
                  backgroundColor: "rgba(255, 0, 0, 0.05)",
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent
            sx={{
              ...lightStyles.dialogContent,
              pt: 2.5,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2.5,
              overflowX: "hidden",
            }}
          >
            {/* Requesting Organ */}
            <TextField
              fullWidth
              label="Requesting Organ *"
              name="requestingOrgan"
              size="small"
              sx={{ ...lightStyles.input, mt: 2.5 }}
              value={newRequest.requestingOrgan}
              onChange={handleRequestChange}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: "#FFD600" }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Request Date */}
            <TextField
              fullWidth
              label="Request Date"
              name="requestDate"
              type="date"
              size="small"
              sx={{ ...lightStyles.input, mt: 2.5 }}
              value={newRequest.requestDate}
              onChange={handleRequestChange}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EventIcon sx={{ color: "#FFD600" }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Applicant Name */}
            <TextField
              fullWidth
              label="Applicant Name *"
              name="applicantName"
              size="small"
              sx={lightStyles.input}
              value={newRequest.applicantName}
              onChange={handleRequestChange}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: "#FFD600" }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Property Owner */}
            <TextField
              fullWidth
              label="Property Owner *"
              name="propertyOwner"
              size="small"
              sx={lightStyles.input}
              value={newRequest.propertyOwner}
              onChange={handleRequestChange}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: "#FFD600" }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Property Address */}
            <TextField
              fullWidth
              label="Property Address *"
              name="propertyAddress"
              size="small"
              sx={lightStyles.input}
              value={newRequest.propertyAddress}
              onChange={handleRequestChange}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PlaceIcon sx={{ color: "#FFD600" }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Purpose of Valuation */}
            <FormControl fullWidth size="small" sx={lightStyles.input}>
              <InputLabel id="purpose-of-valuation-label">
                Purpose of Valuation
              </InputLabel>
              <Select
                labelId="purpose-of-valuation-label"
                label="Purpose of Valuation"
                value={newRequest.purposeOfValuation || ""}
                onChange={(e) =>
                  setNewRequest((prev) => ({
                    ...prev,
                    purposeOfValuation: e.target.value || "",
                  }))
                }
                sx={lightStyles.input}
                renderValue={(selected) => (
                  <SelectValueRow
                    icon={<GavelIcon sx={{ fontSize: 18 }} />}
                    text={selected}
                    placeholder="Select purpose…"
                  />
                )}
              >
                {PURPOSE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <GavelIcon
                        fontSize="small"
                        sx={{ color: "#FFD600" }}
                      />
                      <Typography>{option}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Type of Property */}
            <FormControl fullWidth size="small" sx={lightStyles.input}>
              <InputLabel id="type-of-property-label">
                Type of Property
              </InputLabel>
              <Select
                labelId="type-of-property-label"
                label="Type of Property"
                value={newRequest.typeOfProperty || ""}
                onChange={(e) =>
                  setNewRequest((prev) => ({
                    ...prev,
                    typeOfProperty: e.target.value || "",
                  }))
                }
                sx={lightStyles.input}
                renderValue={(selected) => (
                  <SelectValueRow
                    icon={<ApartmentIcon sx={{ fontSize: 18 }} />}
                    text={selected}
                    placeholder="Select property type…"
                  />
                )}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 320,
                      "& .MuiMenuItem-root": { fontSize: "0.9rem" },
                    },
                  },
                }}
              >
                {TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ApartmentIcon
                        fontSize="small"
                        sx={{ color: "#FFD600" }}
                      />
                      <Typography>{option}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Assigned By (disabled) */}
            <TextField
              fullWidth
              label="Assigned By"
              name="assignedBy"
              size="small"
              sx={{
                ...lightStyles.input,
                "& .MuiOutlinedInput-root": {
                  ...lightStyles.input["& .MuiOutlinedInput-root"],
                  backgroundColor: "#f5f5f5",
                },
              }}
              value={getLoggedInDisplayName()}
              disabled
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: "#FFD600" }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Assigned To */}
            <FormControl fullWidth size="small" sx={lightStyles.input}>
              <InputLabel id="assigned-to-label">Assigned To</InputLabel>
              <Select
                labelId="assigned-to-label"
                name="assignedTo"
                value={newRequest.assignedTo || ""}
                onChange={handleRequestChange}
                label="Assigned To"
                sx={lightStyles.input}
                renderValue={(selected) => {
                  if (!selected) {
                    return (
                      <SelectValueRow
                        icon={<EngineeringIcon sx={{ fontSize: 18 }} />}
                        text=""
                        placeholder="Unassigned"
                      />
                    );
                  }
                  const u = users.find(
                    (x) => x.username === selected || x._id === selected
                  );
                  return (
                    <SelectValueRow
                      icon={<EngineeringIcon sx={{ fontSize: 18 }} />}
                      text={u ? getUserFullName(u) || u.username : selected}
                      placeholder="Unassigned"
                    />
                  );
                }}
                MenuProps={{
                  PaperProps: { sx: { maxHeight: 320 } },
                }}
              >
                <MenuItem value="">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <EngineeringIcon
                      fontSize="small"
                      sx={{ color: "#bdbdbd" }}
                    />
                    <em>Unassigned</em>
                  </Stack>
                </MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.username} value={user.username}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <EngineeringIcon
                        fontSize="small"
                        sx={{ color: "#FFD600" }}
                      />
                      <Stack direction="column" spacing={0}>
                        <Typography variant="body2">
                          {user.username}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: "0.7rem" }}
                        >
                          {getUserFullName(user) || user.username}
                        </Typography>
                      </Stack>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Status (edit-only) */}
            {editId && (
              <FormControl fullWidth size="small" sx={lightStyles.input}>
                <InputLabel id="status-edit-label">Status</InputLabel>
                <Select
                  labelId="status-edit-label"
                  name="status"
                  value={newRequest.status}
                  onChange={handleRequestChange}
                  label="Status"
                  sx={lightStyles.input}
                  renderValue={(selected) => (
                    <SelectValueRow
                      icon={statusIcon(selected, 18)}
                      text={selected}
                      placeholder="Select status…"
                    />
                  )}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status} value={status}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {statusIcon(status, 18)}
                        <Typography>{status}</Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </DialogContent>

          <DialogActions
            sx={{ p: 2, borderTop: "1px solid #eee", bgcolor: "#fafafa" }}
          >
            <Button
              onClick={() => setFormOpen(false)}
              sx={{
                color: "#888",
                fontWeight: "bold",
                textTransform: "none",
                "&:hover": { color: "#444" },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={saveRequest}
              disabled={loading}
              sx={{
                ...lightStyles.actionBtn,
                px: 4,
                fontWeight: "bold",
                textTransform: "none",
                boxShadow: "none",
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : editId !== null ? (
                "Update Request"
              ) : (
                "Create Request"
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* --- STATUS UPDATE DIALOG --- */}
        <Dialog
          open={statusUpdateDialogOpen}
          onClose={handleStatusUpdateDialogClose}
          TransitionComponent={Transition}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: "12px" } }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              px: 3,
              py: 2.5,
            }}
          >
            <PendingIcon sx={{ color: "#FFD600", fontSize: 32 }} />
            <Typography variant="h6">Update Status</Typography>
          </DialogTitle>
          <DialogContent dividers sx={lightStyles.dialogContent}>
            <Typography variant="body1" gutterBottom>
              Change the status of this estimation request:
            </Typography>
            {statusUpdateRecord && (
              <Box
                sx={{
                  mt: 2.5,
                  mb: 2.5,
                  p: 2,
                  bgcolor: "#fff8e1",
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Estimation ID:{" "}
                  <strong>{statusUpdateRecord.estimationId}</strong>
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Applicant:{" "}
                  <strong>{statusUpdateRecord.applicantName}</strong>
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Current Status:{" "}
                  <Chip
                    label={statusUpdateRecord.status}
                    color={getStatusColor(statusUpdateRecord.status)}
                    size="small"
                  />
                </Typography>
              </Box>
            )}
            <FormControl
              fullWidth
              size="small"
              sx={{
                mt: statusUpdateRecord ? 0 : 2.5,
                ...lightStyles.input,
              }}
            >
              <InputLabel id="new-status-label">New Status</InputLabel>
              <Select
                labelId="new-status-label"
                value={newStatusValue}
                onChange={(e) => setNewStatusValue(e.target.value)}
                label="New Status"
                sx={lightStyles.input}
                renderValue={(selected) => (
                  <SelectValueRow
                    icon={statusIcon(selected, 18)}
                    text={selected}
                    placeholder="Select status…"
                  />
                )}
              >
                {STATUS_OPTIONS.map((status) => (
                  <MenuItem key={status} value={status}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                    >
                      {statusIcon(status, 18)}
                      <Typography>{status}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Alert severity="info" sx={{ mt: 2.5 }}>
              Changing the status will update the request's progress tracking.
            </Alert>
          </DialogContent>
          <DialogActions sx={lightStyles.dialogActions}>
            <Button
              onClick={handleStatusUpdateDialogClose}
              variant="outlined"
              sx={{ borderColor: "#666", color: "#666" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmStatusUpdate}
              variant="contained"
              disabled={
                loading || newStatusValue === statusUpdateRecord?.status
              }
              sx={{
                bgcolor: "#FFD600",
                color: "#000000",
                fontWeight: "bold",
                "&:hover": { bgcolor: "#ffcc00" },
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Update Status"
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* --- DELETE CONFIRMATION DIALOG --- */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteDialogClose}
          TransitionComponent={Transition}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: "12px" } }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              px: 3,
              py: 2.5,
            }}
          >
            <WarningIcon sx={{ color: "#f44336", fontSize: 32 }} />
            <Typography variant="h6">Confirm Delete</Typography>
          </DialogTitle>
          <DialogContent dividers sx={lightStyles.dialogContent}>
            <Typography variant="body1" gutterBottom>
              Are you sure you want to delete this estimation request?
            </Typography>
            {selectedRecord && (
              <Box
                sx={{
                  mt: 2.5,
                  mb: 2.5,
                  p: 2,
                  bgcolor: "#fff8e1",
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Estimation ID:{" "}
                  <strong>{selectedRecord.estimationId}</strong>
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Applicant: <strong>{selectedRecord.applicantName}</strong>
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Status:{" "}
                  <Chip
                    label={selectedRecord.status}
                    color={getStatusColor(selectedRecord.status)}
                    size="small"
                  />
                </Typography>
              </Box>
            )}
            <Alert severity="warning" sx={{ mt: selectedRecord ? 0 : 2.5 }}>
              This action cannot be undone. All data associated with this
              request will be permanently deleted.
            </Alert>
          </DialogContent>
          <DialogActions sx={lightStyles.dialogActions}>
            <Button
              onClick={handleDeleteDialogClose}
              variant="outlined"
              sx={{ borderColor: "#666", color: "#666" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              variant="contained"
              color="error"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* --- SNACKBAR --- */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            severity={snackbar.severity}
            sx={{
              bgcolor: "#ffffff",
              color: "#000000",
              border: "1px solid #FFD600",
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default EstimationRequest;