// controllers/DCReportController.js
// ---------------------------------------------------------------
// READ-ONLY controller. No model. No writes.
// Four count-pivots, uniform shape.
//
// Rows      = requestType  (dynamic, alphabetical — from data)
// Cols      = assignedTo   (dynamic, alphabetical — from data)
// Sub-cols  = status       (canonical first, extras after)
// Cell      = COUNT of docs where requestType=row AND assignedTo=col AND status=sub
//
// Grand Total column group also breaks down per status:
//   rowStatusTotals[requestType][status] → per-row status counts
//   colStatusTotals[status]              → global status counts
//
// Canonical statuses ["In Progress", "Completed", "Rejected"] are ALWAYS present.
//
// The frontend may render this as-is (request types on rows) or apply a
// purely cosmetic transpose (engineers on rows) — the payload is identical
// either way.
//
// Date-range filter:
//   DCRequest     → requestDate
//   Design        → createdAt
//   Specification → createdAt
//   Construction  → createdAt
// ---------------------------------------------------------------

const { DCRequest } = require("../models/DCRequest");
const Design = require("../models/Design");
const Specification = require("../models/Specification");
const Construction = require("../models/Construction");

/* =====================================================
   HELPERS
===================================================== */

const s = (v) => String(v ?? "").trim();

const CANONICAL_STATUSES = ["In Progress", "Completed", "Rejected"];
const STATUS_ORDER_HINT = [...CANONICAL_STATUSES, "Cancelled"];

/* =====================================================
   DATE RANGE PARSER
   ?range=all|month|quarter|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
===================================================== */
const parseDateRange = (query) => {
  const type = s(query.range || "all").toLowerCase();
  const now = new Date();

  if (type === "all") {
    return { type: "all", from: null, to: null, label: "All Time" };
  }

  if (type === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const to = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23, 59, 59, 999
    );
    return {
      type: "month",
      from,
      to,
      label: from.toLocaleString("en-IN", { month: "short", year: "numeric" }),
    };
  }

  if (type === "quarter") {
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const from = new Date(now.getFullYear(), qStartMonth, 1, 0, 0, 0, 0);
    const to = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23, 59, 59, 999
    );
    const qNum = Math.floor(now.getMonth() / 3) + 1;
    return {
      type: "quarter",
      from,
      to,
      label: `Q${qNum} ${now.getFullYear()}`,
    };
  }

  if (type === "custom") {
    const fromRaw = s(query.from);
    const toRaw = s(query.to);
    if (!fromRaw || !toRaw) {
      return { type: "all", from: null, to: null, label: "All Time" };
    }
    const from = new Date(`${fromRaw}T00:00:00.000`);
    const to = new Date(`${toRaw}T23:59:59.999`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return { type: "all", from: null, to: null, label: "All Time" };
    }
    return { type: "custom", from, to, label: `${fromRaw} → ${toRaw}` };
  }

  return { type: "all", from: null, to: null, label: "All Time" };
};

const buildDateMatch = (field, range) => {
  if (!range.from && !range.to) return {};
  const cond = {};
  if (range.from) cond.$gte = range.from;
  if (range.to) cond.$lte = range.to;
  return { [field]: cond };
};

/* =====================================================
   PIVOT BUILDER (request types on rows, engineers on cols)
   - rows     : requestType  (dynamic, alphabetical)
   - cols     : assignedTo   (dynamic, alphabetical)
   - statuses : canonical trio always + any extras found
   - every cell initialized to 0
===================================================== */
const buildPivot = (docs) => {
  const rowSet = new Set();   // request types
  const colSet = new Set();   // engineers

  const statusSet = new Set(CANONICAL_STATUSES);

  // cells[requestType][assignedTo][status] = count
  const cells = {};

  // Per-row totals (per request type)
  const rowTotals = {};
  const rowStatusTotals = {};

  // Per-col totals (per engineer)
  const colTotals = {};
  const colStatusTotals = {}; // global per status

  let grandTotal = 0;

  for (const d of docs) {
    const rt = s(d.requestType) || "Unassigned";
    const eng = s(d.assignedTo) || "Unassigned";
    const st = s(d.status) || "In Progress";

    rowSet.add(rt);
    colSet.add(eng);
    statusSet.add(st);

    // Cell
    if (!cells[rt]) cells[rt] = {};
    if (!cells[rt][eng]) cells[rt][eng] = { __total: 0 };
    if (cells[rt][eng][st] === undefined) cells[rt][eng][st] = 0;
    cells[rt][eng][st] += 1;
    cells[rt][eng].__total += 1;

    // Row totals (per request type)
    rowTotals[rt] = (rowTotals[rt] || 0) + 1;
    if (!rowStatusTotals[rt]) rowStatusTotals[rt] = { __total: 0 };
    if (rowStatusTotals[rt][st] === undefined) rowStatusTotals[rt][st] = 0;
    rowStatusTotals[rt][st] += 1;
    rowStatusTotals[rt].__total += 1;

    // Column totals (per engineer)
    colTotals[eng] = (colTotals[eng] || 0) + 1;
    colStatusTotals[st] = (colStatusTotals[st] || 0) + 1;

    grandTotal += 1;
  }

  // Sort statuses: canonical order first, extras alphabetically after.
  const statuses = [
    ...STATUS_ORDER_HINT.filter((st) => statusSet.has(st)),
    ...Array.from(statusSet)
      .filter((st) => !STATUS_ORDER_HINT.includes(st))
      .sort(),
  ];

  // Ensure canonical statuses have colStatusTotals entries
  for (const st of CANONICAL_STATUSES) {
    if (colStatusTotals[st] === undefined) colStatusTotals[st] = 0;
  }

  const rowValues = Array.from(rowSet).sort(); // request types
  const colValues = Array.from(colSet).sort(); // engineers

  // Zero-fill every row × col × status
  for (const rt of rowValues) {
    if (!cells[rt]) cells[rt] = {};
    for (const eng of colValues) {
      if (!cells[rt][eng]) cells[rt][eng] = { __total: 0 };
      for (const st of statuses) {
        if (cells[rt][eng][st] === undefined) cells[rt][eng][st] = 0;
      }
    }
  }

  // Zero-fill per-row status totals
  for (const rt of rowValues) {
    if (!rowStatusTotals[rt]) rowStatusTotals[rt] = { __total: 0 };
    for (const st of statuses) {
      if (rowStatusTotals[rt][st] === undefined) rowStatusTotals[rt][st] = 0;
    }
    if (rowStatusTotals[rt].__total === undefined) {
      rowStatusTotals[rt].__total = rowTotals[rt] || 0;
    }
  }

  return {
    rowValues,          // request types
    colValues,          // engineers
    statuses,
    cells,              // cells[requestType][assignedTo][status]
    rowTotals,          // per requestType
    rowStatusTotals,    // per requestType, per status
    colTotals,          // per assignedTo
    colStatusTotals,    // per status (global)
    grandTotal,
  };
};

