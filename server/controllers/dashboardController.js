// controllers/dashboardController.js
const { DCRequest } = require("../models/DCRequest");
const { EstimationRequest } = require("../models/EstimationRequest");
const Construction = require("../models/Construction");
const Design = require("../models/Design");
const Specification = require("../models/Specification");
const User = require("../models/User");
const Session = require("../models/Session");

/* ---------- helpers ---------- */
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfWeek = () => {
  const d = startOfToday();
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
};

const scopeFilter = (user) => {
  if (!user) return {};
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") return {};
  return { assignedTo: user.username || user.name || "" };
};

const statusCounts = async (Model, extraMatch = {}) => {
  const rows = await Model.aggregate([
    { $match: extraMatch },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const out = { total: 0, "In Progress": 0, Completed: 0, Rejected: 0 };
  for (const r of rows) {
    out[r._id] = r.count;
    out.total += r.count;
  }
  return out;
};

const CONSTRUCTION_FIELDS = [
  "designWorkLayout",
  "specificationWork",
  "partitionWork",
  "strongRoomPartition",
  "strongRoomDoor",
  "sentryBoxPlace",
  "grilledAndSecurityWork",
  "toiletRoomWork",
  "verandaOrCorridorWork",
  "electricalInstallationWork",
  "sanitaryInstallationWork",
  "ceilingFinishWork",
  "paintingWork",
  "electricalFittingWork",
  "sanitaryFittingWork",
  "siteClearance",
  "parkingArea",
];

const constructionBreakdown = async () => {
  const total = await Construction.countDocuments({});

  const groupStage = {};
  for (const f of CONSTRUCTION_FIELDS) {
    groupStage[`${f}_Completed`] = {
      $sum: { $cond: [{ $eq: [`$${f}`, "Completed"] }, 1, 0] },
    };
    groupStage[`${f}_Pending`] = {
      $sum: { $cond: [{ $eq: [`$${f}`, "Pending"] }, 1, 0] },
    };
    groupStage[`${f}_NotRequired`] = {
      $sum: { $cond: [{ $eq: [`$${f}`, "Not Required"] }, 1, 0] },
    };
  }

  const [agg] = await Construction.aggregate([
    { $group: { _id: null, ...groupStage } },
  ]);
  const row = agg || {};

  const fields = {};
  for (const f of CONSTRUCTION_FIELDS) {
    fields[f] = {
      Completed: row[`${f}_Completed`] || 0,
      Pending: row[`${f}_Pending`] || 0,
      "Not Required": row[`${f}_NotRequired`] || 0,
    };
  }

  return { total, fields };
};

/* =========================================================
   GET /api/dashboard/summary
========================================================= */
const getSummary = async (req, res) => {
  try {
    const scope = scopeFilter(req.user);
    const today = startOfToday();
    const week = startOfWeek();

    const [
      dcByStatus,
      estByStatus,
      constructionData,
      designTotal,
      specTotal,
      usersTotal,
      usersEnabled,
      usersByRole,
      activeSessions,
      totalSessions,
      dcToday,
      dcThisWeek,
      estToday,
      dcAssigned,
      estAssigned,
    ] = await Promise.all([
      statusCounts(DCRequest, scope),
      statusCounts(EstimationRequest, scope),
      constructionBreakdown(),
      Design.countDocuments({}),
      Specification.countDocuments({}),

      User.countDocuments({}),
      User.countDocuments({ enabled: true }),
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),

      Session.countDocuments({ isActive: true }),
      Session.countDocuments({}),

      DCRequest.countDocuments({ ...scope, createdAt: { $gte: today } }),
      DCRequest.countDocuments({ ...scope, createdAt: { $gte: week } }),
      EstimationRequest.countDocuments({ ...scope, createdAt: { $gte: today } }),

      DCRequest.countDocuments({ ...scope, assignedTo: { $ne: "" } }),
      EstimationRequest.countDocuments({ ...scope, assignedTo: { $ne: "" } }),
    ]);

    const roles = { SUPER_ADMIN: 0, ADMIN: 0, USER: 0 };
    for (const r of usersByRole) roles[r._id] = r.count;

    res.json({
      success: true,
      data: {
        dcRequests: {
          ...dcByStatus,
          today: dcToday,
          thisWeek: dcThisWeek,
          assigned: dcAssigned,
        },
        estimationRequests: {
          ...estByStatus,
          today: estToday,
          assigned: estAssigned,
        },
        construction: constructionData,
        design: { total: designTotal },
        specification: { total: specTotal },
        users: {
          total: usersTotal,
          enabled: usersEnabled,
          disabled: usersTotal - usersEnabled,
          roles,
        },
        sessions: {
          active: activeSessions,
          total: totalSessions,
        },
        meta: {
          scope:
            req.user?.role === "USER"
              ? `assigned to ${req.user.username}`
              : "all",
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    console.error("dashboard.getSummary:", err);
    res.status(500).json({ success: false, message: "Failed to load summary" });
  }
};

/* =========================================================
   GET /api/dashboard/recent
========================================================= */
const getRecent = async (req, res) => {
  try {
    const scope = scopeFilter(req.user);

    const [dcs, ests] = await Promise.all([
      DCRequest.find(scope)
        .sort({ createdAt: -1 })
        .select(
          "DCId requestingOrgan requestType placeofSite status assignedTo createdAt"
        )
        .lean(),
      EstimationRequest.find(scope)
        .sort({ createdAt: -1 })
        .select(
          "estimationId requestingOrgan applicantName propertyAddress status assignedTo createdAt"
        )
        .lean(),
    ]);

    const merged = [
      ...dcs.map((d) => ({
        kind: "DC",
        id: d.DCId,
        title: d.requestType || "DC Request",
        organ: d.requestingOrgan,
        location: d.placeofSite,
        status: d.status,
        assignedTo: d.assignedTo,
        createdAt: d.createdAt,
      })),
      ...ests.map((e) => ({
        kind: "EST",
        id: e.estimationId,
        title: "Estimation Request",
        organ: e.requestingOrgan,
        location: e.propertyAddress,
        status: e.status,
        assignedTo: e.assignedTo,
        createdAt: e.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: merged });
  } catch (err) {
    console.error("dashboard.getRecent:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load recent activity" });
  }
};

/* =========================================================
   GET /api/dashboard/workload   (admin only)
========================================================= */
const getWorkload = async (req, res) => {
  try {
    if (req.user?.role === "USER") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const [dc, est] = await Promise.all([
      DCRequest.aggregate([
        { $match: { status: "In Progress", assignedTo: { $ne: "" } } },
        { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
      ]),
      EstimationRequest.aggregate([
        { $match: { status: "In Progress", assignedTo: { $ne: "" } } },
        { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
      ]),
    ]);

    const map = {};
    for (const r of dc) map[r._id] = (map[r._id] || 0) + r.count;
    for (const r of est) map[r._id] = (map[r._id] || 0) + r.count;

    const rows = Object.entries(map)
      .map(([assignee, count]) => ({ assignee, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("dashboard.getWorkload:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load workload" });
  }
};

/* =========================================================
   EXPORTS
========================================================= */
module.exports = {
  getSummary,
  getRecent,
  getWorkload,
};