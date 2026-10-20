// pages/estimation/EstimationReport.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Box, Typography, Button, Paper, Stack, Snackbar, Alert, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, useMediaQuery, useTheme, TextField,
  ToggleButton, ToggleButtonGroup, Collapse, Chip, Tooltip,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  CalendarMonth as CalendarIcon,
  FileDownload as FileDownloadIcon,
  SwapHoriz as SwapIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const API_BASE = `${import.meta.env.VITE_API_URL}/api/estimation-reports`;
const URL_BY_TYPE = `${API_BASE}/by-type`;
const URL_BY_PURPOSE = `${API_BASE}/by-purpose`;

/* ============================================================
   HELPERS
============================================================= */
const FALLBACK_STATUSES = ["In Progress", "Completed", "Rejected"];

const getToday = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().split("T")[0];
};
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const fileStamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  );
};
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const mergeStatuses = (fromApi) => {
  const list = Array.isArray(fromApi) ? [...fromApi] : [];
  for (const st of FALLBACK_STATUSES) if (!list.includes(st)) list.push(st);
  return [
    ...FALLBACK_STATUSES.filter((st) => list.includes(st)),
    ...list.filter((st) => !FALLBACK_STATUSES.includes(st)),
  ];
};

const shortStatusLabel = (st) => {
  const lc = String(st).toLowerCase();
  if (lc === "in progress") return "In Progr.";
  if (lc === "completed") return "Compl.";
  if (lc === "rejected") return "Rej.";
  if (lc === "cancelled") return "Canc.";
  if (lc === "pending") return "Pend.";
  return st;
};

/* ============================================================
   TRANSPOSE (rows ↔ cols, status sub-cols preserved)
============================================================= */
const transposePivot = (data) => {
  if (!data) return data;
  const statuses = mergeStatuses(data.statuses);
  const oldRows = data.rowValues || [];
  const oldCols = data.colValues || [];
  const oldCells = data.cells || {};
  const oldRowTotals = data.rowTotals || {};
  const oldColTotals = data.colTotals || {};

  const newRows = oldCols;
  const newCols = oldRows;
  const newCells = {};

  for (const eng of newRows) {
    newCells[eng] = {};
    for (const rv of newCols) {
      const src = oldCells[rv]?.[eng] || {};
      const dst = { __total: num(src.__total) };
      for (const st of statuses) dst[st] = num(src[st]);
      newCells[eng][rv] = dst;
    }
  }

  const newRowTotals = {};
  for (const eng of newRows) newRowTotals[eng] = num(oldColTotals[eng]);

  const newRowStatusTotals = {};
  for (const eng of newRows) {
    const rst = { __total: 0 };
    for (const st of statuses) rst[st] = 0;
    for (const rv of newCols) {
      const cell = newCells[eng][rv];
      for (const st of statuses) rst[st] += num(cell[st]);
      rst.__total += num(cell.__total);
    }
    newRowStatusTotals[eng] = rst;
  }

  const newColTotals = {};
  for (const rv of newCols) newColTotals[rv] = num(oldRowTotals[rv]);

  const newColStatusTotals = {};
  for (const rv of newCols) {
    const cst = { __total: 0 };
    for (const st of statuses) cst[st] = 0;
    for (const eng of newRows) {
      const cell = newCells[eng][rv];
      for (const st of statuses) cst[st] += num(cell[st]);
      cst.__total += num(cell.__total);
    }
    newColStatusTotals[rv] = cst;
  }

  return {
    ...data,
    rowValues: newRows,
    colValues: newCols,
    cells: newCells,
    rowTotals: newRowTotals,
    rowStatusTotals: newRowStatusTotals,
    colTotals: newColTotals,
    colStatusTotals: newColStatusTotals,
    rowKey: data.colKey,
    colKey: data.rowKey,
  };
};

/* ============================================================
   EXCEL
============================================================= */
const HEX_YELLOW      = "FFFFD600";
const HEX_LIGHT_GRAY  = "FFF5F5F5";
const HEX_SOFT_YELLOW = "FFFFF8D6";
const HEX_GRAND_TOTAL = "FFFFF3C4";
const HEX_TOTAL_ROW   = "FFFFFBE6";
const HEX_BLACK       = "FF000000";
const HEX_DARK_AMBER  = "FF8D6E00";
const HEX_GRID_LINE   = "FFE0E0E0";

