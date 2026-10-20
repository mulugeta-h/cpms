// pages/Design.jsx
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
  MenuItem
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
  Upload as UploadIcon,
  Download as DownloadIcon
} from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const API_URL = `${import.meta.env.VITE_API_URL}/api/designs`;
const INPROGRESS_DCIDS_URL = `${API_URL}/inprogress-dcids`;

const STATUS_OPTIONS = ["In Progress", "Completed", "Rejected", "Cancelled"];

// ✅ NEW — allowed CAD / archive extensions
const ALLOWED_EXTS = [".dwg", ".zip", ".rar", ".iso"];
const ALLOWED_EXTS_LABEL = ALLOWED_EXTS.join(", ");
const FILE_ACCEPT_ATTR = ALLOWED_EXTS.join(",");

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

const formatDCIdLabel = (opt) => {
  if (!opt) return "";
  const id = String(opt.DCId || "").trim();
  const place = String(opt.placeofSite || "").trim();
  return place ? `${id} (${place})` : id;
};

const makeEmptyDesign = () => ({
  DCId: "",
  siteVisitDate: getToday(),
  siteVisitPurpose: "",
  drawingReleaseDate: getToday(),
  branchHandOverDate: getToday(),
  acceptedBy: "",
  drawingFileName: "",
  remark: ""
});

