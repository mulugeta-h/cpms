// pages/Estimation.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
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
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
  Place as PlaceIcon,
  Public as PublicIcon,
  ContentCopy as ContentCopyIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { parseCoordinate, openLocationOnMap } from "../../utils/location";

const API_URL = `${import.meta.env.VITE_API_URL}/api/estimations`;
const INPROGRESS_IDS_URL = `${API_URL}/inprogress-estimation-ids`;

const STATUS_OPTIONS = ["In Progress", "Completed", "Rejected"];
const DOC_OPTIONS = ["Pending", "Completed"];

/* ---------------- Pure helpers (hoisted) ---------------- */

const getToday = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().split("T")[0];
};

const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatEstLabel = (opt) => {
  if (!opt) return "";
  const id = String(opt.estimationId || "").trim();
  const place = String(opt.propertyAddress || "").trim();
  return place ? `${id} (${place})` : id;
};

const makeEmptyEstimation = () => ({
  estimationId: "",
  numberOfProperties: 1,
  estimationSiteVisitDate: getToday(),
  estimationReleaseDate: getToday(),
  estimationFee: 0,
  documentation: "Pending",
  locationCoordinate: "",
  areaOfSite: "",
  estimationNumber: "",
  remark: "",
});

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
    boxShadow: "0 4px 12px rgba(255, 214, 0, 0.5)",
  },
};

const FIELD_HEIGHT = 40;

const inputSx = {
  "& .MuiOutlinedInput-root": {
    color: "#000000",
    backgroundColor: "#ffffff",
    minHeight: FIELD_HEIGHT,
    "& fieldset": { borderColor: "#e0e0e0" },
    "&:hover fieldset": { borderColor: "#FFD600" },
    "&.Mui-focused fieldset": { borderColor: "#FFD600" },
  },
  "& .MuiOutlinedInput-input": { padding: "8.5px 12px" },
  "& .MuiInputLabel-root": { color: "#666666" },
};

const selectSx = {
  ...inputSx,
  "& .MuiSelect-icon": { color: "#FFD600" },
  "& .MuiSelect-select": {
    padding: "8.5px 12px",
    minHeight: "1.4375em",
    display: "block",
  },
};

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

/* ---------------- Portable location cell ---------------- */