const STATUS_FILL = {
  "in progress": "FFE3F2FD",
  completed:     "FFE8F5E9",
  rejected:      "FFFFEBEE",
  cancelled:     "FFECEFF1",
  pending:       "FFFFF3E0",
};
const STATUS_TEXT = {
  "in progress": "FF0D47A1",
  completed:     "FF1B5E20",
  rejected:      "FFB71C1C",
  cancelled:     "FF37474F",
  pending:       "FFE65100",
};
const STATUS_TINT = {
  "in progress": "FFEFF7FE",
  completed:     "FFF1F8E9",
  rejected:      "FFFDE7E7",
  cancelled:     "FFEEF2F4",
  pending:       "FFFFF8E1",
};

const statusFill = (st) => STATUS_FILL[String(st).toLowerCase()] || HEX_LIGHT_GRAY;
const statusTextColor = (st) => STATUS_TEXT[String(st).toLowerCase()] || HEX_BLACK;
const statusTint = (st) => STATUS_TINT[String(st).toLowerCase()] || null;

const thinGrid = { style: "thin", color: { argb: HEX_GRID_LINE } };
const thickYellow = { style: "medium", color: { argb: HEX_YELLOW } };

const writeReportSheet = ({ worksheet, startRow, title, report }) => {
  if (!report) {
    worksheet.getRow(startRow).getCell(1).value = `${title} — No data`;
    return startRow + 1;
  }
  const statuses = mergeStatuses(report.statuses);
  const rowValues = report.rowValues || [];
  const colValues = report.colValues || [];
  const cells = report.cells || {};
  const rowTotals = report.rowTotals || {};
  const rowStatusTotals = report.rowStatusTotals || {};
  const colTotals = report.colTotals || {};
  const colStatusTotals = report.colStatusTotals || {};

  const perGroup = statuses.length + 1;
  const totalCols = 1 + colValues.length * perGroup + perGroup;
  let r = startRow;

  const titleRow = worksheet.getRow(r);
  titleRow.getCell(1).value = title;
  titleRow.getCell(1).font = { bold: true, size: 14 };
  titleRow.height = 22;
  worksheet.mergeCells(r, 1, r, totalCols);
  r++;

  const rangeRow = worksheet.getRow(r);
  rangeRow.getCell(1).value = `Range: ${report?.range?.label || ""}`;
  rangeRow.getCell(1).font = { italic: true, color: { argb: "FF666666" } };
  worksheet.mergeCells(r, 1, r, totalCols);
  r++;

  const tier1 = worksheet.getRow(r);
  const corner = tier1.getCell(1);
  corner.value = `${report?.colKey || "Assigned"} / ${report?.rowKey || "Row"}`;
  corner.font = { bold: true };
  corner.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  corner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEX_LIGHT_GRAY } };
  corner.border = { bottom: thickYellow, right: thinGrid };
  worksheet.mergeCells(r, 1, r + 1, 1);

  let col = 2;
  for (const c of colValues) {
    const cell = tier1.getCell(col);
    cell.value = c;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEX_SOFT_YELLOW } };
    cell.border = { left: thickYellow, bottom: thinGrid };
    worksheet.mergeCells(r, col, r, col + perGroup - 1);
    col += perGroup;
  }
  const g1 = tier1.getCell(col);
  g1.value = "Grand Total";
  g1.font = { bold: true, color: { argb: HEX_DARK_AMBER } };
  g1.alignment = { horizontal: "center" };
  g1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEX_GRAND_TOTAL } };
  g1.border = { left: thickYellow, bottom: thinGrid };
  worksheet.mergeCells(r, col, r, col + perGroup - 1);
  r++;

  const tier2 = worksheet.getRow(r);
  col = 2;
  for (const _c of colValues) {
    for (let i = 0; i < statuses.length; i++) {
      const st = statuses[i];
      const cell = tier2.getCell(col);
      cell.value = shortStatusLabel(st);
      cell.font = { bold: true, size: 10, color: { argb: statusTextColor(st) } };
      cell.alignment = { horizontal: "center" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusFill(st) } };
      cell.border = { left: i === 0 ? thickYellow : thinGrid, bottom: thickYellow };
      col++;
    }
    const sc = tier2.getCell(col);
    sc.value = "Total";
    sc.font = { bold: true, size: 10, color: { argb: HEX_DARK_AMBER } };
    sc.alignment = { horizontal: "center" };
    sc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEX_SOFT_YELLOW } };
    sc.border = { bottom: thickYellow };
    col++;
  }
  for (let i = 0; i < statuses.length; i++) {
    const st = statuses[i];
    const cell = tier2.getCell(col);
    cell.value = shortStatusLabel(st);
    cell.font = { bold: true, size: 10, color: { argb: statusTextColor(st) } };
    cell.alignment = { horizontal: "center" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusFill(st) } };
    cell.border = { left: i === 0 ? thickYellow : thinGrid, bottom: thickYellow };
    col++;
  }
  const gs = tier2.getCell(col);
  gs.value = "Total";
  gs.font = { bold: true, size: 10, color: { argb: HEX_DARK_AMBER } };
  gs.alignment = { horizontal: "center" };
  gs.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEX_GRAND_TOTAL } };
  gs.border = { bottom: thickYellow };
  r++;

  for (const rv of rowValues) {
    const row = worksheet.getRow(r);
    const rst = rowStatusTotals[rv] || {};
    row.getCell(1).value = rv;
    row.getCell(1).font = { bold: true };
    row.getCell(1).border = { bottom: thinGrid, right: thinGrid };

    let c2 = 2;
    for (const cv of colValues) {
      const cell = cells[rv]?.[cv] || {};
      for (let i = 0; i < statuses.length; i++) {
        const st = statuses[i];
        const v = num(cell[st]);
        const xc = row.getCell(c2);
        xc.value = v;
        xc.alignment = { horizontal: "center" };
        xc.border = { left: i === 0 ? thickYellow : thinGrid, bottom: thinGrid };
        const tint = v > 0 ? statusTint(st) : null;
        if (tint) xc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tint } };
        c2++;
      }
      const sc = row.getCell(c2);
      sc.value = num(cell.__total);
      sc.font = { bold: true };
      sc.alignment = { horizontal: "center" };
      sc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEX_SOFT_YELLOW } };
      sc.border = { bottom: thinGrid };
      c2++;
    }
    for (let i = 0; i < statuses.length; i++) {
      const st = statuses[i];
      const xc = row.getCell(c2);
      xc.value = num(rst[st]);
      xc.alignment = { horizontal: "center" };
      xc.border = { left: i === 0 ? thickYellow : thinGrid, bottom: thinGrid };
      c2++;
    }
    const gt = row.getCell(c2);
    gt.value = num(rst.__total ?? rowTotals[rv]);
    gt.font = { bold: true };
    gt.alignment = { horizontal: "center" };
    gt.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEX_GRAND_TOTAL } };
    gt.border = { bottom: thinGrid };
    r++;
  }

  const totRow = worksheet.getRow(r);
  totRow.getCell(1).value = "Total";
  totRow.getCell(1).font = { bold: true };
  totRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEX_TOTAL_ROW } };
  totRow.getCell(1).border = { top: thickYellow, right: thinGrid };

  let c3 = 2;
  for (const cv of colValues) {
    for (let i = 0; i < statuses.length; i++) {
      const st = statuses[i];
      let sum = 0;
      for (const rv of rowValues) sum += num(cells[rv]?.[cv]?.[st]);
      const xc = totRow.getCell(c3);
      xc.value = sum;
      xc.font = { bold: true };
      xc.alignment = { horizontal: "center" };
      xc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEX_TOTAL_ROW } };
      xc.border = { top: thickYellow, left: i === 0 ? thickYellow : thinGrid };
      c3++;
    }
    const sc = totRow.getCell(c3);
    sc.value = num(colTotals[cv]);
    sc.font = { bold: true };
    sc.alignment = { horizontal: "center" };
    sc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEX_TOTAL_ROW } };
    sc.border = { top: thickYellow };
    c3++;
  }
  for (let i = 0; i < statuses.length; i++) {
    const st = statuses[i];
    const xc = totRow.getCell(c3);
    xc.value = num(colStatusTotals[st]);
    xc.font = { bold: true };
    xc.alignment = { horizontal: "center" };
    xc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEX_GRAND_TOTAL } };
    xc.border = { top: thickYellow, left: i === 0 ? thickYellow : thinGrid };
    c3++;
  }
  const gt = totRow.getCell(c3);
  gt.value = num(report.grandTotal);
  gt.font = { bold: true, size: 12 };
  gt.alignment = { horizontal: "center" };
  gt.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEX_GRAND_TOTAL } };
  gt.border = { top: thickYellow, left: thickYellow };
  r++;

  worksheet.getColumn(1).width = 28;
  for (let i = 2; i <= totalCols; i++) worksheet.getColumn(i).width = 12;

  return r + 1;
};

