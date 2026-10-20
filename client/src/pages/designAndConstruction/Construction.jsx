// pages/designAndConstruction/Construction.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from "react";
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
  InputAdornment,
  Slide,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Chip
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
  Construction as ConstructionIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as PendingIcon,
  Block as NotRequiredIcon
} from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const API_URL = `${import.meta.env.VITE_API_URL}/api/construction`;

/* ---------------- Construction field definitions ---------------- */
const CONSTRUCTION_FIELDS = [
  { key: "designWorkLayout", label: "Design Work Layout" },
  { key: "specificationWork", label: "Specification Work" },
  { key: "partitionWork", label: "Partition Work" },
  { key: "strongRoomPartition", label: "Strong Room Partition" },
  { key: "strongRoomDoor", label: "Strong Room Door" },
  { key: "sentryBoxPlace", label: "Sentry Box Place" },
  { key: "grilledAndSecurityWork", label: "Grilled & Security Work" },
  { key: "toiletRoomWork", label: "Toilet Room Work" },
  { key: "verandaOrCorridorWork", label: "Veranda / Corridor Work" },
  { key: "electricalInstallationWork", label: "Electrical Installation Work" },
  { key: "sanitaryInstallationWork", label: "Sanitary Installation Work" },
  { key: "ceilingFinishWork", label: "Ceiling Finish Work" },
  { key: "paintingWork", label: "Painting Work" },
  { key: "electricalFittingWork", label: "Electrical Fitting Work" },
  { key: "sanitaryFittingWork", label: "Sanitary Fitting Work" },
  { key: "siteClearance", label: "Site Clearance" },
  { key: "parkingArea", label: "Parking Area" }
];

const STATUS_OPTIONS = [
  {
    value: "Pending",
    label: "Pending",
    color: "#ed6c02",
    icon: <PendingIcon fontSize="small" />
  },
  {
    value: "Completed",
    label: "Completed",
    color: "#2e7d32",
    icon: <CheckCircleIcon fontSize="small" />
  },
  {
    value: "Not Required",
    label: "Not Required",
    color: "#757575",
    icon: <NotRequiredIcon fontSize="small" />
  }
];

const getStatusColor = (status) => {
  const found = STATUS_OPTIONS.find((s) => s.value === status);
  return found ? found.color : "#757575";
};

/* ---------------- Pure helpers ---------------- */
const getToday = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().split("T")[0];
};

const makeEmptyConstruction = () => {
  const empty = {
    DCId: "",
    contactPerson: "",
    submissionDate: getToday(),
    remark: ""
  };
  CONSTRUCTION_FIELDS.forEach((f) => {
    empty[f.key] = "Pending";
  });
  return empty;
};

const formatDCIdLabel = (opt) => {
  if (!opt) return "";
  const id = String(opt.DCId || "").trim();
  const place = String(opt.placeofSite || "").trim();
  return place ? `${id} (${place})` : id;
};

/* ---------------- Shared styles ---------------- */
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const yellowButton = {
  background: "#FFD600",
  color: "#000000",
  fontWeight: "bold",
  "&:hover": {
    background: "#ffcc00",
    boxShadow: "0 4px 12px rgba(255, 214, 0, 0.5)"
  }
};

const FIELD_HEIGHT = 40;

const inputSx = {
  "& .MuiOutlinedInput-root": {
    color: "#000000",
    backgroundColor: "#ffffff",
    minHeight: FIELD_HEIGHT,
    "& fieldset": { borderColor: "#e0e0e0" },
    "&:hover fieldset": { borderColor: "#FFD600" },
    "&.Mui-focused fieldset": { borderColor: "#FFD600" }
  },
  "& .MuiOutlinedInput-input": { padding: "8.5px 12px" },
  "& .MuiInputLabel-root": { color: "#666666" }
};

const selectSx = {
  ...inputSx,
  "& .MuiSelect-icon": { color: "#FFD600" },
  "& .MuiSelect-select": {
    padding: "8.5px 12px",
    minHeight: "1.4375em",
    display: "block"
  }
};