// ✅ NEW — returns true if filename ends with an allowed extension
const isAllowedFileName = (name) => {
  if (!name) return false;
  const lower = String(name).toLowerCase();
  return ALLOWED_EXTS.some((ext) => lower.endsWith(ext));
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

const Design = () => {
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
        fullName: userData.fullName || userData.name
      };
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  }, [token]);

  /* ---------------- State ---------------- */
  const [designs, setDesigns] = useState([]);
  const [dcIdOptions, setDcIdOptions] = useState([]);
  const [selectedDCId, setSelectedDCId] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [newDesign, setNewDesign] = useState(makeEmptyDesign);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success"
  });
  const [selectedRowId, setSelectedRowId] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  /* ---------------- CAD upload / download ---------------- */
  const fileInputRef = useRef(null);
  const [uploadTargetId, setUploadTargetId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  /* ---------------- Replace confirmation ---------------- */
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState(null);

  /* ---------------- Abort controllers ---------------- */
  const designsAbortRef = useRef(null);
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
      const res = await axios.get(INPROGRESS_DCIDS_URL, {
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

  /* ---------------- Fetch designs (all, once) ---------------- */
  const fetchDesigns = useCallback(async () => {
    if (designsAbortRef.current) designsAbortRef.current.abort();
    const controller = new AbortController();
    designsAbortRef.current = controller;

    try {
      setLoading(true);
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      });
      setDesigns(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      if (axios.isCancel(err) || err.name === "CanceledError") return;
      handleApiError(err, "Failed to fetch designs");
    } finally {
      if (designsAbortRef.current === controller) setLoading(false);
    }
  }, [token, handleApiError]);

  /* ---------------- Initial load (single effect) ---------------- */
  useEffect(() => {
    const init = async () => {
      await fetchDCIds();
      await fetchDesigns();
    };
    init();
  }, [fetchDCIds, fetchDesigns]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, selectedDCId, searchTerm]);

  /* ---------------- Form handlers ---------------- */
  const handleDesignChange = (e) => {
    const { name, value } = e.target;
    setNewDesign((prev) => ({ ...prev, [name]: value }));
  };

  const saveDesign = async () => {
    if (!newDesign.DCId?.trim()) {
      return showSnackbar("DC Id is required", "error");
    }

    try {
      setLoading(true);
      const designData = {
        DCId: newDesign.DCId,
        siteVisitDate: newDesign.siteVisitDate || null,
        siteVisitPurpose: newDesign.siteVisitPurpose || "",
        drawingReleaseDate: newDesign.drawingReleaseDate || null,
        branchHandOverDate: newDesign.branchHandOverDate || null,
        remark: newDesign.remark || ""
      };
      if (editId) designData.acceptedBy = newDesign.acceptedBy || "";

      const response = editId
        ? await axios.put(`${API_URL}/${editId}`, designData, {
            headers: { Authorization: `Bearer ${token}` }
          })
        : await axios.post(API_URL, designData, {
            headers: { Authorization: `Bearer ${token}` }
          });

      showSnackbar(
        response.data.message ||
          (editId
            ? "Design updated successfully"
            : "Design created successfully")
      );
      setFormOpen(false);
      setEditId(null);
      setNewDesign(makeEmptyDesign());
      fetchDesigns();
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
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar(res.data.message || "Design deleted successfully", "warning");
      fetchDesigns();
      fetchDCIds();
    } catch (err) {
      handleApiError(err, "Delete Failed");
    } finally {
      handleDeleteDialogClose();
    }
  };

  /* ---------------- CAD upload ---------------- */
  const openFilePicker = (id) => {
    setUploadTargetId(id);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleUploadClick = (record) => {
    if (record?.drawingFileName) {
      setReplaceTarget(record);
      setReplaceDialogOpen(true);
      return;
    }
    openFilePicker(record._id);
  };

  const handleReplaceDialogClose = () => {
    setReplaceDialogOpen(false);
    setReplaceTarget(null);
  };

  const handleConfirmReplace = () => {
    const rec = replaceTarget;
    handleReplaceDialogClose();
    if (rec) openFilePicker(rec._id);
  };

  const handleCADFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;

    // ✅ Validate against all allowed extensions
    if (!isAllowedFileName(file.name)) {
      showSnackbar(
        `Only ${ALLOWED_EXTS_LABEL} files are allowed.`,
        "error"
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadTargetId(null);
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(
        `${API_URL}/${uploadTargetId}/upload-cad`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSnackbar(
        res.data?.message || "File uploaded successfully",
        "success"
      );
      fetchDesigns();
    } catch (err) {
      handleApiError(err, "Failed to upload file");
    } finally {
      setUploading(false);
      setUploadTargetId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ---------------- CAD download ---------------- */
  const handleDownloadCAD = async (record) => {
    if (!record?.drawingFileName) {
      showSnackbar("No file uploaded for this design", "error");
      return;
    }

    try {
      setDownloading(true);
      const res = await axios.get(
        `${API_URL}/${record._id}/download-cad`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob"
        }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", record.drawingFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showSnackbar("Download started", "success");
    } catch (err) {
      let msg = "Failed to download file";
      try {
        if (err.response?.data instanceof Blob) {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed?.message) msg = parsed.message;
        } else if (err.response?.data?.message) {
          msg = err.response.data.message;
        }
      } catch (_) {
        /* ignore */
      }
      showSnackbar(msg, "error");
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setDownloading(false);
    }
  };

  /* ---------------- Filtering + pagination (client-side) ------------ */
  const filteredDesigns = useMemo(() => {
    let filtered = designs;

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
  }, [designs, searchTerm, statusFilter, selectedDCId]);

  const paginatedDesigns = useMemo(
    () =>
      filteredDesigns.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [filteredDesigns, page, rowsPerPage]
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

  const handleEditDesign = (design) => {
    setEditId(design._id);
    setNewDesign({
      DCId: design.DCId || "",
      siteVisitDate: toDateInput(design.siteVisitDate),
      siteVisitPurpose: design.siteVisitPurpose || "",
      drawingReleaseDate: toDateInput(design.drawingReleaseDate),
      branchHandOverDate: toDateInput(design.branchHandOverDate),
      acceptedBy: design.acceptedBy || "",
      drawingFileName: design.drawingFileName || "",
      remark: design.remark || ""
    });
    setFormOpen(true);
  };

  const handleCreateDesign = () => {
    setEditId(null);
    setNewDesign(makeEmptyDesign());
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
        maxWidth: "100%"
      }}
    >
      {/* ✅ accept all four extensions */}
      <input
        type="file"
        accept={FILE_ACCEPT_ATTR}
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleCADFileSelected}
      />

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
              onClick={handleCreateDesign}
            >
              New Design
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
                fetchDesigns();
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
              {filteredDesigns.length} records
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
                  minWidth: 1400,
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
                      "Requested by",
                      "Request Type",
                      "Requested Date",
                      "Place of site",
                      "Assigned Engineer",
                      "Site Visit Date",
                      "Site Visit Purpose",
                      "Drawing Release",
                      "Branch Hand Over",
                      "Accepted By",
                      "Drawing File",
                      "Remark",
                      "Status",
                      "Actions"
                    ].map((h) => (
                      <TableCell key={h} sx={lightStyles.tableHeader}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginatedDesigns.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={16}
                        sx={{ textAlign: "center", py: 4, color: "#666" }}
                      >
                        No designs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedDesigns.map((r, i) => (
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
                                whiteSpace: "nowrap"
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
                                whiteSpace: "nowrap"
                              }}
                            >
                              {r.siteVisitPurpose || "—"}
                            </Typography>
                          </Tooltip>
                        </TableCell>

                        <TableCell sx={lightStyles.tableCell}>
                          {r.drawingReleaseDate
                            ? new Date(
                                r.drawingReleaseDate
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

                        <TableCell
                          sx={{
                            ...lightStyles.tableCell,
                            whiteSpace: "nowrap",
                            maxWidth: 320,
                            width: "auto"
                          }}
                        >
                          <Tooltip title={r.drawingFileName || "—"}>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 300,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {r.drawingFileName || "—"}
                            </Typography>
                          </Tooltip>
                        </TableCell>

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
                                color: "#000000"
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditDesign(r);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>

                          <IconButton
                            size="small"
                            disabled={uploading && uploadTargetId === r._id}
                            sx={{
                              color: "#1565c0",
                              "&:hover": {
                                bgcolor: "#1565c0",
                                color: "#ffffff"
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUploadClick(r);
                            }}
                            title={
                              r.drawingFileName
                                ? `Replace existing file (${ALLOWED_EXTS_LABEL})`
                                : `Upload file (${ALLOWED_EXTS_LABEL})`
                            }
                          >
                            {uploading && uploadTargetId === r._id ? (
                              <CircularProgress
                                size={16}
                                sx={{ color: "inherit" }}
                              />
                            ) : (
                              <UploadIcon fontSize="small" />
                            )}
                          </IconButton>

                          {r.drawingFileName ? (
                            <IconButton
                              size="small"
                              disabled={downloading}
                              sx={{
                                color: "#2e7d32",
                                "&:hover": {
                                  bgcolor: "#2e7d32",
                                  color: "#ffffff"
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadCAD(r);
                              }}
                              title={`Download ${r.drawingFileName}`}
                            >
                              {downloading ? (
                                <CircularProgress
                                  size={16}
                                  sx={{ color: "inherit" }}
                                />
                              ) : (
                                <DownloadIcon fontSize="small" />
                              )}
                            </IconButton>
                          ) : null}

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
            count={filteredDesigns.length}
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
          maxWidth="md"
          PaperProps={{
            sx: {
              ...lightStyles.dialogPaper,
              borderRadius: "12px",
              width: { xs: "95%", sm: "640px" },
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
            <Typography variant="h6" fontWeight="900">
              {editId !== null ? "EDIT DESIGN" : "CREATE DESIGN"}
            </Typography>
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
                value={newDesign.DCId || ""}
                onChange={handleDesignChange}
                sx={selectSx}
                renderValue={(selected) => {
                  if (!selected) {
                    return (
                      <em style={{ color: "#999" }}>Select DC Id…</em>
                    );
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
              label="Site Visit Date"
              name="siteVisitDate"
              type="date"
              size="small"
              sx={{ ...inputSx, mt: 2.5 }}
              value={newDesign.siteVisitDate}
              onChange={handleDesignChange}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Site Visit Purpose"
              name="siteVisitPurpose"
              size="small"
              sx={inputSx}
              value={newDesign.siteVisitPurpose}
              onChange={handleDesignChange}
            />

            {editId && (
              <TextField
                fullWidth
                label="Accepted By"
                name="acceptedBy"
                size="small"
                sx={inputSx}
                value={newDesign.acceptedBy}
                onChange={handleDesignChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: "#FFD600" }} />
                    </InputAdornment>
                  )
                }}
              />
            )}

            <TextField
              fullWidth
              label="Drawing Release Date"
              name="drawingReleaseDate"
              type="date"
              size="small"
              sx={inputSx}
              value={newDesign.drawingReleaseDate}
              onChange={handleDesignChange}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Branch Hand Over Date"
              name="branchHandOverDate"
              type="date"
              size="small"
              sx={inputSx}
              value={newDesign.branchHandOverDate}
              onChange={handleDesignChange}
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
              value={newDesign.remark}
              onChange={handleDesignChange}
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
              onClick={saveDesign}
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
                "Update Design"
              ) : (
                "Create Design"
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* --- REPLACE EXISTING FILE CONFIRMATION DIALOG --- */}
        <Dialog
          open={replaceDialogOpen}
          onClose={handleReplaceDialogClose}
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
            <WarningIcon sx={{ color: "#f57c00", fontSize: 32 }} />
            <Typography variant="h6">Replace existing file?</Typography>
          </DialogTitle>
          <DialogContent dividers sx={lightStyles.dialogContent}>
            <Typography variant="body1" gutterBottom>
              This design already has a file uploaded. Uploading a new one
              will overwrite the existing file on the server.
            </Typography>
            {replaceTarget && (
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
                    {dcidLabelById.get(replaceTarget.DCId) ||
                      replaceTarget.DCId}
                  </strong>
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Current file:{" "}
                  <strong>{replaceTarget.drawingFileName || "—"}</strong>
                </Typography>
              </Box>
            )}
            <Alert severity="info" sx={{ mt: 1 }}>
              Allowed formats: <strong>{ALLOWED_EXTS_LABEL}</strong>
            </Alert>
            <Alert severity="warning" sx={{ mt: 1 }}>
              The previous file will be permanently lost.
            </Alert>
          </DialogContent>
          <DialogActions sx={lightStyles.dialogActions}>
            <Button
              onClick={handleReplaceDialogClose}
              variant="outlined"
              sx={{ borderColor: "#666", color: "#666" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReplace}
              variant="contained"
              sx={{
                bgcolor: "#f57c00",
                color: "#ffffff",
                fontWeight: "bold",
                "&:hover": { bgcolor: "#e65100" }
              }}
            >
              Yes, replace file
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
              Are you sure you want to delete this design record?
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
                  Accepted By:{" "}
                  <strong>{selectedRecord.acceptedBy || "—"}</strong>
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Drawing File:{" "}
                  <strong>{selectedRecord.drawingFileName || "—"}</strong>
                </Typography>
              </Box>
            )}
            <Alert severity="warning" sx={{ mt: selectedRecord ? 0 : 2.5 }}>
              This action cannot be undone. All data associated with this
              design will be permanently deleted.
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

export default Design;