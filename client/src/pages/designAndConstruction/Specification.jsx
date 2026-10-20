// pages/Specification.jsx
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
  Person as PersonIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = `${import.meta.env.VITE_API_URL}/api/specifications`;
const INPROGRESS_DC_IDS_URL = `${API_URL}/inprogress-dcids`;

const STATUS_OPTIONS = ["In Progress", "Completed", "Rejected", "Cancelled"];

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

const formatDCLabel = (opt) => {
  if (!opt) return "";
  const id = String(opt.DCId || "").trim();
  const place = String(opt.placeofSite || "").trim();
  return place ? `${id} (${place})` : id;
};

const makeEmptySpec = () => ({
  DCId: "",
  siteVisitDate: getToday(),
  siteVisitPurpose: "",
  specReleaseDate: getToday(),
  branchHandOverDate: getToday(),
  acceptedBy: "",
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

const Specification = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  /* ---------------- State ---------------- */
  const [specs, setSpecs] = useState([]);
  const [dcIdOptions, setDcIdOptions] = useState([]);
  const [selectedDCId, setSelectedDCId] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [newSpec, setNewSpec] = useState(makeEmptySpec);
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
  const specsAbortRef = useRef(null);
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

  /* ---------------- Lookup map: DCId -> label ---------------- */
  const dcLabelById = useMemo(() => {
    const m = new Map();
    dcIdOptions.forEach((o) => {
      const key = String(o.DCId || "").trim();
      if (key) m.set(key, formatDCLabel(o));
    });
    return m;
  }, [dcIdOptions]);

  /* ---------------- Fetch In-Progress DC Ids ---------------- */
  const fetchDCIds = useCallback(async () => {
    if (dcIdsAbortRef.current) dcIdsAbortRef.current.abort();
    const controller = new AbortController();
    dcIdsAbortRef.current = controller;

    try {
      const res = await axios.get(INPROGRESS_DC_IDS_URL, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
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

  /* ---------------- Fetch specifications (all, once) ---------------- */
  const fetchSpecs = useCallback(async () => {
    if (specsAbortRef.current) specsAbortRef.current.abort();
    const controller = new AbortController();
    specsAbortRef.current = controller;

    try {
      setLoading(true);
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      setSpecs(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      if (axios.isCancel(err) || err.name === "CanceledError") return;
      handleApiError(err, "Failed to fetch specifications");
    } finally {
      if (specsAbortRef.current === controller) setLoading(false);
    }
  }, [token, handleApiError]);

  /* ---------------- Initial load (single effect) ---------------- */
  useEffect(() => {
    const init = async () => {
      await fetchDCIds();
      await fetchSpecs();
    };
    init();
  }, [fetchDCIds, fetchSpecs]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, selectedDCId, searchTerm]);

  /* ---------------- Form handlers ---------------- */
  const handleSpecChange = (e) => {
    const { name, value } = e.target;
    setNewSpec((prev) => ({ ...prev, [name]: value }));
  };

  const saveSpec = async () => {
    if (!newSpec.DCId?.trim()) {
      return showSnackbar("DC Id is required", "error");
    }

    try {
      setLoading(true);
      const specData = {
        DCId: newSpec.DCId,
        siteVisitDate: newSpec.siteVisitDate || null,
        siteVisitPurpose: newSpec.siteVisitPurpose || "",
        specReleaseDate: newSpec.specReleaseDate || null,
        branchHandOverDate: newSpec.branchHandOverDate || null,
        remark: newSpec.remark || "",
      };
      if (editId) specData.acceptedBy = newSpec.acceptedBy || "";

      const response = editId
        ? await axios.put(`${API_URL}/${editId}`, specData, {
            headers: { Authorization: `Bearer ${token}` },
          })
        : await axios.post(API_URL, specData, {
            headers: { Authorization: `Bearer ${token}` },
          });

      showSnackbar(
        response.data.message ||
          (editId
            ? "Specification updated successfully"
            : "Specification created successfully")
      );
      setFormOpen(false);
      setEditId(null);
      setNewSpec(makeEmptySpec());
      fetchSpecs();
      fetchDCIds();
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
        res.data.message || "Specification deleted successfully",
        "warning"
      );
      fetchSpecs();
      fetchDCIds();
    } catch (err) {
      handleApiError(err, "Delete Failed");
    } finally {
      handleDeleteDialogClose();
    }
  };

  /* ---------------- Filtering + pagination (client-side) ------------ */
  const filteredSpecs = useMemo(() => {
    let filtered = specs;

    if (statusFilter && statusFilter !== "All Statuses") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (selectedDCId) {
      filtered = filtered.filter((r) => r.DCId === selectedDCId);
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
  }, [specs, searchTerm, statusFilter, selectedDCId]);

  const paginatedSpecs = useMemo(
    () =>
      filteredSpecs.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [filteredSpecs, page, rowsPerPage]
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

  const handleEditSpec = (spec) => {
    setEditId(spec._id);
    setNewSpec({
      DCId: spec.DCId || "",
      siteVisitDate: toDateInput(spec.siteVisitDate),
      siteVisitPurpose: spec.siteVisitPurpose || "",
      specReleaseDate: toDateInput(spec.specReleaseDate),
      branchHandOverDate: toDateInput(spec.branchHandOverDate),
      acceptedBy: spec.acceptedBy || "",
      remark: spec.remark || "",
    });
    setFormOpen(true);
  };

  const handleCreateSpec = () => {
    setEditId(null);
    setNewSpec(makeEmptySpec());
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
              onClick={handleCreateSpec}
            >
              New Specification
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
                fetchSpecs();
                fetchDCIds();
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
              {filteredSpecs.length} records
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
                      "DC Id",
                      "Requested by",
                      "Request Type",
                      "Requested Date",
                      "Place of site",
                      "Assigned Engineer",
                      "Site Visit Date",
                      "Site Visit Purpose",
                      "Spec Release",
                      "Branch Hand Over",
                      "Accepted By",
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
                  {paginatedSpecs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={15}
                        sx={{ textAlign: "center", py: 4, color: "#666" }}
                      >
                        No specifications found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSpecs.map((r, i) => (
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
                          {dcLabelById.get(r.DCId) || r.DCId}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.requestingOrgan || "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          <Typography variant="body2">
                            {r.requestType || "—"}
                          </Typography>
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.requestDate
                            ? new Date(r.requestDate).toLocaleDateString()
                            : "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          <Tooltip title={r.placeofSite || "—"}>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 220,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {r.placeofSite || "—"}
                            </Typography>
                          </Tooltip>
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          <Typography variant="body2">
                            {r.assignedTo || "—"}
                          </Typography>
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.siteVisitDate
                            ? new Date(r.siteVisitDate).toLocaleDateString()
                            : "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          <Tooltip title={r.siteVisitPurpose || "—"}>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 160,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {r.siteVisitPurpose || "—"}
                            </Typography>
                          </Tooltip>
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.specReleaseDate
                            ? new Date(
                                r.specReleaseDate
                              ).toLocaleDateString()
                            : "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.branchHandOverDate
                            ? new Date(
                                r.branchHandOverDate
                              ).toLocaleDateString()
                            : "—"}
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.acceptedBy || "—"}
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

                        {/* Status — display only */}
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
                              handleEditSpec(r);
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
            count={filteredSpecs.length}
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
                ? "EDIT SPECIFICATION"
                : "CREATE SPECIFICATION"}
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
            >
              <InputLabel id="dcid-form-label">DC Id *</InputLabel>
              <Select
                labelId="dcid-form-label"
                label="DC Id *"
                name="DCId"
                value={newSpec.DCId || ""}
                onChange={handleSpecChange}
                sx={selectSx}
                renderValue={(selected) => {
                  if (!selected) {
                    return (
                      <em style={{ color: "#999" }}>Select DC Id…</em>
                    );
                  }
                  const found = dcIdOptions.find((o) => o.DCId === selected);
                  return found ? formatDCLabel(found) : selected;
                }}
              >
                {dcIdOptions.length === 0 ? (
                  <MenuItem value="" disabled>
                    No In-Progress DC Ids available
                  </MenuItem>
                ) : (
                  dcIdOptions.map((opt) => (
                    <MenuItem key={opt.DCId} value={opt.DCId}>
                      {formatDCLabel(opt)}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Site Visit Date"
              name="siteVisitDate"
              type="date"
              size="small"
              sx={{ ...inputSx, mt: 2.5 }}
              value={newSpec.siteVisitDate}
              onChange={handleSpecChange}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Site Visit Purpose"
              name="siteVisitPurpose"
              size="small"
              sx={inputSx}
              value={newSpec.siteVisitPurpose}
              onChange={handleSpecChange}
            />

            {editId && (
              <TextField
                fullWidth
                label="Accepted By"
                name="acceptedBy"
                size="small"
                sx={inputSx}
                value={newSpec.acceptedBy}
                onChange={handleSpecChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: "#FFD600" }} />
                    </InputAdornment>
                  ),
                }}
              />
            )}

            <TextField
              fullWidth
              label="Spec Release Date"
              name="specReleaseDate"
              type="date"
              size="small"
              sx={inputSx}
              value={newSpec.specReleaseDate}
              onChange={handleSpecChange}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Branch Hand Over Date"
              name="branchHandOverDate"
              type="date"
              size="small"
              sx={inputSx}
              value={newSpec.branchHandOverDate}
              onChange={handleSpecChange}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Remark"
              name="remark"
              size="small"
              multiline
              rows={3}
              sx={{ ...inputSx, gridColumn: { sm: "1 / -1" } }}
              value={newSpec.remark}
              onChange={handleSpecChange}
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
              onClick={saveSpec}
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
                "Update Specification"
              ) : (
                "Create Specification"
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
              Are you sure you want to delete this specification record?
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
                  DC Id:{" "}
                  <strong>
                    {dcLabelById.get(selectedRecord.DCId) ||
                      selectedRecord.DCId}
                  </strong>
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Accepted By:{" "}
                  <strong>{selectedRecord.acceptedBy || "—"}</strong>
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Spec Release Date:{" "}
                  <strong>
                    {selectedRecord.specReleaseDate
                      ? new Date(
                          selectedRecord.specReleaseDate
                        ).toLocaleDateString()
                      : "—"}
                  </strong>
                </Typography>
              </Box>
            )}
            <Alert severity="warning" sx={{ mt: selectedRecord ? 0 : 2.5 }}>
              This action cannot be undone. All data associated with this
              specification will be permanently deleted.
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

export default Specification;