const respondPivot = (res, range, pivot) => {
  return res.status(200).json({
    success: true,
    range: {
      type: range.type,
      from: range.from ? range.from.toISOString() : null,
      to: range.to ? range.to.toISOString() : null,
      label: range.label,
    },
    // Labels reflect the current shape
    rowKey: "requestType",
    colKey: "assignedTo",
    subKey: "status",
    rowValues: pivot.rowValues,
    colValues: pivot.colValues,
    statuses: pivot.statuses,
    cells: pivot.cells,
    rowTotals: pivot.rowTotals,
    rowStatusTotals: pivot.rowStatusTotals,
    colTotals: pivot.colTotals,
    colStatusTotals: pivot.colStatusTotals,
    grandTotal: pivot.grandTotal,
  });
};

/* =====================================================
   SHARED ENRICHMENT FOR CHILD COLLECTIONS
   Design / Specification / Construction pull
   assignedTo + requestType + status from DCRequest via DCId.
===================================================== */
const enrichWithDCRequest = async (children) => {
  if (!children.length) return [];

  const dcIds = children.map((c) => s(c.DCId)).filter(Boolean);
  if (!dcIds.length) return [];

  const dcReqs = await DCRequest.find(
    { DCId: { $in: dcIds } },
    { DCId: 1, assignedTo: 1, requestType: 1, status: 1, _id: 0 }
  ).lean();

  const metaByDcId = new Map(
    dcReqs.map((r) => [
      s(r.DCId),
      {
        assignedTo: s(r.assignedTo),
        requestType: s(r.requestType),
        status: s(r.status),
      },
    ])
  );

  return children.map((c) => {
    const meta = metaByDcId.get(s(c.DCId)) || {};
    return {
      assignedTo: meta.assignedTo || "Unassigned",
      requestType: meta.requestType || "Unassigned",
      status: meta.status || "In Progress",
    };
  });
};

/* =====================================================
   TABLE 1 — DCRequest
   rows = requestType, cols = assignedTo, sub = status
   date = requestDate
===================================================== */
const getDCRequestReport = async (req, res) => {
  try {
    const range = parseDateRange(req.query);
    const match = buildDateMatch("requestDate", range);

    const docs = await DCRequest.find(match, {
      assignedTo: 1,
      requestType: 1,
      status: 1,
      _id: 0,
    }).lean();

    const pivot = buildPivot(docs);
    return respondPivot(res, range, pivot);
  } catch (error) {
    console.error("getDCRequestReport error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch DCRequest report",
      error: error.message,
    });
  }
};

/* =====================================================
   TABLE 2 — Design
   date = createdAt
===================================================== */
const getDesignReport = async (req, res) => {
  try {
    const range = parseDateRange(req.query);
    const match = buildDateMatch("createdAt", range);

    const designs = await Design.find(match, { DCId: 1, _id: 0 }).lean();
    const enriched = await enrichWithDCRequest(designs);

    const pivot = buildPivot(enriched);
    return respondPivot(res, range, pivot);
  } catch (error) {
    console.error("getDesignReport error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Design report",
      error: error.message,
    });
  }
};

/* =====================================================
   TABLE 3 — Specification
   date = createdAt
===================================================== */
const getSpecificationReport = async (req, res) => {
  try {
    const range = parseDateRange(req.query);
    const match = buildDateMatch("createdAt", range);

    const specs = await Specification.find(match, {
      DCId: 1,
      _id: 0,
    }).lean();
    const enriched = await enrichWithDCRequest(specs);

    const pivot = buildPivot(enriched);
    return respondPivot(res, range, pivot);
  } catch (error) {
    console.error("getSpecificationReport error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Specification report",
      error: error.message,
    });
  }
};

/* =====================================================
   TABLE 4 — Construction
   date = createdAt
===================================================== */
const getConstructionReport = async (req, res) => {
  try {
    const range = parseDateRange(req.query);
    const match = buildDateMatch("createdAt", range);

    const constructions = await Construction.find(match, {
      DCId: 1,
      _id: 0,
    }).lean();
    const enriched = await enrichWithDCRequest(constructions);

    const pivot = buildPivot(enriched);
    return respondPivot(res, range, pivot);
  } catch (error) {
    console.error("getConstructionReport error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Construction report",
      error: error.message,
    });
  }
};

/* =====================================================
   EXPORTS
===================================================== */
module.exports = {
  getDCRequestReport,
  getDesignReport,
  getSpecificationReport,
  getConstructionReport,
};