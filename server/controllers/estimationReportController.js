// controllers/estimationReportController.js
// READ-ONLY. Two endpoints:
//
//   GET /api/estimation-reports/by-type
//       rows = typeOfProperty,     cols = assignedTo, sub = request status
//
//   GET /api/estimation-reports/by-purpose
//       rows = purposeOfValuation, cols = assignedTo, sub = request status
//
// Cell = COUNT of estimations where (request.field = row) AND (assignedTo = col)
//        AND (request.status = sub)
// Date filter field: Estimation.createdAt

const Estimation = require("../models/Estimation");
const { EstimationRequest } = require("../models/EstimationRequest");

/* =====================================================
   HELPERS
===================================================== */
const s = (v) => String(v ?? "").trim();

const CANONICAL_STATUSES = ["In Progress", "Completed", "Rejected"];
const STATUS_ORDER_HINT = [...CANONICAL_STATUSES, "Cancelled"];

/* =====================================================
   DATE RANGE
===================================================== */
const parseDateRange = (query) => {
  const type = s(query.range || "all").toLowerCase();
  const now = new Date();

  if (type === "all") return { type: "all", from: null, to: null, label: "All Time" };

  if (type === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return {
      type: "month", from, to,
      label: from.toLocaleString("en-IN", { month: "short", year: "numeric" }),
    };
  }

  if (type === "quarter") {
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const from = new Date(now.getFullYear(), qStartMonth, 1, 0, 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const qNum = Math.floor(now.getMonth() / 3) + 1;
    return { type: "quarter", from, to, label: `Q${qNum} ${now.getFullYear()}` };
  }

  if (type === "custom") {
    const fromRaw = s(query.from);
    const toRaw = s(query.to);
    if (!fromRaw || !toRaw) return { type: "all", from: null, to: null, label: "All Time" };
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
   PIVOT BUILDER — rows × cols × status
===================================================== */
const buildStatusPivot = ({ docs, rowField }) => {
  const rowSet = new Set();
  const colSet = new Set();
  const statusSet = new Set(CANONICAL_STATUSES);

  const cells = {};
  const rowTotals = {};
  const rowStatusTotals = {};
  const colTotals = {};
  const colStatusTotals = {};

  let grandTotal = 0;

  for (const d of docs) {
    const rowVal = s(d[rowField]) || "Unassigned";
    const eng = s(d.assignedTo) || "Unassigned";
    const st = s(d.status) || "In Progress";

    rowSet.add(rowVal);
    colSet.add(eng);
    statusSet.add(st);

    if (!cells[rowVal]) cells[rowVal] = {};
    if (!cells[rowVal][eng]) cells[rowVal][eng] = { __total: 0 };
    if (cells[rowVal][eng][st] === undefined) cells[rowVal][eng][st] = 0;
    cells[rowVal][eng][st] += 1;
    cells[rowVal][eng].__total += 1;

    rowTotals[rowVal] = (rowTotals[rowVal] || 0) + 1;
    if (!rowStatusTotals[rowVal]) rowStatusTotals[rowVal] = { __total: 0 };
    if (rowStatusTotals[rowVal][st] === undefined) rowStatusTotals[rowVal][st] = 0;
    rowStatusTotals[rowVal][st] += 1;
    rowStatusTotals[rowVal].__total += 1;

    colTotals[eng] = (colTotals[eng] || 0) + 1;
    colStatusTotals[st] = (colStatusTotals[st] || 0) + 1;

    grandTotal += 1;
  }

  const statuses = [
    ...STATUS_ORDER_HINT.filter((st) => statusSet.has(st)),
    ...Array.from(statusSet).filter((st) => !STATUS_ORDER_HINT.includes(st)).sort(),
  ];

  const rowValues = Array.from(rowSet).sort();
  const colValues = Array.from(colSet).sort();

  for (const st of CANONICAL_STATUSES) {
    if (colStatusTotals[st] === undefined) colStatusTotals[st] = 0;
  }

  for (const rv of rowValues) {
    if (!cells[rv]) cells[rv] = {};
    for (const cv of colValues) {
      if (!cells[rv][cv]) cells[rv][cv] = { __total: 0 };
      for (const st of statuses) {
        if (cells[rv][cv][st] === undefined) cells[rv][cv][st] = 0;
      }
    }
  }
  for (const rv of rowValues) {
    if (!rowStatusTotals[rv]) rowStatusTotals[rv] = { __total: 0 };
    for (const st of statuses) {
      if (rowStatusTotals[rv][st] === undefined) rowStatusTotals[rv][st] = 0;
    }
    if (rowStatusTotals[rv].__total === undefined) {
      rowStatusTotals[rv].__total = rowTotals[rv] || 0;
    }
  }

  return {
    rowValues, colValues, statuses,
    cells, rowTotals, rowStatusTotals,
    colTotals, colStatusTotals, grandTotal,
  };
};

/* =====================================================
   ENRICH — pull request metadata by estimationId
===================================================== */
const enrichWithEstimationRequest = async (estimations) => {
  if (!estimations.length) return [];
  const ids = estimations.map((e) => s(e.estimationId)).filter(Boolean);
  if (!ids.length) return [];

  const requests = await EstimationRequest.find(
    { estimationId: { $in: ids } },
    {
      estimationId: 1,
      assignedTo: 1,
      typeOfProperty: 1,
      purposeOfValuation: 1,
      status: 1,
      _id: 0,
    }
  ).lean();

  const metaById = new Map(
    requests.map((r) => [
      s(r.estimationId),
      {
        assignedTo: s(r.assignedTo),
        typeOfProperty: s(r.typeOfProperty),
        purposeOfValuation: s(r.purposeOfValuation),
        status: s(r.status),
      },
    ])
  );

  return estimations.map((e) => {
    const meta = metaById.get(s(e.estimationId)) || {};
    return {
      ...e,
      assignedTo: meta.assignedTo || "Unassigned",
      typeOfProperty: meta.typeOfProperty || "Unassigned",
      purposeOfValuation: meta.purposeOfValuation || "Unassigned",
      status: meta.status || "In Progress",
    };
  });
};

/* =====================================================
   SHARED CORE — used by both endpoints
===================================================== */
const buildReportFor = async (req, { rowField, rowKey }) => {
  const range = parseDateRange(req.query);
  const match = buildDateMatch("createdAt", range);

  const estimations = await Estimation.find(match, {
    estimationId: 1,
    createdAt: 1,
    _id: 0,
  }).lean();

  const enriched = await enrichWithEstimationRequest(estimations);
  const pivot = buildStatusPivot({ docs: enriched, rowField });

  return {
    success: true,
    range: {
      type: range.type,
      from: range.from ? range.from.toISOString() : null,
      to: range.to ? range.to.toISOString() : null,
      label: range.label,
    },
    rowKey,
    colKey: "assignedTo",
    subKey: "status",
    ...pivot,
  };
};

/* =====================================================
   ENDPOINT 1 — BY TYPE OF PROPERTY
===================================================== */
const getEstimationReportByType = async (req, res) => {
  try {
    const payload = await buildReportFor(req, {
      rowField: "typeOfProperty",
      rowKey: "typeOfProperty",
    });
    return res.status(200).json(payload);
  } catch (error) {
    console.error("getEstimationReportByType error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch estimation report by type",
      error: error.message,
    });
  }
};

/* =====================================================
   ENDPOINT 2 — BY PURPOSE OF VALUATION
===================================================== */
const getEstimationReportByPurpose = async (req, res) => {
  try {
    const payload = await buildReportFor(req, {
      rowField: "purposeOfValuation",
      rowKey: "purposeOfValuation",
    });
    return res.status(200).json(payload);
  } catch (error) {
    console.error("getEstimationReportByPurpose error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch estimation report by purpose",
      error: error.message,
    });
  }
};

module.exports = {
  getEstimationReportByType,
  getEstimationReportByPurpose,
};