const downloadOneXlsx = async (sheetName, title, report) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", xSplit: 1, ySplit: 0 }],
  });
  writeReportSheet({ worksheet: ws, startRow: 1, title, report });
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `${sheetName}_${fileStamp()}.xlsx`);
};

const downloadBothXlsx = async (byType, byPurpose) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Estimation Report", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 0 }],
  });
  let r = 1;
  r = writeReportSheet({
    worksheet: ws, startRow: r,
    title: "ESTIMATION BY TYPE OF PROPERTY", report: byType,
  });
  writeReportSheet({
    worksheet: ws, startRow: r + 1,
    title: "ESTIMATION BY PURPOSE OF VALUATION", report: byPurpose,
  });
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `Estimation_Report_${fileStamp()}.xlsx`);
};

/* ============================================================
   STYLES
============================================================= */
const inputSx = {
  "& .MuiOutlinedInput-root": {
    color: "#000", backgroundColor: "#fff", minHeight: 40,
    "& fieldset": { borderColor: "#e0e0e0" },
    "&:hover fieldset": { borderColor: "#FFD600" },
    "&.Mui-focused fieldset": { borderColor: "#FFD600" },
  },
  "& .MuiOutlinedInput-input": { padding: "8.5px 12px" },
  "& .MuiInputLabel-root": { color: "#666" },
};