const LocationCell = ({ value, onCopy }) => {
  const coords = parseCoordinate(value);

  if (!coords) {
    return (
      <Tooltip title={value || "No coordinate"}>
        <Typography
          variant="body2"
          sx={{
            maxWidth: 180,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value || "—"}
        </Typography>
      </Tooltip>
    );
  }

  const label = `${coords.lat},${coords.lng}`;

  const handleMaps = (e) => {
    e.stopPropagation();
    openLocationOnMap(value, { provider: "maps" });
  };

  const handleEarth = (e) => {
    e.stopPropagation();
    openLocationOnMap(value, { provider: "earth" });
  };

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(label);
      onCopy?.("Coordinates copied");
    } catch {
      onCopy?.("Copy failed", "error");
    }
  };

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Tooltip title="Open in Google Maps">
        <IconButton
          size="small"
          onClick={handleMaps}
          sx={{
            color: "#FFD600",
            "&:hover": { bgcolor: "rgba(255,214,0,0.15)" },
          }}
        >
          <PlaceIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Open in Google Earth">
        <IconButton
          size="small"
          onClick={handleEarth}
          sx={{
            color: "#4285F4",
            "&:hover": { bgcolor: "rgba(66,133,244,0.15)" },
          }}
        >
          <PublicIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title={label}>
        <Typography
          variant="body2"
          onClick={handleMaps}
          sx={{
            cursor: "pointer",
            color: "#242321",
            maxWidth: 140,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          {label}
        </Typography>
      </Tooltip>

      <Tooltip title="Copy coordinates">
        <IconButton
          size="small"
          onClick={handleCopy}
          sx={{
            color: "#888",
            "&:hover": { bgcolor: "rgba(0,0,0,0.05)" },
          }}
        >
          <ContentCopyIcon fontSize="small" sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
};

/* ============================================================ */

const Estimation = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  /* ---------------- State ---------------- */
  const [estimations, setEstimations] = useState([]);
  const [estIdOptions, setEstIdOptions] = useState([]);
  const [selectedEstId, setSelectedEstId] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [newEstimation, setNewEstimation] = useState(makeEmptyEstimation);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [selectedRowId, setSelectedRowId] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  /* ---------------- Abort controllers ---------------- */
  const estAbortRef = useRef(null);
  const estIdsAbortRef = useRef(null);

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

  /* ---------------- Lookup map: estimationId -> label ---------------- */
  const estLabelById = useMemo(() => {
    const m = new Map();
    estIdOptions.forEach((o) => {
      const key = String(o.estimationId || "").trim();
      if (key) m.set(key, formatEstLabel(o));
    });
    return m;
  }, [estIdOptions]);

  /* ---------------- Fetch In-Progress Estimation Ids ---------------- */
  const fetchEstIds = useCallback(async () => {
    if (estIdsAbortRef.current) estIdsAbortRef.current.abort();
    const controller = new AbortController();
    estIdsAbortRef.current = controller;

    try {
      const res = await axios.get(INPROGRESS_IDS_URL, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      setEstIdOptions(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      if (axios.isCancel(err) || err.name === "CanceledError") return;
      console.error("[fetchEstIds] error:", err);
      setEstIdOptions([]);
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
  }, [token, navigate]);

  /* ---------------- Fetch estimations (all, once) ---------------- */
  const fetchEstimations = useCallback(async () => {
    if (estAbortRef.current) estAbortRef.current.abort();
    const controller = new AbortController();
    estAbortRef.current = controller;

    try {
      setLoading(true);
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      setEstimations(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      if (axios.isCancel(err) || err.name === "CanceledError") return;
      handleApiError(err, "Failed to fetch estimations");
    } finally {
      if (estAbortRef.current === controller) setLoading(false);
    }
  }, [token, handleApiError]);

  /* ---------------- Initial load ---------------- */
  useEffect(() => {
    const init = async () => {
      await fetchEstIds();
      await fetchEstimations();
    };
    init();
  }, [fetchEstIds, fetchEstimations]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, selectedEstId, searchTerm]);

  /* ---------------- Form handlers ---------------- */
  const handleEstChange = (e) => {
    const { name, value } = e.target;
    setNewEstimation((prev) => ({ ...prev, [name]: value }));
  };

  const saveEstimation = async () => {
    if (!newEstimation.estimationId?.trim()) {
      return showSnackbar("Estimation Id is required", "error");
    }

    if (
      !newEstimation.numberOfProperties ||
      Number(newEstimation.numberOfProperties) < 1
    ) {
      return showSnackbar("Number of Properties must be >= 1", "error");
    }

    try {
      setLoading(true);
      const payload = {
        numberOfProperties: Number(newEstimation.numberOfProperties) || 1,
        estimationSiteVisitDate: newEstimation.estimationSiteVisitDate || null,
        estimationReleaseDate: newEstimation.estimationReleaseDate || null,
        estimationFee: Number(newEstimation.estimationFee) || 0,
        documentation: newEstimation.documentation || "Pending",
        locationCoordinate: newEstimation.locationCoordinate || "",
        areaOfSite:
          newEstimation.areaOfSite === ""
            ? null
            : Number(newEstimation.areaOfSite),
        estimationNumber: newEstimation.estimationNumber || undefined,
        remark: newEstimation.remark || "",
      };

      // estimationId is immutable on update
      if (!editId) payload.estimationId = newEstimation.estimationId;

      const response = editId
        ? await axios.put(`${API_URL}/${editId}`, payload, {
            headers: { Authorization: `Bearer ${token}` },
          })
        : await axios.post(API_URL, payload, {
            headers: { Authorization: `Bearer ${token}` },
          });

      showSnackbar(
        response.data.message ||
          (editId
            ? "Estimation updated successfully"
            : "Estimation created successfully")
      );
      setFormOpen(false);
      setEditId(null);
      setNewEstimation(makeEmptyEstimation());
      fetchEstimations();
      fetchEstIds();
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
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
        res.data.message || "Estimation deleted successfully",
        "warning"
      );
      fetchEstimations();
      fetchEstIds();
    } catch (err) {
      handleApiError(err, "Delete Failed");
    } finally {
      handleDeleteDialogClose();
    }
  };

  /* ---------------- Filtering + pagination (client-side) ------------ */
  const filteredEstimations = useMemo(() => {
    let filtered = estimations;

    if (statusFilter && statusFilter !== "All Statuses") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (selectedEstId) {
      filtered = filtered.filter((r) => r.estimationId === selectedEstId);
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
  }, [estimations, searchTerm, statusFilter, selectedEstId]);

  const paginatedEstimations = useMemo(
    () =>
      filteredEstimations.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [filteredEstimations, page, rowsPerPage]
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

  const handleEditEstimation = (row) => {
    setEditId(row._id);
    setNewEstimation({
      estimationId: row.estimationId || "",
      numberOfProperties: row.numberOfProperties ?? 1,
      estimationSiteVisitDate: toDateInput(row.estimationSiteVisitDate),
      estimationReleaseDate: toDateInput(row.estimationReleaseDate),
      estimationFee: row.estimationFee ?? 0,
      documentation: row.documentation || "Pending",
      locationCoordinate: row.locationCoordinate || "",
      areaOfSite: row.areaOfSite ?? "",
      estimationNumber: row.estimationNumber || "",
      remark: row.remark || "",
    });
    setFormOpen(true);
  };

  const handleCreateEstimation = () => {
    setEditId(null);
    setNewEstimation(makeEmptyEstimation());
    setFormOpen(true);
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
              onClick={handleCreateEstimation}
            >
              New Estimation
            </Button>

            <TextField
              placeholder="🔍 Universal search..."
              size="small"
              sx={{
                ...inputSx,
                minWidth: isMobile ? "100%" : "300px",
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
                    <IconButton size="small" onClick={() => setSearchTerm("")}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <FormControl
              size="small"
              sx={{ minWidth: isMobile ? "100%" : "170px" }}
            >
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={selectSx}
              >
                <MenuItem value="All Statuses">All Statuses</MenuItem>
                {STATUS_OPTIONS.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <IconButton
              onClick={() => {
                fetchEstimations();
                fetchEstIds();
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
              {filteredEstimations.length} records
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
                  minWidth: 1700,
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
                      "Estimation Id",
                      "Requested by",
                      "Applicant",
                      "Property Type",
                      "No. of Properties",
                      "Request Date",
                      "Site Visit Date",
                      "Release Date",
                      "Estimation Fee",
                      "Documentation",
                      "Location",
                      "Area (sq.m)",
                      "Estimation Number",
                      "Assigned Engineer",
                      "Remark",
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
                  {paginatedEstimations.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={18}
                        sx={{ textAlign: "center", py: 4, color: "#666" }}
                      >
                        No estimations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedEstimations.map((r, i) => (
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
                                : "rgba(255, 214, 0, 0.1)",
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
                          {estLabelById.get(r.estimationId) || r.estimationId}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.requestingOrgan || "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.applicantName || "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.typeOfProperty || "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.numberOfProperties ?? "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.requestDate
                            ? new Date(r.requestDate).toLocaleDateString()
                            : "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.estimationSiteVisitDate
                            ? new Date(
                                r.estimationSiteVisitDate
                              ).toLocaleDateString()
                            : "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.estimationReleaseDate
                            ? new Date(
                                r.estimationReleaseDate
                              ).toLocaleDateString()
                            : "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.estimationFee ?? "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.documentation || "—"}
                        </TableCell>

                        {/* Location — portable click-to-map */}
                        <TableCell sx={lightStyles.tableCell}>
                          <LocationCell
                            value={r.locationCoordinate}
                            onCopy={(msg) => showSnackbar(msg, "success")}
                          />
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.areaOfSite ?? "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.estimationNumber || "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.assignedTo || "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          <Tooltip title={r.remark || "—"}>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 200,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {r.remark || "—"}
                            </Typography>
                          </Tooltip>
                        </TableCell>

                        {/* Status — display only (from EstimationRequest) */}
                        <TableCell sx={lightStyles.tableCell}>
                          {r.status || "—"}
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
                              handleEditEstimation(r);
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
            count={filteredEstimations.length}
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
              width: { xs: "95%", sm: "720px" },
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
              {editId !== null ? "EDIT ESTIMATION" : "CREATE ESTIMATION"}
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
            <FormControl
              fullWidth
              size="small"
              sx={{ ...selectSx, mt: 2.5 }}
              disabled={!!editId}
            >
              <InputLabel id="estimation-id-label">
                Estimation Id *
              </InputLabel>
              <Select
                labelId="estimation-id-label"
                label="Estimation Id *"
                name="estimationId"
                value={newEstimation.estimationId || ""}
                onChange={handleEstChange}
                sx={selectSx}
                renderValue={(selected) => {
                  if (!selected) {
                    return (
                      <em style={{ color: "#999" }}>Select Estimation Id…</em>
                    );
                  }
                  const found = estIdOptions.find(
                    (o) => o.estimationId === selected
                  );
                  return found ? formatEstLabel(found) : selected;
                }}
              >
                {estIdOptions.length === 0 ? (
                  <MenuItem value="" disabled>
                    No In-Progress Estimation Ids available
                  </MenuItem>
                ) : (
                  estIdOptions.map((opt) => (
                    <MenuItem key={opt.estimationId} value={opt.estimationId}>
                      {formatEstLabel(opt)}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Number of Properties *"
              name="numberOfProperties"
              type="number"
              size="small"
              sx={{ ...inputSx, mt: 2.5 }}
              value={newEstimation.numberOfProperties}
              onChange={handleEstChange}
              inputProps={{ min: 1 }}
            />

            <TextField
              fullWidth
              label="Site Visit Date"
              name="estimationSiteVisitDate"
              type="date"
              size="small"
              sx={inputSx}
              value={newEstimation.estimationSiteVisitDate}
              onChange={handleEstChange}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Release Date"
              name="estimationReleaseDate"
              type="date"
              size="small"
              sx={inputSx}
              value={newEstimation.estimationReleaseDate}
              onChange={handleEstChange}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Estimation Fee"
              name="estimationFee"
              type="number"
              size="small"
              sx={inputSx}
              value={newEstimation.estimationFee}
              onChange={handleEstChange}
              inputProps={{ min: 0 }}
            />

            <FormControl fullWidth size="small" sx={selectSx}>
              <InputLabel id="doc-label">Documentation</InputLabel>
              <Select
                labelId="doc-label"
                label="Documentation"
                name="documentation"
                value={newEstimation.documentation || "Pending"}
                onChange={handleEstChange}
                sx={selectSx}
              >
                {DOC_OPTIONS.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Location Coordinate"
              name="locationCoordinate"
              size="small"
              sx={inputSx}
              value={newEstimation.locationCoordinate}
              onChange={handleEstChange}
              helperText="Format: lat,lng — e.g. 9.0301,38.7400"
            />

            {/* Live preview when coordinate parses */}
            {parseCoordinate(newEstimation.locationCoordinate) && (
              <Stack
                direction="row"
                spacing={1}
                sx={{ gridColumn: { sm: "1 / -1" }, mt: -1.5 }}
              >
                <Button
                  size="small"
                  startIcon={<PlaceIcon />}
                  sx={{ textTransform: "none", color: "#242321" }}
                  onClick={() =>
                    openLocationOnMap(newEstimation.locationCoordinate, {
                      provider: "maps",
                    })
                  }
                >
                  Preview on Google Maps
                </Button>
                <Button
                  size="small"
                  startIcon={<PublicIcon />}
                  sx={{ textTransform: "none", color: "#4285F4" }}
                  onClick={() =>
                    openLocationOnMap(newEstimation.locationCoordinate, {
                      provider: "earth",
                    })
                  }
                >
                  Preview on Google Earth
                </Button>
              </Stack>
            )}

            <TextField
              fullWidth
              label="Area of Site (sq.m)"
              name="areaOfSite"
              type="number"
              size="small"
              sx={inputSx}
              value={newEstimation.areaOfSite}
              onChange={handleEstChange}
              inputProps={{ min: 0, step: "0.01" }}
            />

            <TextField
              fullWidth
              label="Estimation Number"
              name="estimationNumber"
              size="small"
              sx={inputSx}
              value={newEstimation.estimationNumber}
              onChange={handleEstChange}
            />

            <TextField
              fullWidth
              label="Remark"
              name="remark"
              size="small"
              multiline
              rows={3}
              sx={{ ...inputSx, gridColumn: { sm: "1 / -1" } }}
              value={newEstimation.remark}
              onChange={handleEstChange}
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
                "&:hover": { color: "#444" },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={saveEstimation}
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
                "Update Estimation"
              ) : (
                "Create Estimation"
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
              Are you sure you want to delete this estimation record?
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
                  Estimation Id:{" "}
                  <strong>
                    {estLabelById.get(selectedRecord.estimationId) ||
                      selectedRecord.estimationId}
                  </strong>
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Applicant:{" "}
                  <strong>{selectedRecord.applicantName || "—"}</strong>
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Release Date:{" "}
                  <strong>
                    {selectedRecord.estimationReleaseDate
                      ? new Date(
                          selectedRecord.estimationReleaseDate
                        ).toLocaleDateString()
                      : "—"}
                  </strong>
                </Typography>
              </Box>
            )}
            <Alert severity="warning" sx={{ mt: selectedRecord ? 0 : 2.5 }}>
              This action cannot be undone. All data associated with this
              estimation will be permanently deleted.
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

export default Estimation;