const lightStyles = {
  paper: {
    bgcolor: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    color: "#000000",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)"
  },
  dialogPaper: {
    bgcolor: "#ffffff",
    border: "1px solid #FFD600",
    color: "#000000",
    borderRadius: "12px"
  },
  tableHeader: {
    color: "#000000",
    fontWeight: "bold",
    borderBottom: "2px solid #FFD600",
    backgroundColor: "#f5f5f5",
    position: "sticky",
    top: 0,
    zIndex: 2,
    whiteSpace: "nowrap"
  },
  tableCell: {
    color: "#000000",
    borderBottom: "1px solid #e0e0e0",
    whiteSpace: "nowrap"
  },
  actionBtn: {
    background: "#FFD600",
    color: "#000000",
    fontWeight: "bold",
    "&:hover": {
      background: "#ffcc00",
      boxShadow: "0 0 15px #FFD600"
    }
  },
  dialogContent: { px: 3, py: 2.5 },
  dialogActions: {
    px: 3,
    py: 2,
    borderTop: "1px solid #eee",
    gap: 1
  }
};

const scrollbarStyles = {
  "&::-webkit-scrollbar": { width: "8px", height: "8px" },
  "&::-webkit-scrollbar-track": {
    backgroundColor: "#f1f1f1",
    borderRadius: "4px"
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "#DAA520",
    borderRadius: "4px",
    "&:hover": { backgroundColor: "#b8860b" }
  }
};