const lightStyles = {
  paper: {
    bgcolor: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px",
    color: "#000", boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
  },
  actionBtn: {
    background: "#FFD600", color: "#000", fontWeight: "bold",
    "&:hover": { background: "#ffcc00", boxShadow: "0 0 15px #FFD600" },
  },
  tableHeader: {
    color: "#000", fontWeight: "bold", borderBottom: "2px solid #FFD600",
    backgroundColor: "#f5f5f5", position: "sticky", top: 0, zIndex: 2, whiteSpace: "nowrap",
  },
  tableCell: {
    color: "#000", borderBottom: "1px solid #e0e0e0", whiteSpace: "nowrap",
  },
  totalRowCell: {
    color: "#000", borderTop: "2px solid #FFD600",
    backgroundColor: "#fffbe6", fontWeight: "bold", whiteSpace: "nowrap",
  },
  totalColCell: {
    color: "#000", borderLeft: "2px solid #FFD600",
    backgroundColor: "#fffbe6", fontWeight: "bold", whiteSpace: "nowrap",
  },
};

const scrollbarStyles = {
  "&::-webkit-scrollbar": { width: "8px", height: "8px" },
  "&::-webkit-scrollbar-track": { backgroundColor: "#f1f1f1", borderRadius: "4px" },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "#DAA520", borderRadius: "4px",
    "&:hover": { backgroundColor: "#b8860b" },
  },
};

const statusBg = (st) => {
  const lc = String(st).toLowerCase();
  if (lc === "completed") return "#e8f5e9";
  if (lc === "rejected") return "#ffebee";
  if (lc === "cancelled") return "#eceff1";
  if (lc === "in progress") return "#e3f2fd";
  if (lc === "pending") return "#fff3e0";
  return "#f5f5f5";
};
const statusText = (st) => {
  const lc = String(st).toLowerCase();
  if (lc === "completed") return "#1b5e20";
  if (lc === "rejected") return "#b71c1c";
  if (lc === "cancelled") return "#37474f";
  if (lc === "in progress") return "#0d47a1";
  if (lc === "pending") return "#e65100";
  return "#333";
};
const statusCellBg = (st, value) => {
  if (!value || value <= 0) return "transparent";
  const lc = String(st).toLowerCase();
  if (lc === "completed") return "rgba(76,175,80,0.06)";
  if (lc === "rejected") return "rgba(244,67,54,0.06)";
  if (lc === "cancelled") return "rgba(120,144,156,0.06)";
  if (lc === "in progress") return "rgba(33,150,243,0.05)";
  if (lc === "pending") return "rgba(255,152,0,0.06)";
  return "transparent";
};