/* ---------------- Reusable status dropdown ---------------- */
const StatusDropdown = ({ value, onChange, disabled }) => {
  const color = getStatusColor(value);
  return (
    <FormControl size="small" fullWidth disabled={disabled}>
      <Select
        value={value || "Pending"}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          fontSize: "0.8rem",
          bgcolor: `${color}11`,
          minWidth: 130,
          "& .MuiSelect-select": {
            py: 0.6,
            display: "flex",
            alignItems: "center",
            gap: 0.5
          },
          "& fieldset": { borderColor: `${color}55` },
          "&:hover fieldset": { borderColor: color },
          "&.Mui-focused fieldset": { borderColor: color },
          "& .MuiSelect-icon": { color }
        }}
        renderValue={(selected) => {
          const opt = STATUS_OPTIONS.find((s) => s.value === selected);
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {opt?.icon}
              <Typography variant="caption" fontWeight={600} color={opt?.color}>
                {opt?.label}
              </Typography>
            </Box>
          );
        }}
      >
        {STATUS_OPTIONS.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {opt.icon}
              <Typography variant="body2">{opt.label}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

const Construction = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  /* ---------------- State ---------------- */
  const [constructions, setConstructions] = useState([]);
  const [dcIdOptions, setDcIdOptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [loading, setLoading] = useState(false);
  const [savingField, setSavingField] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success"
  });
  const [selectedRowId, setSelectedRowId] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [newConstruction, setNewConstruction] = useState(makeEmptyConstruction);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  /* ---------------- Abort controllers ---------------- */
  const constructionsAbortRef = useRef(null);
  const dcIdsAbortRef = useRef(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  /* ---------------- Helpers ---------------- */
  const showSnackbar = useCallback(
    (msg, severity = "success") =>
      setSnackbar({ open: true, message: msg, severity }),
    []
  );

  const handleApiError = useCallback(
    (err, fallbackMsg = "Operation Failed") => {
      console.error(fallbackMsg, err);
      showSnackbar(err.response?.data?.message || fallbackMsg, "error");
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    },
    [showSnackbar, navigate]
  );

  /* ---------------- Lookup map ---------------- */
  const dcidLabelById = useMemo(() => {
    const m = new Map();
    dcIdOptions.forEach((o) => {
      const key = String(o.DCId || "").trim();
      if (key) m.set(key, formatDCIdLabel(o));
    });
    return m;
  }, [dcIdOptions]);

  /* ---------------- Fetch In-Progress DC Ids ---------------- */
  const fetchDCIds = useCallback(async () => {
    if (dcIdsAbortRef.current) dcIdsAbortRef.current.abort();
    const controller = new AbortController();
    dcIdsAbortRef.current = controller;

    try {
      const res = await axios.get(`${API_URL}/inprogress-dcids`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      });
      setDcIdOptions(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      if (axios.isCancel(err) || err.name === "CanceledError") return;
      console.error("[fetchDCIds] error:", err);
      setDcIdOptions([]);
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
  }, [token, navigate]);

  /* ---------------- Fetch constructions ---------------- */
  const fetchConstructions = useCallback(async () => {
    if (constructionsAbortRef.current) constructionsAbortRef.current.abort();
    const controller = new AbortController();
    constructionsAbortRef.current = controller;

    try {
      setLoading(true);
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      });
      setConstructions(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      if (axios.isCancel(err) || err.name === "CanceledError") return;
      handleApiError(err, "Failed to fetch constructions");
    } finally {
      if (constructionsAbortRef.current === controller) setLoading(false);
    }
  }, [token, handleApiError]);

  /* ---------------- Initial load ---------------- */
  useEffect(() => {
    const init = async () => {
      await fetchDCIds();
      await fetchConstructions();
    };
    init();
  }, [fetchDCIds, fetchConstructions]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, searchTerm]);

  /* ---------------- Status change (inline dropdown) ---------------- */
  const handleStatusChange = async (constructionId, field, newValue) => {
    const key = `${constructionId}-${field}`;
    setSavingField(key);

    // optimistic update
    setConstructions((prev) =>
      prev.map((c) =>
        c._id === constructionId ? { ...c, [field]: newValue } : c
      )
    );

    try {
      const res = await axios.patch(
        `${API_URL}/${constructionId}/status`,
        { field, value: newValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setConstructions((prev) =>
          prev.map((c) => (c._id === constructionId ? res.data.data : c))
        );
      }
    } catch (err) {
      handleApiError(err, "Failed to update status");
      fetchConstructions();
    } finally {
      setSavingField(null);
    }
  };

  /* ---------------- Form handlers ---------------- */
  const handleConstructionChange = (e) => {
    const { name, value } = e.target;
    setNewConstruction((prev) => ({ ...prev, [name]: value }));
  };

  const saveConstruction = async () => {
    if (!newConstruction.DCId?.trim()) {
      return showSnackbar("DC Id is required", "error");
    }
    if (!newConstruction.contactPerson?.trim()) {
      return showSnackbar("Contact Person is required", "error");
    }

    try {
      setLoading(true);

      // Build payload
      const payload = {
        DCId: newConstruction.DCId,
        contactPerson: newConstruction.contactPerson,
        submissionDate: newConstruction.submissionDate || getToday(),
        remark: newConstruction.remark || ""
      };

      // Only include status fields when editing
      if (editId) {
        CONSTRUCTION_FIELDS.forEach((f) => {
          payload[f.key] = newConstruction[f.key] || "Pending";
        });
      }

      const response = editId
        ? await axios.put(`${API_URL}/${editId}`, payload, {
            headers: { Authorization: `Bearer ${token}` }
          })
        : await axios.post(API_URL, payload, {
            headers: { Authorization: `Bearer ${token}` }
          });

      showSnackbar(
        response.data.message ||
          (editId
            ? "Construction updated successfully"
            : "Construction created successfully")
      );
      setFormOpen(false);
      setEditId(null);
      setNewConstruction(makeEmptyConstruction());
      fetchConstructions();
      fetchDCIds();
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditConstruction = (rec) => {
    setEditId(rec._id);
    const filled = { ...makeEmptyConstruction() };
    filled.DCId = rec.DCId || "";
    filled.contactPerson = rec.contactPerson || "";
    filled.submissionDate = rec.submissionDate || getToday();
    filled.remark = rec.remark || "";
    CONSTRUCTION_FIELDS.forEach((f) => {
      filled[f.key] = rec[f.key] || "Pending";
    });
    setNewConstruction(filled);
    setFormOpen(true);
  };

  const handleCreateConstruction = () => {
    setEditId(null);
    // makeEmptyConstruction already sets submissionDate to today
    setNewConstruction(makeEmptyConstruction());
    setFormOpen(true);
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
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar(
        res.data.message || "Construction deleted successfully",
        "warning"
      );
      fetchConstructions();
      fetchDCIds();
    } catch (err) {
      handleApiError(err, "Delete Failed");
    } finally {
      handleDeleteDialogClose();
    }
  };

  /* ---------------- Filtering + pagination ---------------- */
  const filteredConstructions = useMemo(() => {
    let filtered = constructions;

    if (statusFilter && statusFilter !== "All Statuses") {
      if (statusFilter === "Completed") {
        filtered = filtered.filter((r) => (r.percentage || 0) === 100);
      } else if (statusFilter === "In Progress") {
        filtered = filtered.filter(
          (r) => (r.percentage || 0) > 0 && (r.percentage || 0) < 100
        );
      } else if (statusFilter === "Not Started") {
        filtered = filtered.filter((r) => (r.percentage || 0) === 0);
      }
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
  }, [constructions, searchTerm, statusFilter]);

  const paginatedConstructions = useMemo(
    () =>
      filteredConstructions.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [filteredConstructions, page, rowsPerPage]
  );

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getTableHeight = () => {
    const availableHeight = window.innerHeight - (isMobile ? 360 : 300);
    return `${Math.max(availableHeight, 400)}px`;
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
        maxWidth: "100%"
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
            gap: 2
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
              onClick={handleCreateConstruction}
            >
              New Construction
            </Button>

            <TextField
              placeholder="🔍 Universal search..."
              size="small"
              sx={{
                ...inputSx,
                minWidth: isMobile ? "100%" : "300px",
                flexGrow: 1
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
                    <IconButton size="small" onClick={() => setSearchTerm("")}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <FormControl
              size="small"
              sx={{ minWidth: isMobile ? "100%" : "170px" }}
            >
              <InputLabel id="status-filter-label">Progress</InputLabel>
              <Select
                labelId="status-filter-label"
                label="Progress"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={selectSx}
              >
                <MenuItem value="All Statuses">All Statuses</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Not Started">Not Started</MenuItem>
              </Select>
            </FormControl>

            <IconButton
              onClick={() => {
                fetchConstructions();
                fetchDCIds();
                showSnackbar("✅ Table updated", "success");
              }}
              sx={{
                ...yellowButton,
                background: "transparent",
                border: "1px solid #FFD600"
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
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
                bgcolor: "rgba(255,214,0,0.05)"
              }}
            >
              {filteredConstructions.length} records
            </Typography>
          </Stack>
        </Paper>

        {/* --- DATA TABLE --- */}
        <Paper
          sx={{
            borderRadius: "8px",
            overflow: "hidden",
            border: "1px solid #e0e0e0"
          }}
        >
          <TableContainer
            sx={{
              height: getTableHeight(),
              maxHeight: getTableHeight(),
              overflow: "auto",
              ...scrollbarStyles
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
                  minWidth: 1200,
                  width: "100%",
                  "& .MuiTableCell-root": {
                    whiteSpace: "nowrap",
                    padding: "10px 12px"
                  }
                }}
              >
                <TableHead>
                  <TableRow>
                    {[
                      "#",
                      "DC Id",
                      "Contact Person",
                      "Submitted",
                      "Progress",
                      ...CONSTRUCTION_FIELDS.map((f) => f.label),
                      "Remark",
                      "Actions"
                    ].map((h, idx) => (
                      <TableCell key={`${h}-${idx}`} sx={lightStyles.tableHeader}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginatedConstructions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={CONSTRUCTION_FIELDS.length + 6}
                        sx={{ textAlign: "center", py: 4, color: "#666" }}
                      >
                        No construction records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedConstructions.map((r, i) => (
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
                              ? "#ffb648f3"
                              : "transparent",
                          "&:hover": {
                            bgcolor:
                              selectedRowId === r._id
                                ? "#ff790c"
                                : "rgba(255, 214, 0, 0.1)"
                          },
                          transition: "background-color 0.2s ease"
                        }}
                      >
                        <TableCell sx={lightStyles.tableCell}>
                          {page * rowsPerPage + i + 1}
                        </TableCell>

                        <TableCell
                          sx={{
                            ...lightStyles.tableCell,
                            fontWeight: "bold",
                            color: "#242321"
                          }}
                        >
                          {dcidLabelById.get(r.DCId) || r.DCId}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.contactPerson || "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.submissionDate || "—"}
                        </TableCell>

                        {/* Progress */}
                        <TableCell sx={{ ...lightStyles.tableCell, minWidth: 160 }}>
                          <Box sx={{ minWidth: 140 }}>
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                              mb={0.5}
                            >
                              <Typography
                                variant="caption"
                                fontWeight={600}
                                color="text.secondary"
                              >
                                Progress
                              </Typography>
                              <Chip
                                label={`${r.percentage || 0}%`}
                                size="small"
                                sx={{
                                  bgcolor:
                                    (r.percentage || 0) === 100
                                      ? "#2e7d32"
                                      : (r.percentage || 0) > 0
                                      ? "#ed6c02"
                                      : "#757575",
                                  color: "#fff",
                                  fontWeight: 700,
                                  fontSize: "0.7rem",
                                  height: 18
                                }}
                              />
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={r.percentage || 0}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: "#eee",
                                "& .MuiLinearProgress-bar": {
                                  bgcolor:
                                    (r.percentage || 0) === 100
                                      ? "#2e7d32"
                                      : (r.percentage || 0) > 0
                                      ? "#ed6c02"
                                      : "#757575"
                                }
                              }}
                            />
                          </Box>
                        </TableCell>

                        {/* Inline status dropdowns (always visible in table) */}
                        {CONSTRUCTION_FIELDS.map((f) => {
                          const key = `${r._id}-${f.key}`;
                          const isSaving = savingField === key;
                          return (
                            <TableCell
                              key={f.key}
                              sx={{ ...lightStyles.tableCell, minWidth: 160 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Box sx={{ position: "relative", minWidth: 150 }}>
                                <StatusDropdown
                                  value={r[f.key]}
                                  onChange={(val) =>
                                    handleStatusChange(r._id, f.key, val)
                                  }
                                  disabled={isSaving}
                                />
                                {isSaving && (
                                  <CircularProgress
                                    size={14}
                                    sx={{
                                      position: "absolute",
                                      top: "50%",
                                      right: 30,
                                      mt: "-7px",
                                      color: "#FFD600"
                                    }}
                                  />
                                )}
                              </Box>
                            </TableCell>
                          );
                        })}

                        <TableCell sx={lightStyles.tableCell}>
                          <Tooltip title={r.remark || "—"}>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 180,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {r.remark || "—"}
                            </Typography>
                          </Tooltip>
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          <IconButton
                            size="small"
                            sx={{
                              color: "#000000",
                              "&:hover": {
                                bgcolor: "#FFD600",
                                color: "#000000"
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditConstruction(r);
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
                                color: "#ffffff"
                              }
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
            count={filteredConstructions.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              color: "#000000",
              borderTop: "1px solid #e0e0e0",
              bgcolor: "#ffffff",
              "& .MuiTablePagination-selectIcon": { color: "#FFD600" },
              "& .MuiIconButton-root": { color: "#FFD600" }
            }}
          />
        </Paper>

        {/* --- CREATE/EDIT DIALOG --- */}
        <Dialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          TransitionComponent={Transition}
          fullWidth
          maxWidth={editId ? "lg" : "md"}
          PaperProps={{
            sx: {
              ...lightStyles.dialogPaper,
              borderRadius: "12px",
              width: { xs: "95%", sm: editId ? "900px" : "640px" },
              margin: "auto",
              overflowX: "hidden"
            }
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
              alignItems: "center"
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ConstructionIcon sx={{ color: "#FFD600" }} />
              <Typography variant="h6" fontWeight="900">
                {editId !== null ? "EDIT CONSTRUCTION" : "CREATE CONSTRUCTION"}
              </Typography>
            </Box>
            <IconButton
              onClick={() => setFormOpen(false)}
              size="small"
              sx={{
                color: "#999",
                transition: "0.2s",
                "&:hover": {
                  color: "#ff0000",
                  backgroundColor: "rgba(255, 0, 0, 0.05)"
                }
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
              overflowX: "hidden"
            }}
          >
            <FormControl fullWidth size="small" sx={{ ...selectSx, mt: 2.5 }}>
              <InputLabel id="dcid-form-label">DC Id *</InputLabel>
              <Select
                labelId="dcid-form-label"
                label="DC Id *"
                name="DCId"
                value={newConstruction.DCId || ""}
                onChange={handleConstructionChange}
                sx={selectSx}
                disabled={!!editId}
                renderValue={(selected) => {
                  if (!selected) {
                    return <em style={{ color: "#999" }}>Select DC Id…</em>;
                  }
                  const found = dcIdOptions.find((o) => o.DCId === selected);
                  return found ? formatDCIdLabel(found) : selected;
                }}
              >
                {dcIdOptions.length === 0 ? (
                  <MenuItem value="" disabled>
                    No In-Progress DC Ids available
                  </MenuItem>
                ) : (
                  dcIdOptions.map((opt) => (
                    <MenuItem key={opt.DCId} value={opt.DCId}>
                      {formatDCIdLabel(opt)}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Contact Person *"
              name="contactPerson"
              size="small"
              sx={{ ...inputSx, mt: 2.5 }}
              value={newConstruction.contactPerson}
              onChange={handleConstructionChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: "#FFD600" }} />
                  </InputAdornment>
                )
              }}
            />

            <TextField
              fullWidth
              label="Submission Date"
              name="submissionDate"
              type="date"
              size="small"
              sx={inputSx}
              value={newConstruction.submissionDate || getToday()}
              onChange={handleConstructionChange}
              InputLabelProps={{ shrink: true }}
            />

            {/* Status fields grid — ONLY VISIBLE WHEN EDITING */}
            {editId && (
              <Box sx={{ gridColumn: { sm: "1 / -1" }, mt: 1 }}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  sx={{ mb: 1, color: "#333" }}
                >
                  Construction Work Status
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                      md: "repeat(3, 1fr)"
                    },
                    gap: 2
                  }}
                >
                  {CONSTRUCTION_FIELDS.map((f) => (
                    <FormControl key={f.key} fullWidth size="small">
                      <InputLabel>{f.label}</InputLabel>
                      <Select
                        label={f.label}
                        name={f.key}
                        value={newConstruction[f.key] || "Pending"}
                        onChange={handleConstructionChange}
                        sx={selectSx}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1
                              }}
                            >
                              {opt.icon}
                              <Typography variant="body2">
                                {opt.label}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ))}
                </Box>
              </Box>
            )}

            <TextField
              fullWidth
              label="Remark"
              name="remark"
              size="small"
              multiline
              rows={3}
              sx={{ ...inputSx, gridColumn: { sm: "1 / -1" } }}
              value={newConstruction.remark}
              onChange={handleConstructionChange}
            />
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
                "&:hover": { color: "#444" }
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={saveConstruction}
              disabled={loading}
              sx={{
                ...lightStyles.actionBtn,
                px: 4,
                fontWeight: "bold",
                textTransform: "none",
                boxShadow: "none"
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : editId !== null ? (
                "Update Construction"
              ) : (
                "Create Construction"
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
              py: 2.5
            }}
          >
            <WarningIcon sx={{ color: "#f44336", fontSize: 32 }} />
            <Typography variant="h6">Confirm Delete</Typography>
          </DialogTitle>
          <DialogContent dividers sx={lightStyles.dialogContent}>
            <Typography variant="body1" gutterBottom>
              Are you sure you want to delete this construction record?
            </Typography>
            {selectedRecord && (
              <Box
                sx={{
                  mt: 2.5,
                  mb: 2.5,
                  p: 2,
                  bgcolor: "#fff8e1",
                  borderRadius: 2
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  DC Id:{" "}
                  <strong>
                    {dcidLabelById.get(selectedRecord.DCId) ||
                      selectedRecord.DCId}
                  </strong>
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Contact Person:{" "}
                  <strong>{selectedRecord.contactPerson || "—"}</strong>
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Progress: <strong>{selectedRecord.percentage || 0}%</strong>
                </Typography>
              </Box>
            )}
            <Alert severity="warning" sx={{ mt: selectedRecord ? 0 : 2.5 }}>
              This action cannot be undone. All data associated with this
              construction record will be permanently deleted.
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
              border: "1px solid #FFD600"
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default Construction;