/* ============================================================
   PIVOT TABLE
============================================================= */
const PivotTable = ({
  title,
  sheetName,
  data,
  loading,
  error,
  onExport,
  transposed,
}) => {
  const view = useMemo(() => {
    if (!data) return data;
    return transposed ? transposePivot(data) : data;
  }, [data, transposed]);

  if (loading) {
    return (
      <Paper sx={{ ...lightStyles.paper, p: 4, mb: 3 }}>
        <Typography variant="h6" fontWeight="900" mb={2}>{title}</Typography>
        <Box textAlign="center" py={4}>
          <CircularProgress sx={{ color: "#FFD600" }} />
        </Box>
      </Paper>
    );
  }
  if (error) {
    return (
      <Paper sx={{ ...lightStyles.paper, p: 2, mb: 3 }}>
        <Typography variant="h6" fontWeight="900" mb={1}>{title}</Typography>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  const statuses = mergeStatuses(view?.statuses);
  const rows = view?.rowValues || [];
  const cols = view?.colValues || [];
  const cells = view?.cells || {};
  const rowTotals = view?.rowTotals || {};
  const rowStatusTotals = view?.rowStatusTotals || {};
  const colTotals = view?.colTotals || {};
  const colStatusTotals = view?.colStatusTotals || {};
  const grandTotal = num(view?.grandTotal);
  const canExport = !!view;

  const cornerLabel = `${view?.colKey || "Assigned"} / ${view?.rowKey || "Row"}`;

  return (
    <Paper sx={{ ...lightStyles.paper, mb: 3, overflow: "hidden" }}>
      <Box
        sx={{
          px: 2, py: 1.5, borderBottom: "1px solid #eee", bgcolor: "#fafafa",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 1,
        }}
      >
        <Typography variant="h6" fontWeight="900">{title}</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {view?.range?.label && (
            <Chip
              size="small"
              icon={<CalendarIcon fontSize="small" />}
              label={view.range.label}
              sx={{
                bgcolor: "#fff8e1", color: "#8d6e00",
                border: "1px solid #FFD600", fontWeight: "bold",
              }}
            />
          )}
          <Chip
            size="small"
            label={`${grandTotal} records`}
            sx={{
              bgcolor: "rgba(255,214,0,0.1)", color: "#000",
              border: "1px solid #e0e0e0", fontWeight: "bold",
            }}
          />
          <Tooltip title={`Export ${title} to Excel`}>
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileDownloadIcon fontSize="small" />}
                disabled={!canExport}
                onClick={() => onExport?.(sheetName, title, view)}
                sx={{
                  borderColor: "#FFD600", color: "#000", fontWeight: "bold",
                  textTransform: "none",
                  "&:hover": { borderColor: "#ffcc00", bgcolor: "#fff8d6" },
                  "&.Mui-disabled": { borderColor: "#e0e0e0", color: "#aaa" },
                }}
              >
                Export
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {rows.length === 0 || cols.length === 0 ? (
        <Box p={4} textAlign="center">
          <Typography color="text.secondary">No data for this range</Typography>
        </Box>
      ) : (
        <TableContainer sx={{ maxHeight: 520, overflow: "auto", ...scrollbarStyles }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell
                  rowSpan={2}
                  sx={{
                    ...lightStyles.tableHeader, minWidth: 200,
                    verticalAlign: "middle", textAlign: "center",
                  }}
                >
                  {cornerLabel}
                </TableCell>
                {cols.map((c) => (
                  <TableCell
                    key={c}
                    colSpan={statuses.length + 1}
                    align="center"
                    sx={{
                      ...lightStyles.tableHeader,
                      borderLeft: "2px solid #FFD600",
                      bgcolor: "#fffbe6", minWidth: 100,
                    }}
                  >
                    {c}
                  </TableCell>
                ))}
                <TableCell
                  colSpan={statuses.length + 1}
                  align="center"
                  sx={{
                    ...lightStyles.tableHeader,
                    borderLeft: "2px solid #FFD600",
                    bgcolor: "#fff3c4", minWidth: 100, fontWeight: 900,
                  }}
                >
                  Grand Total
                </TableCell>
              </TableRow>

              <TableRow>
                {cols.flatMap((c) =>
                  [...statuses, "Total"].map((st, idx) => (
                    <TableCell
                      key={`${c}-${st}`}
                      align="center"
                      sx={{
                        ...lightStyles.tableHeader,
                        fontSize: "0.72rem", py: 0.75, minWidth: 70,
                        bgcolor: st === "Total" ? "#fff8d6" : statusBg(st),
                        color: st === "Total" ? "#8d6e00" : statusText(st),
                        borderLeft: idx === 0 ? "2px solid #FFD600" : "none",
                        fontWeight: 700,
                      }}
                    >
                      {st === "Total" ? "Total" : shortStatusLabel(st)}
                    </TableCell>
                  ))
                )}
                {[...statuses, "Total"].map((st, idx) => (
                  <TableCell
                    key={`grand-${st}`}
                    align="center"
                    sx={{
                      ...lightStyles.tableHeader,
                      fontSize: "0.72rem", py: 0.75, minWidth: 70,
                      bgcolor: st === "Total" ? "#fff3c4" : statusBg(st),
                      color: st === "Total" ? "#8d6e00" : statusText(st),
                      borderLeft: idx === 0 ? "2px solid #FFD600" : "none",
                      fontWeight: 700,
                    }}
                  >
                    {st === "Total" ? "Total" : shortStatusLabel(st)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((r) => {
                const rst = rowStatusTotals[r] || {};
                return (
                  <TableRow key={r} hover>
                    <TableCell sx={{ ...lightStyles.tableCell, fontWeight: "bold" }}>
                      {r}
                    </TableCell>
                    {cols.flatMap((c) =>
                      [...statuses, "Total"].map((st, idx) => {
                        const cell = cells[r]?.[c] || {};
                        const value = st === "Total" ? num(cell.__total) : num(cell[st]);
                        return (
                          <TableCell
                            key={`${r}-${c}-${st}`}
                            align="center"
                            sx={{
                              ...lightStyles.tableCell,
                              borderLeft: idx === 0 ? "2px solid #FFD600" : "none",
                              bgcolor:
                                st === "Total" ? "#fff8d6" : statusCellBg(st, value),
                              fontWeight: st === "Total" ? 700 : 400,
                            }}
                          >
                            {value}
                          </TableCell>
                        );
                      })
                    )}
                    {[...statuses, "Total"].map((st, idx) => {
                      const value =
                        st === "Total"
                          ? num(rst.__total ?? rowTotals[r])
                          : num(rst[st]);
                      return (
                        <TableCell
                          key={`grand-${r}-${st}`}
                          align="center"
                          sx={{
                            ...lightStyles.totalColCell,
                            borderLeft: idx === 0 ? "2px solid #FFD600" : "none",
                            bgcolor:
                              st === "Total" ? "#fff3c4" : statusCellBg(st, value),
                            fontWeight: st === "Total" ? 900 : 400,
                          }}
                        >
                          {value}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}

              <TableRow>
                <TableCell sx={lightStyles.totalRowCell}>Total</TableCell>
                {cols.flatMap((c) =>
                  [...statuses, "Total"].map((st, idx) => {
                    let sum = 0;
                    if (st === "Total") sum = num(colTotals[c]);
                    else for (const r of rows) sum += num(cells[r]?.[c]?.[st]);
                    return (
                      <TableCell
                        key={`total-${c}-${st}`}
                        align="center"
                        sx={{
                          ...lightStyles.totalRowCell,
                          borderLeft: idx === 0 ? "2px solid #FFD600" : "none",
                        }}
                      >
                        {sum}
                      </TableCell>
                    );
                  })
                )}
                {[...statuses, "Total"].map((st, idx) => {
                  const value = st === "Total" ? grandTotal : num(colStatusTotals[st]);
                  return (
                    <TableCell
                      key={`grand-total-${st}`}
                      align="center"
                      sx={{
                        ...lightStyles.totalRowCell,
                        borderLeft: idx === 0 ? "2px solid #FFD600" : "none",
                        bgcolor: st === "Total" ? "#fff3c4" : "#fff8d6",
                        fontWeight: 900,
                      }}
                    >
                      {value}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

/* ============================================================
   MAIN PAGE
============================================================= */
const EstimationReport = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [range, setRange] = useState("all");
  const [customFrom, setCustomFrom] = useState(firstOfMonth());
  const [customTo, setCustomTo] = useState(getToday());
  const [appliedQuery, setAppliedQuery] = useState({ range: "all" });

  const [transposed, setTransposed] = useState(false);

  // Two independent resources
  const [byType, setByType] = useState({
    data: null, loading: false, error: null, view: null,
  });
  const [byPurpose, setByPurpose] = useState({
    data: null, loading: false, error: null, view: null,
  });

  const [snackbar, setSnackbar] = useState({
    open: false, message: "", severity: "success",
  });

  const abortRefType = useRef(null);
  const abortRefPurpose = useRef(null);

  const showSnackbar = useCallback(
    (msg, severity = "success") =>
      setSnackbar({ open: true, message: msg, severity }),
    []
  );

  const buildQueryString = useCallback((q) => {
    const params = new URLSearchParams();
    params.set("range", q.range || "all");
    if (q.range === "custom") {
      if (q.from) params.set("from", q.from);
      if (q.to) params.set("to", q.to);
    }
    return params.toString();
  }, []);

  const fetchByType = useCallback(async () => {
    if (abortRefType.current) abortRefType.current.abort();
    const controller = new AbortController();
    abortRefType.current = controller;

    const qs = buildQueryString(appliedQuery);
    setByType((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await axios.get(`${URL_BY_TYPE}?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      setByType({ data: res.data, loading: false, error: null, view: res.data });
    } catch (err) {
      if (axios.isCancel(err) || err?.name === "CanceledError") return;
      const msg = err?.response?.data?.message || "Failed to fetch report by type";
      setByType({ data: null, loading: false, error: msg, view: null });
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
  }, [appliedQuery, buildQueryString, token, navigate]);

  const fetchByPurpose = useCallback(async () => {
    if (abortRefPurpose.current) abortRefPurpose.current.abort();
    const controller = new AbortController();
    abortRefPurpose.current = controller;

    const qs = buildQueryString(appliedQuery);
    setByPurpose((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await axios.get(`${URL_BY_PURPOSE}?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      setByPurpose({ data: res.data, loading: false, error: null, view: res.data });
    } catch (err) {
      if (axios.isCancel(err) || err?.name === "CanceledError") return;
      const msg = err?.response?.data?.message || "Failed to fetch report by purpose";
      setByPurpose({ data: null, loading: false, error: msg, view: null });
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
  }, [appliedQuery, buildQueryString, token, navigate]);

  useEffect(() => {
    fetchByType();
    fetchByPurpose();
  }, [fetchByType, fetchByPurpose]);

  const handleRangeChange = (e, newRange) => {
    if (!newRange) return;
    setRange(newRange);
    if (newRange !== "custom") setAppliedQuery({ range: newRange });
  };

  const handleApplyCustom = () => {
    if (!customFrom || !customTo) {
      return showSnackbar("Please pick both From and To dates", "error");
    }
    if (customFrom > customTo) {
      return showSnackbar("From date cannot be after To date", "error");
    }
    setAppliedQuery({ range: "custom", from: customFrom, to: customTo });
  };

  const handleRefresh = () => {
    fetchByType();
    fetchByPurpose();
    showSnackbar("✅ Reports refreshed", "success");
  };

  const handleExportOne = useCallback(
    async (sheetName, title, view) => {
      if (!view) return showSnackbar("Nothing to export", "error");
      try {
        await downloadOneXlsx(sheetName, title, view);
        showSnackbar(`✅ ${title} exported`, "success");
      } catch (err) {
        console.error("export error:", err);
        showSnackbar("Failed to export report", "error");
      }
    },
    [showSnackbar]
  );

  const handleExportAll = useCallback(async () => {
    if (!byType.data && !byPurpose.data) {
      return showSnackbar("Nothing to export yet", "error");
    }
    try {
      await downloadBothXlsx(byType.view, byPurpose.view);
      showSnackbar("✅ Full report exported", "success");
    } catch (err) {
      console.error("export all error:", err);
      showSnackbar("Failed to export reports", "error");
    }
  }, [byType, byPurpose, showSnackbar]);

  const rangeLabel = useMemo(() => {
    switch (range) {
      case "all": return "All Time";
      case "month": return "This Month";
      case "quarter": return "This Quarter";
      case "custom": return "Custom Range";
      default: return "";
    }
  }, [range]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5", py: isMobile ? 1 : 2, width: "100%" }}>
      <Box sx={{ width: "100%", px: { xs: 1, sm: 1, md: 0.5 } }}>
        {/* HEADER */}
        <Paper
          sx={{
            p: 1.5, mb: 2, ...lightStyles.paper,
            display: "flex", flexWrap: "wrap",
            alignItems: "center", justifyContent: "space-between", gap: 2,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center" sx={{ flexGrow: 1, flexWrap: "wrap" }}>
            <Typography variant="h6" fontWeight="900">Estimation Report</Typography>

            <ToggleButtonGroup
              value={range}
              exclusive
              onChange={handleRangeChange}
              size="small"
              sx={{
                "& .MuiToggleButton-root": {
                  color: "#000", borderColor: "#e0e0e0",
                  fontWeight: "bold", textTransform: "none", px: 2,
                  "&.Mui-selected": {
                    bgcolor: "#FFD600", color: "#000",
                    "&:hover": { bgcolor: "#ffcc00" },
                  },
                },
              }}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="month">This Month</ToggleButton>
              <ToggleButton value="quarter">This Quarter</ToggleButton>
              <ToggleButton value="custom">Custom</ToggleButton>
            </ToggleButtonGroup>

            <IconButton
              onClick={handleRefresh}
              sx={{
                border: "1px solid #FFD600",
                "&:hover": { background: "#fff8d6" },
              }}
              title="Refresh"
            >
              <RefreshIcon fontSize="small" />
            </IconButton>

            <Tooltip title={transposed ? "Default (rows = request field)" : "Transpose (rows = engineers)"}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SwapIcon fontSize="small" />}
                onClick={() => setTransposed((v) => !v)}
                sx={{
                  borderColor: "#FFD600", color: "#000",
                  fontWeight: "bold", textTransform: "none",
                  bgcolor: transposed ? "#fff8d6" : "#fff",
                  "&:hover": { borderColor: "#ffcc00", bgcolor: "#fff8d6" },
                }}
              >
                {transposed ? "By Engineer" : "Transpose"}
              </Button>
            </Tooltip>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="contained"
              size="small"
              startIcon={<FileDownloadIcon fontSize="small" />}
              onClick={handleExportAll}
              sx={{ ...lightStyles.actionBtn, textTransform: "none" }}
            >
              Export Report
            </Button>
            <Typography
              variant="caption"
              sx={{
                color: "#000", fontWeight: "bold",
                border: "1px solid #e0e0e0", px: 1.5, py: 0.5,
                borderRadius: "4px", bgcolor: "rgba(255,214,0,0.05)",
              }}
            >
              {rangeLabel}
            </Typography>
          </Stack>
        </Paper>

        {/* CUSTOM RANGE */}
        <Collapse in={range === "custom"}>
          <Paper sx={{ ...lightStyles.paper, p: 2, mb: 2, border: "1px solid #FFD600" }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "center" }}
              flexWrap="wrap"
            >
              <Typography variant="subtitle2" fontWeight="bold">
                Custom Date Range
              </Typography>
              <TextField
                label="From"
                type="date"
                size="small"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ ...inputSx, minWidth: 180 }}
              />
              <TextField
                label="To"
                type="date"
                size="small"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ ...inputSx, minWidth: 180 }}
              />
              <Button variant="contained" onClick={handleApplyCustom} sx={lightStyles.actionBtn}>
                Apply
              </Button>
            </Stack>
          </Paper>
        </Collapse>

        <PivotTable
          title="Estimation Report — By Type of Property"
          sheetName="ByType"
          data={byType.data}
          loading={byType.loading}
          error={byType.error}
          onExport={handleExportOne}
          transposed={transposed}
        />

        <PivotTable
          title="Estimation Report — By Purpose of Valuation"
          sheetName="ByPurpose"
          data={byPurpose.data}
          loading={byPurpose.loading}
          error={byPurpose.error}
          onExport={handleExportOne}
          transposed={transposed}
        />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            severity={snackbar.severity}
            sx={{
              bgcolor: "#ffffff", color: "#000000",
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

export default EstimationReport;